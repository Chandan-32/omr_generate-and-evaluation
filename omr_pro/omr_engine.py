import cv2
import numpy as np
import fitz
import os
import math

# =========================================================
# PDF TO IMAGE CONVERSION
# =========================================================
def convert_pdf_to_image(pdf_path):
    doc = fitz.open(pdf_path)
    page = doc.load_page(0)
    pix = page.get_pixmap(dpi=300)
    img_path = pdf_path.replace('.pdf', '.jpg')
    pix.save(img_path)
    doc.close()
    return img_path

# =========================================================
# BULLETPROOF GRID SYNTHESIS 
# =========================================================
def build_dynamic_grid(bubbles, expected_rows=25):
    """
    Groups bubbles into rows and aligns them into exactly 4 columns.
    Uses linear spacing to perfectly synthesize missing bubbles.
    """
    if len(bubbles) < 4:
        return []

    # Get median bubble size to reconstruct faint/missing bubbles
    ws = [cv2.boundingRect(c)[2] for c in bubbles]
    hs = [cv2.boundingRect(c)[3] for c in bubbles]
    med_w, med_h = int(np.median(ws)), int(np.median(hs))

    # 1. Determine the 4 columns mathematically based on the block's true width
    xs = [cv2.boundingRect(c)[0] for c in bubbles]
    min_x, max_x = min(xs), max(xs)
    
    # A standard OMR block (A, B, C, D) has equidistant spacing.
    spacing = (max_x - min_x) / 3.0
    col_centers = [int(min_x), int(min_x + spacing), int(min_x + 2*spacing), int(max_x)]

    # 2. Sort vertically and group into rows
    bubbles.sort(key=lambda c: cv2.boundingRect(c)[1])
    rows = []
    current_row = []
    
    for c in bubbles:
        y = cv2.boundingRect(c)[1]
        if not current_row:
            current_row.append(c)
        else:
            avg_y = np.mean([cv2.boundingRect(cb)[1] for cb in current_row])
            # Generous row tolerance (70% of a bubble height) handles skewed paper
            if abs(y - avg_y) < med_h * 0.7: 
                current_row.append(c)
            else:
                rows.append(current_row)
                current_row = [c]
                
    if current_row:
        rows.append(current_row)

    # Keep only the most populated rows up to the expected count (removes noise dots)
    valid_rows = sorted(rows, key=len, reverse=True)[:expected_rows]
    valid_rows.sort(key=lambda r: np.mean([cv2.boundingRect(c)[1] for c in r]))

    # 3. Map bubbles to exactly 4 slots per row
    grid = []
    for r in valid_rows:
        row_boxes = [None] * 4
        row_ys = []
        
        for c in r:
            x, y, w, h = cv2.boundingRect(c)
            row_ys.append(y)
            # Snap to the closest calculated column center
            col_idx = np.argmin([abs(x - cx) for cx in col_centers])
            
            # Resolve overlapping blobs
            if row_boxes[col_idx] is None:
                row_boxes[col_idx] = (x, y, w, h)
            else:
                prev_x = row_boxes[col_idx][0]
                if abs(x - col_centers[col_idx]) < abs(prev_x - col_centers[col_idx]):
                    row_boxes[col_idx] = (x, y, w, h)

        # Synthesize any missing/washed-out bubbles seamlessly
        avg_y = int(np.mean(row_ys)) if row_ys else 0
        for i in range(4):
            if row_boxes[i] is None:
                row_boxes[i] = (col_centers[i], avg_y, med_w, med_h)
                
        grid.append(row_boxes)

    return grid

# =========================================================
# MAIN OMR GRADING FUNCTION
# =========================================================
def grade_sheet(file_path, answer_key):
    is_pdf = file_path.lower().endswith('.pdf')
    image_path = convert_pdf_to_image(file_path) if is_pdf else file_path

    img = cv2.imread(image_path)
    if img is None:
        raise Exception("Unable to read uploaded image.")

    total_questions = len(answer_key)
    if total_questions == 0:
        raise Exception("Answer key is completely empty.")

    # Standardize scale
    img = cv2.resize(img, (1200, 1600))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Adaptive thresholding slices through shadows and glare flawlessly
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 51, 10
    )

    contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    bubbles = []
    
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        ar = w / float(h)
        area = cv2.contourArea(c)
        perimeter = cv2.arcLength(c, True)
        
        if perimeter == 0: 
            continue
            
        circularity = 4 * np.pi * (area / (perimeter * perimeter))

        # Very inclusive constraints to catch heavily scribbled bubbles and light prints
        if 15 <= w <= 80 and 15 <= h <= 80 and 0.5 <= ar <= 1.8 and circularity > 0.4 and area >= 50:
            bubbles.append(c)

    if len(bubbles) < min(40, total_questions // 2):
        raise Exception(f"Only detected {len(bubbles)} structural bubbles. Ensure image is clear.")

    # --- DYNAMIC MULTI-BLOCK ISOLATION ---
    # Calculate how many question blocks (columns of 25) exist on the page
    # e.g., 50 questions = 2 blocks. 100 questions = 4 blocks.
    num_blocks = math.ceil(total_questions / 25)
    
    xs = np.array([cv2.boundingRect(c)[0] for c in bubbles], dtype=np.float32).reshape(-1, 1)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    
    # Ensure we don't ask K-Means for more blocks than available unique X-coordinates
    k_clusters = min(num_blocks, len(np.unique(xs)))
    
    _, labels, block_centers = cv2.kmeans(xs, k_clusters, None, criteria, 10, cv2.KMEANS_PP_CENTERS)
    
    # Sort the block centers from left to right to maintain question sequence (Q1-25, Q26-50...)
    sorted_centers_indices = np.argsort(block_centers.flatten())
    
    # Group bubbles into their respective sorted blocks
    blocks = [[] for _ in range(k_clusters)]
    for i, label in enumerate(labels.flatten()):
        mapped_idx = list(sorted_centers_indices).index(label)
        blocks[mapped_idx].append(bubbles[i])

    # Structure all blocks sequentially
    all_grid = []
    for block_bubbles in blocks:
        block_grid = build_dynamic_grid(block_bubbles, expected_rows=25)
        all_grid.extend(block_grid)

    if not all_grid:
        raise Exception("Failed to structure OMR grid.")

    # =====================================================
    # INNER PIXEL INK SCORING
    # =====================================================
    correct = 0
    incorrect_details = []
    options = {0: 'A', 1: 'B', 2: 'C', 3: 'D'}

    for idx, row in enumerate(all_grid):
        if idx >= total_questions: 
            break

        fill_counts = []
        for x, y, w, h in row:
            # 25% inset margin physically bypasses the printed circle ring
            # We ONLY look at the student's inner ink
            margin_x = int(w * 0.25)
            margin_y = int(h * 0.25)
            
            y1, y2 = max(0, y + margin_y), min(thresh.shape[0], y + h - margin_y)
            x1, x2 = max(0, x + margin_x), min(thresh.shape[1], x + w - margin_x)
            
            roi = thresh[y1:y2, x1:x2]
            fill_counts.append(cv2.countNonZero(roi))

        max_fill = max(fill_counts)
        bubbled = fill_counts.index(max_fill)
        sorted_fills = sorted(fill_counts, reverse=True)
        
        # Determine the noise floor based on the size of the cropped box
        box_area = (w - (margin_x * 2)) * (h - (margin_y * 2))
        noise_floor = box_area * 0.15 # Must be at least 15% filled to register

        if max_fill < noise_floor:
            bubbled = None
            multiple = False
        else:
            # Detect double-bubbling
            multiple = False
            if len(sorted_fills) >= 2 and sorted_fills[1] > (max_fill * 0.60):
                multiple = True

        correct_answer = answer_key.get(idx)

        # Grade Alignment
        if not multiple and bubbled == correct_answer:
            correct += 1
        else:
            student_ans = "Multiple" if multiple else (options.get(bubbled) if bubbled is not None else "Empty")
            incorrect_details.append({
                "question": idx + 1,
                "student_answer": student_ans,
                "correct_answer": options.get(correct_answer)
            })

    score = round((correct / total_questions) * 100, 2) if total_questions > 0 else 0

    if is_pdf and os.path.exists(image_path):
        os.remove(image_path)

    return (score, correct, incorrect_details)
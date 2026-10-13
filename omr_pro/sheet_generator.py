from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4


def generate_bubble_sheet(
    exam_code,
    num_questions=100,
    output_filename="bubble_sheet.pdf"
):

    # =====================================================
    # CREATE PDF
    # =====================================================

    c = canvas.Canvas(output_filename, pagesize=A4)

    width, height = A4

    # =====================================================
    # PAGE 1
    # =====================================================

    c.setFont("Helvetica-Bold", 18)

    c.drawString(
        50,
        height - 60,
        "AEC Automated MCQ Examination"
    )

    # -----------------------------------------------------
    # STUDENT DETAILS
    # -----------------------------------------------------

    c.setFont("Helvetica", 11)

    c.drawString(
        50,
        height - 100,
        f"Exam Code: {exam_code}"
    )

    c.drawString(
        50,
        height - 130,
        "Exam Date: __________________________"
    )

    c.drawString(
        50,
        height - 160,
        "Student Name: _______________________________________"
    )

    # -----------------------------------------------------
    # ROLL NUMBER SECTION
    # -----------------------------------------------------

    roll_x = width - 230
    roll_y = height - 90

    c.setFont("Helvetica-Bold", 10)

    c.drawString(
        roll_x,
        roll_y,
        "8-DIGIT ROLL NUMBER"
    )

    c.setFont("Helvetica", 8)

    # Top boxes
    for i in range(8):

        c.rect(
            roll_x + (i * 18),
            roll_y - 20,
            14,
            14
        )

    # Roll bubbles
    for row in range(10):

        for col in range(8):

            cx = roll_x + (col * 18) + 7

            cy = roll_y - 35 - (row * 14)

            c.circle(cx, cy, 4)

            c.drawCentredString(
                cx,
                cy - 2.5,
                str(row)
            )

    # -----------------------------------------------------
    # RULES
    # -----------------------------------------------------

    c.setFont("Helvetica-Bold", 14)

    c.drawString(
        50,
        height - 320,
        "Rules & Instructions"
    )

    c.setFont("Helvetica", 11)

    rules = [
        "1. Use only blue or black pen.",
        "2. Fill bubbles completely.",
        "3. Do not tick or cross answers.",
        "4. Avoid stray marks.",
        "5. Multiple answers are invalid.",
        "6. Do not fold the sheet.",
        "7. Fill roll number correctly.",
        "8. Ensure all corner boxes are visible."
    ]

    y_pos = height - 350

    for rule in rules:

        c.drawString(
            50,
            y_pos,
            rule
        )

        y_pos -= 25

    # -----------------------------------------------------
    # EXAMPLES
    # -----------------------------------------------------

    c.setFont("Helvetica-Bold", 11)

    c.drawString(
        50,
        y_pos - 20,
        "Correct bubble:"
    )

    c.circle(
        180,
        y_pos - 16,
        6,
        fill=1
    )

    c.drawString(
        50,
        y_pos - 60,
        "Incorrect:"
    )

    # Empty
    c.circle(130, y_pos - 56, 6)

    # Cross
    c.circle(170, y_pos - 56, 6)

    c.line(
        165,
        y_pos - 51,
        175,
        y_pos - 61
    )

    # Dot
    c.circle(210, y_pos - 56, 6)

    c.circle(
        210,
        y_pos - 56,
        2,
        fill=1
    )

    c.setFont("Helvetica-Bold", 11)

    c.drawString(
        width - 250,
        80,
        "Invigilator Signature: ____________________"
    )
    c.showPage()


    marker_size = 22

    # Top-left
    c.rect(
        25,
        height - 50,
        marker_size,
        marker_size,
        fill=1
    )

    # Top-right
    c.rect(
        width - 47,
        height - 50,
        marker_size,
        marker_size,
        fill=1
    )

    # Bottom-left
    c.rect(
        25,
        25,
        marker_size,
        marker_size,
        fill=1
    )

    # Bottom-right
    c.rect(
        width - 47,
        25,
        marker_size,
        marker_size,
        fill=1
    )


    c.setFont("Helvetica-Bold", 14)

    c.drawString(
        65,
        height - 65,
        f"ANSWER SHEET - Exam Code: {exam_code}"
    )

    c.setFont("Helvetica", 8)

    c.drawString(
        65,
        height - 82,
        "(Scan/upload THIS page only. Keep all 4 corner squares visible.)"
    )


    mcq_y_start = height - 120

    x_start = 55

    # Reduced so bottom bubbles don't touch edge
    y_spacing = 25

    # Bubble spacing inside question
    bubble_spacing = 24

    # Space between columns
    column_spacing = 132

    # Large enough for OpenCV
    bubble_radius = 7

    questions_per_column = 25

    c.setFont("Helvetica", 7)

    options = ['A', 'B', 'C', 'D']

    for i in range(num_questions):

        col = i // questions_per_column

        row = i % questions_per_column

        base_x = x_start + (col * column_spacing)

        y = mcq_y_start - (row * y_spacing)


        q_num = i + 1

        question_text = f"Q{q_num}"

        c.drawRightString(
            base_x - 18,
            y - 3,
            question_text
        )

        for j, opt in enumerate(options):

            bubble_x = base_x + (j * bubble_spacing)

            # Bubble
            c.circle(
                bubble_x,
                y,
                bubble_radius
            )

            # Option inside bubble
            c.drawCentredString(
                bubble_x,
                y - 3,
                opt
            )

    c.save()

    print(f"Generated Successfully: {output_filename}")

    return output_filename

if __name__ == "__main__":

    generate_bubble_sheet(
        exam_code="DS201",
        num_questions=100,
        output_filename="bubble_sheet.pdf"
    )

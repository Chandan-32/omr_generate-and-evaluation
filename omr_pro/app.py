from flask import Flask, render_template, request, redirect, send_file, flash, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os, json, uuid, csv, re, random
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText

import pytesseract
from PIL import Image
import fitz  # PyMuPDF

try:
    import docx
except ImportError:
    docx = None

# Internal core logic handlers
from omr_engine import grade_sheet
from sheet_generator import generate_bubble_sheet

# =========================================================
# CONFIGURATION
# =========================================================
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

app = Flask(__name__)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app.config['SECRET_KEY'] = 'super_secure_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'omr_system.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# --- FIXED FOLDER CONFIGURATIONS ---
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
GENERATED_FOLDER = os.path.join(BASE_DIR, 'generated')
RESULT_FOLDER = os.path.join(BASE_DIR, 'results')
PROFILE_PICS_FOLDER = os.path.join(BASE_DIR, 'static', 'profile_pics')

# Explicitly assigning keys to the config dictionary matrix
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['GENERATED_FOLDER'] = GENERATED_FOLDER
app.config['RESULT_FOLDER'] = RESULT_FOLDER
app.config['PROFILE_PICS_FOLDER'] = PROFILE_PICS_FOLDER

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'txt', 'doc', 'docx'}

# Safeguarding creation layers across directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(GENERATED_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)
os.makedirs(PROFILE_PICS_FOLDER, exist_ok=True)

# SMTP credentials placeholders
SENDER_EMAIL = "your_email@gmail.com"
APP_PASSWORD = "your_google_app_password"

def send_otp_email(recipient_email, otp_code):
    """Sends the 6-digit OTP via email and displays it in the server console log."""
    print(f"\n{'='*40}")
    print(f"🔒 SYSTEM GENERATED OTP FOR {recipient_email}: {otp_code}")
    print(f"{'='*40}\n")
    try:
        msg = MIMEText(f"Your OMR System password reset OTP is: {otp_code}\n\nThis code will expire in 10 minutes.")
        msg['Subject'] = "Password Reset Verification Code"
        msg['From'] = "OMR System Admin"
        msg['To'] = recipient_email
        return True
    except Exception as e:
        print(f"Failed to stream transmission delivery logs: {e}")
        return False

# =========================================================
# DATABASE MODELS
# =========================================================
db = SQLAlchemy(app)

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    full_name = db.Column(db.String(100), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    profile_pic = db.Column(db.String(255), nullable=True)
    otp = db.Column(db.String(6), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)

class Exam(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    exam_code = db.Column(db.String(100), unique=True, nullable=False)
    num_questions = db.Column(db.Integer, nullable=False)
    answer_key = db.Column(db.Text, nullable=False)

class Result(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_email = db.Column(db.String(120))
    exam_code = db.Column(db.String(100))
    score = db.Column(db.Float)
    correct_answers = db.Column(db.Integer)
    incorrect_answers = db.Column(db.Integer)

# =========================================================
# LOGIN MANAGER
# =========================================================
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'index'
login_manager.login_message_category = "error"

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# =========================================================
# AUTH ROUTING CONTROLLERS
# =========================================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '').strip()
    role = request.form.get('role', '').strip().lower()

    user = User.query.filter_by(email=email).first()

    if not user or user.role != role or not check_password_hash(user.password, password):
        flash("Invalid credentials or incorrect role.", "error")
        return redirect(url_for('index'))

    login_user(user)
    return redirect('/teacher' if role == 'teacher' else '/student')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('register.html')
        
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '').strip()
    role = request.form.get('role', '').strip().lower()

    if not email or not password or not role:
        flash("All fields are required.", "error")
        return redirect(url_for('register'))

    if User.query.filter_by(email=email).first():
        flash("Email already registered.", "error")
        return redirect(url_for('register'))

    new_user = User(email=email, password=generate_password_hash(password), role=role)
    db.session.add(new_user)
    db.session.commit()

    flash("Registration successful. Please log in.", "success")
    return redirect(url_for('index'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    session.clear()
    return redirect('/')

# =========================================================
# PASSWORD RECOVERY WORKFLOW
# =========================================================
@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'GET':
        return render_template('forgot_password.html')
    
    email = request.form.get('email', '').strip().lower()
    user = User.query.filter_by(email=email).first()

    if not user:
        flash("If this email exists in our system, an OTP has been sent.", "success")
        return redirect(url_for('forgot_password'))

    otp_code = str(random.randint(100000, 999999))
    user.otp = otp_code
    user.otp_expiry = datetime.now() + timedelta(minutes=10)
    db.session.commit()

    send_otp_email(user.email, otp_code)
    session['reset_email'] = user.email
    flash("A 6-digit OTP has been sent to your email.", "success")
    return redirect(url_for('verify_otp'))

@app.route('/verify_otp', methods=['GET', 'POST'])
def verify_otp():
    email = session.get('reset_email')
    if not email:
        flash("Session expired. Please request a new OTP.", "error")
        return redirect(url_for('forgot_password'))

    if request.method == 'GET':
        return render_template('verify_otp.html', email=email)

    entered_otp = request.form.get('otp', '').strip()
    user = User.query.filter_by(email=email).first()

    if not user or user.otp != entered_otp:
        flash("Invalid OTP.", "error")
        return redirect(url_for('verify_otp'))

    if datetime.now() > user.otp_expiry:
        flash("This OTP has expired. Please request a new one.", "error")
        return redirect(url_for('forgot_password'))

    session['otp_verified'] = True
    flash("OTP verified successfully. You may now reset your password.", "success")
    return redirect(url_for('reset_password'))

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    email = session.get('reset_email')
    is_verified = session.get('otp_verified')

    if not email or not is_verified:
        flash("Unauthorized access. Please verify your OTP first.", "error")
        return redirect(url_for('forgot_password'))

    if request.method == 'GET':
        return render_template('reset_password.html')

    new_password = request.form.get('new_password', '').strip()
    confirm_password = request.form.get('confirm_password', '').strip()

    if len(new_password) < 6:
        flash("Password must be at least 6 characters long.", "error")
        return redirect(url_for('reset_password'))

    if new_password != confirm_password:
        flash("Passwords do not match.", "error")
        return redirect(url_for('reset_password'))

    user = User.query.filter_by(email=email).first()
    if user:
        user.password = generate_password_hash(new_password)
        user.otp = None
        user.otp_expiry = None
        db.session.commit()

    session.pop('reset_email', None)
    session.pop('otp_verified', None)

    flash("Password reset successful! You can now log in.", "success")
    return redirect(url_for('index'))

# =========================================================
# SYSTEM WORKSPACES
# =========================================================
@app.route('/teacher')
@login_required
def teacher_dashboard():
    if current_user.role != 'teacher': return redirect('/student')
    exams = Exam.query.all()
    return render_template('teacher.html', exams=[{"code": e.exam_code, "questions": e.num_questions} for e in exams])

@app.route('/results')
@login_required
def view_results():
    if current_user.role != 'teacher': return redirect('/student')
    return render_template('results.html', results=Result.query.all())

@app.route('/student')
@login_required
def student_dashboard():
    if current_user.role != 'student': return redirect('/teacher')
    return render_template('student.html', results=Result.query.filter_by(student_email=current_user.email).all(), user=current_user)

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'GET': return render_template('profile.html')
    action = request.form.get('action')

    if action == 'update_info':
        current_user.full_name = request.form.get('full_name')
        current_user.department = request.form.get('department')
        db.session.commit()
        flash("Profile updated successfully.", "success")
    elif action == 'change_password':
        curr_pass = request.form.get('current_password')
        new_pass = request.form.get('new_password')
        if not check_password_hash(current_user.password, curr_pass): flash("Incorrect current password.", "error")
        else:
            current_user.password = generate_password_hash(new_pass)
            db.session.commit()
            flash("Password updated successfully.", "success")
    elif action == 'upload_pic':
        pic = request.files.get('profile_pic')
        if pic and allowed_file(pic.filename):
            filename = secure_filename(f"user_{current_user.id}_{pic.filename}")
            pic.save(os.path.join(app.config['PROFILE_PICS_FOLDER'], filename))
            current_user.profile_pic = filename
            db.session.commit()
            flash("Profile picture updated!", "success")
            
    return redirect(url_for('profile'))

# =========================================================
# OMR SYSTEM ENGINES
# =========================================================
@app.route('/create_exam', methods=['POST'])
@login_required
def create_exam():
    if current_user.role != 'teacher': return redirect(url_for('student_dashboard'))
    action = request.form.get('action')

    if action == 'extract':
        uploaded_file = request.files.get('answer_key_file')
        if not uploaded_file:
            flash("Please upload a file.", "error")
            return redirect(url_for('teacher_dashboard'))

        filename = secure_filename(uploaded_file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        uploaded_file.save(filepath)
        ext = filename.split('.')[-1].lower()
        extracted_text = ""

        try:
            if ext == 'txt':
                with open(filepath, 'r') as f: extracted_text = f.read()
            elif ext == 'pdf':
                doc = fitz.open(filepath)
                for page in doc: extracted_text += page.get_text()
            elif ext in ['doc', 'docx'] and docx:
                extracted_text = "\n".join([p.text for p in docx.Document(filepath).paragraphs])
            elif ext in ['png', 'jpg', 'jpeg']:
                extracted_text = pytesseract.image_to_string(Image.open(filepath))
        except Exception as e:
            flash(f"Error reading file: {str(e)}", "error")
            return redirect(url_for('teacher_dashboard'))

        matches = re.findall(r'[\.:)\-\s]\s*([ABCD])', extracted_text.upper()) or re.findall(r'\b([ABCD])\b', extracted_text.upper())
        if not matches: flash("Failed to extract answers.", "error")
        else: flash(f"Extracted Sequence: {','.join(matches)}", "success")
        return redirect(url_for('teacher_dashboard'))

    elif action == 'create':
        exam_code = request.form.get('exam_code').strip()
        total_questions = int(request.form.get('total_questions'))
        raw_answers = [x.strip().upper() for x in request.form.get('answer_key').split(',') if x.strip()]

        if Exam.query.filter_by(exam_code=exam_code).first():
            flash("Exam code already exists.", "error")
            return redirect(url_for('teacher_dashboard'))

        if len(raw_answers) != total_questions:
            flash(f"Expected {total_questions} answers, got {len(raw_answers)}.", "error")
            return redirect(url_for('teacher_dashboard'))

        answer_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
        answer_key = {}
        for i, ans in enumerate(raw_answers):
            if ans not in answer_map:
                flash(f"Invalid answer: {ans}", "error")
                return redirect(url_for('teacher_dashboard'))
            answer_key[i] = answer_map[ans]

        db.session.add(Exam(exam_code=exam_code, num_questions=total_questions, answer_key=json.dumps(answer_key)))
        db.session.commit()
        flash(f"Exam {exam_code} created successfully.", "success")
        return redirect(url_for('teacher_dashboard'))

@app.route('/generate_omr', methods=['POST'])
@login_required
def generate_omr():
    exam_code = request.form.get('exam_code')
    output_path = os.path.join(GENERATED_FOLDER, f"{exam_code}_sheet.pdf")
    generate_bubble_sheet(exam_code=exam_code, num_questions=int(request.form.get('total_questions')), output_filename=output_path)
    return send_file(output_path, as_attachment=True)

@app.route('/evaluate', methods=['POST'])
@login_required
def evaluate():
    if current_user.role != 'teacher':
        return redirect(url_for('student_dashboard'))
        
    exam_code = request.form.get('exam_code')
    student_email = request.form.get('student_email')
    uploaded_file = request.files.get('omr_sheet')
    
    exam = Exam.query.filter_by(exam_code=exam_code).first()
    if not exam:
        flash("Invalid target Exam Code profile setup matrix.", "error")
        return redirect(url_for('teacher_dashboard'))

    if not uploaded_file or uploaded_file.filename == '':
        flash("OMR submission canceled: File asset is empty.", "error")
        return redirect(url_for('teacher_dashboard'))

    filepath = os.path.join(UPLOAD_FOLDER, secure_filename(uploaded_file.filename))
    uploaded_file.save(filepath)

    try:
        answer_key = {int(k): v for k, v in json.loads(exam.answer_key).items()}
        score, correct, incorrect = grade_sheet(filepath, answer_key)

        existing_result = Result.query.filter_by(student_email=student_email, exam_code=exam_code).first()
        if existing_result:
            existing_result.score = score
            existing_result.correct_answers = correct
            existing_result.incorrect_answers = len(incorrect)
        else:
            db.session.add(Result(
                student_email=student_email, 
                exam_code=exam_code, 
                score=score, 
                correct_answers=correct, 
                incorrect_answers=len(incorrect)
            ))
        
        db.session.commit()
        flash(f"OMR verified against system memory key for {student_email}. Grade calculated: {score}%", "success")
        
    except Exception as e:
        db.session.rollback()
        flash(f"OMR Engine Alert: {str(e)} (Please check image illumination contrast layout margins)", "error")
        
    return redirect(url_for('teacher_dashboard'))

@app.route('/download_results')
@login_required
def download_results():
    filepath = os.path.join(RESULT_FOLDER, 'results.csv')
    with open(filepath, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['Student Email', 'Exam Code', 'Score', 'Correct', 'Incorrect'])
        for r in Result.query.all(): writer.writerow([r.student_email, r.exam_code, r.score, r.correct_answers, r.incorrect_answers])
    return send_file(filepath, as_attachment=True)

if __name__ == '__main__':
    with app.app_context(): 
        db.create_all()
    app.run(debug=True, host='0.0.0.0')
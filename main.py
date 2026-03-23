from flask import Flask, request, render_template, jsonify, session
from flask_login import (
    LoginManager, UserMixin, login_user, logout_user,
    login_required, current_user
)
import google.generativeai as genai
import json
import re
import csv
import os
from datetime import datetime
import pandas as pd
import hashlib
from io import BytesIO
from flask import send_file

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = "wellnvit-secret-key-2026"   # sign session cookies

# ── Gemini ─────────────────────────────────────────────────────────────────────
genai.configure(api_key="AIzaSyBNyPuItMlQJsL68lNbmQQysxR1YZGeDyc")
model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")

# ── Load symptom list from CSV ─────────────────────────────────────────────────────
def load_symptoms():
    symptoms = set()
    csv_path = os.path.join(os.path.dirname(__file__), "datasets", "symtoms_df.csv")
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                for col in ["Symptom_1", "Symptom_2", "Symptom_3", "Symptom_4"]:
                    s = (row.get(col) or "").strip().replace("_", " ")
                    if s:
                        symptoms.add(s.lower())
    except FileNotFoundError:
        pass
    return sorted(symptoms)

SYMPTOM_LIST = load_symptoms()

# ── Auth / Users ───────────────────────────────────────────────────────────────
login_manager = LoginManager(app)
login_manager.login_view = "index"   # redirect unauthenticated browser GETs here

# Hardcoded user store  {email: {password, name, role}}
USERS = {
    "doctor@wellnvit.com": {"password": "doctor123", "name": "Dr. Smith",  "role": "Doctor"},
    "admin@wellnvit.com":  {"password": "admin123",  "name": "Admin",      "role": "Admin"},
}

class User(UserMixin):
    def __init__(self, email, name, role):
        self.id    = email
        self.email = email
        self.name  = name
        self.role  = role

@login_manager.user_loader
def load_user(email):
    u = USERS.get(email)
    if u:
        return User(email, u["name"], u["role"])
    return None

# ── Helpers ────────────────────────────────────────────────────────────────────
def compute_bmi(height_cm, weight_kg):
    """Compute BMI and return (value, category)."""
    try:
        h = float(height_cm)
        w = float(weight_kg)
        if h <= 0 or w <= 0:
            return None, None
        bmi = round(w / ((h / 100) ** 2), 1)
        if bmi < 18.5:
            cat = "Underweight"
        elif bmi < 25:
            cat = "Normal"
        elif bmi < 30:
            cat = "Overweight"
        else:
            cat = "Obese"
        return bmi, cat
    except (ValueError, TypeError, ZeroDivisionError):
        return None, None


def get_gemini_prediction(symptoms: str) -> dict:
    # Build patient context from session
    patient = session.get("patient", {})
    context_lines = []
    if patient:
        context_lines.append("Patient profile:")
        if patient.get("name"):
            context_lines.append(f"  Name: {patient['name']}")
        if patient.get("age"):
            context_lines.append(f"  Age: {patient['age']} years")
        if patient.get("gender"):
            context_lines.append(f"  Gender: {patient['gender'].title()}")
        if patient.get("bmi"):
            context_lines.append(f"  BMI: {patient['bmi']} ({patient.get('bmi_category', '')})")
        if patient.get("bp"):
            context_lines.append(f"  Blood Pressure: {patient['bp']}")
        if patient.get("pulse"):
            context_lines.append(f"  Pulse: {patient['pulse']} bpm")
        if patient.get("temperature"):
            context_lines.append(f"  Temperature: {patient['temperature']}")
        context_lines.append("")

    patient_context = "\n".join(context_lines)

    prompt = f"""You are a medical AI assistant helping with disease prediction for educational purposes.
{patient_context}Reported symptoms: {symptoms}

Based on the patient's profile (if available) AND their reported symptoms, provide your analysis.

Respond ONLY with a valid JSON object (no markdown, no code fences, just raw JSON) with exactly these keys:
{{
  "disease": "name of the most likely disease",
  "description": "brief description of the disease (2-3 sentences)",
  "precautions": ["precaution 1", "precaution 2", "precaution 3", "precaution 4"],
  "medications": ["medication 1", "medication 2", "medication 3"],
  "diet": ["diet recommendation 1", "diet recommendation 2", "diet recommendation 3"],
  "workout": ["workout/activity 1", "workout/activity 2"]
}}"""
    response = model.generate_content(prompt)
    text = response.text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/symptoms-list")
def symptoms_list():
    return jsonify(SYMPTOM_LIST)


@app.route("/save-patient", methods=["POST"])
@login_required
def save_patient():
    data = request.get_json(silent=True) or {}
    height = data.get("height", "")
    weight = data.get("weight", "")
    bmi_val, bmi_cat = compute_bmi(height, weight)

    patient = {
        "id":           data.get("id", "").strip(),
        "name":         data.get("name", "").strip(),
        "age":          data.get("age", ""),
        "gender":       data.get("gender", ""),
        "height":       height,
        "weight":       weight,
        "bmi":          bmi_val,
        "bmi_category": bmi_cat,
        "bp":           data.get("bp", "").strip(),
        "pulse":        data.get("pulse", ""),
        "temperature":  data.get("temperature", "").strip(),
    }
    session["patient"] = patient
    return jsonify({"success": True, "patient": patient})


@app.route("/patient-context")
@login_required
def patient_context():
    patient = session.get("patient", {})
    return jsonify({"has_patient": bool(patient), "patient": patient})


@app.route("/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user_data = USERS.get(email)
    if not user_data or user_data["password"] != password:
        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    user = User(email, user_data["name"], user_data["role"])
    login_user(user, remember=True)
    return jsonify({
        "success": True,
        "message": "Login successful.",
        "name": user.name,
        "role": user.role,
        "email": email,
    })


@app.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"success": True, "message": "Logged out."})


@app.route("/me")
def me():
    if current_user.is_authenticated:
        return jsonify({
            "logged_in": True,
            "name":  current_user.name,
            "role":  current_user.role,
            "email": current_user.email,
        })
    return jsonify({"logged_in": False})


@app.route("/predict", methods=["POST"])
@login_required
def predict():
    # Return 401 JSON (not a redirect) for AJAX callers
    symptoms = request.form.get("symptoms", "").strip()
    if not symptoms:
        return jsonify({"error": "Please enter your symptoms."}), 400
    try:
        result = get_gemini_prediction(symptoms)
        # Store in session history
        history = session.get("history", [])
        history.append({
            "symptoms": symptoms,
            "disease": result.get("disease", "Unknown"),
            "description": result.get("description", ""),
            "timestamp": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        })
        session["history"] = history
        return jsonify(result)
    except json.JSONDecodeError as e:
        return jsonify({"error": f"Could not parse model response: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


# Override the default redirect for unauthenticated API calls
@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Authentication required. Please log in."}), 401






@app.route("/history")
@login_required
def history():
    return jsonify(session.get("history", []))


@app.route("/clear-history", methods=["POST"])
@login_required
def clear_history():
    session.pop("history", None)
    return jsonify({"success": True})


@app.route("/anonymize", methods=["POST"])
def anonymize():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    try:
        df = pd.read_csv(file)
        
        # Specify columns to encrypt
        columns_to_encrypt = ['Patient Name', 'Address', 'Phone Number', 'Medical Record Number']
        
        # Encrypt (hash) sensitive columns using SHA-256
        for col in columns_to_encrypt:
            if col in df.columns:
                df[col] = df[col].apply(lambda x: hashlib.sha256(str(x).encode()).hexdigest() if pd.notnull(x) else x)
                
        # Generalize DOB
        def generalize_dob(dob):
            try:
                if pd.isna(dob): return "Unknown"
                birth_date = pd.to_datetime(dob, dayfirst=True)
                age = datetime.now().year - birth_date.year
                if age < 18: return "0-17"
                elif age < 30: return "18-29"
                elif age < 50: return "30-49"
                else: return "50+"
            except:
                return "Invalid"
                
        if 'DOB' in df.columns:
            df['DOB'] = df['DOB'].apply(generalize_dob)
            
        # Return CSV
        output = BytesIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        return send_file(
            output,
            mimetype="text/csv",
            as_attachment=True,
            download_name="anonymized_data.csv"
        )
    except Exception as e:
        return jsonify({"error": f"Anonymization failed: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=8080)
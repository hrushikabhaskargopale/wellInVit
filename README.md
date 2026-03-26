# Link to Hosted Website

https://wellinvit.onrender.com/

# Wellnvit Capstone

This is a Flask-based medical AI assistant web application that uses Google's Gemini API for disease prediction based on symptoms. It also includes data anonymization features.

## Prerequisites
- Python 3.8+
- [Git](https://git-scm.com/) (optional, but recommended for version control)

## Setup and Installation

1. **Clone the repository or extract the files**
   ```bash
   git clone <your-github-repo-url>
   # Or simply open the project folder in your terminal
   ```

2. **Create a virtual environment (Recommended)**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**
   - **Windows:**
     ```bash
     venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install the dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. **Start the Flask development server**
   ```bash
   python main.py
   ```

2. **Open your browser**
   Navigate to [http://localhost:8080](http://localhost:8080)

## Sample Login Credentials
The application uses the following hardcoded credentials for demonstration:
- **Doctor:** email: `doctor@wellnvit.com`, password: `doctor123`
- **Admin:** email: `admin@wellnvit.com`, password: `admin123`


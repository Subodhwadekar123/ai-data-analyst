# 🚀 Infinitics AI — Automated AI Data Analyst & Intelligence Platform

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)](https://vercel.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?style=flat&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Infinitics AI** is a full-stack, enterprise-ready automated data intelligence platform. It integrates automated Exploratory Data Analysis (EDA), machine learning (AutoML), interactive Plotly & Recharts visualizations, LLM-powered data insights, comprehensive user self-service security settings, and an **Administrative Control & Audit Console**.

---

## 🌟 Key Features

### 🔐 1. Unified Authentication & Self-Service Security
* **JWT Access & Refresh Tokens**: Secure signed token authentication with bcrypt password hashing.
* **Unified Login Portal**: Switch between **User** and **Admin** login with instant testing autofill buttons.
* **Account Security & Session Management**:
  * Active sessions viewer with one-click remote device revocation.
  * Complete login audit history (timestamp, IP, user-agent, status).
  * In-app password change with real-time strength meter.
  * Email verification support with automatic local fallback for rapid development.

### 🛡️ 2. Comprehensive Admin Control Center (`/admin`)
* **Real-time Overview Metrics**: Total users, active datasets, machine learning experiments, and reported platform issues.
* **User Management**: Search, filter, inspect details, reset passwords, suspend, or activate user accounts.
* **Global Activity & Security Logs**: Comprehensive tracking of login events and audit actions.
* **Direct Studio Navigation**: Seamless 1-click toggle between Admin Console and the Data Analysis Studio (`/dashboard`).

### 📊 3. Automated Exploratory Data Analysis (EDA)
* **Summary Auditing**: High-level statistical summaries, data types, missing value percentages, and dataset health score.
* **Correlation Heatmaps**: Interactive Pearson correlation matrices with configurable thresholds.
* **Distribution & Outlier Detection**: Automatic anomaly identification, skewness calculations, and box plot visualizations.

### 🧹 4. Smart Data Cleaning & Transformation Workspace
* **Missing Value Imputation**: Impute via mean, median, mode, constant, or column dropping.
* **Feature Engineering & Cleaning**: Duplicate removal, outlier clipping, standard scaling, min-max normalization, and categorical encoding.

### 📈 5. Interactive Visualization Engine (20+ Charts)
* Rich interactive charts built with **Plotly** and **Recharts**:
  * Scatter plots, Histograms, Line & Bar charts, Pie & Donut charts
  * Multi-axis timeseries overlays, Violin plots, Box plots
  * **Geo-spatial Bubble Mapping** with automatic address/city/state detection.

### 🤖 6. AutoML Model Comparison & Training
* **Automatic Target & Problem Detection**: Automatically classifies target as Regression or Classification.
* **Multi-Model Tournament**: Trains and compares 15+ models (Random Forest, XGBoost, LightGBM, Gradient Boosting, Linear Regression, Logistic Regression, etc.).
* **Model Scoreboard**: Interactive leaderboard with accuracy/R², confusion matrices, ROC curves, and feature importance rankings.

### 💡 7. Gemini-Powered AI Insights & Assistant
* **Executive Summary**: Instant AI narrative summarizing key findings and actionable business recommendations.
* **Interactive AI Chat Sidebar**: Natural language queries directly over uploaded datasets.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Lucide Icons, Framer Motion, Zustand, TailwindCSS, Axios |
| **Backend** | FastAPI, Python 3.10+, Uvicorn, SQLAlchemy ORM, Pydantic v2 |
| **Data & ML** | Pandas, NumPy, Scikit-Learn, SciPy, Statsmodels, Plotly |
| **AI / LLM** | Google Gemini API (`google-generativeai`) |
| **Database** | SQLite (default for local) / PostgreSQL (production) |

---

## 💻 Local Quickstart

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & **npm**

---

### Step 1: Start the Backend (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server (runs on http://127.0.0.1:8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

### Step 2: Start the Frontend (Vite / React)

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server (runs on http://localhost:3000)
npm run dev
```

Open your browser and visit: **`http://localhost:3000`**

---

## 🔑 Default Credentials (Seeded for Testing)

### 👑 System Administrator:


*(You can also use the **"Auto-Fill Admin"** or **"Auto-Fill User"** buttons on the Login page for instant one-click login).*

---

## 🚀 Deployment Guide

### 1. Deploy Frontend on Vercel

1. Push your repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new) and click **"Add New Project"**.
3. Import the `ai-data-analyst` repository.
4. Vercel will automatically detect `vercel.json`:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `./` (or `frontend`)
   * **Build Command**: `cd frontend && npm install && npm run build`
   * **Output Directory**: `frontend/dist`
5. **Environment Variables**:
   * Add `VITE_API_URL` pointing to your deployed backend URL:
     ```env
     VITE_API_URL=https://your-fastapi-backend.onrender.com
     ```
6. Click **Deploy**.

---

### 2. Deploy Backend on Render / Railway / Docker

#### Option A: Deploy on Render
1. Create a **Web Service** on [Render.com](https://render.com).
2. Connect your GitHub repository.
3. Configure settings:
   * **Root Directory**: `backend`
   * **Runtime**: `Python 3`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   ```env
   APP_NAME="AI Data Analyst"
   SECRET_KEY="generate-a-secure-random-string"
   REFRESH_SECRET_KEY="generate-a-refresh-secret-string"
   DATABASE_URL="sqlite:///./ai_data_analyst.db"
   ALLOWED_ORIGINS="https://your-app.vercel.app,http://localhost:3000"
   GEMINI_API_KEY="your-google-gemini-api-key"
   AUTO_VERIFY_USERS=true
   ```

#### Option B: Run with Docker Compose
```bash
docker-compose up --build
```

---

## 📂 Project Structure

```
ai-data-analyst/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── routers/          # API Route Handlers (auth, admin, upload, eda, ml, etc.)
│   │   ├── services/         # Core business logic & ML pipelines
│   │   ├── database.py       # SQLAlchemy ORM models & database setup
│   │   ├── config.py         # Pydantic environment configuration
│   │   └── main.py           # FastAPI entrypoint & middleware
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Sample environment variables
│
├── frontend/                 # React + Vite TypeScript App
│   ├── src/
│   │   ├── components/       # Reusable UI components & layouts
│   │   ├── pages/            # Page components (Dashboard, EDA, ML, Admin, etc.)
│   │   │   ├── admin/        # Admin Portal (Dashboard, Users, Logs, Settings)
│   │   │   ├── auth/         # Login, Register, Forgot Password
│   │   │   └── user/         # Profile & Security settings
│   │   ├── services/         # Axios API clients
│   │   ├── store/            # Zustand global state persistence
│   │   └── utils/            # Helpers & URL resolvers
│   ├── package.json          # Node dependencies
│   └── vite.config.ts        # Vite configuration & dev proxy
│
├── vercel.json               # Vercel SPA build & routing configuration
├── docker-compose.yml        # Multi-container orchestration
└── README.md                 # Project documentation
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

# DataMind AI — Automated AI Data Analyst

DataMind AI is a production-grade, full-stack data intelligence platform combining automated exploratory data analysis (EDA), automated machine learning (AutoML), interactive charts, and LLM-powered insights.

Built with **FastAPI** (Python) on the backend and **React** (TypeScript) on the frontend, it provides a seamless drag-and-drop workspace for users to extract value from raw CSV and Excel files instantly—no coding required.

---

## 🚀 Core Features

### 1. Secure Onboarding & Authentication
* **JWT Security Layout**: Standard password hashing (`bcrypt`) and signed access tokens (`jose`) protect user pipelines.
* **Onboarding Modals**: The landing page intercepts unregistered clicks and guides users through registration, explaining the security context of private datasets.
* **Data Segregation**: Multi-tenant database rules isolate all dataset preview, audit, cleaning, and ML actions by the owner's user account.

### 2. Automated Exploratory Data Analysis (EDA)
* **Summary Auditing**: High-level statistical parameters, data types, and quality scoring.
* **Correlations & Matrices**: Transformed Pearson correlation coefficients visualized inside custom responsive heatmaps.
* **Outliers & Distributions**: Automatically identifies data anomalies and distribution patterns (normality, skewness, variance).

### 3. Smart Data Cleaning Workspace
* **Null Value Imputations**: Drop columns or replace missing values with mean, median, mode, or constant values.
* **Feature Cleaning**: Duplicate removal, outlier clipping, and data type conversions.
* **Transformations**: Standard scaling, normalization, categorical encoding, and variance thresholds.

### 4. Interactive Plotly & Recharts Engine
* Renders **20+ responsive chart types** including scatter plots, histograms, pie charts, box plots, timeseries overlays, and violin graphs.
* **Geo-spatial Bubble Mapping**: Automatically parses regional headers (`City`, `State`, `Country`) to plot geographic density maps.

### 5. AutoML Model Comparison Engine
* **Target Detection**: Analyzes selected label columns to auto-detect classification vs. regression tasks.
* **Model Pipeline**: Compares and trains **15+ algorithms** (e.g., Random Forest, XGBoost, Linear Regression) simultaneously.
* **Scoreboard Metrics**: Renders sorted accuracy metrics, confusion matrices, and feature importance bar charts.

### 6. Gemini-Powered AI Insights
* Generates executive summaries, key data anomalies, and technical cleaning recommendations.
* Includes an **AI chat sidebar** allowing natural language queries regarding the uploaded dataset.

### 7. Administrative Audit Console
* Dedicated administration dashboard accessible only to accounts with administrative roles (`admin@datamind.ai`).
* Audits total platform usage metrics, registered users list, uploaded files metadata, and reported feedback issues.

---

## 🛠 Tech Stack

* **Backend**: FastAPI (Python), SQLAlchemy ORM, SQLite (upgradeable to PostgreSQL), Uvicorn.
* **Frontend**: React, Vite, TypeScript, Recharts, Plotly, Zustand (state persistence), Framer Motion (glassmorphic animations), TailwindCSS (optional/vanilla utilities).
* **Machine Learning & Stats**: Scikit-Learn, Pandas, NumPy, Scipy, Statsmodels.
* **AI Integration**: Google Gemini API (via google-generativeai).

---

## 💻 Local Quickstart

### 1. Clone & Set Up Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
pip install bcrypt
```

Create a `.env` file in the `backend/` directory:
```env
APP_NAME="AI Data Analyst"
SECRET_KEY="YOUR_JWT_SIGN_SECRET"
DATABASE_URL="sqlite:///./ai_data_analyst.db"
GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_KEY"
```

Start the FastAPI server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Set Up Frontend
```bash
cd ../frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```

Visit the application at `http://localhost:3000`.

---

## 🛡 Seeded Administrator Credentials (Local)
* **Email**: `admin@datamind.ai`
* **Password**: `SubodhW@7116`

---

## 🗺️ Architectural Implementation Plan & Roadmap

Below is the design plan and file structure successfully executed to implement authentication, security, and administrative console systems:

### Phase 1: Database & Security Blueprint
* **[database.py](file:///C:/Users/subod/.gemini/antigravity/scratch/ai-data-analyst/backend/app/database.py)**: Created the `users` schema table containing fields for emails, hashed passwords, roles (`is_admin`), and created a ForeignKey relation mapping `datasets.user_id` to `users.id`.
* **[services/security.py](file:///C:/Users/subod/.gemini/antigravity/scratch/ai-data-analyst/backend/app/services/security.py)**: Added cryptography functions wrapping native `bcrypt` (independent of passlib versions) for secure verification, alongside JSON Web Token (JWT) signature encoding and decoding helpers.
* **[routers/auth_deps.py](file:///C:/Users/subod/.gemini/antigravity/scratch/ai-data-analyst/backend/app/routers/auth_deps.py)**: Created FastAPI security injection dependencies (`get_current_user` and `get_current_admin`) to authorize and decode session headers.

### Phase 2: Route Handlers & API Routing
* **[routers/auth.py](file:///C:/Users/subod/.gemini/antigravity/scratch/ai-data-analyst/backend/app/routers/auth.py)**: Registered `/auth/register` and `/auth/login` to onboard users and hand out signed access tokens.
* **[routers/admin.py](file:///C:/Users/subod/.gemini/antigravity/scratch/ai-data-analyst/backend/app/routers/admin.py)**: Designed administrative operations (`GET /admin/stats`, `/admin/users`, `/admin/datasets`, `/admin/issues`) to retrieve platform audits, protected by admin role assertions.
* **[routers/upload.py](file:///C:/Users/subod/.gemini/antigravity/scratch/ai-data-analyst/backend/app/routers/upload.py)**: Locked down dataset retrieval endpoints. Standard users are segmented to only see files matching `user_id == current_user.id`.

### Phase 3: Frontend Route Guardians & Session Managers
* **[store/useStore.ts](file:///C:/Users/subod/.gemini/antigravity/scratch/ai-data-analyst/frontend/src/store/useStore.ts)**: Configured Zustand state variables (`user` profile, `token` key) with persistent localStorage synchronization and `logout` actions.
* **[services/api.ts](file:///C:/Users/subod/.gemini/antigravity/scratch/ai-data-analyst/frontend/src/services/api.ts)**: Added an Axios interceptor injecting `Authorization: Bearer <token>` on all outgoing request headers.
* **[components/layout/ProtectedRoute.tsx](file:///C:/Users/subod/.gemini/antigravity/scratch/ai-data-analyst/frontend/src/components/layout/ProtectedRoute.tsx)**: Created a route guardian layout ensuring unauthorized attempts to read `/dashboard/*` fallback to the landing page.
* **[pages/LandingPage.tsx](file:///C:/Users/subod/.gemini/antigravity/scratch/ai-data-analyst/frontend/src/pages/LandingPage.tsx)**: Intercepted Core CTAs to open an authentication modal overlay detailing the security parameters of private dataset storage.

---

## 🌐 Production Deployment
For steps on how to containerize this project using Docker and deploy to production-grade serverless platforms (like Vercel, Render, and Neon PostgreSQL), see the [deployment_guide.md](./deployment_guide.md).

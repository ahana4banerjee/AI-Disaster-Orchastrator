# AI Disaster Orchestrator

An AI-powered decision-support system that predicts disaster severity, estimates damage, and recommends optimal emergency resource allocation through an interactive dashboard.

---

## Overview

AI Disaster Orchestrator is a full-stack intelligent system designed to assist disaster management teams in making fast, data-driven decisions.

The system:

- Predicts disaster severity using Machine Learning
- Estimates potential economic damage
- Recommends emergency resources (ambulances, rescue teams, relief camps)
- Logs historical disaster predictions
- Provides analytics dashboard with visualization
- Supports scenario-based decision analysis

---

## Core Features

### 🔹 Disaster Prediction Engine
- Random Forest classifier for severity prediction
- Synthetic training dataset (extensible to real datasets)
- Severity levels: Low, Medium, High
- Real-time prediction via REST API

### 🔹 Damage Estimation
- Damage estimation model based on:
  - Magnitude
  - Population density
  - Rainfall
  - Infrastructure score

### 🔹 Resource Allocation Engine
- Dynamic allocation logic
- Population-based scaling
- Severity-aware resource recommendation

### 🔹 Analytics Dashboard
- Severity distribution chart
- Historical disaster logs
- Color-coded risk indicators
- Interactive prediction form

---

## Architecture


```text
Frontend (Next.js + TypeScript + Tailwind)
↓
Backend API (FastAPI)
↓
ML Prediction Engine (Scikit-learn)
↓
Resource Allocation Engine
↓
SQLite Database (SQLAlchemy)
```


---

## Tech Stack

### Backend
- FastAPI
- SQLAlchemy
- SQLite
- Scikit-learn
- Pandas
- Joblib

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Axios
- Recharts

---

## Project Structure

```text
ai-disaster-orchestrator/

backend/
│
├── main.py
├── database.py
├── models.py
├── schemas.py
├── disaster_engine.py
├── ml_model.py
├── train_model.py
├── disaster_model.pkl
└── requirements.txt

frontend/
│
├── app/
├── components/
├── lib/
└── package.json
```


---

## Setup Instructions

### 1️⃣ Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

Train model:

```bash
python train_model.py
```

Run backend:

```bash
uvicorn main:app --reload
```

Backend runs at: http://127.0.0.1:8000

Swagger docs: http://127.0.0.1:8000/docs

### 2️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

---

## 📊 API Endpoints

**POST /predict**

Predicts disaster severity and resource allocation.

Input:

```text
{
  "disaster_type": "flood",
  "magnitude": 7.5,
  "population_density": 5000,
  "rainfall": 300,
  "infrastructure_score": 4
}
```

Output:

```text
{
  "severity_level": "High",
  "estimated_damage": 900000,
  "recommended_resources": {
    "ambulances": 15,
    "rescue_teams": 10,
    "relief_camps": 5
  }
}
```

**GET /history**

Returns historical disaster predictions.

---

## Future Enhancements (Planned)

- Severity confidence score
- Regression-based damage model
- Multi-disaster comparison
- Simulation mode (time progression)
- Geo-location risk multiplier
- KPI analytics dashboard
- Real-world disaster dataset integration
- Deployment to cloud

---

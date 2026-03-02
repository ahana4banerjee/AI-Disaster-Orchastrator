from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models
from schemas import DisasterInput, DisasterResponse, ResourceRecommendation
from ml_model import predict_severity
from disaster_engine import allocate_resources

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
models.Base.metadata.create_all(bind=engine)

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "AI Disaster Orchestrator Backend Running"}


@app.post("/predict", response_model=DisasterResponse)
def predict_disaster(data: DisasterInput, db: Session = Depends(get_db)):

    # 1️⃣ ML Prediction
    severity = predict_severity(
        data.magnitude,
        data.population_density,
        data.rainfall,
        data.infrastructure_score
    )

    # 2️⃣ Damage Estimation (Simple formula)
    estimated_damage = (
        data.magnitude * 100000 +
        data.population_density * 10 +
        data.rainfall * 500 -
        data.infrastructure_score * 20000
    )

    # 3️⃣ Resource Allocation
    resources = allocate_resources(severity, data.population_density)

    # 4️⃣ Log into Database
    log_entry = models.DisasterLog(
        disaster_type=data.disaster_type,
        magnitude=data.magnitude,
        population_density=data.population_density,
        rainfall=data.rainfall,
        infrastructure_score=data.infrastructure_score,
        severity_level=severity,
        estimated_damage=estimated_damage,
        ambulances=resources["ambulances"],
        rescue_teams=resources["rescue_teams"],
        relief_camps=resources["relief_camps"],
    )

    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    return {
        "severity_level": severity,
        "estimated_damage": estimated_damage,
        "recommended_resources": resources
    }

@app.get("/history")
def get_history(db: Session = Depends(get_db)):
    logs = db.query(models.DisasterLog).all()

    return [
        {
            "id": log.id,
            "disaster_type": log.disaster_type,
            "severity_level": log.severity_level,
            "estimated_damage": log.estimated_damage,
            "ambulances": log.ambulances,
            "rescue_teams": log.rescue_teams,
            "relief_camps": log.relief_camps
        }
        for log in logs
    ]
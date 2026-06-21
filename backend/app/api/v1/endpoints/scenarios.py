from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List
from bson import ObjectId
from datetime import datetime
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_admin
from app.models.schemas.scenario import ScenarioCreate, ScenarioResponse, ScenarioCompareResponse
from app.services.data_pipeline import DisasterDataPipeline

router = APIRouter()

async def predict_scenario_metrics(scenario: dict) -> dict:
    mag = scenario.get("magnitude", 0.0)
    dtype = scenario.get("disasterType", "Storm").lower()
    
    # Heuristic based prediction engine
    expected_deaths = 5
    expected_affected = 1000
    expected_damage = 50000.0
    
    if "storm" in dtype:
        expected_deaths = int(mag * 0.3)
        expected_affected = int(mag * 2000)
        expected_damage = mag * 50000.0
    elif "flood" in dtype:
        expected_deaths = int(mag * 0.5)
        expected_affected = int(mag * 3000)
        expected_damage = mag * 30000.0
    elif "earthquake" in dtype:
        expected_deaths = int(mag * 10)
        expected_affected = int(mag * 500)
        expected_damage = mag * 100000.0
    else:
        expected_deaths = int(mag * 0.2)
        expected_affected = int(mag * 1000)
        expected_damage = mag * 20000.0

    expected_deaths = max(1, expected_deaths)
    expected_affected = max(10, expected_affected)
    expected_damage = max(1000.0, expected_damage)

    pipeline = DisasterDataPipeline()
    damage_thousands = expected_damage / 1000.0
    _, severity_class = pipeline.calculate_severity(expected_deaths, expected_affected, damage_thousands)

    required_ambulances = int(expected_deaths * 0.5 + expected_affected * 0.01)
    required_ambulances = max(5, required_ambulances)

    return {
        "predictedSeverity": severity_class,
        "predictedDeaths": expected_deaths,
        "predictedDamageUSD": expected_damage,
        "requiredAmbulances": required_ambulances
    }

@router.post("/", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    payload: ScenarioCreate,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    doc = payload.model_dump()
    doc["createdBy"] = str(current_admin["_id"])
    doc["createdAt"] = datetime.utcnow()
    
    try:
        result = await db.scenarios.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database write error: {str(e)}")

@router.get("/compare", response_model=List[ScenarioCompareResponse])
async def compare_scenarios(
    scenarioIds: str = Query(..., description="Comma-separated Scenario ObjectId strings"),
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    ids_str = [id_str.strip() for id_str in scenarioIds.split(",") if id_str.strip()]
    if not ids_str:
        raise HTTPException(status_code=400, detail="Invalid scenarioIds query parameter")
    
    obj_ids = []
    for id_str in ids_str:
        try:
            obj_ids.append(ObjectId(id_str))
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid Scenario ObjectId: {id_str}")
            
    try:
        cursor = db.scenarios.find({"_id": {"$in": obj_ids}})
        scenarios = await cursor.to_list(length=len(obj_ids))
        
        if not scenarios:
            raise HTTPException(status_code=404, detail="No matching scenarios found")
            
        results = []
        for sc in scenarios:
            predictions = await predict_scenario_metrics(sc)
            results.append({
                "id": str(sc["_id"]),
                "name": sc["name"],
                "predictedSeverity": predictions["predictedSeverity"],
                "predictedDeaths": predictions["predictedDeaths"],
                "predictedDamageUSD": predictions["predictedDamageUSD"],
                "requiredAmbulances": predictions["requiredAmbulances"]
            })
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import httpx
from app.core.config import settings
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_admin
from app.models.schemas.disaster import DisasterRecordCreate, DisasterRecordResponse, PaginatedDisasterRecordsResponse
from pydantic import BaseModel, Field, BeforeValidator
from typing_extensions import Annotated
from app.services.data_pipeline import DisasterDataPipeline

router = APIRouter()

PyObjectId = Annotated[str, BeforeValidator(str)]

class AuditLogResponse(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    adminUserId: PyObjectId
    action: str
    details: str
    timestamp: datetime

    class Config:
        populate_by_name = True

async def log_admin_action(db, admin_id: ObjectId, action: str, details: str):
    if db is not None:
        await db.audit_logs.insert_one({
            "adminUserId": admin_id,
            "action": action,
            "details": details,
            "timestamp": datetime.utcnow()
        })

@router.get("/records", response_model=PaginatedDisasterRecordsResponse)
async def get_records(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    country: Optional[str] = None,
    disasterType: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    query = {}
    if country:
        query["country"] = {"$regex": f"^{country.strip()}$", "$options": "i"}
    if disasterType:
        query["disasterType"] = {"$regex": f"^{disasterType.strip()}$", "$options": "i"}

    try:
        total_count = await db.disaster_records.count_documents(query)
        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 0
        
        offset = (page - 1) * limit
        cursor = db.disaster_records.find(query).sort("startDate", -1).skip(offset).limit(limit)
        records = await cursor.to_list(length=limit)

        return {
            "totalCount": total_count,
            "page": page,
            "totalPages": total_pages,
            "data": records
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

@router.post("/records", response_model=DisasterRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_record(
    payload: DisasterRecordCreate,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    # Check for duplicate disNo
    existing_record = await db.disaster_records.find_one({"disNo": payload.disNo})
    if existing_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Disaster record with code {payload.disNo} already exists"
        )

    # Re-calculate severity using pipeline heuristics to ensure consistency
    pipeline = DisasterDataPipeline()
    deaths_calc = payload.impact.deaths or 0
    affected_calc = payload.impact.totalAffected or 0
    # Damage in pipeline is in thousands for score calculation
    damage_thousands = (payload.impact.economicDamageUSD or 0) / 1000.0
    
    severity_score, severity_class = pipeline.calculate_severity(deaths_calc, affected_calc, damage_thousands)
    
    doc = payload.model_dump(by_alias=True)
    doc["severityScore"] = severity_score
    doc["severityClass"] = severity_class
    doc["createdAt"] = datetime.utcnow()
    doc["updatedAt"] = datetime.utcnow()

    # Convert GeoJSON models back to standard nested Dict if Pydantic model parsed it
    if "geoJSON" in doc and hasattr(doc["geoJSON"], "model_dump"):
        doc["geoJSON"] = doc["geoJSON"].model_dump()

    try:
        result = await db.disaster_records.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        # Log action
        await log_admin_action(
            db=db,
            admin_id=current_admin["_id"],
            action="CREATE_RECORD",
            details=f"Created disaster record: {payload.disNo}"
        )
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database write error: {str(e)}")

@router.delete("/records/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid MongoDB ObjectId hex string")

    try:
        record = await db.disaster_records.find_one({"_id": obj_id})
        if not record:
            raise HTTPException(status_code=404, detail=f"Disaster record with ID {id} not found")

        await db.disaster_records.delete_one({"_id": obj_id})
        
        # Log action
        await log_admin_action(
            db=db,
            admin_id=current_admin["_id"],
            action="DELETE_RECORD",
            details=f"Deleted disaster record: {record.get('disNo')} (ID: {id})"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database execution error: {str(e)}")

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = Query(default=50, ge=1, le=100),
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    try:
        cursor = db.audit_logs.find({}).sort("timestamp", -1).limit(limit)
        logs = await cursor.to_list(length=limit)
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

class ScenarioCompareRequest(BaseModel):
    scenarioIds: List[str]

@router.post("/scenarios/compare")
async def compare_scenarios_batch(
    payload: ScenarioCompareRequest,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    if not payload.scenarioIds:
        raise HTTPException(status_code=400, detail="scenarioIds list cannot be empty")
    if len(payload.scenarioIds) > 4:
        raise HTTPException(status_code=400, detail="Cannot compare more than 4 scenarios at once")

    obj_ids = []
    for id_str in payload.scenarioIds:
        try:
            obj_ids.append(ObjectId(id_str))
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid Scenario ObjectId: {id_str}")

    try:
        cursor = db.scenarios.find({"_id": {"$in": obj_ids}})
        scenarios = await cursor.to_list(length=len(obj_ids))
        if not scenarios:
            raise HTTPException(status_code=404, detail="No matching scenarios found")

        # Map by id to preserve payload order
        sc_map = {str(sc["_id"]): sc for sc in scenarios}
        results = []

        async with httpx.AsyncClient() as client:
            for s_id in payload.scenarioIds:
                sc = sc_map.get(s_id)
                if not sc:
                    continue

                # Run predictions via ML service
                predict_payload = {
                    "disasterType": sc.get("disasterType", "Storm"),
                    "disasterSubtype": sc.get("disasterSubtype", ""),
                    "country": sc.get("country", ""),
                    "region": sc.get("region", ""),
                    "magnitude": sc.get("magnitude", 0.0),
                    "startMonth": 6
                }
                
                predictions = {}
                try:
                    p_resp = await client.post(f"{settings.ML_SERVICE_URL}/predict/", json=predict_payload, timeout=5.0)
                    if p_resp.status_code == 200:
                        predictions = p_resp.json()
                except Exception:
                    pass

                # Run similarity via ML service
                similarity_payload = {
                    "disasterType": sc.get("disasterType", "Storm"),
                    "country": sc.get("country", ""),
                    "region": sc.get("region", ""),
                    "magnitude": sc.get("magnitude", 0.0)
                }
                
                analogs = []
                try:
                    s_resp = await client.post(f"{settings.ML_SERVICE_URL}/similarity/", json=similarity_payload, timeout=5.0)
                    if s_resp.status_code == 200:
                        analogs = s_resp.json()
                except Exception:
                    pass

                # Handle predictions default / fallbacks if predictions is empty
                if not predictions:
                    # Heuristic calculation
                    mag = sc.get("magnitude", 0.0)
                    dtype = sc.get("disasterType", "Storm").lower()
                    
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

                    predictions = {
                        "severityClass": "Moderate",
                        "impactMetrics": {
                            "expectedDeaths": expected_deaths,
                            "expectedTotalAffected": expected_affected,
                            "expectedDamageUSD": expected_damage
                        },
                        "confidenceScore": 0.50,
                        "riskIndex": 40.0
                    }

                # Resource requirements calculation
                expected_deaths = predictions["impactMetrics"]["expectedDeaths"]
                expected_affected = predictions["impactMetrics"]["expectedTotalAffected"]
                
                required_ambulances = max(5, int(expected_deaths * 0.5 + expected_affected * 0.01))
                required_generators = max(10, int(expected_affected * 0.002))
                required_water_liters = max(1000, int(expected_affected * 3))

                results.append({
                  "id": str(sc["_id"]),
                  "name": sc["name"],
                  "disasterType": sc["disasterType"],
                  "disasterSubtype": sc.get("disasterSubtype", ""),
                  "magnitude": sc["magnitude"],
                  "magnitudeScale": sc.get("magnitudeScale", ""),
                  "country": sc.get("country", ""),
                  "region": sc.get("region", ""),
                  "predictions": predictions,
                  "requiredResources": {
                    "ambulances": required_ambulances,
                    "generators": required_generators,
                    "waterLiters": required_water_liters
                  },
                  "historicalAnalogs": analogs
                })
                
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database execution error: {str(e)}")

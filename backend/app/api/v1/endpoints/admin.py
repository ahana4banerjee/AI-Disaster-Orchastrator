from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.core.database import db_helper
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

async def log_admin_action(admin_id: ObjectId, action: str, details: str):
    db = db_helper.db
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
    current_admin: dict = Depends(get_current_admin)
):
    db = db_helper.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")

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
async def create_record(payload: DisasterRecordCreate, current_admin: dict = Depends(get_current_admin)):
    db = db_helper.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")

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
            admin_id=current_admin["_id"],
            action="CREATE_RECORD",
            details=f"Created disaster record: {payload.disNo}"
        )
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database write error: {str(e)}")

@router.delete("/records/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(id: str, current_admin: dict = Depends(get_current_admin)):
    db = db_helper.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")

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
    current_admin: dict = Depends(get_current_admin)
):
    db = db_helper.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")

    try:
        cursor = db.audit_logs.find({}).sort("timestamp", -1).limit(limit)
        logs = await cursor.to_list(length=limit)
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

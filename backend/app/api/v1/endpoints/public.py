from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.schemas.disaster import PaginatedDisasterRecordsResponse

router = APIRouter()

@router.get("/disasters", response_model=PaginatedDisasterRecordsResponse)
async def get_public_disasters(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),  # Limit restricted to 50 items max
    country: Optional[str] = None,
    year: Optional[int] = Query(default=None, ge=1900, le=2100),
    disasterType: Optional[str] = None,
    db = Depends(get_db)
):
    """
    Retrieve historical disaster records (non-authenticated public access).
    Supports pagination and filtering by country, year, and disaster type.
    """
    query = {}
    
    if country:
        query["country"] = {"$regex": f"^{country.strip()}$", "$options": "i"}
        
    if disasterType:
        query["disasterType"] = {"$regex": f"^{disasterType.strip()}$", "$options": "i"}
        
    if year:
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        query["startDate"] = {"$gte": start_date, "$lte": end_date}

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

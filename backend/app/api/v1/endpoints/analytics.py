from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.core.database import db_helper
from app.models.schemas.analytics import RegionalRiskClusterResponse

router = APIRouter()

@router.get("/regional-risk", response_model=List[RegionalRiskClusterResponse])
async def get_all_regional_risks():
    """
    Retrieve risk clustering profiles for all subregions.
    """
    db = db_helper.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    
    try:
        # Fetch all regional risk cluster documents from MongoDB
        cursor = db.regional_risk_clusters.find({})
        results = await cursor.to_list(length=100)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

@router.get("/regional-risk/{subregion}", response_model=RegionalRiskClusterResponse)
async def get_regional_risk_by_subregion(subregion: str):
    """
    Retrieve risk clustering profile for a specific subregion.
    """
    db = db_helper.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    
    try:
        # Case-insensitive lookup using regex index or case-insensitive exact matching
        doc = await db.regional_risk_clusters.find_one({"subregion": subregion})
        if not doc:
            doc = await db.regional_risk_clusters.find_one(
                {"subregion": {"$regex": f"^{subregion}$", "$options": "i"}}
            )
            
        if not doc:
            raise HTTPException(
                status_code=404, 
                detail=f"Regional risk cluster data not found for subregion '{subregion}'"
            )
        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

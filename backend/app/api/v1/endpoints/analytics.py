from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.core.database import get_db
from app.models.schemas.analytics import RegionalRiskClusterResponse, DashboardKPIResponse, TrendResponse, SpatialResponse
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

@router.get("/dashboard", response_model=DashboardKPIResponse)
async def get_dashboard_kpis(
    country: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Retrieve high-level dashboard KPIs aggregated from disaster records.
    Supports filtering by country.
    """
    match_stage = {}
    if country:
        match_stage["country"] = {"$regex": f"^{country.strip()}$", "$options": "i"}
        
    pipeline = []
    if match_stage:
        pipeline.append({"$match": match_stage})
        
    pipeline.append({
        "$group": {
            "_id": None,
            "totalEvents": {"$sum": 1},
            "averageDeaths": {"$avg": "$impact.deaths"},
            "averageDamageUSD": {"$avg": "$impact.economicDamageUSD"},
            "highRiskEvents": {
                "$sum": {
                    "$cond": [
                        {"$in": ["$severityClass", ["High", "Extreme"]]},
                        1,
                        0
                    ]
                }
            }
        }
    })
    
    try:
        cursor = db.disaster_records.aggregate(pipeline)
        results = await cursor.to_list(length=1)
        
        if not results:
            return {
                "totalEvents": 0,
                "highRiskEvents": 0,
                "averageDeaths": 0.0,
                "averageDamageUSD": 0.0
            }
            
        res = results[0]
        return {
            "totalEvents": res.get("totalEvents", 0),
            "highRiskEvents": res.get("highRiskEvents", 0),
            "averageDeaths": round(res.get("averageDeaths") or 0.0, 1),
            "averageDamageUSD": round(res.get("averageDamageUSD") or 0.0, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database aggregation error: {str(e)}")

@router.get("/trends", response_model=List[TrendResponse])
async def get_year_wise_trends(
    disasterType: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Retrieve year-wise disaster trends.
    Supports filtering by disasterType.
    """
    match_stage = {"startDate": {"$type": "date"}}
    if disasterType:
        match_stage["disasterType"] = {"$regex": f"^{disasterType.strip()}$", "$options": "i"}
        
    pipeline = [
        {"$match": match_stage},
        {
            "$group": {
                "_id": {"$year": "$startDate"},
                "eventCount": {"$sum": 1},
                "averageDamageUSD": {"$avg": "$impact.economicDamageUSD"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "year": "$_id",
                "eventCount": 1,
                "averageDamageUSD": 1
            }
        },
        {"$sort": {"year": 1}}
    ]
    
    try:
        cursor = db.disaster_records.aggregate(pipeline)
        results = await cursor.to_list(length=100)
        
        trends = []
        for r in results:
            trends.append({
                "year": r["year"],
                "eventCount": r["eventCount"],
                "averageDamageUSD": round(r.get("averageDamageUSD") or 0.0, 2)
            })
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database aggregation error: {str(e)}")

@router.get("/spatial", response_model=List[SpatialResponse])
async def get_spatial_lookups(
    longitude: float = Query(..., description="Query point longitude"),
    latitude: float = Query(..., description="Query point latitude"),
    radiusKm: float = Query(default=500.0, description="Search radius in kilometers"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Perform spatial geospatial lookups on disaster records within a radius.
    """
    if not (-180.0 <= longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
    if not (-90.0 <= latitude <= 90.0):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    if radiusKm <= 0:
        raise HTTPException(status_code=400, detail="radiusKm must be positive")

    pipeline = [
        {
            "$geoNear": {
                "near": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                },
                "distanceField": "distanceKm",
                "maxDistance": radiusKm * 1000.0,
                "distanceMultiplier": 0.001,
                "spherical": True
            }
        },
        {
            "$project": {
                "_id": 0,
                "disNo": 1,
                "disasterType": 1,
                "distanceKm": 1,
                "deaths": "$impact.deaths"
            }
        }
    ]
    
    try:
        cursor = db.disaster_records.aggregate(pipeline)
        results = await cursor.to_list(length=100)
        
        lookups = []
        for r in results:
            lookups.append({
                "disNo": r["disNo"],
                "disasterType": r["disasterType"],
                "distanceKm": round(r["distanceKm"], 2),
                "deaths": r.get("deaths") or 0
            })
        return lookups
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database aggregation error: {str(e)}")

@router.get("/regional-risk", response_model=List[RegionalRiskClusterResponse])
async def get_all_regional_risks(db = Depends(get_db)):
    """
    Retrieve risk clustering profiles for all subregions.
    """
    try:
        # Fetch all regional risk cluster documents from MongoDB
        cursor = db.regional_risk_clusters.find({})
        results = await cursor.to_list(length=100)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

@router.get("/regional-risk/{subregion}", response_model=RegionalRiskClusterResponse)
async def get_regional_risk_by_subregion(subregion: str, db = Depends(get_db)):
    """
    Retrieve risk clustering profile for a specific subregion.
    """
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

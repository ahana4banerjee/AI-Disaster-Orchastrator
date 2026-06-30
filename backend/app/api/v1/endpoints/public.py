from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.schemas.disaster import PaginatedDisasterRecordsResponse, RiskCheckerResponse, ThreatProfile

from app.models.schemas.analytics import SpatialResponse

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


@router.get("/disasters/nearby", response_model=List[SpatialResponse])
async def get_public_nearby_disasters(
    longitude: float = Query(..., description="Query point longitude", ge=-180.0, le=180.0),
    latitude: float = Query(..., description="Query point latitude", ge=-90.0, le=90.0),
    radiusKm: float = Query(default=500.0, description="Search radius in kilometers", ge=1.0, le=2000.0),
    limit: int = Query(default=10, description="Maximum matching records to return", ge=1, le=50),
    db = Depends(get_db)
):
    """
    Geospatial nearby disaster search (non-authenticated public access).
    Executes $geoNear pipeline to locate disasters within radiusKm of input coordinate.
    """
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
        },
        {
            "$limit": limit
        }
    ]

    try:
        cursor = db.disaster_records.aggregate(pipeline)
        results = await cursor.to_list(length=limit)
        
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


@router.get("/risk-checker", response_model=RiskCheckerResponse)
async def get_public_risk_checker(
    country: str = Query(..., description="Target country"),
    region: Optional[str] = Query(default=None, description="Subnational region or state"),
    db = Depends(get_db)
):
    """
    Public risk checker score generator.
    Aggregates threat incident counts, calculates risk score, and maps top threat vectors.
    """
    if not country.strip():
        raise HTTPException(status_code=400, detail="Country parameter cannot be empty")

    query = {"country": {"$regex": f"^{country.strip()}$", "$options": "i"}}
    if region and region.strip():
        query["$or"] = [
            {"region": {"$regex": region.strip(), "$options": "i"}},
            {"location": {"$regex": region.strip(), "$options": "i"}}
        ]

    try:
        cursor = db.disaster_records.find(query)
        records = await cursor.to_list(length=1000)

        if not records:
            return {
                "country": country,
                "region": region,
                "riskScore": 0.0,
                "riskLevel": "Low",
                "totalEvents": 0,
                "totalDeaths": 0,
                "averageDamageUSD": 0.0,
                "topThreats": []
            }

        total_events = len(records)
        total_deaths = 0
        total_damage = 0.0
        damage_count = 0
        
        threat_counts = {}
        total_severity_weight = 0
        
        for r in records:
            total_deaths += r.get("impact", {}).get("deaths") or 0
            
            damage = r.get("impact", {}).get("economicDamageUSD")
            if damage is not None:
                total_damage += damage
                damage_count += 1
                
            dtype = r.get("disasterType") or "Unknown"
            threat_counts[dtype] = threat_counts.get(dtype, 0) + 1
            
            sev = (r.get("severityClass") or "").lower().strip()
            if sev == "low":
                total_severity_weight += 15
            elif sev in ("medium", "moderate"):
                total_severity_weight += 40
            elif sev == "high":
                total_severity_weight += 70
            elif sev in ("extreme", "critical"):
                total_severity_weight += 95
            else:
                total_severity_weight += 30

        average_damage = total_damage / damage_count if damage_count > 0 else 0.0
        
        risk_score = round(total_severity_weight / total_events, 1)
        if risk_score < 25.0:
            risk_level = "Low"
        elif risk_score < 50.0:
            risk_level = "Moderate"
        elif risk_score < 75.0:
            risk_level = "High"
        else:
            risk_level = "Extreme"

        top_threats = []
        for dtype, count in threat_counts.items():
            top_threats.append({
                "disasterType": dtype,
                "count": count,
                "percentage": round((count / total_events) * 100.0, 1)
            })
        top_threats.sort(key=lambda x: x["count"], reverse=True)
        top_threats = top_threats[:3]

        return {
            "country": country,
            "region": region,
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "totalEvents": total_events,
            "totalDeaths": total_deaths,
            "averageDamageUSD": round(average_damage, 2),
            "topThreats": top_threats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database aggregation query error: {str(e)}")



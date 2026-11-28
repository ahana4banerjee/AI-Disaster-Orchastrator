from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.models.schemas.analytics import RegionalRiskClusterResponse, DashboardKPIResponse, TrendResponse, SpatialResponse
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


async def _get_date_cutoff(db, days: int) -> datetime:
    anchor = datetime.now(timezone.utc)
    try:
        latest = await db.disaster_records.find_one(
            {"startDate": {"$type": "date"}},
            sort=[("startDate", -1)],
        )
        if latest and isinstance(latest.get("startDate"), datetime):
            anchor = latest["startDate"]
            if anchor.tzinfo is None:
                anchor = anchor.replace(tzinfo=timezone.utc)
    except (TypeError, Exception):
        pass
    return anchor - timedelta(days=days)


@router.get("/dashboard", response_model=DashboardKPIResponse)
async def get_dashboard_kpis(
    country: Optional[str] = None,
    days: Optional[int] = Query(default=None, ge=1, le=10000, description="Filter records within last N days from latest dataset record"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Retrieve high-level dashboard KPIs aggregated from disaster records.
    Supports filtering by country and days window.
    """
    match_stage = {}
    if country:
        match_stage["country"] = {"$regex": f"^{country.strip()}$", "$options": "i"}
    if days is not None:
        cutoff = await _get_date_cutoff(db, days)
        match_stage["startDate"] = {"$gte": cutoff}
        
    pipeline = []
    if match_stage:
        pipeline.append({"$match": match_stage})
        
    effective_damage_expr = {
        "$cond": [
            {"$gt": ["$impact.economicDamageUSD", 0]},
            "$impact.economicDamageUSD",
            {
                "$add": [
                    {"$multiply": [{"$ifNull": ["$impact.deaths", 0]}, 50000]},
                    {"$multiply": [{"$ifNull": ["$impact.totalAffected", 0]}, 120]},
                ]
            },
        ]
    }

    pipeline.append({
        "$group": {
            "_id": None,
            "totalEvents": {"$sum": 1},
            "averageDeaths": {"$avg": "$impact.deaths"},
            "averageDamageUSD": {"$avg": effective_damage_expr},
            "maxDamageUSD": {"$max": effective_damage_expr},
            "totalDamageUSD": {"$sum": effective_damage_expr},
            "highRiskEvents": {
                "$sum": {
                    "$cond": [
                        {"$in": ["$severityClass", ["High", "Extreme"]]},
                        1,
                        0
                    ]
                }
            },
            "lowCount": {"$sum": {"$cond": [{"$eq": ["$severityClass", "Low"]}, 1, 0]}},
            "mediumCount": {"$sum": {"$cond": [{"$eq": ["$severityClass", "Medium"]}, 1, 0]}},
            "highCount": {"$sum": {"$cond": [{"$eq": ["$severityClass", "High"]}, 1, 0]}},
            "extremeCount": {"$sum": {"$cond": [{"$eq": ["$severityClass", "Extreme"]}, 1, 0]}},
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
                "averageDamageUSD": 0.0,
                "maxDamageUSD": 0.0,
                "totalDamageUSD": 0.0,
                "severityDistribution": [
                    {"name": "Low", "value": 0, "color": "#10B981"},
                    {"name": "Moderate", "value": 0, "color": "#F59E0B"},
                    {"name": "High", "value": 0, "color": "#F97316"},
                    {"name": "Extreme", "value": 0, "color": "#DC2626"},
                ],
            }
            
        res = results[0]
        return {
            "totalEvents": res.get("totalEvents", 0),
            "highRiskEvents": res.get("highRiskEvents", 0),
            "averageDeaths": round(res.get("averageDeaths") or 0.0, 1),
            "averageDamageUSD": round(res.get("averageDamageUSD") or 0.0, 2),
            "maxDamageUSD": round(res.get("maxDamageUSD") or 0.0, 2),
            "totalDamageUSD": round(res.get("totalDamageUSD") or 0.0, 2),
            "severityDistribution": [
                {"name": "Low", "value": res.get("lowCount", 0), "color": "#10B981"},
                {"name": "Moderate", "value": res.get("mediumCount", 0), "color": "#F59E0B"},
                {"name": "High", "value": res.get("highCount", 0), "color": "#F97316"},
                {"name": "Extreme", "value": res.get("extremeCount", 0), "color": "#DC2626"},
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database aggregation error: {str(e)}")

@router.get("/trends", response_model=List[TrendResponse])
async def get_year_wise_trends(
    disasterType: Optional[str] = None,
    days: Optional[int] = Query(default=None, ge=1, le=10000),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Retrieve disaster trends (daily/monthly when days <= 365, year-wise otherwise).
    Supports filtering by disasterType and days window.
    """
    match_stage = {"startDate": {"$type": "date"}}
    if disasterType:
        match_stage["disasterType"] = {"$regex": f"^{disasterType.strip()}$", "$options": "i"}
    if days is not None:
        cutoff = await _get_date_cutoff(db, days)
        match_stage["startDate"] = {"$type": "date", "$gte": cutoff}

    if days is not None and days <= 30:
        group_id = {
            "year": {"$year": "$startDate"},
            "label": {"$dateToString": {"format": "%Y-%m-%d", "date": "$startDate"}},
        }
        sort_stage = {"_id.label": 1}
    elif days is not None and days <= 365:
        group_id = {
            "year": {"$year": "$startDate"},
            "label": {"$dateToString": {"format": "%Y-%m", "date": "$startDate"}},
        }
        sort_stage = {"_id.label": 1}
    else:
        group_id = {"$year": "$startDate"}
        sort_stage = {"year": 1}

    effective_damage_expr = {
        "$cond": [
            {"$gt": ["$impact.economicDamageUSD", 0]},
            "$impact.economicDamageUSD",
            {
                "$add": [
                    {"$multiply": [{"$ifNull": ["$impact.deaths", 0]}, 50000]},
                    {"$multiply": [{"$ifNull": ["$impact.totalAffected", 0]}, 120]},
                ]
            },
        ]
    }

    if isinstance(group_id, dict):
        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": group_id,
                    "eventCount": {"$sum": 1},
                    "averageDamageUSD": {"$avg": effective_damage_expr},
                }
            },
            {"$sort": sort_stage},
            {
                "$project": {
                    "_id": 0,
                    "year": "$_id.year",
                    "label": "$_id.label",
                    "eventCount": 1,
                    "averageDamageUSD": 1,
                }
            },
        ]
    else:
        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": group_id,
                    "eventCount": {"$sum": 1},
                    "averageDamageUSD": {"$avg": effective_damage_expr},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "year": "$_id",
                    "eventCount": 1,
                    "averageDamageUSD": 1,
                }
            },
            {"$sort": sort_stage},
        ]
    
    try:
        cursor = db.disaster_records.aggregate(pipeline)
        results = await cursor.to_list(length=200)
        
        trends = []
        for r in results:
            trends.append({
                "year": r["year"],
                "label": r.get("label") or str(r["year"]),
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


@router.get("/risk-hotspots")
async def get_risk_hotspots(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Aggregates real geospatial hotspots by country/place from EM-DAT disaster_records
    joined with K-Means regional_risk_clusters for Risk Intelligence mapping.
    """
    try:
        cluster_docs = await db.regional_risk_clusters.find({}).to_list(length=100)
        cluster_by_subregion = {
            (c.get("subregion") or "").lower().strip(): c for c in cluster_docs
        }

        pipeline = [
            {"$match": {"geoJSON.coordinates": {"$type": "array"}}},
            {
                "$group": {
                    "_id": {"country": "$country", "subregion": "$subregion", "disasterType": "$disasterType"},
                    "typeCount": {"$sum": 1},
                    "avgLat": {"$avg": {"$arrayElemAt": ["$geoJSON.coordinates", 1]}},
                    "avgLon": {"$avg": {"$arrayElemAt": ["$geoJSON.coordinates", 0]}},
                    "avgMag": {"$avg": "$magnitude"},
                    "maxMag": {"$max": "$magnitude"},
                    "avgDeaths": {"$avg": "$impact.deaths"},
                    "highCount": {
                        "$sum": {
                            "$cond": [{"$in": ["$severityClass", ["High", "Extreme"]]}, 1, 0]
                        }
                    },
                }
            },
            {"$sort": {"typeCount": -1}},
            {
                "$group": {
                    "_id": "$_id.country",
                    "subregion": {"$first": "$_id.subregion"},
                    "predictedDisasterType": {"$first": "$_id.disasterType"},
                    "eventCount": {"$sum": "$typeCount"},
                    "latitude": {"$avg": "$avgLat"},
                    "longitude": {"$avg": "$avgLon"},
                    "avgMag": {"$avg": "$avgMag"},
                    "maxMag": {"$max": "$maxMag"},
                    "avgDeaths": {"$avg": "$avgDeaths"},
                    "highEvents": {"$sum": "$highCount"},
                }
            },
            {"$sort": {"eventCount": -1}},
            {"$limit": 250},
        ]

        agg_docs = await db.disaster_records.aggregate(pipeline).to_list(length=250)

        hotspots = []
        for doc in agg_docs:
            lat = doc.get("latitude")
            lon = doc.get("longitude")
            if lat is None or lon is None:
                continue

            subregion = doc.get("subregion") or "Global"
            cluster_info = cluster_by_subregion.get(subregion.lower().strip(), {})
            raw_tier = (cluster_info.get("riskTier") or "").strip()

            event_count = int(doc.get("eventCount") or 0)
            high_ratio = (doc.get("highEvents") or 0) / max(1, event_count)

            # Map into Low, Medium, High risk levels cleanly
            if event_count >= 120 or (raw_tier in ("Extreme", "High") and high_ratio >= 0.35):
                risk_level = "High"
            elif event_count >= 30 or high_ratio >= 0.15:
                risk_level = "Medium"
            else:
                risk_level = "Low"

            mag_val = doc.get("avgMag") or doc.get("maxMag") or cluster_info.get("maxMagnitude")
            predicted_mag = round(float(mag_val), 1) if mag_val is not None else None

            hotspots.append({
                "place": doc.get("_id") or "Unknown",
                "subregion": subregion,
                "latitude": round(float(lat), 4),
                "longitude": round(float(lon), 4),
                "predictedDisasterType": doc.get("predictedDisasterType") or "Storm",
                "predictedMagnitude": predicted_mag,
                "eventCount": event_count,
                "riskLevel": risk_level,
                "clusterId": int(cluster_info.get("clusterId", 0)),
            })

        return {
            "totalHotspots": len(hotspots),
            "hotspots": hotspots,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database aggregation error: {str(e)}")

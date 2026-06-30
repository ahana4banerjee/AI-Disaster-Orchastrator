from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.schemas.disaster import PaginatedDisasterRecordsResponse, RiskCheckerResponse, ThreatProfile, AwarenessResponse

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


DEFAULT_AWARENESS_TEMPLATES = [
    {
        "hazard": "flood",
        "description": "Rapid accumulation of water in normally dry landmass areas, triggered by intense rainfall, storms, or dam failures.",
        "warningSigns": [
            "Rapidly rising water levels in local waterways",
            "Heavy rainfall persisting over multiple hours",
            "Saturated ground conditions with localized pooling"
        ],
        "before": [
            "Build an emergency kit containing non-perishable foods and water supplies",
            "Identify elevated evacuation routes and local emergency shelters",
            "Secure household appliances and document physical assets"
        ],
        "during": [
            "Evacuate immediately if directed by regional emergency services",
            "Avoid walking or driving through moving water currents",
            "Move to higher levels or attic crawlspaces if trapped inside structures"
        ],
        "after": [
            "Boil all drinking water until local sanitation declares lines safe",
            "Avoid electrical devices contact if exposed to standing water",
            "Document structural damages for restoration claims"
        ],
        "resources": [
            "FEMA Flood Safety Guide",
            "Red Cross Emergency Kit Preparation Guide"
        ]
    },
    {
        "hazard": "earthquake",
        "description": "Sudden release of geological energy along fault lines, producing strong ground shaking and structural shifts.",
        "warningSigns": [
            "Minor structural rattling or deep rumbling sounds",
            "Erratic animal behaviors or sudden pet alarms",
            "Initial minor tremors preceding large seismic shifts"
        ],
        "before": [
            "Anchor heavy furniture, mirrors, and shelving to wall studs",
            "Establish a family reunion protocol and designate assembly points",
            "Locate utility shutoff valves (gas, electricity, water)"
        ],
        "during": [
            "Execute drop, cover, and hold under sturdy furniture",
            "Stay indoors away from exterior windows, glass, or heavy cabinets",
            "Pull over safely to the side of the road if operating vehicles"
        ],
        "after": [
            "Check structural walls for cracks and sniff for gas leaks",
            "Expect subsequent aftershocks and keep shoes on to avoid debris",
            "Monitor local EOC broadcasts for structural safety updates"
        ],
        "resources": [
            "USGS Earthquake Hazards Portal",
            "Red Cross Earthquake Readiness Checklist"
        ]
    },
    {
        "hazard": "storm",
        "description": "Violent atmospheric disturbances characterized by high-velocity winds, lightning, hail, and heavy rainfall.",
        "warningSigns": [
            "Sudden drop in barometric pressure and dark wall clouds",
            "Violent wind gust increases and atmospheric cooling",
            "Severe thunder and continuous lighting strikes"
        ],
        "before": [
            "Trim weak tree branches hanging over structural roofs",
            "Board up glass windows and secure all loose outdoor items",
            "Charge battery backup devices and keep flashlights nearby"
        ],
        "during": [
            "Seek shelter inside a central interior room away from windows",
            "Unplug sensitive electrical devices to prevent surge damage",
            "Avoid showering or using landline phones during lightning storms"
        ],
        "after": [
            "Report downed utility lines to local power grids",
            "Inspect property roofs for damage and avoid flooded streets",
            "Check on elderly neighbors and clear small yard blockages"
        ],
        "resources": [
            "National Weather Service Storm Preparedness",
            "EOC Windstorm Safety Toolkit"
        ]
    },
    {
        "hazard": "wildfire",
        "description": "Uncontrolled fires spreading rapidly across dry forest, brush, or woodland areas, threatening lives and properties.",
        "warningSigns": [
            "Plumes of dark smoke rising along the horizon",
            "Smell of burning timber and falling ash",
            "Sudden increases in local wind speeds and temperatures"
        ],
        "before": [
            "Clear dry leaves, twigs, and vegetation within 30 feet of structures",
            "Designate a safe evacuation destination outside fire zones",
            "Keep vehicle fuel tanks full and pack emergency bags"
        ],
        "during": [
            "Evacuate immediately upon receiving alert orders",
            "Keep all windows, doors, and vents closed if remaining indoors",
            "Wear face coverings or wet cloths to filter ash and smoke inhalation"
        ],
        "after": [
            "Inspect roof, attic, and crawlspaces for hidden hot spots",
            "Avoid hot ash, charred trees, and active utility lines",
            "Wait for EOC all-clear notices before returning to properties"
        ],
        "resources": [
            "Ready.gov Wildfire Safety Guide",
            "State Forestry Fire Prevention Bureau"
        ]
    },
    {
        "hazard": "drought",
        "description": "Extended periods of deficient rainfall resulting in water scarcity, crop damage, and ecological imbalances.",
        "warningSigns": [
            "Decreasing water levels in reservoirs and wells",
            "Widespread wilting of crops and dry soil cracks",
            "Local water utility restrictions on non-essential consumption"
        ],
        "before": [
            "Install water-efficient fixtures and low-flow aerators",
            "Repair structural plumbing leaks and insulate water pipes",
            "Establish rainwater harvesting systems for landscape irrigation"
        ],
        "during": [
            "Adhere strictly to local utility water rationing mandates",
            "Re-use greywater for plants and household flushing",
            "Prioritize water supplies for hydration and hygiene needs"
        ],
        "after": [
            "Evaluate long-term agricultural soil restoration strategies",
            "Maintain water conservation habits post-drought recovery",
            "Participate in local water resource planning forums"
        ],
        "resources": [
            "National Drought Mitigation Center",
            "EPA Water Conservation Guidelines"
        ]
    },
    {
        "hazard": "landslide",
        "description": "Downward movement of soil, rocks, and debris along slopes, triggered by heavy rain, seismic activity, or human construction.",
        "warningSigns": [
            "New cracks in plaster, tile, brick, or foundations",
            "Tilted trees, utility poles, or retaining walls",
            "Faint rumbling sounds that increase in volume over time"
        ],
        "before": [
            "Avoid building structures on steep slopes or near ravine edges",
            "Plant ground cover on slopes to stabilize soil structures",
            "Review evacuation paths away from potential debris flows"
        ],
        "during": [
            "Evacuate immediately if you suspect a debris flow is imminent",
            "Curl into a tight ball and protect your head if escape is impossible",
            "Listen for unusual cracking sounds indicating moving earth"
        ],
        "after": [
            "Stay away from the slide area to prevent secondary slide traps",
            "Check for damaged utility lines and report them to authorities",
            "Consult geotechnical specialists to evaluate slope stability"
        ],
        "resources": [
            "USGS Landslides Hazards Program",
            "Red Cross Landslide Preparedness Guide"
        ]
    },
    {
        "hazard": "volcano",
        "description": "Release of molten rock, ash, and gases from underground chambers, producing lava flows, ash fall, and toxic gas clouds.",
        "warningSigns": [
            "Increased seismic shaking or minor tremors near vents",
            "Ground deformation or bulging of the volcano slope",
            "Changes in gas emissions or visible steam plumes"
        ],
        "before": [
            "Establish evacuation routes outside defined exclusion zones",
            "Keep goggles and N95 masks in emergency supply kits",
            "Review safety plans for ash fall protection and shelter-in-place"
        ],
        "during": [
            "Follow evacuation orders from local authorities immediately",
            "Wear long sleeves, pants, and eye protection if caught in ash fall",
            "Stay indoors with all windows and ventilation systems closed"
        ],
        "after": [
            "Clear heavy ash accumulation from roofs to prevent collapse",
            "Avoid driving through thick ash clouds to protect engine filters",
            "Listen to emergency EOC broadcasts for air quality warnings"
        ],
        "resources": [
            "USGS Volcano Hazards Program",
            "FEMA Volcanic Ash Safety Portal"
        ]
    }
]


async def seed_disaster_awareness(db):
    """
    Check and seed the disaster_awareness collection with guides.
    """
    count = await db.disaster_awareness.count_documents({})
    if count == 0:
        await db.disaster_awareness.insert_many(DEFAULT_AWARENESS_TEMPLATES)


@router.get("/awareness", response_model=List[AwarenessResponse])
async def get_all_awareness_guides(db = Depends(get_db)):
    """
    Retrieve all disaster safety awareness guides.
    """
    try:
        await seed_disaster_awareness(db)
        cursor = db.disaster_awareness.find({})
        results = await cursor.to_list(length=100)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")


@router.get("/awareness/{hazard}", response_model=AwarenessResponse)
async def get_awareness_guide_by_hazard(hazard: str, db = Depends(get_db)):
    """
    Retrieve disaster safety guide for a specific hazard category.
    """
    try:
        await seed_disaster_awareness(db)
        norm = hazard.lower().strip()
        doc = await db.disaster_awareness.find_one({"hazard": norm})
        if not doc:
            raise HTTPException(status_code=404, detail=f"Awareness guide for hazard category '{hazard}' not found")
        return doc
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")




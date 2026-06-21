from pydantic import BaseModel, Field, constr, model_validator
from typing import Optional, List
from datetime import datetime
import json
import os

# Load country centroids
current_dir = os.path.dirname(os.path.abspath(__file__))
# current_dir is backend/app/models/schemas/
app_dir = os.path.dirname(os.path.dirname(current_dir)) # backend/app
centroids_path = os.path.join(app_dir, "core", "country_centroids.json")

centroids_data = {}
if os.path.exists(centroids_path):
    try:
        with open(centroids_path, 'r', encoding='utf-8') as f:
            centroids_data = json.load(f)
    except Exception:
        pass

class GeoJSONPoint(BaseModel):
    type: str = Field(default="Point", pattern="^Point$")
    coordinates: List[float] = Field(
        ...,
        min_items=2,
        max_items=2,
        description="Coordinates in [longitude, latitude] format"
    )

class DisasterImpactSchema(BaseModel):
    deaths: int = Field(default=0, ge=0, description="Total recorded casualties")
    deaths_is_missing: bool = Field(default=False, description="Flag indicating if the deaths count was missing and imputed to 0")
    injured: Optional[int] = Field(default=None, ge=0, description="Number of injured individuals")
    affected: Optional[int] = Field(default=None, ge=0, description="Number of affected individuals")
    homeless: Optional[int] = Field(default=None, ge=0, description="Number of homeless individuals")
    totalAffected: int = Field(default=0, ge=0, description="Sum of injured, affected, and homeless")
    economicDamageUSD: Optional[float] = Field(default=None, ge=0.0, description="Adjusted total damage in USD")

    @model_validator(mode="before")
    @classmethod
    def preprocess_impact_fields(cls, data):
        if isinstance(data, dict):
            # Impute deaths
            deaths_val = data.get("deaths")
            if deaths_val is None or deaths_val == "" or "deaths" not in data:
                data["deaths"] = 0
                data["deaths_is_missing"] = True
            else:
                try:
                    data["deaths"] = int(deaths_val)
                    if "deaths_is_missing" not in data:
                        data["deaths_is_missing"] = False
                except ValueError:
                    data["deaths"] = 0
                    data["deaths_is_missing"] = True

            # Normalize other optional int fields to None if empty string
            for field in ["injured", "affected", "homeless"]:
                val = data.get(field)
                if val == "" or val is None:
                    data[field] = None
                else:
                    try:
                        data[field] = int(val)
                    except ValueError:
                        data[field] = None

            # Calculate totalAffected if it's missing or empty
            injured_val = data.get("injured") or 0
            affected_val = data.get("affected") or 0
            homeless_val = data.get("homeless") or 0
            calc_total = injured_val + affected_val + homeless_val
            
            tot_aff = data.get("totalAffected")
            if tot_aff is None or tot_aff == "":
                data["totalAffected"] = calc_total
            else:
                try:
                    data["totalAffected"] = int(tot_aff)
                except ValueError:
                    data["totalAffected"] = calc_total

            # Normalize economicDamageUSD
            dmg = data.get("economicDamageUSD")
            if dmg == "" or dmg is None:
                data["economicDamageUSD"] = None
            else:
                try:
                    data["economicDamageUSD"] = float(dmg)
                except ValueError:
                    data["economicDamageUSD"] = None

        return data

class DisasterRecordCreate(BaseModel):
    disNo: str = Field(..., description="EM-DAT unique identifier, e.g., 2026-0153-KEN")
    disasterGroup: str = Field(..., description="High-level grouping, e.g., Natural, Technological")
    disasterSubgroup: Optional[str] = Field(default=None, description="Disaster subgroup classification")
    disasterType: str = Field(..., description="Primary hazard classification, e.g., Flood, Storm")
    disasterSubtype: Optional[str] = Field(default=None, description="Detailed disaster subtype")
    country: str = Field(..., description="Country name")
    iso: constr(pattern=r"^[A-Z]{3}$") = Field(..., description="3-letter country ISO code in capitals")
    region: Optional[str] = Field(default=None, description="Global region (e.g., Africa, Asia)")
    subregion: Optional[str] = Field(default=None, description="Global subregion (e.g., Eastern Africa)")
    location: Optional[str] = Field(default=None, description="Specific local cities/states description")
    magnitude: Optional[float] = Field(default=None, description="Physical magnitude value")
    magnitudeScale: Optional[str] = Field(default=None, description="Measurement scale of the magnitude")
    geoJSON: GeoJSONPoint = Field(..., description="GeoJSON coordinates mapping")
    startDate: datetime = Field(..., description="Starting timestamp")
    endDate: Optional[datetime] = Field(default=None, description="Ending timestamp")
    impact: DisasterImpactSchema = Field(..., description="Casualties and economic damages sub-document")
    severityScore: Optional[float] = Field(default=None, ge=0.0, description="Derived numerical severity score")
    severityClass: Optional[str] = Field(default=None, pattern="^(Low|Medium|High|Extreme)$", description="Derived ordinal class label")

    @model_validator(mode="before")
    @classmethod
    def fallback_country_centroids(cls, data):
        if isinstance(data, dict):
            geojson = data.get("geoJSON")
            iso = data.get("iso")
            
            def is_valid_geojson(g):
                if not isinstance(g, dict):
                    return False
                coords = g.get("coordinates")
                if not isinstance(coords, list) or len(coords) < 2:
                    return False
                if coords[0] is None or coords[1] is None:
                    return False
                return True

            if not geojson or not is_valid_geojson(geojson):
                # Try top-level Latitude/Longitude
                lat = data.get("Latitude") or data.get("latitude")
                lon = data.get("Longitude") or data.get("longitude")
                
                try:
                    if lat is not None and lon is not None and lat != "" and lon != "":
                        data["geoJSON"] = {
                            "type": "Point",
                            "coordinates": [float(lon), float(lat)]
                        }
                        return data
                except ValueError:
                    pass

                # Fallback to ISO centroid
                if iso and iso in centroids_data:
                    centroid = centroids_data[iso]
                    if centroid:
                        data["geoJSON"] = {
                            "type": "Point",
                            "coordinates": centroid
                        }
        return data

class DisasterRecordResponse(DisasterRecordCreate):
    id: str = Field(..., alias="_id", description="MongoDB ObjectId hex string")

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class PaginatedDisasterRecordsResponse(BaseModel):
    totalCount: int
    page: int
    totalPages: int
    data: List[DisasterRecordResponse]


from pydantic import BaseModel, Field, constr
from typing import Optional, List
from datetime import datetime

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
    injured: Optional[int] = Field(default=None, ge=0, description="Number of injured individuals")
    affected: Optional[int] = Field(default=None, ge=0, description="Number of affected individuals")
    homeless: Optional[int] = Field(default=None, ge=0, description="Number of homeless individuals")
    totalAffected: int = Field(default=0, ge=0, description="Sum of injured, affected, and homeless")
    economicDamageUSD: Optional[float] = Field(default=None, ge=0.0, description="Adjusted total damage in USD")

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

class DisasterRecordResponse(DisasterRecordCreate):
    id: str = Field(..., alias="_id", description="MongoDB ObjectId hex string")

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

from pydantic import BaseModel, Field
from typing import Optional, List
from typing_extensions import Annotated
from datetime import datetime
from pydantic import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]

class TimelineParameters(BaseModel):
    durationHours: int = Field(default=48, ge=1, description="Simulation duration in hours")
    cascadingIntervalHours: int = Field(default=12, ge=1, description="Interval step window in hours")

class ScenarioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Name of the hypothetical scenario")
    description: str = Field(default="", description="Description details")
    disasterType: str = Field(..., min_length=1, description="Disaster classification class, e.g. Flood, Storm")
    disasterSubtype: str = Field(default="", description="Specific hazard subgroup subtype")
    country: str = Field(default="", description="Target country")
    iso: str = Field(default="", pattern="^([A-Z]{3})?$", description="3-character ISO country code")
    region: str = Field(default="", description="Specific geographic region or state")
    magnitude: float = Field(..., ge=0.0, description="Simulated hazard scale physical magnitude")
    magnitudeScale: str = Field(default="", description="Measurement scale label, e.g. Richter, Kph")
    timelineParameters: TimelineParameters = Field(default_factory=TimelineParameters, description="Temporal timestep progression parameters")
    notes: str = Field(default="", description="Operational response briefing logs")
    tags: List[str] = Field(default_factory=list, description="Categorical tags for dashboard filtering")
    status: str = Field(default="Draft", pattern="^(Draft|Published)$", description="Scenario deployment state")

class ScenarioUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None)
    disasterType: Optional[str] = Field(default=None, min_length=1)
    disasterSubtype: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None, min_length=1)
    iso: Optional[str] = Field(default=None, pattern="^[A-Z]{3}$")
    region: Optional[str] = Field(default=None)
    magnitude: Optional[float] = Field(default=None, ge=0.0)
    magnitudeScale: Optional[str] = Field(default=None, min_length=1)
    timelineParameters: Optional[TimelineParameters] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    tags: Optional[List[str]] = Field(default=None)
    status: Optional[str] = Field(default=None, pattern="^(Draft|Published)$")

class ScenarioResponse(ScenarioCreate):
    id: PyObjectId = Field(..., alias="_id", description="MongoDB ObjectId hex string")
    createdBy: PyObjectId = Field(..., description="ObjectId reference of the administrator owner")
    createdAt: datetime = Field(..., description="Creation timestamp")
    updatedAt: Optional[datetime] = Field(default=None, description="Last updated timestamp")

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ScenarioListResponse(BaseModel):
    totalCount: int
    page: int
    totalPages: int
    data: List[ScenarioResponse]

class ScenarioCompareResponse(BaseModel):
    id: str
    name: str
    predictedSeverity: str
    predictedDeaths: int
    predictedDamageUSD: float
    requiredAmbulances: int


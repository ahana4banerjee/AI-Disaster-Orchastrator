from pydantic import BaseModel, Field, BeforeValidator
from typing_extensions import Annotated
from typing import Optional
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(str)]

class ScenarioCreate(BaseModel):
    name: str = Field(..., description="Unique scenario template name")
    description: Optional[str] = Field(None, description="Detailed assessment context")
    disasterType: str = Field(..., description="Primary hazard classification, e.g. Storm, Flood")
    disasterSubtype: Optional[str] = Field(None, description="Disaster subgroup/subtype")
    country: str = Field(..., description="Target country")
    region: Optional[str] = Field(None, description="Specific administrative region/state")
    magnitude: float = Field(..., gt=0.0, description="Numerical hazard magnitude")
    magnitudeScale: Optional[str] = Field(None, description="Measurement scale (e.g. Kph, Richter)")

class ScenarioResponse(ScenarioCreate):
    id: PyObjectId = Field(..., alias="_id", description="MongoDB ObjectId hex string")
    createdBy: str = Field(..., description="User ID of the creating admin")
    createdAt: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ScenarioCompareResponse(BaseModel):
    id: str = Field(..., description="MongoDB ObjectId hex string")
    name: str
    predictedSeverity: str
    predictedDeaths: int
    predictedDamageUSD: float
    requiredAmbulances: int

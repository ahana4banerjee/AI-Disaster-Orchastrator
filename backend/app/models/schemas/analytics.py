from pydantic import BaseModel, Field, BeforeValidator
from typing_extensions import Annotated
from typing import Optional
from datetime import datetime

# Helper to automatically cast MongoDB ObjectId to string
PyObjectId = Annotated[str, BeforeValidator(str)]

class RegionalRiskClusterResponse(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    subregion: str
    frequency: float
    mortalityRate: float
    economicRisk: float
    maxMagnitude: float
    clusterId: int
    riskTier: str
    updatedAt: datetime

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "subregion": "Southern Asia",
                "frequency": 3.42,
                "mortalityRate": 0.00045,
                "economicRisk": 0.0012,
                "maxMagnitude": 7.8,
                "clusterId": 3,
                "riskTier": "Extreme",
                "updatedAt": "2026-06-19T23:39:58Z"
            }
        }

class DashboardKPIResponse(BaseModel):
    totalEvents: int
    highRiskEvents: int
    averageDeaths: float
    averageDamageUSD: float


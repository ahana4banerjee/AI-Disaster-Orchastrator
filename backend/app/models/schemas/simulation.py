from pydantic import BaseModel, Field, BeforeValidator
from typing_extensions import Annotated
from typing import Optional, List
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(str)]

class SimulationCreate(BaseModel):
    scenarioId: str = Field(..., description="Target Scenario Configuration ID")
    name: str = Field(..., description="Human-readable simulation execution label")

class InfrastructureStatesSchema(BaseModel):
    powerGrid: str = Field(default="Operational")
    transportationRoads: str = Field(default="Operational")
    hospitals: str = Field(default="Operational")

class TimestepMetricsSchema(BaseModel):
    activeCasualties: int = Field(default=0, ge=0)
    displacedPopulation: int = Field(default=0, ge=0)
    structuralDamagePercentage: float = Field(default=0.0, ge=0.0, le=100.0)

class SimulationTimestepSchema(BaseModel):
    step: int
    timeLabel: str
    status: str = Field(default="Active")
    narrative: str
    metrics: TimestepMetricsSchema
    infrastructureStates: InfrastructureStatesSchema

class SimulationResponse(BaseModel):
    id: PyObjectId = Field(..., alias="_id", description="MongoDB ObjectId hex string")
    scenarioId: str
    name: str
    createdBy: str
    status: str
    createdAt: datetime
    timesteps: List[SimulationTimestepSchema] = []

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class SimulationInitResponse(BaseModel):
    simulationId: str
    status: str
    timestepsCount: int

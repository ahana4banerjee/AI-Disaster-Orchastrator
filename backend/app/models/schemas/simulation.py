from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from typing_extensions import Annotated
from datetime import datetime
from pydantic import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]

class SimulationCreate(BaseModel):
    scenarioId: PyObjectId = Field(..., description="Target Scenario template ID")
    name: str = Field(..., min_length=1, max_length=200, description="Name of the simulation exercise")

class SimulationResponse(BaseModel):
    id: PyObjectId = Field(..., alias="_id", description="MongoDB ObjectId hex string")
    name: str = Field(..., description="Name of the simulation exercise")
    scenarioId: PyObjectId = Field(..., description="Referencing Scenario ID")
    status: str = Field(default="Created", description="Active simulation execution state")
    currentStep: int = Field(default=0, description="Active timestep index")
    timesteps: List[Dict[str, Any]] = Field(default_factory=list, description="Computed timeline steps parameters")
    createdBy: PyObjectId = Field(..., description="Administrator owner reference")
    createdAt: datetime = Field(..., description="Creation timestamp")
    updatedAt: Optional[datetime] = Field(default=None, description="Last updated timestamp")

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class SimulationListResponse(BaseModel):
    totalCount: int
    page: int
    totalPages: int
    data: List[SimulationResponse]

class SimulationInitResponse(BaseModel):
    simulationId: str
    status: str
    timestepsCount: int

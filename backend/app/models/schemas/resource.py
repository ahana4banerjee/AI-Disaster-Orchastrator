from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from typing_extensions import Annotated
from datetime import datetime
from pydantic import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class ResourceInventory(BaseModel):
    ambulances: int = Field(default=35, ge=0, description="Available ambulance units")
    rescueTeams: int = Field(default=12, ge=0, description="Available search & rescue teams")
    medicalTeams: int = Field(default=10, ge=0, description="Available medical response teams")
    reliefCamps: int = Field(default=15, ge=0, description="Available emergency relief camps")
    foodUnits: int = Field(default=25000, ge=0, description="Available daily food ration units")


class ResourceItemAssessment(BaseModel):
    key: str = Field(..., description="CamelCase resource key")
    type: str = Field(..., description="Human-readable resource category")
    unit: str = Field(..., description="Measurement unit")
    required: int = Field(..., ge=0)
    available: int = Field(..., ge=0)
    deficit: int = Field(..., ge=0)
    deficitPercentage: float = Field(..., ge=0.0, le=100.0)
    coveragePercentage: float = Field(..., ge=0.0, le=100.0)
    status: str = Field(..., description="Sufficient | Moderate Shortage | Critical Shortage")
    statusColor: str = Field(..., description="EMERALD | AMBER | CRIMSON")
    operationalImplication: str = Field(..., description="Operational risk & response implication")
    infrastructureFactor: Optional[str] = Field(default=None, description="Infrastructure disruption impact note")


class ResourceSummaryMetrics(BaseModel):
    totalRequired: int = Field(..., ge=0)
    totalAvailable: int = Field(..., ge=0)
    totalDeficit: int = Field(..., ge=0)
    criticalCount: int = Field(..., ge=0)
    moderateCount: int = Field(..., ge=0)
    sufficientCount: int = Field(..., ge=0)


class CriticalShortageAlert(BaseModel):
    resourceType: str
    severity: str
    deficit: int
    deficitPercentage: float
    implication: str
    infrastructureDriver: Optional[str] = None


class TimestepResourceAssessment(BaseModel):
    step: int
    hour: int
    timeLabel: str
    assessedAt: datetime
    resources: List[ResourceItemAssessment]
    summary: ResourceSummaryMetrics
    criticalAlerts: List[CriticalShortageAlert] = Field(default_factory=list)
    deficitAnalysisSummary: str


class ResourcePlanResponse(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    simulationId: PyObjectId
    simulationName: Optional[str] = None
    assessmentDate: datetime
    status: str = Field(default="In Progress", description="In Progress | Finalized")
    inventory: ResourceInventory
    resources: List[ResourceItemAssessment]
    summary: ResourceSummaryMetrics
    criticalAlerts: List[CriticalShortageAlert] = Field(default_factory=list)
    deficitAnalysisSummary: str
    timestepAssessments: List[TimestepResourceAssessment] = Field(default_factory=list)
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

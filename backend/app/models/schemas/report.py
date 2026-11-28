from pydantic import BaseModel, Field, BeforeValidator
from typing import Optional, List, Dict, Any
from typing_extensions import Annotated
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(str)]


class ReportCreate(BaseModel):
    simulationId: str = Field(..., min_length=1, description="Target simulation run ID")
    title: str = Field(..., min_length=1, max_length=200, description="Report title label")
    classification: str = Field(
        default="UNCLASSIFIED // EOC OFFICIAL BRIEF",
        max_length=100,
        description="Document security classification banner",
    )
    authorNotes: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Optional coordinator operational remarks",
    )


class ReportProvenance(BaseModel):
    historicalDataSource: str
    mlModels: List[str]
    simulationEngine: str
    resourceEngine: str
    recommendationMethod: str
    assumptions: List[str]
    limitations: List[str]
    generatedAt: str


class ReportSections(BaseModel):
    situationSummary: str
    riskAssessment: str
    expectedImpact: str
    resourceRecommendations: str
    keyConcerns: str
    suggestedActions: str


class ReportSnapshot(BaseModel):
    reportCode: str
    version: int
    title: str
    classification: str
    generatedAt: str
    compiledBy: str
    compiledByEmail: str
    simulationId: str
    simulationName: str
    simulationStatus: str
    sourceSimulationUpdatedAt: Optional[str] = None
    severityClass: str
    scenarioSummary: Dict[str, Any]
    scenarioMissing: bool = False
    executedTimesteps: List[Dict[str, Any]] = Field(default_factory=list)
    pendingTimesteps: List[Dict[str, Any]] = Field(default_factory=list)
    resourcePlanStatus: str
    resourceSummary: Optional[Dict[str, Any]] = None
    resources: List[Dict[str, Any]] = Field(default_factory=list)
    criticalAlerts: List[Dict[str, Any]] = Field(default_factory=list)
    inventory: Optional[Dict[str, Any]] = None
    recoveryForecastDays: Optional[int] = None
    authorNotes: Optional[str] = None
    sections: ReportSections
    provenance: ReportProvenance


class ReportResponse(BaseModel):
    id: PyObjectId = Field(..., alias="_id", description="MongoDB ObjectId hex string")
    reportCode: Optional[str] = None
    version: int = 1
    simulationId: str
    simulationName: Optional[str] = None
    simulationStatus: Optional[str] = None
    severityClass: Optional[str] = None
    title: str
    classification: str = "UNCLASSIFIED // EOC OFFICIAL BRIEF"
    compiledBy: Optional[str] = None
    compiledByEmail: Optional[str] = None
    pdfStorageUrl: str
    markdownUrl: Optional[str] = None
    csvUrl: Optional[str] = None
    createdAt: datetime

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class ReportDetailResponse(ReportResponse):
    snapshot: Optional[ReportSnapshot] = None
    markdownContent: str = ""


class ReportListResponse(BaseModel):
    totalCount: int
    page: int
    totalPages: int
    data: List[ReportResponse]

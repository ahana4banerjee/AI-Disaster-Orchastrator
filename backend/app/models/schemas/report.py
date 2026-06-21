from pydantic import BaseModel, Field
from datetime import datetime

class ReportCreate(BaseModel):
    simulationId: str = Field(..., description="Target completed simulation run ID")
    title: str = Field(..., description="Report title label")

class ReportResponse(BaseModel):
    id: str = Field(..., alias="_id", description="MongoDB ObjectId hex string")
    simulationId: str
    title: str
    pdfStorageUrl: str
    createdAt: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

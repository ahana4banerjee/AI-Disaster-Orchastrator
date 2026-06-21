from pydantic import BaseModel, Field, BeforeValidator
from typing_extensions import Annotated
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(str)]

class ReportCreate(BaseModel):
    simulationId: str = Field(..., description="Target completed simulation run ID")
    title: str = Field(..., description="Report title label")

class ReportResponse(BaseModel):
    id: PyObjectId = Field(..., alias="_id", description="MongoDB ObjectId hex string")
    simulationId: str
    title: str
    pdfStorageUrl: str
    createdAt: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

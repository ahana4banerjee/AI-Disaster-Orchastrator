from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class ReadinessProfileUpdate(BaseModel):
    checkedItems: List[str] = Field(..., description="List of preparedness checklist item keys currently checked")

class ReadinessProfileResponse(BaseModel):
    userId: str
    checkedItems: List[str]
    score: int
    updatedAt: datetime

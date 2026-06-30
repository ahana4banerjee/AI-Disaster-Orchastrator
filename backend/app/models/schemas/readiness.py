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


class FamilyPlanCreate(BaseModel):
    memberCount: int = Field(..., gt=0, description="Number of household members, must be a positive integer")
    contacts: str = Field(..., description="Emergency contacts information")
    evacuationRoute: str = Field(..., description="Evacuation plan or designated meeting points")
    medicalNeeds: str = Field(..., description="Special medical rules, conditions, or prescription protocols")
    petAssistance: str = Field(..., description="Pet care and assistance configurations during evacuations")


class FamilyPlanResponse(BaseModel):
    userId: str
    memberCount: int
    contacts: str
    evacuationRoute: str
    medicalNeeds: str
    petAssistance: str
    updatedAt: datetime


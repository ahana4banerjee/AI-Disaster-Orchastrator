from pydantic import BaseModel, EmailStr, Field, BeforeValidator
from typing_extensions import Annotated
from typing import Optional
from datetime import datetime

PyObjectId = Annotated[str, BeforeValidator(str)]

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    role: str = Field(default="public_user", pattern="^(public_user|admin)$")

class UserResponse(UserBase):
    id: PyObjectId = Field(..., alias="_id")
    role: str
    isActive: bool = Field(default=True)
    createdAt: datetime

    class Config:
        populate_by_name = True

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


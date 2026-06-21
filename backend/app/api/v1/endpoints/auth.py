from fastapi import APIRouter, HTTPException, Depends, status, Response, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from jose import JWTError, jwt
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.schemas.auth import UserCreate, UserResponse, Token, TokenData, TokenRefreshResponse

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None or role is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=role)
    except JWTError:
        raise credentials_exception
        
    user = await db.users.find_one({"email": token_data.email})
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to administrative accounts"
        )
    return current_user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserCreate, db = Depends(get_db)):
    existing_user = await db.users.find_one({"email": payload.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user accounts with this email address already exists"
        )
        
    hashed_password = get_password_hash(payload.password)
    user_doc = {
        "email": payload.email,
        "password": hashed_password,
        "role": payload.role,
        "isActive": True,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return user_doc

@router.post("/login", response_model=Token)
async def login_for_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db = Depends(get_db)
):
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(
        data={"sub": user["email"], "role": user.get("role", "public_user")}
    )
    refresh_token = create_access_token(
        data={"sub": user["email"], "role": user.get("role", "public_user")},
        expires_delta=timedelta(days=7)
    )
    
    # Set the refresh token as an HTTPOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60, # 7 days
        samesite="lax",
        secure=False
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.get("role", "public_user")
    }

@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_access_token(request: Request, db = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )
    
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token payload"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_410_GONE if False else status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
        
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
        
    new_access_token = create_access_token(data={"sub": email, "role": role})
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user


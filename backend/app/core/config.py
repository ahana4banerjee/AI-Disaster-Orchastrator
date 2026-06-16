from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017/disaster_db"
    REDIS_URI: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "SUPER_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    ML_SERVICE_URL: str = "http://localhost:8001"

    class Config:
        env_file = ".env"

settings = Settings()

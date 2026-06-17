import os
from pydantic_settings import BaseSettings

# Dynamically resolve absolute path to workspace root
current_dir = os.path.dirname(os.path.abspath(__file__))
# current_dir is backend/app/core
# Go up 3 levels to reach the root
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
env_path = os.path.join(root_dir, ".env")

class Settings(BaseSettings):
    MONGO_URI: str
    REDIS_URI: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    ML_SERVICE_URL: str = "http://localhost:8001"

    class Config:
        env_file = env_path
        env_file_encoding = 'utf-8'

settings = Settings()
print(f"Loaded database configuration from environment. Target MONGO_URI: {settings.MONGO_URI}")

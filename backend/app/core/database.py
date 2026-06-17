import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_helper = Database()

async def connect_to_mongo():
    """
    Establish connection to MongoDB Atlas or local container.
    Verifies connection by executing a ping command.
    """
    try:
        logger.info("Connecting to MongoDB database...")
        db_helper.client = AsyncIOMotorClient(settings.MONGO_URI)
        # Fallback to 'disaster_db' if default database is not specified in the URI
        db_helper.db = db_helper.client.get_default_database(default="disaster_db")
        # Ping connection to verify access/connectivity
        await db_helper.db.command("ping")
        logger.info("Successfully connected to MongoDB and verified connection with ping.")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """
    Close MongoDB connection gracefully.
    """
    if db_helper.client:
        logger.info("Closing MongoDB connection...")
        db_helper.client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    """
    Get direct access to the database instance.
    """
    return db_helper.db

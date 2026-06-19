import os
import sys
import json
from pymongo import MongoClient, ASCENDING, DESCENDING, GEOSPHERE

def load_env_mongo_uri():
    """
    Read MONGO_URI from the root .env file.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(base_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if stripped.startswith("MONGO_URI="):
                    # Strip any surrounding quotes or spacing
                    val = stripped.split("=", 1)[1].strip()
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    return val
    return os.getenv("MONGO_URI")

def main():
    mongo_uri = load_env_mongo_uri()
    if not mongo_uri:
        print("Error: MONGO_URI not found in environment or .env file.")
        sys.exit(1)

    print(f"Connecting to MongoDB database at: {mongo_uri}")
    try:
        client = MongoClient(mongo_uri)
        # Verify connection
        client.admin.command("ping")
        print("Connected to MongoDB successfully.")
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

    # Use the database specified in URI or fallback to 'disaster_db'
    db = client.get_default_database(default="disaster_db")
    db_name = db.name
    print(f"Target Database: {db_name}")

    collections = [
        "disaster_records",
        "users",
        "predictions",
        "simulations",
        "scenarios",
        "resource_plans",
        "ai_reports",
        "analytics_cache",
        "regional_risk_clusters"
    ]

    existing_collections = db.list_collection_names()
    print(f"Existing collections: {existing_collections}")

    # 1. Create collections (if they don't exist)
    for col in collections:
        if col not in existing_collections:
            db.create_collection(col)
            print(f"Created collection: {col}")
        else:
            print(f"Collection already exists: {col}")

    # 2. Build indexes
    print("\n--- Initializing Indexes ---")

    # Collection: disaster_records
    # Index 1: Geospatial 2dsphere index on geoJSON
    print("Building indexes on 'disaster_records'...")
    db.disaster_records.create_index([("geoJSON", GEOSPHERE)], name="geoJSON_2dsphere")
    # Index 2: Compound dashboard filter index
    db.disaster_records.create_index(
        [
            ("country", ASCENDING),
            ("disasterType", ASCENDING),
            ("startDate", DESCENDING)
        ],
        name="country_disasterType_startDate_compound"
    )
    print("Indexes on 'disaster_records' initialized.")

    # Collection: users
    # Index 1: Unique single index on email
    print("Building indexes on 'users'...")
    db.users.create_index([("email", ASCENDING)], unique=True, name="email_unique")
    print("Indexes on 'users' initialized.")

    # Collection: analytics_cache
    # Index 1: TTL Index on expiresAt
    print("Building indexes on 'analytics_cache'...")
    db.analytics_cache.create_index(
        [("expiresAt", ASCENDING)],
        expireAfterSeconds=0,
        name="expiresAt_ttl"
    )
    print("Indexes on 'analytics_cache' initialized.")

    # Collection: predictions
    print("Building indexes on 'predictions'...")
    db.predictions.create_index([("createdAt", ASCENDING)], name="createdAt_sort")
    db.predictions.create_index([("inputHash", ASCENDING)], name="inputHash_lookup")
    print("Indexes on 'predictions' initialized.")

    # Collection: simulations
    print("Building indexes on 'simulations'...")
    db.simulations.create_index(
        [
            ("createdBy", ASCENDING),
            ("createdAt", DESCENDING)
        ],
        name="createdBy_createdAt_compound"
    )
    print("Indexes on 'simulations' initialized.")

    # Collection: analytics_cache key lookup index
    db.analytics_cache.create_index([("cacheKey", ASCENDING)], name="cacheKey_lookup")

    # Collection: regional_risk_clusters
    print("Building indexes on 'regional_risk_clusters'...")
    db.regional_risk_clusters.create_index([("subregion", ASCENDING)], unique=True)
    print("Indexes on 'regional_risk_clusters' initialized.")

    print("\nMongoDB Database Schema Initialization Completed Successfully.")

if __name__ == "__main__":
    main()

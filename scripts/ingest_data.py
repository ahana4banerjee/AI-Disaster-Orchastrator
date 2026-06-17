import os
import sys
import argparse
import asyncio

# Setup sys.path to resolve imports from backend/app
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(base_dir, "backend")
sys.path.insert(0, backend_dir)

from app.core.database import connect_to_mongo, close_mongo_connection
from app.services.csv_loader import CSVLoader
from app.services.data_pipeline import DisasterDataPipeline
from app.services.bulk_ingestion import BulkIngestionService

async def ingest_csv(csv_path: str, batch_size: int = 1000):
    # Initialize loader, pipeline and ingestion service
    loader = CSVLoader(csv_path, chunk_size=batch_size)
    pipeline = DisasterDataPipeline()
    ingestion_service = BulkIngestionService(batch_size=batch_size)

    print("Connecting to MongoDB...")
    await connect_to_mongo()
    print("Connection established successfully.")

    total_read = 0
    total_matched = 0
    total_modified = 0
    total_upserted = 0

    print(f"Reading CSV chunks from {csv_path}...")
    
    # Stream chunks through loader
    chunk_index = 0
    for chunk in loader.read_chunks():
        chunk_index += 1
        chunk_len = len(chunk)
        total_read += chunk_len
        print(f"\nProcessing chunk {chunk_index} ({chunk_len} raw rows)...")

        # 1. Clean and validate the batch
        cleaned_records = pipeline.clean_batch(chunk)
        print(f"Cleaned and validated {len(cleaned_records)} / {chunk_len} records (others filtered or invalid).")

        if cleaned_records:
            # 2. Bulk upsert cleaned records
            res = await ingestion_service.bulk_upsert_records(cleaned_records)
            total_matched += res.get("matched", 0)
            total_modified += res.get("modified", 0)
            total_upserted += res.get("upserted", 0)
            print(f"Chunk upsert results: {res}")

    print("\n--- Ingestion Statistics Summary ---")
    print(f"Total raw records read from CSV: {total_read}")
    print(f"Total records matched (already in DB): {total_matched}")
    print(f"Total records modified (updated in DB): {total_modified}")
    print(f"Total records upserted (newly inserted): {total_upserted}")
    print("------------------------------------")

    print("Closing MongoDB connection...")
    await close_mongo_connection()
    print("Database connection closed cleanly.")

def main():
    parser = argparse.ArgumentParser(description="Ingest EM-DAT CSV into MongoDB Atlas")
    parser.add_argument("--csv", required=True, help="Path to EMDAT raw CSV file")
    parser.add_argument("--batch-size", type=int, default=1000, help="Batch chunk size for writes (default: 1000)")
    args = parser.parse_args()

    csv_path = args.csv
    if not os.path.exists(csv_path):
        # Fallback to absolute check from base workspace dir
        csv_path = os.path.join(base_dir, csv_path)
        if not os.path.exists(csv_path):
            print(f"Error: CSV file not found at: {args.csv}")
            sys.exit(1)

    asyncio.run(ingest_csv(csv_path, batch_size=args.batch_size))

if __name__ == "__main__":
    main()

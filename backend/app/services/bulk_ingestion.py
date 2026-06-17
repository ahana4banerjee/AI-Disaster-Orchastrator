import logging
from typing import List, Dict, Any
from pymongo import ReplaceOne
from app.core.database import db_helper

logger = logging.getLogger(__name__)

class BulkIngestionService:
    """
    Asynchronous bulk insert service using Motor's bulk_write for high throughput.
    """
    def __init__(self, collection_name: str = "disaster_records", batch_size: int = 1000):
        self.collection_name = collection_name
        self.batch_size = batch_size

    async def bulk_upsert_records(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Performs batched asynchronous bulk upserts using ReplaceOne operations.
        Idempotent by checking unique 'disNo'.
        """
        if not records:
            return {"inserted": 0, "matched": 0, "modified": 0, "upserted": 0}

        db = db_helper.db
        if db is None:
            raise RuntimeError("Database connection not established. Call connect_to_mongo() first.")

        collection = db[self.collection_name]
        
        # Prepare bulk operations
        operations = []
        for record in records:
            dis_no = record.get("disNo")
            if not dis_no:
                logger.warning("Skipping bulk write record: missing unique identifier 'disNo'")
                continue
                
            operations.append(
                ReplaceOne(
                    filter={"disNo": dis_no},
                    replacement=record,
                    upsert=True
                )
            )

        if not operations:
            return {"inserted": 0, "matched": 0, "modified": 0, "upserted": 0}

        results = {
            "inserted": 0,
            "matched": 0,
            "modified": 0,
            "upserted": 0
        }

        # Execute operations in chunks of batch_size
        total_ops = len(operations)
        logger.info(f"Starting bulk upsert of {total_ops} records into collection '{self.collection_name}' in batches of {self.batch_size}...")
        
        for i in range(0, total_ops, self.batch_size):
            chunk = operations[i:i + self.batch_size]
            try:
                res = await collection.bulk_write(chunk, ordered=False)
                # pymongo/motor returns bulk results metrics
                results["matched"] += res.matched_count
                results["modified"] += res.modified_count
                results["upserted"] += res.upserted_count
            except Exception as e:
                logger.error(f"Bulk write failed for batch index {i}: {e}")
                raise

        logger.info(f"Bulk upsert completed. Results: {results}")
        return results

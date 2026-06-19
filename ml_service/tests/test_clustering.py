import unittest
from unittest.mock import patch, MagicMock
import os
import sys
import pandas as pd
import numpy as np

# Resolve paths to import scripts and ml_service modules
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(base_dir, ".."))
sys.path.insert(0, base_dir)

class TestMLClustering(unittest.TestCase):
    @patch('scripts.run_clustering.MongoClient')
    @patch('scripts.run_clustering.load_env_mongo_uri')
    def test_clustering_pipeline(self, mock_load_uri, mock_mongo_client):
        # 1. Setup mock MongoDB records (6 records across 4 subregions)
        mock_records = [
            {
                "subregion": "Southern Asia",
                "magnitude": 6.5,
                "impact": {"deaths": 1000, "totalAffected": 50000, "economicDamageUSD": 100000000.0}
            },
            {
                "subregion": "Southern Asia",
                "magnitude": 7.0,
                "impact": {"deaths": 2000, "totalAffected": 150000, "economicDamageUSD": 200000000.0}
            },
            {
                "subregion": "Northern America",
                "magnitude": 5.0,
                "impact": {"deaths": 5, "totalAffected": 100, "economicDamageUSD": 1000000.0}
            },
            {
                "subregion": "Northern America",
                "magnitude": 5.5,
                "impact": {"deaths": 10, "totalAffected": 200, "economicDamageUSD": 2000000.0}
            },
            {
                "subregion": "Eastern Africa",
                "magnitude": 6.0,
                "impact": {"deaths": 500, "totalAffected": 10000, "economicDamageUSD": 5000000.0}
            },
            {
                "subregion": "Western Europe",
                "magnitude": 4.5,
                "impact": {"deaths": 1, "totalAffected": 50, "economicDamageUSD": 500000.0}
            }
        ]
        
        # Mock database setup
        mock_db = MagicMock()
        mock_db.disaster_records.find.return_value = mock_records
        mock_db.list_collection_names.return_value = ["disaster_records"]
        
        mock_client = MagicMock()
        mock_client.get_default_database.return_value = mock_db
        mock_mongo_client.return_value = mock_client
        mock_load_uri.return_value = "mongodb://localhost:27017"
        
        # 2. Run the main execution logic from scripts/run_clustering.py
        # Instead of running the script as a subprocess, we can import and run main()
        from scripts.run_clustering import main as run_clustering_main
        
        # Run main and ensure it completes without raising exceptions
        try:
            run_clustering_main()
        except SystemExit as e:
            # Main will call sys.exit if there are issues, check code
            self.assertEqual(e.code, 0)
            
        # Verify bulk_write was called on regional_risk_clusters
        self.assertTrue(mock_db.regional_risk_clusters.bulk_write.called)
        
        # Verify indexes were created
        self.assertTrue(mock_db.regional_risk_clusters.create_index.called)
        
        # Retrieve the ops passed to bulk_write
        args, kwargs = mock_db.regional_risk_clusters.bulk_write.call_args
        ops = args[0]
        self.assertEqual(len(ops), 4) # 4 unique subregions
        
        # Verify the contents of one of the replacement documents
        first_op = ops[0]
        replacement = first_op._doc
        self.assertIn("subregion", replacement)
        self.assertIn("frequency", replacement)
        self.assertIn("mortalityRate", replacement)
        self.assertIn("economicRisk", replacement)
        self.assertIn("clusterId", replacement)
        self.assertIn("riskTier", replacement)
        self.assertIn(replacement["riskTier"], ["Low", "Medium", "High", "Extreme"])

if __name__ == '__main__':
    unittest.main()

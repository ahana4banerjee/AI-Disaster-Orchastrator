import unittest
from unittest.mock import patch, MagicMock
import os
import sys
import pandas as pd
import numpy as np
import asyncio

# Resolve paths to import ml_service
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, base_dir)

from api.endpoints.similarity import run_similarity

class TestMLSimilarity(unittest.TestCase):
    @patch('api.endpoints.similarity.get_similarity_resources')
    def test_run_similarity(self, mock_cache):
        # Mock preprocessor
        mock_prep = MagicMock()
        mock_transformed_df = pd.DataFrame({
            'subregion_encoded': [1.2],
            'latitude': [12.0],
            'longitude': [32.0],
            'sin_month': [0.48],
            'cos_month': [0.87],
            'magnitude_normalized': [1.45]
        })
        mock_prep.transform.return_value = mock_transformed_df
        
        # Mock KNN model
        mock_knn = MagicMock()
        mock_knn.kneighbors.return_value = (
            np.array([[0.05, 0.15, 0.30]]), # distances (cosine distance = 1 - cosine_similarity)
            np.array([[0, 1, 2]]) # indices
        )
        
        # Mock Scaler
        mock_scaler = MagicMock()
        mock_scaler.transform.return_value = np.array([[1.2, 12.0, 32.0, 0.48, 0.87, 1.45]])
        
        # Mock Lookup Records
        mock_records = [
            {
                "disNo": "2000-0001-KEN",
                "year": 2000,
                "country": "Kenya",
                "location": "Rift Valley region",
                "magnitude": 150.0,
                "deaths": 10,
                "affected": 500,
                "damage": 50.0,
                "disasterType": "Storm"
            },
            {
                "disNo": "2005-0002-IND",
                "year": 2005,
                "country": "India",
                "location": "Odisha coast",
                "magnitude": 180.0,
                "deaths": 50,
                "affected": 20000,
                "damage": 500.0,
                "disasterType": "Storm"
            },
            {
                "disNo": "2010-0003-KEN",
                "year": 2010,
                "country": "Kenya",
                "location": "Coastal Mombasa",
                "magnitude": 120.0,
                "deaths": 2,
                "affected": 100,
                "damage": 10.0,
                "disasterType": "Storm"
            }
        ]
        
        # Mock Centroids
        mock_centroids = {
            "IND": {"country": "India", "latitude": 20.59, "longitude": 78.96},
            "KEN": {"country": "Kenya", "latitude": 0.02, "longitude": 37.90}
        }
        
        # Setup mock cache
        mock_cache.return_value = {
            "prep": mock_prep,
            "knn": mock_knn,
            "scaler": mock_scaler,
            "records": mock_records,
            "centroids": mock_centroids
        }
        
        # Query parameters
        payload = {
            "disasterType": "Storm",
            "country": "Kenya",
            "region": "Rift Valley",
            "magnitude": 145.0
        }
        
        # Run async function using asyncio.run
        results = asyncio.run(run_similarity(payload))
        
        # Verify results count and mappings
        self.assertEqual(len(results), 3)
        
        # The first match should be Kenya 2000
        first_match = results[0]
        self.assertEqual(first_match["country"], "Kenya")
        self.assertEqual(first_match["year"], 2000)
        self.assertEqual(first_match["similarityPercentage"], 95.0) # 100 * (1 - 0.05)
        
        # The third match should be Kenya 2010
        third_match = results[2]
        self.assertEqual(third_match["country"], "Kenya")
        self.assertEqual(third_match["year"], 2010)
        self.assertEqual(third_match["similarityPercentage"], 70.0) # 100 * (1 - 0.30)
        
        # Check matching schema fields
        expected_fields = {"year", "country", "location", "magnitude", "deaths", "affectedPopulation", "economicDamageUSD", "similarityPercentage"}
        self.assertEqual(set(first_match.keys()), expected_fields)

if __name__ == '__main__':
    unittest.main()

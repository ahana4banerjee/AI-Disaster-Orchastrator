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
    @patch('api.endpoints.similarity.get_preprocessor_and_centroids')
    @patch('api.endpoints.similarity.fetch_historical_events')
    def test_run_similarity(self, mock_fetch, mock_cache):
        # Mock preprocessor
        mock_prep = MagicMock()
        
        # When preprocessor transform is called, return mock encoded features
        # Columns: 'sin_month', 'cos_month', 'magnitude_normalized', and categoricals
        # Query will be the last row
        mock_transformed_df = pd.DataFrame({
            'subregion_encoded': [1.0, 2.0, 3.0, 1.2], # query is last
            'latitude': [10.0, -20.0, 45.0, 12.0],
            'longitude': [30.0, -40.0, 120.0, 32.0],
            'sin_month': [0.5, -0.5, 0.0, 0.48],
            'cos_month': [0.86, -0.86, -1.0, 0.87],
            'magnitude_normalized': [1.5, -0.5, 2.0, 1.45]
        })
        mock_prep.transform.return_value = mock_transformed_df
        mock_prep.categorical_cols = ['country', 'disasterType']
        mock_prep.include_duration = False
        mock_prep.include_coordinates = True
        
        # Mock centroids mapping
        mock_centroids = {
            "IND": {"country": "India", "latitude": 20.59, "longitude": 78.96},
            "KEN": {"country": "Kenya", "latitude": 0.02, "longitude": 37.90}
        }
        
        mock_cache.return_value = {
            "prep": mock_prep,
            "centroids": mock_centroids
        }
        
        # Mock historical events from database (3 records)
        mock_hist_df = pd.DataFrame([
            {
                "disNo": "2000-0001-KEN",
                "startDate": "2000-01-15",
                "endDate": "2000-01-20",
                "disasterGroup": "Natural",
                "disasterSubgroup": "Meteorological",
                "disasterType": "Storm",
                "disasterSubtype": "Tropical cyclone",
                "country": "Kenya",
                "iso": "KEN",
                "region": "Rift Valley",
                "subregion": "Eastern Africa",
                "location": "Rift Valley region",
                "magnitude": 150.0,
                "severityScore": 1.2,
                "severityClass": "Medium",
                "deaths": 10,
                "affected": 500,
                "damage": 50.0,
                "longitude": 37.90,
                "latitude": 0.02
            },
            {
                "disNo": "2005-0002-IND",
                "startDate": "2005-06-10",
                "endDate": "2005-06-15",
                "disasterGroup": "Natural",
                "disasterSubgroup": "Meteorological",
                "disasterType": "Storm",
                "disasterSubtype": "Tropical cyclone",
                "country": "India",
                "iso": "IND",
                "region": "Odisha",
                "subregion": "Southern Asia",
                "location": "Odisha coast",
                "magnitude": 180.0,
                "severityScore": 2.5,
                "severityClass": "High",
                "deaths": 50,
                "affected": 20000,
                "damage": 500.0,
                "longitude": 78.96,
                "latitude": 20.59
            },
            {
                "disNo": "2010-0003-KEN",
                "startDate": "2010-12-05",
                "endDate": "2010-12-10",
                "disasterGroup": "Natural",
                "disasterSubgroup": "Meteorological",
                "disasterType": "Storm",
                "disasterSubtype": "Tropical cyclone",
                "country": "Kenya",
                "iso": "KEN",
                "region": "Mombasa",
                "subregion": "Eastern Africa",
                "location": "Coastal Mombasa",
                "magnitude": 120.0,
                "severityScore": 0.8,
                "severityClass": "Low",
                "deaths": 2,
                "affected": 100,
                "damage": 10.0,
                "longitude": 37.90,
                "latitude": 0.02
            }
        ])
        mock_fetch.return_value = mock_hist_df
        
        # Call API endpoint logic
        payload = {
            "disasterType": "Storm",
            "country": "Kenya",
            "region": "Rift Valley",
            "magnitude": 145.0
        }
        
        # Run async function using asyncio.run in a synchronous test wrapper
        results = asyncio.run(run_similarity(payload))
        
        # Verify result contains the expected 3 matches
        self.assertEqual(len(results), 3)
        
        # The first result should be the most similar event (Kenya 2000 Storm)
        first_match = results[0]
        self.assertEqual(first_match["country"], "Kenya")
        self.assertEqual(first_match["year"], 2000)
        self.assertIn("similarityPercentage", first_match)
        self.assertTrue(0.0 <= first_match["similarityPercentage"] <= 100.0)
        
        # Check matching schema fields
        expected_fields = {"year", "country", "location", "magnitude", "deaths", "affectedPopulation", "economicDamageUSD", "similarityPercentage"}
        self.assertEqual(set(first_match.keys()), expected_fields)

if __name__ == '__main__':
    unittest.main()

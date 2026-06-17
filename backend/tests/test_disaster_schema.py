import os
import sys
import unittest
from datetime import datetime

# Insert backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.schemas.disaster import DisasterRecordCreate, DisasterImpactSchema
from app.services.data_pipeline import DisasterDataPipeline

class TestDisasterSchema(unittest.TestCase):
    def setUp(self):
        self.pipeline = DisasterDataPipeline()

    def test_deaths_zero_imputation(self):
        # Case A: deaths is None -> imputed to 0, deaths_is_missing = True
        impact_a = DisasterImpactSchema(deaths=None, injured=5)
        self.assertEqual(impact_a.deaths, 0)
        self.assertTrue(impact_a.deaths_is_missing)
        self.assertEqual(impact_a.totalAffected, 5)

        # Case B: deaths is empty string -> imputed to 0, deaths_is_missing = True
        impact_b = DisasterImpactSchema(deaths="")
        self.assertEqual(impact_b.deaths, 0)
        self.assertTrue(impact_b.deaths_is_missing)

        # Case C: deaths is valid integer -> kept, deaths_is_missing = False
        impact_c = DisasterImpactSchema(deaths=15)
        self.assertEqual(impact_c.deaths, 15)
        self.assertFalse(impact_c.deaths_is_missing)

    def test_impact_fields_cleanup(self):
        # Optional fields passed as empty strings should be cleaned to None
        impact = DisasterImpactSchema(injured="", affected="", homeless="", economicDamageUSD="")
        self.assertIsNone(impact.injured)
        self.assertIsNone(impact.affected)
        self.assertIsNone(impact.homeless)
        self.assertIsNone(impact.economicDamageUSD)

    def test_total_affected_aggregation(self):
        # totalAffected = injured + affected + homeless if missing
        impact = DisasterImpactSchema(injured=10, affected=100, homeless=5)
        self.assertEqual(impact.totalAffected, 115)

    def test_centroid_fallback(self):
        # If geoJSON is missing but iso is KEN, fallback to Kenya centroid [39.7797, 0.0044]
        record_data = {
            "disNo": "2026-TEST-01",
            "disasterGroup": "Natural",
            "disasterType": "Flood",
            "country": "Kenya",
            "iso": "KEN",
            "startDate": datetime(2026, 6, 18),
            "impact": {}
        }
        record = DisasterRecordCreate(**record_data)
        self.assertEqual(record.geoJSON.type, "Point")
        self.assertEqual(record.geoJSON.coordinates, [39.7797, 0.0044])

    def test_latitude_longitude_top_level_priority(self):
        # If geoJSON is missing but top level Latitude/Longitude are provided, use them
        record_data = {
            "disNo": "2026-TEST-02",
            "disasterGroup": "Natural",
            "disasterType": "Flood",
            "country": "Kenya",
            "iso": "KEN",
            "startDate": datetime(2026, 6, 18),
            "impact": {},
            "Latitude": -4.0435,
            "Longitude": 39.6682
        }
        record = DisasterRecordCreate(**record_data)
        self.assertEqual(record.geoJSON.coordinates, [39.6682, -4.0435])

    def test_pipeline_filters_pre_2000(self):
        # Start year < 2000 -> dropped
        row_pre_2000 = {
            "DisNo.": "1999-0012-KEN",
            "Disaster Group": "Natural",
            "Disaster Type": "Flood",
            "Country": "Kenya",
            "ISO": "KEN",
            "Start Year": "1999",
            "Start Month": "5",
            "Start Day": "12"
        }
        self.assertIsNone(self.pipeline.clean_row(row_pre_2000))

        # Year in DisNo prefix < 2000 -> dropped
        row_id_pre_2000 = {
            "DisNo.": "1998-0424-VEN",
            "Disaster Group": "Natural",
            "Disaster Type": "Flood",
            "Country": "Venezuela",
            "ISO": "VEN",
            "Start Year": "2026",
            "Start Month": "9",
            "Start Day": "11"
        }
        self.assertIsNone(self.pipeline.clean_row(row_id_pre_2000))

    def test_pipeline_filters_invalid_end_date(self):
        # endDate < startDate -> dropped
        row_invalid_dates = {
            "DisNo.": "2026-0005-KEN",
            "Disaster Group": "Natural",
            "Disaster Type": "Flood",
            "Country": "Kenya",
            "ISO": "KEN",
            "Start Year": "2026",
            "Start Month": "6",
            "Start Day": "18",
            "End Year": "2026",
            "End Month": "6",
            "End Day": "17"
        }
        self.assertIsNone(self.pipeline.clean_row(row_invalid_dates))

    def test_pipeline_date_clipping(self):
        # Day 31 for June -> clipped to June 30
        row_overflow_day = {
            "DisNo.": "2026-0006-KEN",
            "Disaster Group": "Natural",
            "Disaster Type": "Flood",
            "Country": "Kenya",
            "ISO": "KEN",
            "Start Year": "2026",
            "Start Month": "6",
            "Start Day": "31"
        }
        cleaned = self.pipeline.clean_row(row_overflow_day)
        self.assertIsNotNone(cleaned)
        self.assertEqual(cleaned["startDate"].day, 30)

    def test_severity_score_and_class(self):
        # Test low, medium, high, extreme classifications
        # Low: score <= 0.7199
        score_low, class_low = self.pipeline.calculate_severity(deaths=0, total_affected=0, damage_thousands=0)
        self.assertEqual(class_low, "Low")

        # Medium: 0.7199 < score <= 1.8125
        score_med, class_med = self.pipeline.calculate_severity(deaths=10, total_affected=100, damage_thousands=0)
        self.assertEqual(class_med, "Medium")

        # High: 1.8125 < score <= 3.5907
        score_high, class_high = self.pipeline.calculate_severity(deaths=200, total_affected=50000, damage_thousands=1000)
        self.assertEqual(class_high, "High")

        # Extreme: score > 3.5907
        score_extreme, class_extreme = self.pipeline.calculate_severity(deaths=25000, total_affected=15000000, damage_thousands=5000000)
        self.assertEqual(class_extreme, "Extreme")

if __name__ == "__main__":
    unittest.main()

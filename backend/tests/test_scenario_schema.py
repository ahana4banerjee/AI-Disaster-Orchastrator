import os
import sys
import unittest
from pydantic import ValidationError

# Insert backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.schemas.scenario import ScenarioCreate, ScenarioUpdate, ScenarioResponse, TimelineParameters

class TestScenarioSchemas(unittest.TestCase):

    def test_timeline_parameters_default(self):
        params = TimelineParameters()
        self.assertEqual(params.durationHours, 48)
        self.assertEqual(params.cascadingIntervalHours, 12)

    def test_timeline_parameters_validation(self):
        # Must be >= 1
        with self.assertRaises(ValidationError):
            TimelineParameters(durationHours=0)
        
        with self.assertRaises(ValidationError):
            TimelineParameters(cascadingIntervalHours=-5)

    def test_scenario_create_valid(self):
        data = {
            "name": "Cyclone Alpha Scenario",
            "description": "Simulation checklist scenario",
            "disasterType": "Storm",
            "disasterSubtype": "Tropical cyclone",
            "country": "India",
            "iso": "IND",
            "region": "Odisha",
            "magnitude": 220.5,
            "magnitudeScale": "Kph",
            "notes": "Emergency operational checks",
            "tags": ["cyclone", "east-coast"],
            "status": "Draft"
        }
        scenario = ScenarioCreate(**data)
        self.assertEqual(scenario.name, "Cyclone Alpha Scenario")
        self.assertEqual(scenario.magnitude, 220.5)
        self.assertEqual(scenario.iso, "IND")
        self.assertEqual(scenario.status, "Draft")

    def test_scenario_create_invalid_iso(self):
        data = {
            "name": "Cyclone Alpha Scenario",
            "disasterType": "Storm",
            "country": "India",
            "iso": "ind",  # Must be 3 capital letters
            "magnitude": 220.5,
            "magnitudeScale": "Kph"
        }
        with self.assertRaises(ValidationError):
            ScenarioCreate(**data)

    def test_scenario_create_invalid_status(self):
        data = {
            "name": "Cyclone Alpha Scenario",
            "disasterType": "Storm",
            "country": "India",
            "iso": "IND",
            "magnitude": 220.5,
            "magnitudeScale": "Kph",
            "status": "Active"  # Must be Draft or Published
        }
        with self.assertRaises(ValidationError):
            ScenarioCreate(**data)

    def test_scenario_create_negative_magnitude(self):
        data = {
            "name": "Cyclone Alpha Scenario",
            "disasterType": "Storm",
            "country": "India",
            "iso": "IND",
            "magnitude": -10.0,  # Must be ge=0.0
            "magnitudeScale": "Kph"
        }
        with self.assertRaises(ValidationError):
            ScenarioCreate(**data)

    def test_scenario_update_fields_optional(self):
        update_data = {
            "name": "Updated Name",
            "status": "Published"
        }
        update_model = ScenarioUpdate(**update_data)
        self.assertEqual(update_model.name, "Updated Name")
        self.assertEqual(update_model.status, "Published")
        self.assertIsNone(update_model.magnitude)

    def test_scenario_response_alias(self):
        raw_res = {
            "_id": "60a4f5f5f5f5f5f5f5f5f50b",
            "name": "Storm Scenario",
            "description": "desc",
            "disasterType": "Storm",
            "disasterSubtype": "",
            "country": "India",
            "iso": "IND",
            "region": "",
            "magnitude": 120.0,
            "magnitudeScale": "Kph",
            "timelineParameters": {
                "durationHours": 48,
                "cascadingIntervalHours": 12
            },
            "notes": "",
            "tags": [],
            "status": "Published",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "createdAt": "2026-07-01T02:00:00Z",
            "updatedAt": "2026-07-01T02:00:00Z"
        }
        res = ScenarioResponse(**raw_res)
        self.assertEqual(res.id, "60a4f5f5f5f5f5f5f5f5f50b")
        self.assertEqual(res.createdBy, "60a4f5f5f5f5f5f5f5f5f500")

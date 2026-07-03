import unittest
from app.services.cascade_engine import InfrastructureStateEngine, CascadeRulesEngine

class TestCascadeEngine(unittest.TestCase):
    def test_initialize_states_low_severity(self):
        # Low severity should yield Operational statuses
        states = InfrastructureStateEngine.initialize_states(expected_deaths=5, expected_affected=500)
        states_map = {s["name"]: s for s in states}
        self.assertEqual(states_map["Power Grid"]["status"], "Operational")
        self.assertEqual(states_map["Power Grid"]["color"], "emerald")
        self.assertEqual(states_map["Road Network"]["status"], "Operational")

    def test_initialize_states_extreme_severity(self):
        # High severity should yield Degraded or Failed statuses
        states = InfrastructureStateEngine.initialize_states(expected_deaths=150, expected_affected=120000)
        states_map = {s["name"]: s for s in states}
        self.assertEqual(states_map["Power Grid"]["status"], "Failed")
        self.assertEqual(states_map["Power Grid"]["color"], "extreme")
        self.assertEqual(states_map["Road Network"]["status"], "Degraded")

    def test_process_cascades_power_failure(self):
        # Setup initial infrastructure with failed Power Grid
        infra = [
            {"name": "Power Grid", "status": "Failed", "color": "extreme", "details": ""},
            {"name": "Road Network", "status": "Operational", "color": "emerald", "details": ""},
            {"name": "Hospitals", "status": "Operational", "color": "emerald", "details": ""},
            {"name": "Water Supply", "status": "Operational", "color": "emerald", "details": ""},
            {"name": "Telecommunications", "status": "Operational", "color": "emerald", "details": ""},
            {"name": "Fuel Supply", "status": "Operational", "color": "emerald", "details": ""}
        ]
        
        cascaded = CascadeRulesEngine.process_cascades(infra, hours_elapsed=6)
        states_map = {s["name"]: s for s in cascaded}
        # Water and Telecom should transition to Degraded due to power grid failure
        self.assertEqual(states_map["Water Supply"]["status"], "Degraded")
        self.assertEqual(states_map["Telecommunications"]["status"], "Degraded")
        self.assertEqual(states_map["Telecommunications"]["color"], "amber")

    def test_process_cascades_road_failure(self):
        # Setup initial infrastructure with failed Road Network
        infra = [
            {"name": "Power Grid", "status": "Operational", "color": "emerald", "details": ""},
            {"name": "Road Network", "status": "Failed", "color": "extreme", "details": ""},
            {"name": "Hospitals", "status": "Operational", "color": "emerald", "details": ""},
            {"name": "Water Supply", "status": "Operational", "color": "emerald", "details": ""},
            {"name": "Telecommunications", "status": "Operational", "color": "emerald", "details": ""},
            {"name": "Fuel Supply", "status": "Operational", "color": "emerald", "details": ""}
        ]

        cascaded = CascadeRulesEngine.process_cascades(infra, hours_elapsed=12)
        states_map = {s["name"]: s for s in cascaded}
        # Hospitals and Fuel should transition to Degraded
        self.assertEqual(states_map["Hospitals"]["status"], "Degraded")
        self.assertEqual(states_map["Fuel Supply"]["status"], "Degraded")

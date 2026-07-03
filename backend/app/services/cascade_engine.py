from typing import Dict, List, Any

class InfrastructureStateEngine:
    COLOR_MAP = {
        "Operational": "emerald",
        "Degraded": "amber",
        "Critical": "extreme",
        "Failed": "extreme",
        "Recovery": "emerald"
    }

    @staticmethod
    def get_color(status: str) -> str:
        return InfrastructureStateEngine.COLOR_MAP.get(status, "emerald")

    @staticmethod
    def initialize_states(expected_deaths: int, expected_affected: int) -> List[Dict[str, Any]]:
        # Map severity thresholds to configure initial infrastructure degradation indices
        power_status = "Operational"
        road_status = "Operational"
        hospital_status = "Operational"
        water_status = "Operational"
        telecom_status = "Operational"
        fuel_status = "Operational"

        if expected_deaths > 100 or expected_affected > 100000:
            power_status = "Failed"
            road_status = "Degraded"
            hospital_status = "Degraded"
        elif expected_deaths > 30 or expected_affected > 20000:
            power_status = "Degraded"
            road_status = "Degraded"
        
        if expected_affected > 50000:
            hospital_status = "Degraded"
            water_status = "Degraded"

        return [
            {
                "name": "Power Grid",
                "status": power_status,
                "color": InfrastructureStateEngine.get_color(power_status),
                "details": "Main distribution normal (100% capacity)" if power_status == "Operational" else "Substations offline due to initial impact"
            },
            {
                "name": "Road Network",
                "status": road_status,
                "color": InfrastructureStateEngine.get_color(road_status),
                "details": "All highway arteries open" if road_status == "Operational" else "Water logging or debris blocking secondary corridors"
            },
            {
                "name": "Hospitals",
                "status": hospital_status,
                "color": InfrastructureStateEngine.get_color(hospital_status),
                "details": "Bed capacity within limits" if hospital_status == "Operational" else "High casualty surge; emergency triaging warning"
            },
            {
                "name": "Water Supply",
                "status": water_status,
                "color": InfrastructureStateEngine.get_color(water_status),
                "details": "Reservoirs operating at baseline" if water_status == "Operational" else "Distribution network operating on low reserve pressure"
            },
            {
                "name": "Telecommunications",
                "status": telecom_status,
                "color": InfrastructureStateEngine.get_color(telecom_status),
                "details": "LTE / SatCom repeaters operational" if telecom_status == "Operational" else "Satellite backhaul experiencing noise/outages"
            },
            {
                "name": "Fuel Supply",
                "status": fuel_status,
                "color": InfrastructureStateEngine.get_color(fuel_status),
                "details": "Strategic reserves at 100%" if fuel_status == "Operational" else "Strategic depot access hampered"
            }
        ]

class CascadeRulesEngine:
    @staticmethod
    def process_cascades(previous_infra: List[Dict[str, Any]], hours_elapsed: int) -> List[Dict[str, Any]]:
        # Clone previous states
        new_infra = [dict(item) for item in previous_infra]
        infra_map = {item["name"]: item for item in new_infra}

        # Retrieve utility statuses
        power = infra_map.get("Power Grid", {})
        roads = infra_map.get("Road Network", {})
        hospitals = infra_map.get("Hospitals", {})
        water = infra_map.get("Water Supply", {})
        telecom = infra_map.get("Telecommunications", {})
        fuel = infra_map.get("Fuel Supply", {})

        # Apply sequential cascading rules logic
        # 1. Power grid failure collapses telecom and water supply
        if power.get("status") in ["Failed", "Critical"]:
            if water.get("status") == "Operational":
                water["status"] = "Degraded"
                water["details"] = "Water pumps running on emergency battery backup."
            elif water.get("status") == "Degraded":
                water["status"] = "Failed"
                water["details"] = "Pumping stations shut down due to grid collapse."

            if telecom.get("status") == "Operational":
                telecom["status"] = "Degraded"
                telecom["details"] = "Tower repeaters switching to backup diesel generators."
            elif telecom.get("status") == "Degraded":
                telecom["status"] = "Failed"
                telecom["details"] = "LTE cells offline. Backhaul failed."

        # 2. Road network failure degrades hospital supply delivery and fuel distribution
        if roads.get("status") in ["Failed", "Critical"]:
            if hospital_status := hospitals.get("status"):
                if hospital_status == "Operational":
                    hospitals["status"] = "Degraded"
                    hospitals["details"] = "Ambulances delayed by roadblocks. Medical supply levels declining."
                elif hospital_status == "Degraded":
                    hospitals["status"] = "Failed"
                    hospitals["details"] = "Staff surge locked out. Disaster response overflow."

            if fuel.get("status") == "Operational":
                fuel["status"] = "Degraded"
                fuel["details"] = "Fuel truck routing restricted by flooded corridors."

        # 3. Fuel supply collapse breaks hospital generators
        if fuel.get("status") in ["Failed", "Critical"]:
            if hospitals.get("status") == "Degraded":
                hospitals["status"] = "Failed"
                hospitals["details"] = "Emergency backup generators out of fuel; ICU cooling failed."

        # Sync color codes
        for item in new_infra:
            item["color"] = InfrastructureStateEngine.get_color(item["status"])

        return new_infra

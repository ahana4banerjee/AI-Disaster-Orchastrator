import httpx
from app.core.config import settings

class TimelineEngine:
    @staticmethod
    async def run_step_0(scenario: dict) -> dict:
        predict_payload = {
            "disasterType": scenario.get("disasterType", "Storm"),
            "disasterSubtype": scenario.get("disasterSubtype", ""),
            "country": scenario.get("country", ""),
            "region": scenario.get("region", ""),
            "magnitude": scenario.get("magnitude", 0.0),
            "startMonth": 6
        }
        
        predictions = {}
        try:
            async with httpx.AsyncClient() as client:
                p_resp = await client.post(
                    f"{settings.ML_SERVICE_URL}/predict/",
                    json=predict_payload,
                    timeout=5.0
                )
                if p_resp.status_code == 200:
                    predictions = p_resp.json()
        except Exception:
            pass

        # Parse outcome casualty indices (deaths, affected)
        if predictions and "impactMetrics" in predictions:
            metrics = predictions["impactMetrics"]
            expected_deaths = int(metrics.get("expectedDeaths", 5))
            expected_affected = int(metrics.get("expectedTotalAffected", 1000))
            expected_damage = float(metrics.get("expectedDamageUSD", 50000.0))
        else:
            # Fallback heuristic calculation
            mag = scenario.get("magnitude", 0.0)
            dtype = scenario.get("disasterType", "Storm").lower()
            if "storm" in dtype:
                expected_deaths = int(mag * 0.3)
                expected_affected = int(mag * 2000)
                expected_damage = mag * 50000.0
            elif "flood" in dtype:
                expected_deaths = int(mag * 0.5)
                expected_affected = int(mag * 3000)
                expected_damage = mag * 30000.0
            else:
                expected_deaths = int(mag * 0.2)
                expected_affected = int(mag * 1000)
                expected_damage = mag * 20000.0

        expected_deaths = max(1, expected_deaths)
        expected_affected = max(10, expected_affected)
        expected_damage = max(1000.0, expected_damage)

        from app.services.cascade_engine import InfrastructureStateEngine
        infra_states = InfrastructureStateEngine.initialize_states(expected_deaths, expected_affected)

        # Hour 0 landfall details
        return {
            "step": 0,
            "timeLabel": "Hour 0: Landfall",
            "status": "Active",
            "narrative": f"Simulated {scenario.get('disasterType')} onset triggered. Core physical impacts and initial structural degradations observed.",
            "metrics": {
                "activeCasualties": expected_deaths,
                "displacedPopulation": expected_affected,
                "structuralDamagePercentage": min(100.0, max(1.0, float(expected_deaths * 0.05 + 1.0)))
            },
            "infrastructureStates": infra_states
        }

    @staticmethod
    async def run_step_1(scenario: dict, previous_step_doc: dict) -> dict:
        decay_multiplier = 1.0
        try:
            similarity_payload = {
                "disasterType": scenario.get("disasterType", "Storm"),
                "country": scenario.get("country", ""),
                "region": scenario.get("region", ""),
                "magnitude": scenario.get("magnitude", 0.0)
            }
            async with httpx.AsyncClient() as client:
                sim_resp = await client.post(
                    f"{settings.ML_SERVICE_URL}/similarity/",
                    json=similarity_payload,
                    timeout=5.0
                )
                if sim_resp.status_code == 200:
                    analogs = sim_resp.json()
                    if isinstance(analogs, list) and len(analogs) > 0:
                        first_score = analogs[0].get("similarity_score", 0.0)
                        if first_score > 0.7:
                            decay_multiplier = 1.25
                        elif first_score > 0.5:
                            decay_multiplier = 1.15
        except Exception:
            pass

        prev_metrics = previous_step_doc.get("metrics", {})
        prev_infra = previous_step_doc.get("infrastructureStates", [])

        from app.services.cascade_engine import CascadeRulesEngine
        new_infra = CascadeRulesEngine.process_cascades(prev_infra, hours_elapsed=6)

        prev_deaths = prev_metrics.get("activeCasualties", 10)
        prev_affected = prev_metrics.get("displacedPopulation", 1000)
        prev_damage = prev_metrics.get("structuralDamagePercentage", 5.0)

        power_failed = any(item for item in new_infra if item["name"] == "Power Grid" and item["status"] in ["Failed", "Critical"])
        stress_factor = 1.3 if power_failed else 1.0

        new_deaths = prev_deaths + int(prev_deaths * 0.12 * decay_multiplier * stress_factor)
        new_affected = prev_affected + int(prev_affected * 0.08 * decay_multiplier * stress_factor)
        new_damage = min(100.0, prev_damage + (4.5 * decay_multiplier * stress_factor))

        return {
            "step": 1,
            "timeLabel": "Hour 6: Primary Grid Cascades",
            "status": "Active",
            "narrative": "Hour 6: Secondary utility failures observed. Primary electrical grid distribution outages have triggered telecommunications and water distribution failures across affected sectors.",
            "metrics": {
                "activeCasualties": max(1, new_deaths),
                "displacedPopulation": max(10, new_affected),
                "structuralDamagePercentage": round(new_damage, 2)
            },
            "infrastructureStates": new_infra
        }

    @staticmethod
    async def run_step_2(scenario: dict, previous_step_doc: dict, db) -> dict:
        # ML Integration: query risk cluster based on scenario's subregion
        iso_code = scenario.get("iso", "")
        country_name = scenario.get("country", "")
        subregion = "Southern Asia"  # Default fallback subregion for Odisha / India
        
        try:
            disaster_rec = await db.disasters.find_one({"iso": iso_code})
            if not disaster_rec and country_name:
                disaster_rec = await db.disasters.find_one({"country": country_name})
            if disaster_rec and disaster_rec.get("subregion"):
                subregion = disaster_rec.get("subregion")
        except Exception:
            pass

        logistics_multiplier = 1.0
        try:
            cluster_doc = await db.regional_risk_clusters.find_one({"subregion": subregion})
            if not cluster_doc and subregion:
                cluster_doc = await db.regional_risk_clusters.find_one(
                    {"subregion": {"$regex": f"^{subregion}$", "$options": "i"}}
                )
            if cluster_doc:
                tier = cluster_doc.get("riskTier", "Medium")
                if tier == "High":
                    logistics_multiplier = 1.30
                elif tier == "Medium":
                    logistics_multiplier = 1.15
                else:
                    logistics_multiplier = 1.0
        except Exception:
            pass

        prev_metrics = previous_step_doc.get("metrics", {})
        prev_infra = previous_step_doc.get("infrastructureStates", [])

        # Clone and process standard cascades
        from app.services.cascade_engine import CascadeRulesEngine, InfrastructureStateEngine
        new_infra = CascadeRulesEngine.process_cascades(prev_infra, hours_elapsed=12)

        # 1. Cascade Rule: Heavy flood levels or cyclone duration >= 12h -> Road Network Failed
        dtype = scenario.get("disasterType", "Storm").lower()
        mag = scenario.get("magnitude", 0.0)
        
        road_network = next((item for item in new_infra if item["name"] == "Road Network"), None)
        if road_network:
            if "flood" in dtype or ("storm" in dtype and mag > 120.0) or (dtype == "storm"):
                road_network["status"] = "Failed"
                road_network["details"] = "Critical transportation corridors blocked by high water levels and debris."

        # 2. Cascade Rule: Road Network Failed + Communication Degraded -> Emergency Shelters Degraded (logistics supply routes blocked)
        telecom_status = next((item for item in new_infra if item["name"] == "Telecommunications"), {}).get("status", "Operational")
        
        shelter_status = "Operational"
        shelter_details = "All emergency evacuation shelters operating with stable logistics lines."
        
        if road_network and road_network["status"] in ["Failed", "Critical"] and telecom_status in ["Degraded", "Failed", "Critical"]:
            shelter_status = "Degraded"
            shelter_details = "Logistic delivery corridors cut off. Fresh water, food, and medical supplies delayed."

        # Pushing the shelters node to EOC grid
        new_infra.append({
            "name": "Emergency Shelters",
            "status": shelter_status,
            "color": InfrastructureStateEngine.get_color(shelter_status),
            "details": shelter_details
        })

        # Sync color codes
        for item in new_infra:
            item["color"] = InfrastructureStateEngine.get_color(item["status"])

        # Calculate step metrics scaled by risk cluster logistics multiplier
        prev_deaths = prev_metrics.get("activeCasualties", 10)
        prev_affected = prev_metrics.get("displacedPopulation", 1000)
        prev_damage = prev_metrics.get("structuralDamagePercentage", 5.0)

        # High logistics strain multiplies displacement and casualty surge
        new_deaths = prev_deaths + int(prev_deaths * 0.15 * logistics_multiplier)
        new_affected = prev_affected + int(prev_affected * 0.10 * logistics_multiplier)
        new_damage = min(100.0, prev_damage + (6.0 * logistics_multiplier))

        return {
            "step": 2,
            "timeLabel": "Hour 12: Transportation Corridors",
            "status": "Active",
            "narrative": "Hour 12: Transportation arteries have collapsed due to severe local blockages. Evacuation shelters are experiencing logistical shortages as supply lines are cut.",
            "metrics": {
                "activeCasualties": max(1, new_deaths),
                "displacedPopulation": max(10, new_affected),
                "structuralDamagePercentage": round(new_damage, 2)
            },
            "infrastructureStates": new_infra
        }

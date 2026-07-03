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

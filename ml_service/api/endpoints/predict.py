import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException

router = APIRouter()

# Setup paths to import ml_service modules
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, base_dir)

from src.preprocessing import DerivedSeverityClassifier, DisasterPreprocessor, SeverityLabelGenerator

registry_dir = os.path.join(base_dir, "models", "registry")
clf_path = os.path.join(registry_dir, "severity_classifier.joblib")
prep_path = os.path.join(registry_dir, "preprocessor.joblib")
lbl_base_path = os.path.join(registry_dir, "severity_label_generator_baseline.joblib")

# Cache models in memory
model_cache = {}

def get_models():
    if not model_cache:
        if not (os.path.exists(clf_path) and os.path.exists(prep_path) and os.path.exists(lbl_base_path)):
            raise RuntimeError("Model binaries not found in registry. Run training first.")
        model_cache["clf"] = joblib.load(clf_path)
        model_cache["prep"] = joblib.load(prep_path)
        model_cache["lbl_base"] = joblib.load(lbl_base_path)
        
        # Load country centroids
        centroids_path = os.path.join(base_dir, "..", "scripts", "country_centroids.json")
        centroids = {}
        if os.path.exists(centroids_path):
            with open(centroids_path, "r", encoding="utf-8") as f:
                centroids = json.load(f)
        model_cache["centroids"] = centroids
        
    return model_cache

@router.post("/")
async def run_predict(payload: dict):
    try:
        models = get_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model loading error: {str(e)}")
        
    disaster_type = payload.get("disasterType", "Storm")
    country_name = payload.get("country", "").strip()
    
    # Resolve country centroids and ISO
    iso = None
    lat = 0.0
    lon = 0.0
    centroids = models["centroids"]
    country_map = {
        "india": "IND", "kenya": "KEN", "bangladesh": "BGD", "nepal": "NPL", 
        "philippines": "PHL", "indonesia": "IDN", "sri lanka": "LKA"
    }
    for code, info in centroids.items():
        if isinstance(info, dict):
            c_name = info.get("country", "").lower()
            c_lat = info.get("latitude", 0.0)
            c_lon = info.get("longitude", 0.0)
        else:
            c_name = ""
            c_lon = info[0] if len(info) > 0 else 0.0
            c_lat = info[1] if len(info) > 1 else 0.0
            
        target_iso = country_map.get(country_name.lower(), country_name.lower())
        if c_name == country_name.lower() or code.lower() == target_iso:
            iso = code
            lat = c_lat
            lon = c_lon
            break
            
    # Resolve subgroup mapping
    subgroup_map = {
        "Flood": "Hydrological",
        "Storm": "Meteorological",
        "Earthquake": "Geophysical",
        "Epidemic": "Biological",
        "Landslide": "Hydrological",
        "Extreme temperature": "Meteorological",
        "Drought": "Climatological",
        "Wildfire": "Climatological",
        "Volcanic activity": "Geophysical",
        "Mass movement (dry)": "Geophysical"
    }
    disaster_subgroup = subgroup_map.get(disaster_type, "Meteorological")
    
    start_month = int(payload.get("startMonth", 6))
    start_date_str = f"2026-{start_month:02d}-01"
    
    # Construct raw DataFrame matching train feature columns
    raw_data = {
        "startDate": [start_date_str],
        "endDate": [start_date_str],
        "disasterType": [disaster_type],
        "disasterSubgroup": [disaster_subgroup],
        "country": [country_name if country_name else "Global"],
        "iso": [iso if iso else "GLB"],
        "region": [payload.get("region", "Global")],
        "subregion": ["Global"],
        "magnitude": [payload.get("magnitude", None)],
        "longitude": [lon],
        "latitude": [lat]
    }
    df_raw = pd.DataFrame(raw_data)
    
    try:
        # Preprocess features
        prep = models["prep"]
        X_trans = prep.transform(df_raw)
        
        # Predict severity and impacts
        clf = models["clf"]
        pred_class_idx = clf.predict(X_trans)[0]
        pred_class = models["lbl_base"].class_names[int(pred_class_idx)]
        
        impacts = clf.predict_impacts(X_trans)
        
        health_mult = float(payload.get("healthStressMultiplier", 1.0))
        
        # Generate final response
        return {
            "severityClass": pred_class,
            "impactMetrics": {
                "expectedDeaths": int(round(impacts["deaths"][0] * health_mult)),
                "expectedTotalAffected": int(round(impacts["affected"][0] * health_mult)),
                "expectedDamageUSD": float(impacts["damage"][0])
            },
            "confidenceScore": 0.85,
            "riskIndex": float(np.clip(25.0 * pred_class_idx + 12.5, 0.0, 100.0))
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference error: {str(e)}")

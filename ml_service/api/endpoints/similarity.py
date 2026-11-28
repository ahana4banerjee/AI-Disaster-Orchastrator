import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

router = APIRouter()

# Setup paths to import ml_service modules
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, base_dir)

from src.preprocessing import DisasterPreprocessor

registry_dir = os.path.join(base_dir, "models", "registry")
prep_path = os.path.join(registry_dir, "preprocessor.joblib")
knn_path = os.path.join(registry_dir, "knn_similarity.joblib")
scaler_path = os.path.join(registry_dir, "similarity_scaler.joblib")
records_path = os.path.join(registry_dir, "similarity_records.joblib")

# Cache preprocessor, models, and centroids in memory
state_cache = {}

def get_similarity_resources():
    if not state_cache:
        if not (os.path.exists(prep_path) and os.path.exists(knn_path) and 
                os.path.exists(scaler_path) and os.path.exists(records_path)):
            raise RuntimeError("Model binaries not found in registry. Run training first.")
        
        state_cache["prep"] = joblib.load(prep_path)
        state_cache["knn"] = joblib.load(knn_path)
        state_cache["scaler"] = joblib.load(scaler_path)
        state_cache["records"] = joblib.load(records_path)
        
        # Load country centroids
        centroids_path = os.path.join(base_dir, "..", "scripts", "country_centroids.json")
        centroids = {}
        if os.path.exists(centroids_path):
            with open(centroids_path, "r", encoding="utf-8") as f:
                centroids = json.load(f)
        state_cache["centroids"] = centroids
        
    return state_cache

@router.post("/")
async def run_similarity(payload: dict):
    try:
        cache = get_similarity_resources()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model loading error: {str(e)}")
        
    disaster_type = payload.get("disasterType", "Storm")
    query_country = payload.get("country", "").strip()
    query_region = payload.get("region", "").strip()
    query_mag = payload.get("magnitude")
    
    # Resolve country centroids and ISO for query scenario
    iso = None
    lat = 0.0
    lon = 0.0
    centroids = cache["centroids"]
    country_map = {
        "india": "IND", "kenya": "KEN", "bangladesh": "BGD", "nepal": "NPL",
        "philippines": "PHL", "indonesia": "IDN", "sri lanka": "LKA",
        "japan": "JPN", "united states": "USA", "usa": "USA", "china": "CHN",
        "turkey": "TUR", "brazil": "BRA", "mexico": "MEX", "pakistan": "PAK",
        "italy": "ITA", "greece": "GRC", "australia": "AUS",
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
            
        target_iso = country_map.get(query_country.lower(), query_country.lower())
        if c_name == query_country.lower() or code.lower() == target_iso:
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
    
    # Construct raw DataFrame row for query
    query_row = {
        "startDate": pd.NaT,
        "endDate": pd.NaT,
        "disasterType": disaster_type,
        "disasterSubgroup": disaster_subgroup,
        "country": query_country if query_country else "Global",
        "iso": iso if iso else "GLB",
        "region": query_region if query_region else "Global",
        "subregion": "Global",
        "magnitude": query_mag,
        "longitude": lon,
        "latitude": lat
    }
    df_query = pd.DataFrame([query_row])
    
    try:
        prep = cache["prep"]
        X_trans = prep.transform(df_query)
        
        # Select similarity features
        similarity_features = ['subregion_encoded', 'latitude', 'longitude', 'sin_month', 'cos_month', 'magnitude_normalized']
        X_features = X_trans[similarity_features]
        
        # Scale features using pre-fitted StandardScaler
        scaler = cache["scaler"]
        query_vector = scaler.transform(X_features)
        
        # Load pre-saved lookup records
        records = cache["records"]

        # Run KNN query across enough neighbors to guarantee up to 5 same-type matches
        knn = cache["knn"]
        k_search = min(len(records), 2000)
        distances, indices = knn.kneighbors(query_vector, n_neighbors=k_search)
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            rec = records[idx]
            
            # Filter by disasterType to ensure same-type matching
            if rec["disasterType"].lower() != disaster_type.lower():
                continue
                
            sim_pct = float(np.clip((1.0 - dist) * 100.0, 0.0, 100.0))
            
            mag_val = rec["magnitude"]
            mag_float = float(mag_val) if pd.notnull(mag_val) and str(mag_val).strip() != "" else None
            deaths_val = int(rec['deaths'])
            aff_val = int(rec['affected'])
            dmg_val = float(rec['damage'])

            if deaths_val >= 100 or aff_val >= 100000:
                sev_class = "Extreme"
            elif deaths_val >= 20 or aff_val >= 20000:
                sev_class = "High"
            elif deaths_val >= 3 or aff_val >= 2000:
                sev_class = "Moderate"
            else:
                sev_class = "Low"
            
            results.append({
                "year": int(rec['year']),
                "disasterType": str(rec['disasterType']),
                "country": str(rec['country']),
                "location": str(rec['location']),
                "magnitude": mag_float,
                "deaths": deaths_val,
                "affectedPopulation": aff_val,
                "economicDamageUSD": dmg_val,
                "severityClass": sev_class,
                "similarityPercentage": round(sim_pct, 2)
            })
            
            if len(results) >= 5:
                break
                
        # Sort by similarity percentage descending
        results = sorted(results, key=lambda x: x["similarityPercentage"], reverse=True)
        return results
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Similarity processing error: {str(e)}")

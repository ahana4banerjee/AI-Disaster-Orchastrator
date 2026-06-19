import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pymongo import MongoClient
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

router = APIRouter()

# Setup paths to import ml_service modules
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, base_dir)

from src.preprocessing import DisasterPreprocessor

registry_dir = os.path.join(base_dir, "models", "registry")
prep_path = os.path.join(registry_dir, "preprocessor.joblib")

# Cache preprocessor and centroids in memory
state_cache = {}

def get_preprocessor_and_centroids():
    if not state_cache:
        if not os.path.exists(prep_path):
            raise RuntimeError("Preprocessor binary not found in registry. Run training first.")
        state_cache["prep"] = joblib.load(prep_path)
        
        # Load country centroids
        centroids_path = os.path.join(base_dir, "..", "scripts", "country_centroids.json")
        centroids = {}
        if os.path.exists(centroids_path):
            with open(centroids_path, "r", encoding="utf-8") as f:
                centroids = json.load(f)
        state_cache["centroids"] = centroids
        
    return state_cache

def load_env_mongo_uri():
    env_path = os.path.join(base_dir, "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if stripped.startswith("MONGO_URI="):
                    val = stripped.split("=", 1)[1].strip()
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    return val
    return os.getenv("MONGO_URI")

def fetch_historical_events(disaster_type: str):
    mongo_uri = load_env_mongo_uri()
    if not mongo_uri:
        raise RuntimeError("MONGO_URI not configured.")
        
    client = MongoClient(mongo_uri)
    db = client.get_default_database(default="disaster_db")
    records = list(db.disaster_records.find({"disasterType": disaster_type}))
    
    flat_records = []
    for r in records:
        flat = {
            "disNo": r.get("disNo"),
            "startDate": r.get("startDate"),
            "endDate": r.get("endDate"),
            "disasterGroup": r.get("disasterGroup"),
            "disasterSubgroup": r.get("disasterSubgroup"),
            "disasterType": r.get("disasterType"),
            "disasterSubtype": r.get("disasterSubtype"),
            "country": r.get("country"),
            "iso": r.get("iso"),
            "region": r.get("region"),
            "subregion": r.get("subregion"),
            "location": r.get("location") or r.get("region") or "",
            "magnitude": r.get("magnitude"),
            "severityScore": r.get("severityScore"),
            "severityClass": r.get("severityClass"),
            "deaths": r.get("impact", {}).get("deaths", 0),
            "affected": r.get("impact", {}).get("totalAffected", 0),
            "damage": r.get("impact", {}).get("economicDamageUSD", 0) or 0.0,
            "longitude": r.get("geoJSON", {}).get("coordinates", [None, None])[0],
            "latitude": r.get("geoJSON", {}).get("coordinates", [None, None])[1]
        }
        flat_records.append(flat)
    return pd.DataFrame(flat_records)

@router.post("/")
async def run_similarity(payload: dict):
    try:
        cache = get_preprocessor_and_centroids()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model loading error: {str(e)}")
        
    disaster_type = payload.get("disasterType", "Storm")
    query_country = payload.get("country", "").strip()
    query_region = payload.get("region", "").strip()
    query_mag = payload.get("magnitude")
    
    # Fetch records of the same disaster type
    try:
        df_hist = fetch_historical_events(disaster_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database fetch error: {str(e)}")
        
    if len(df_hist) == 0:
        return []
        
    # Resolve country centroids and ISO for query scenario
    iso = None
    lat = 0.0
    lon = 0.0
    centroids = cache["centroids"]
    for code, info in centroids.items():
        if info.get("country", "").lower() == query_country.lower() or code.lower() == query_country.lower():
            iso = code
            lat = info.get("latitude", 0.0)
            lon = info.get("longitude", 0.0)
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
        "disNo": "QUERY",
        "startDate": pd.NaT,
        "endDate": pd.NaT,
        "disasterGroup": "Natural",
        "disasterSubgroup": disaster_subgroup,
        "disasterType": disaster_type,
        "disasterSubtype": "",
        "country": query_country if query_country else "Global",
        "iso": iso if iso else "GLB",
        "region": query_region if query_region else "Global",
        "subregion": "Global",
        "location": query_region if query_region else "Global",
        "magnitude": query_mag,
        "severityScore": 0.0,
        "severityClass": "Medium",
        "deaths": 0,
        "affected": 0,
        "damage": 0.0,
        "longitude": lon,
        "latitude": lat
    }
    df_query = pd.DataFrame([query_row])
    
    # Combine historical and query data to run through preprocessor together
    df_combined = pd.concat([df_hist, df_query], ignore_index=True)
    
    # Parse years
    df_combined['year'] = pd.to_datetime(df_combined['startDate'], errors='coerce').dt.year.fillna(2000).astype(int)
    
    try:
        prep = cache["prep"]
        
        # We need the 11 feature columns from combined data to feed to transform
        feature_cols = ['startDate', 'endDate', 'disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'magnitude', 'longitude', 'latitude']
        X_raw = df_combined[feature_cols]
        X_trans = prep.transform(X_raw)
        
        # Select features defined for cosine similarity search
        similarity_features = ['subregion_encoded', 'latitude', 'longitude', 'sin_month', 'cos_month', 'magnitude_normalized']
        X_similarity = X_trans[similarity_features].copy()
        
        # Scale features using StandardScaler
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_similarity)
        
        # Separate historical and query vectors
        historical_vectors = X_scaled[:-1]
        query_vector = X_scaled[-1].reshape(1, -1)
        
        # Run K-Nearest Neighbors
        n_neighbors = min(5, len(historical_vectors))
        if n_neighbors <= 0:
            return []
            
        knn = NearestNeighbors(n_neighbors=n_neighbors, metric='cosine', algorithm='brute')
        knn.fit(historical_vectors)
        
        distances, indices = knn.kneighbors(query_vector)
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            row = df_combined.iloc[idx]
            
            # Compute similarity percentage: 100 * (1.0 - cosine_distance)
            sim_pct = float(np.clip((1.0 - dist) * 100.0, 0.0, 100.0))
            
            # Format magnitude cleanly
            mag_val = row['magnitude']
            mag_float = float(mag_val) if pd.notnull(mag_val) and str(mag_val).strip() != "" else None
            
            results.append({
                "year": int(row['year']),
                "country": str(row['country']),
                "location": str(row['location']),
                "magnitude": mag_float,
                "deaths": int(row['deaths']),
                "affectedPopulation": int(row['affected']),
                "economicDamageUSD": float(row['damage']),
                "similarityPercentage": round(sim_pct, 2)
            })
            
        # Sort by similarity percentage descending
        results = sorted(results, key=lambda x: x["similarityPercentage"], reverse=True)
        return results
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Similarity processing error: {str(e)}")

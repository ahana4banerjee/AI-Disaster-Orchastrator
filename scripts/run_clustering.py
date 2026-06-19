import os
import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime
from pymongo import MongoClient, ReplaceOne
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# Override DNS resolver nameservers to prevent local DNS resolution timeouts on Windows
try:
    import dns.resolver
    dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
    dns.resolver.default_resolver.nameservers = ['8.8.8.8', '8.8.4.4', '1.1.1.1']
except Exception as e:
    print(f"Warning: Failed to override default DNS nameservers: {e}")

# Setup paths to import ml_service modules
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(base_dir, "ml_service"))

from train import load_env_mongo_uri

# Subregion population (in millions) and GDP (in billions USD) estimates for vulnerability normalization
SUBREGION_STATS = {
    "Eastern Africa": {"population_m": 450.0, "gdp_b": 250.0},
    "Middle Africa": {"population_m": 180.0, "gdp_b": 150.0},
    "Northern Africa": {"population_m": 250.0, "gdp_b": 600.0},
    "Southern Africa": {"population_m": 68.0, "gdp_b": 400.0},
    "Western Africa": {"population_m": 420.0, "gdp_b": 700.0},
    "Caribbean": {"population_m": 44.0, "gdp_b": 350.0},
    "Central America": {"population_m": 180.0, "gdp_b": 1500.0},
    "South America": {"population_m": 430.0, "gdp_b": 3500.0},
    "Northern America": {"population_m": 370.0, "gdp_b": 27000.0},
    "Central Asia": {"population_m": 78.0, "gdp_b": 350.0},
    "Eastern Asia": {"population_m": 1600.0, "gdp_b": 23000.0},
    "Southern Asia": {"population_m": 1900.0, "gdp_b": 4500.0},
    "South-eastern Asia": {"population_m": 670.0, "gdp_b": 3600.0},
    "Western Asia": {"population_m": 280.0, "gdp_b": 3500.0},
    "Eastern Europe": {"population_m": 290.0, "gdp_b": 2500.0},
    "Northern Europe": {"population_m": 105.0, "gdp_b": 6000.0},
    "Southern Europe": {"population_m": 150.0, "gdp_b": 4000.0},
    "Western Europe": {"population_m": 195.0, "gdp_b": 10000.0},
    "Australia and New Zealand": {"population_m": 31.0, "gdp_b": 1800.0},
    "Melanesia": {"population_m": 11.0, "gdp_b": 40.0},
    "Micronesia": {"population_m": 0.5, "gdp_b": 2.0},
    "Polynesia": {"population_m": 0.7, "gdp_b": 5.0}
}

def main():
    mongo_uri = load_env_mongo_uri()
    if not mongo_uri:
        print("Error: MONGO_URI not configured.")
        sys.exit(1)
        
    client = MongoClient(mongo_uri)
    db = client.get_default_database(default="disaster_db")
    
    print("Fetching disaster records for regional clustering...")
    records = list(db.disaster_records.find({}))
    if not records:
        print("Error: No disaster records found in MongoDB.")
        sys.exit(1)
        
    print(f"Loaded {len(records)} records.")
    
    # Flatten records
    flat_records = []
    for r in records:
        flat = {
            "subregion": r.get("subregion") or "Unknown",
            "deaths": r.get("impact", {}).get("deaths", 0) or 0,
            "affected": r.get("impact", {}).get("totalAffected", 0) or 0,
            "damage": r.get("impact", {}).get("economicDamageUSD", 0) or 0.0,
            "magnitude": r.get("magnitude")
        }
        flat_records.append(flat)
        
    df = pd.DataFrame(flat_records)
    
    # Aggregate metrics by subregion
    print("Aggregating metrics by subregion...")
    subregions = df['subregion'].unique()
    subregion_agg = []
    
    # Total years span (2000 to 2026 = 27 years)
    years_span = 27.0
    
    for sub in subregions:
        if sub == "Unknown":
            continue
            
        sub_df = df[df['subregion'] == sub]
        n_events = len(sub_df)
        
        # Calculate frequency per decade
        frequency = (n_events / years_span) * 10.0
        
        total_deaths = sub_df['deaths'].sum()
        total_damage = sub_df['damage'].sum()
        
        # Get normalization stats (default to global median values if missing)
        stats = SUBREGION_STATS.get(sub, {"population_m": 150.0, "gdp_b": 500.0})
        pop_m = stats["population_m"]
        gdp_b = stats["gdp_b"]
        
        # Mortality rate: average deaths / population (per 100,000 people)
        mortality_rate = (total_deaths / n_events) / (pop_m * 10.0) if n_events > 0 else 0.0
        
        # Economic risk: average damage / GDP (as fraction of GDP)
        economic_risk = (total_damage / n_events) / (gdp_b * 1000000000.0) if n_events > 0 else 0.0
        
        # Max magnitude
        max_mag = sub_df['magnitude'].max()
        max_mag = float(max_mag) if pd.notnull(max_mag) else 0.0
        
        subregion_agg.append({
            "subregion": sub,
            "frequency": round(frequency, 4),
            "mortalityRate": round(mortality_rate, 6),
            "economicRisk": round(economic_risk, 8),
            "maxMagnitude": round(max_mag, 4)
        })
        
    df_agg = pd.DataFrame(subregion_agg)
    if len(df_agg) < 4:
        print("Error: Too few unique subregions to run 4-means clustering.")
        sys.exit(1)
        
    # Scale features for clustering
    features = ['frequency', 'mortalityRate', 'economicRisk', 'maxMagnitude']
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_agg[features])
    
    # Fit K-Means
    print("Fitting K-Means (K=4) clustering model...")
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    kmeans.fit(X_scaled)
    df_agg['clusterId'] = kmeans.labels_
    
    # Map clusterId to riskTier ordinally ("Low", "Medium", "High", "Extreme")
    # We sort clusters by their centroid feature means
    cluster_means = []
    for cid in range(4):
        cluster_mask = df_agg['clusterId'] == cid
        if np.sum(cluster_mask) > 0:
            mean_val = float(np.mean(X_scaled[cluster_mask]))
        else:
            mean_val = 0.0
        cluster_means.append((cid, mean_val))
        
    # Sort cluster IDs ascending by centroid values
    sorted_clusters = sorted(cluster_means, key=lambda x: x[1])
    tier_names = ["Low", "Medium", "High", "Extreme"]
    tier_mapping = {sorted_clusters[i][0]: tier_names[i] for i in range(4)}
    
    df_agg['riskTier'] = df_agg['clusterId'].map(tier_mapping)
    
    # Prepare MongoDB Bulk Operations
    print("Saving cluster assignments to MongoDB collection 'regional_risk_clusters'...")
    operations = []
    current_time = datetime.now()
    
    for _, row in df_agg.iterrows():
        doc = {
            "subregion": row['subregion'],
            "frequency": float(row['frequency']),
            "mortalityRate": float(row['mortalityRate']),
            "economicRisk": float(row['economicRisk']),
            "maxMagnitude": float(row['maxMagnitude']),
            "clusterId": int(row['clusterId']),
            "riskTier": row['riskTier'],
            "updatedAt": current_time
        }
        operations.append(
            ReplaceOne(
                filter={"subregion": row['subregion']},
                replacement=doc,
                upsert=True
            )
        )
        
    # Write to collection
    if operations:
        # Create collection or indices if they don't exist
        if "regional_risk_clusters" not in db.list_collection_names():
            db.create_collection("regional_risk_clusters")
        db.regional_risk_clusters.create_index([("subregion", 1)], unique=True)
        
        result = db.regional_risk_clusters.bulk_write(operations)
        print(f"Upserted/Modified {result.bulk_api_result.get('nUpserted', 0) + result.bulk_api_result.get('nModified', 0)} regional risk cluster documents.")
        
    print("\nRegional Aggregation & Clustering Completed Successfully.")

if __name__ == "__main__":
    main()

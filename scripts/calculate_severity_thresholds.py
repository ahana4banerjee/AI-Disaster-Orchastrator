import os
import pandas as pd
import numpy as np
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
csv_path = os.path.join(base_dir, "data", "raw", "public_emdat_custom_request_2026-06-16_b4cec7bb-ec36-4c87-9762-f7cc13e97076.csv")
output_path = os.path.join(base_dir, "reports", "severity_thresholds.json")

print(f"Loading data from: {csv_path}...")
df = pd.read_csv(csv_path, encoding='utf-8-sig')

# Clean components
deaths = df['Total Deaths'].fillna(0).values
affected = df['Total Affected'].fillna(0).values
damage = df["Total Damage, Adjusted ('000 US$)"].fillna(0).values

# Compute log values
log_deaths = np.log10(deaths + 1)
log_affected = np.log10(affected + 1)
log_damage = np.log10(damage + 1)

# Severity score formula (weights: 0.4, 0.3, 0.3)
severity_scores = 0.4 * log_deaths + 0.3 * log_affected + 0.3 * log_damage
df['Severity_Score'] = severity_scores

# Calculate percentile boundaries
p25 = np.percentile(severity_scores, 25)
p75 = np.percentile(severity_scores, 75)
p95 = np.percentile(severity_scores, 95)

# Summarize severity class allocations
def classify_severity(score):
    if score <= p25: return 'Low'
    elif score <= p75: return 'Medium'
    elif score <= p95: return 'High'
    else: return 'Extreme'

classes = [classify_severity(s) for s in severity_scores]
df['Severity_Class'] = classes

class_counts = df['Severity_Class'].value_counts().to_dict()

summary = {
    "weights": {
        "deaths_weight_w1": 0.4,
        "affected_weight_w2": 0.3,
        "damage_weight_w3": 0.3
    },
    "thresholds": {
        "P25_Low_to_Medium": round(p25, 4),
        "P75_Medium_to_High": round(p75, 4),
        "P95_High_to_Extreme": round(p95, 4)
    },
    "statistics": {
        "min_score": round(float(np.min(severity_scores)), 4),
        "max_score": round(float(np.max(severity_scores)), 4),
        "mean_score": round(float(np.mean(severity_scores)), 4),
        "median_score": round(float(np.median(severity_scores)), 4)
      },
    "class_allocations": class_counts
}

print("Calculated Severity Scoring Configurations:")
print(json.dumps(summary, indent=2))

os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2)
print(f"Summary successfully written to: {output_path}")

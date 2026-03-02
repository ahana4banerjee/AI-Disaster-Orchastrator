import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import numpy as np

# Create synthetic training data
np.random.seed(42)

data_size = 500

data = pd.DataFrame({
    "magnitude": np.random.uniform(1, 10, data_size),
    "population_density": np.random.uniform(100, 10000, data_size),
    "rainfall": np.random.uniform(0, 500, data_size),
    "infrastructure_score": np.random.uniform(1, 10, data_size),
})

# Simple logic for severity labeling
def generate_severity(row):
    score = (
        row["magnitude"] * 2 +
        row["population_density"] / 2000 +
        row["rainfall"] / 100 -
        row["infrastructure_score"]
    )
    if score < 10:
        return 0  # Low
    elif score < 20:
        return 1  # Medium
    else:
        return 2  # High

data["severity"] = data.apply(generate_severity, axis=1)

X = data[["magnitude", "population_density", "rainfall", "infrastructure_score"]]
y = data["severity"]

model = RandomForestClassifier()
model.fit(X, y)

joblib.dump(model, "disaster_model.pkl")

print("Model trained and saved as disaster_model.pkl")
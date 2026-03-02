import joblib
import numpy as np

model = joblib.load("disaster_model.pkl")

def predict_severity(magnitude, population_density, rainfall, infrastructure_score):
    input_data = np.array([[magnitude, population_density, rainfall, infrastructure_score]])
    prediction = model.predict(input_data)[0]

    if prediction == 0:
        return "Low"
    elif prediction == 1:
        return "Medium"
    else:
        return "High"
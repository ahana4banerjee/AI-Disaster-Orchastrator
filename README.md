# AI Disaster Response Orchestrator

An autonomous AI system that monitors real-time disaster data (satellite, weather, seismic), detects early signs of threats, and coordinates response actions such as alerts, drone dispatch simulation, and relief notifications — **without human prompts**.  

---

## 🚀 Project Overview
The AI Disaster Response Orchestrator is designed as a **multi-agent system**:
- **Data Monitor Agent**: Continuously pulls data from APIs (NASA FIRMS, OpenWeatherMap, USGS, etc.)
- **Detection Module**: Uses ML models (YOLOv8 for fire detection, anomaly detection for disasters).
- **Planner Agent**: Decides next actions (alerting, resource allocation, drone dispatch).
- **Executor Agent**: Simulates actions (Twilio alerts, dashboard notifications, logs).
- **Dashboard**: Streamlit-based real-time visualization of disasters, alerts, and responses.

---

## 🛠️ Tech Stack
- **Backend / Agents**: Python, LangChain / LangGraph  
- **Detection**: YOLOv8, Anomaly Detection Models  
- **APIs**: NASA FIRMS, OpenWeatherMap, USGS Earthquake API  
- **Dashboard**: Streamlit  
- **Alerts**: Twilio (SMS/WhatsApp), Email


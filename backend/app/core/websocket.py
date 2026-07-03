from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, simulation_id: str, websocket: WebSocket):
        await websocket.accept()
        if simulation_id not in self.active_connections:
            self.active_connections[simulation_id] = []
        self.active_connections[simulation_id].append(websocket)
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "data": {
                "simulationId": simulation_id,
                "status": "Connected"
            }
        })

    def disconnect(self, simulation_id: str, websocket: WebSocket):
        if simulation_id in self.active_connections:
            if websocket in self.active_connections[simulation_id]:
                self.active_connections[simulation_id].remove(websocket)
            if not self.active_connections[simulation_id]:
                del self.active_connections[simulation_id]

    async def broadcast(self, simulation_id: str, message: dict):
        if simulation_id in self.active_connections:
            for connection in self.active_connections[simulation_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

# Singleton manager
manager = ConnectionManager()

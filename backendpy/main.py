import json
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Allow frontend to access WebSockets
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://aedesign-sonoff-app.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connection Manager for WebSockets
class ConnectionManager:
    def __init__(self):
        self.frontends: list[WebSocket] = []

    async def connect_frontend(self, websocket: WebSocket):
        await websocket.accept()
        self.frontends.append(websocket)

    def disconnect_frontend(self, websocket: WebSocket):
        self.frontends.remove(websocket)

    async def broadcast_to_frontends(self, message: str):
        # Send data to all active React viewers
        for connection in self.frontends:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws/frontend")
async def websocket_frontend(websocket: WebSocket):
    await manager.connect_frontend(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text() 
    except WebSocketDisconnect:
        manager.disconnect_frontend(websocket)

@app.websocket("/ws/camera")
async def websocket_camera(websocket: WebSocket):
    await websocket.accept()
    print("ESP32-CAM Connected!")
    try:
        while True:
            # 1. Receive JPEG bytes directly from ESP32
            bytes_data = await websocket.receive_bytes()
            
            # 2. Convert to Base64 instantly
            b64_frame = base64.b64encode(bytes_data).decode('utf-8')
            
            # 3. Broadcast to the React frontend
            await manager.broadcast_to_frontends(json.dumps({
                "type": "frame", 
                "data": b64_frame
            }))

    except WebSocketDisconnect:
        print("ESP32-CAM Disconnected.")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=10000)

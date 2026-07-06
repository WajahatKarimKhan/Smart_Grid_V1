import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Render Live Monitoring Portal")

# Allow all origins for easier dashboard connectivity testing on Render
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active connected hardware nodes list
modbus_clients = []

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    modbus_clients.append(websocket)
    print(f"📡 [WS CONNECT] New client accepted from proxy. Current count: {len(modbus_clients)}")
    
    try:
        while True:
            # Await raw text payload transmissions from the ESP32
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                print(f"🚀 [ELUM EMS DATA] Received from device: {payload.get('device_id', 'UNKNOWN')}")
                print(f"📊 Payload Metrics: {payload}")
                print("-" * 50)
                
                # Echo data back to any connected front-end clients (dashboards)
                for client in modbus_clients:
                    if client != websocket:
                        await client.send_text(json.dumps(payload))
                        
            except json.JSONDecodeError:
                print("⚠️ [WS WARN] Intercepted malformed non-JSON data stream.")
                
    except WebSocketDisconnect:
        print("🔌 [WS DISCONNECT] Client connection dropped or timed out.")
    finally:
        if websocket in modbus_clients:
            modbus_clients.remove(websocket)

@app.get("/")
async def root():
    return {"status": "Online", "environment": "Render Production Proxy"}

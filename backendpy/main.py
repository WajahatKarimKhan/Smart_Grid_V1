import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Render IoT Streaming Test Server")

# Allow all origins so your React frontend can connect easily from any URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tracks connected sockets (ESP32 and Frontend Dashboards)
connected_clients = []

@app.websocket("/ws/stream")
@app.websocket("/wss/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"📡 [WS CONNECT] Connection established. Active client count: {len(connected_clients)}")
    
    try:
        while True:
            # Maintain active listener loop for incoming text payloads
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                
                # Check if it's your specific Elum device payload
                device_id = payload.get("device_id", "UNKNOWN_DEVICE")
                payload_type = payload.get("type", "UNKNOWN_TYPE")
                
                print(f"\n🚀 [STREAM INBOUND] Packet parsed successfully!")
                print(f"   🔹 Device ID : {device_id}")
                print(f"   🔹 Msg Type  : {payload_type}")
                print(f"   🔹 Full Data : {payload}")
                print("-" * 60)
                
                # Broadcast the live stream instantly out to all other connected web apps
                for client in connected_clients:
                    if client != websocket:
                        try:
                            await client.send_text(json.dumps(payload))
                        except Exception:
                            # Catch stale or dead browser clients
                            pass
                            
            except json.JSONDecodeError:
                print(f"⚠️ [MALFORMED FRAME] Raw string is not JSON: {data}")
                
    except WebSocketDisconnect:
        print("🔌 [WS DISCONNECT] A device connection dropped or timed out.")
    except Exception as e:
        print(f"❌ [RUNTIME ERROR] Socket loop error: {e}")
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
        print(f"📊 [SYSTEM STATUS] Remaining connected clients: {len(connected_clients)}")

@app.get("/")
async def root():
    return {
        "status": "Online",
        "mode": "Isolated Telemetry Testing",
        "active_devices": len(connected_clients)
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

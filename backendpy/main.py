import os
import json
import numpy as np
import cv2
import face_recognition
import psycopg2
from datetime import datetime
import pytz
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Allow frontend to access REST APIs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://aedesign-sonoff-app.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Connection (Add your NEON DB URL to Render Environment Variables)
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://neondb_owner:npg_KiG3oYvEQaA2@ep-bold-feather-a1sewfka-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

# In-memory face encodings to speed up real-time recognition
known_face_encodings = []
known_face_names = []

def load_known_faces():
    global known_face_encodings, known_face_names
    known_face_encodings.clear()
    known_face_names.clear()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT name, encoding FROM users")
    rows = cur.fetchall()
    for row in rows:
        known_face_names.append(row[0])
        known_face_encodings.append(np.array(row[1]))
    cur.close()
    conn.close()

# Load faces on startup
load_known_faces()

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
        for connection in self.frontends:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()
tz_pk = pytz.timezone('Asia/Karachi') # UTC+5

@app.websocket("/ws/frontend")
async def websocket_frontend(websocket: WebSocket):
    await manager.connect_frontend(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive
    except WebSocketDisconnect:
        manager.disconnect_frontend(websocket)

@app.websocket("/ws/camera")
async def websocket_camera(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive JPEG bytes from ESP32
            bytes_data = await websocket.receive_bytes()
            
            # Forward raw frame to frontend instantly
            import base64
            b64_frame = base64.b64encode(bytes_data).decode('utf-8')
            await manager.broadcast_to_frontends(json.dumps({"type": "frame", "data": b64_frame}))

            # Decode image for OpenCV/Face Recognition
            np_arr = np.frombuffer(bytes_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if img is not None and len(known_face_encodings) > 0:
                # Resize for faster processing
                small_frame = cv2.resize(img, (0, 0), fx=0.5, fy=0.5)
                rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
                
                face_locations = face_recognition.face_locations(rgb_small_frame)
                face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

                for face_encoding in face_encodings:
                    matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
                    name = "Unknown"

                    if True in matches:
                        first_match_index = matches.index(True)
                        name = known_face_names[first_match_index]
                        
                        # Generate Alert
                        now = datetime.now(tz_pk)
                        timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
                        
                        # Save to DB
                        conn = get_db_connection()
                        cur = conn.cursor()
                        cur.execute("INSERT INTO alerts (name, detected_at) VALUES (%s, %s)", (name, now))
                        conn.commit()
                        cur.close()
                        conn.close()

                        # Broadcast Alert
                        await manager.broadcast_to_frontends(json.dumps({
                            "type": "alert",
                            "name": name,
                            "time": timestamp_str
                        }))

    except WebSocketDisconnect:
        print("Camera disconnected")

@app.post("/register")
async def register_face(name: str = Form(...), file: UploadFile = File(...)):
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    encodings = face_recognition.face_encodings(rgb_img)
    if not encodings:
        return {"status": "error", "message": "No face found in image."}
    
    encoding_list = encodings[0].tolist()
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO users (name, encoding) VALUES (%s, %s)", (name, json.dumps(encoding_list)))
        conn.commit()
        status = "success"
    except psycopg2.IntegrityError:
        conn.rollback()
        status = "error - name exists"
    finally:
        cur.close()
        conn.close()
        
    load_known_faces() # Reload into memory
    return {"status": status, "name": name}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=10000)

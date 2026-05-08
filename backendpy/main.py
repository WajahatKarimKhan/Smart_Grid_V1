import os
import time
import json
import base64
import numpy as np
import cv2
import psycopg2
import asyncio
from datetime import datetime
import pytz
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change back to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://neondb_owner:npg_KiG3oYvEQaA2@ep-bold-feather-a1sewfka-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")

# State tracking for the camera
camera_ws: WebSocket = None
latest_frame: bytes = None
alert_cooldowns = {} # Prevents database spam. Maps "Name" -> Timestamp

# --- RECOGNITION SETUP ---
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
recognizer = cv2.face.LBPHFaceRecognizer_create()
id_to_name = {}
is_model_trained = False
tz_pk = pytz.timezone('Asia/Karachi')

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def load_and_train_faces():
    global id_to_name, is_model_trained
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, encoding FROM users")
    rows = cur.fetchall()
    
    faces, ids = [], []
    id_to_name.clear()
    
    for row in rows:
        db_id, name, pixel_list = row[0], row[1], row[2]
        id_to_name[db_id] = name
        faces.append(np.array(pixel_list, dtype=np.uint8))
        ids.append(db_id)
        
    cur.close()
    conn.close()
    
    if len(faces) > 0:
        recognizer.train(faces, np.array(ids))
        is_model_trained = True
    else:
        is_model_trained = False

# Run initial training
load_and_train_faces()

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

def save_alert_to_db(name: str):
    now = datetime.now(tz_pk)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO alerts (name, detected_at) VALUES (%s, %s)", (name, now))
    conn.commit()
    cur.close()
    conn.close()
    return now.strftime("%Y-%m-%d %H:%M:%S")

@app.websocket("/ws/frontend")
async def websocket_frontend(websocket: WebSocket):
    await manager.connect_frontend(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_frontend(websocket)

@app.websocket("/ws/camera")
async def websocket_camera(websocket: WebSocket):
    global camera_ws, latest_frame
    await websocket.accept()
    camera_ws = websocket
    print("ESP32-CAM Connected!")
    try:
        while True:
            bytes_data = await websocket.receive_bytes()
            latest_frame = bytes_data # Store in memory for registration grabbing

            np_arr = np.frombuffer(bytes_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if img is not None:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                
                # Push heavy detection to a background thread to prevent lag
                faces = await asyncio.to_thread(face_cascade.detectMultiScale, gray, 1.2, 5)
                
                for (x, y, w, h) in faces:
                    # Draw Green Rectangle
                    cv2.rectangle(img, (x, y), (x+w, y+h), (0, 255, 0), 2)
                    
                    if is_model_trained:
                        face_roi = cv2.resize(gray[y:y+h, x:x+w], (100, 100))
                        label_id, distance = await asyncio.to_thread(recognizer.predict, face_roi)
                        
                        if distance < 70:
                            name = id_to_name.get(label_id, "Unknown")
                            now_ts = time.time()
                            
                            # 10-Second Anti-Spam Cooldown per person
                            if now_ts - alert_cooldowns.get(name, 0) > 10:
                                alert_cooldowns[name] = now_ts
                                
                                # Save to DB in background
                                time_str = await asyncio.to_thread(save_alert_to_db, name)
                                
                                await manager.broadcast_to_frontends(json.dumps({
                                    "type": "alert",
                                    "name": name,
                                    "time": time_str
                                }))

                # Re-encode image with the green box and send to frontend
                success, buffer = cv2.imencode('.jpg', img)
                if success:
                    b64_frame = base64.b64encode(buffer).decode('utf-8')
                    await manager.broadcast_to_frontends(json.dumps({"type": "frame", "data": b64_frame}))

    except WebSocketDisconnect:
        camera_ws = None
        print("Camera disconnected")

# --- REGISTRATION LOGIC ---
def process_registration_db(name, frame_bytes):
    np_arr = np.frombuffer(frame_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5)
    if len(faces) == 0:
        return {"status": "error", "message": "No face found. Try again."}
    
    x, y, w, h = faces[0]
    face_roi = cv2.resize(gray[y:y+h, x:x+w], (100, 100))
    pixel_list = face_roi.tolist()
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO users (name, encoding) VALUES (%s, %s)", (name, json.dumps(pixel_list)))
        conn.commit()
        status = "success"
    except psycopg2.IntegrityError:
        conn.rollback()
        status = "error - name exists"
    finally:
        cur.close()
        conn.close()
        
    load_and_train_faces()
    return {"status": status, "name": name}

@app.post("/register")
async def register_face(name: str = Form(...)):
    global camera_ws, latest_frame
    if not camera_ws or not latest_frame:
        return {"status": "error", "message": "Camera is not connected."}

    try:
        # 1. Turn on Flash LED
        await camera_ws.send_text("LED_ON")
        
        # 2. Wait 1 second for the camera exposure to adjust to the light
        await asyncio.sleep(1.0)
        
        # 3. Capture the perfectly lit frame from memory
        captured_frame = latest_frame
        
        # 4. Turn off Flash LED immediately
        await camera_ws.send_text("LED_OFF")

        # 5. Process the DB save in a background thread so video doesn't lag
        result = await asyncio.to_thread(process_registration_db, name, captured_frame)
        return result

    except Exception as e:
        if camera_ws:
            await camera_ws.send_text("LED_OFF")
        return {"status": "error", "message": "Processing failed."}
# --- Add these to your existing main.py ---

@app.post("/camera/photo")
async def capture_photo():
    if camera_ws:
        await camera_ws.send_text("TAKE_PHOTO")
        return {"status": "command_sent", "action": "photo"}
    return {"status": "error", "message": "Camera offline"}

@app.post("/camera/start-video")
async def start_video():
    if camera_ws:
        await camera_ws.send_text("START_VIDEO")
        return {"status": "command_sent", "action": "recording_started"}
    return {"status": "error", "message": "Camera offline"}

@app.post("/camera/stop-video")
async def stop_video():
    if camera_ws:
        await camera_ws.send_text("STOP_VIDEO")
        return {"status": "command_sent", "action": "recording_stopped"}
    return {"status": "error", "message": "Camera offline"}
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=10000)

import os
import json
import base64
import numpy as np
import cv2
import psycopg2
from datetime import datetime
import pytz
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://aedesign-sonoff-app.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://neondb_owner:npg_KiG3oYvEQaA2@ep-bold-feather-a1sewfka-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

# --- LIGHTWEIGHT FACIAL RECOGNITION SETUP ---
# Load OpenCV's built-in lightweight face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Create the LBPH Recognizer
recognizer = cv2.face.LBPHFaceRecognizer_create()
id_to_name = {}  # Maps DB integer IDs to Names
is_model_trained = False

def load_and_train_faces():
    global id_to_name, is_model_trained
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, encoding FROM users")
    rows = cur.fetchall()
    
    faces = []
    ids = []
    id_to_name.clear()
    
    for row in rows:
        db_id = row[0]
        name = row[1]
        pixel_list = row[2]  # This is now a 100x100 array of pixels
        
        id_to_name[db_id] = name
        faces.append(np.array(pixel_list, dtype=np.uint8))
        ids.append(db_id)
        
    cur.close()
    conn.close()
    
    if len(faces) > 0:
        # Train the lightweight model instantly in RAM
        recognizer.train(faces, np.array(ids))
        is_model_trained = True
        print(f"Trained model with {len(faces)} faces.")
    else:
        is_model_trained = False

load_and_train_faces()

# --- WEBSOCKET MANAGER ---
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
tz_pk = pytz.timezone('Asia/Karachi')

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
    await websocket.accept()
    try:
        while True:
            bytes_data = await websocket.receive_bytes()
            
            # Send live frame to frontend
            b64_frame = base64.b64encode(bytes_data).decode('utf-8')
            await manager.broadcast_to_frontends(json.dumps({"type": "frame", "data": b64_frame}))

            # --- RUN LIGHTWEIGHT RECOGNITION ---
            if is_model_trained:
                np_arr = np.frombuffer(bytes_data, np.uint8)
                img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                
                if img is not None:
                    # Convert to grayscale for LBPH math
                    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    
                    # Detect faces
                    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5)
                    
                    for (x, y, w, h) in faces:
                        # Extract the face, resize to standard 100x100
                        face_roi = cv2.resize(gray[y:y+h, x:x+w], (100, 100))
                        
                        # Predict who it is
                        label_id, distance = recognizer.predict(face_roi)
                        
                        # Distance is inverse to confidence. Lower is better. 
                        # Usually, distance < 70 is considered a good match.
                        if distance < 70:
                            name = id_to_name.get(label_id, "Unknown")
                            
                            now = datetime.now(tz_pk)
                            
                            # Save alert to DB
                            conn = get_db_connection()
                            cur = conn.cursor()
                            cur.execute("INSERT INTO alerts (name, detected_at) VALUES (%s, %s)", (name, now))
                            conn.commit()
                            cur.close()
                            conn.close()

                            # Alert Frontend
                            await manager.broadcast_to_frontends(json.dumps({
                                "type": "alert",
                                "name": name,
                                "time": now.strftime("%Y-%m-%d %H:%M:%S")
                            }))

    except WebSocketDisconnect:
        print("Camera disconnected")

@app.post("/register")
async def register_face(name: str = Form(...), file: UploadFile = File(...)):
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Find face to register
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5)
    
    if len(faces) == 0:
        return {"status": "error", "message": "No face found in image. Please look at the camera."}
    
    # Grab the first face found
    x, y, w, h = faces[0]
    face_roi = cv2.resize(gray[y:y+h, x:x+w], (100, 100))
    
    # Convert pixels to a JSON list for the database
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
        
    load_and_train_faces() # Retrain the memory instantly
    return {"status": status, "name": name}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=10000)

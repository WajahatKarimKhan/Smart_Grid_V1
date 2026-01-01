import json
import asyncio
import logging
import asyncpg  # Database driver
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# ================= CONFIGURATION =================
app = FastAPI(title="Smart Gridx Backend")

# Database Connection String
DATABASE_URL = "postgresql://neondb_owner:npg_KiG3oYvEQaA2@ep-bold-feather-a1sewfka-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Allow CORS for React Frontend
origins = [
    "http://localhost:5173",          
    "https://smartgridx.onrender.com" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SmartGridx")

# ================= DATABASE MANAGER =================
class DatabaseManager:
    def __init__(self):
        self.pool = None

    async def connect(self):
        """Create a connection pool to NeonDB"""
        try:
            self.pool = await asyncpg.create_pool(dsn=DATABASE_URL)
            logger.info("Connected to NeonDB PostgreSQL")
            await self.create_table()
        except Exception as e:
            logger.error(f"Database connection failed: {e}")

    async def disconnect(self):
        """Close the connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Disconnected from NeonDB")

    async def create_table(self):
        """
        Creates the unified table.
        Frequency is now a standard column for both.
        Temperature is nullable (House only).
        """
        query = """
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            node_id VARCHAR(50),
            
            -- Sensor Data Columns
            voltage REAL,
            current REAL,
            power REAL,
            energy REAL,
            frequency REAL,    -- Sent by BOTH Pole and House
            pf REAL,
            temperature REAL   -- Sent by House ONLY (NULL for Pole)
        );
        """
        async with self.pool.acquire() as connection:
            await connection.execute(query)
            logger.info("Table 'sensor_readings' checked/created.")

    async def insert_reading(self, node_id: str, data: dict):
        """
        Inserts data into the database. 
        Handles missing keys gracefully (sets them to None/NULL).
        """
        if not self.pool:
            return

        query = """
        INSERT INTO sensor_readings 
        (node_id, voltage, current, power, energy, frequency, pf, temperature)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """
        
        # Safe extraction: defaults to None if the sensor didn't send it
        voltage = data.get("voltage")
        current = data.get("current")
        power = data.get("power")
        energy = data.get("energy")
        pf = data.get("pf")
        
        # Frequency is now expected from both, but we use .get() to be safe
        frequency = data.get("frequency") 
        
        # Temperature is House specific
        temperature = data.get("temperature") 

        try:
            async with self.pool.acquire() as connection:
                await connection.execute(
                    query, 
                    node_id, voltage, current, power, energy, frequency, pf, temperature
                )
                logger.info(f"DB Saved: {node_id} | Freq: {frequency} | Temp: {temperature}")
        except Exception as e:
            logger.error(f"Failed to insert data: {e}")

db_manager = DatabaseManager()

# ================= STATE MANAGEMENT =================
system_state = {
    "pole": {
        "connected": False,
        "power": 0.0,
        "voltage": 0.0,
        "current": 0.0,
        "energy": 0.0,
        "pf": 0.0,
        "frequency": 0.0,
        "last_seen": None
    },
    "house": {
        "connected": False,
        "power": 0.0,
        "voltage": 0.0,
        "current": 0.0,
        "energy": 0.0,
        "temperature": 25.0,
        "frequency": 0.0,  # Added to state
        "relays": [False, False, False, False],
        "pf": 0.0,
        "last_seen": None
    },
    "alerts": {
        "theft_detected": False,
        "maintenance_risk": False,
        "risk_score": 0.0,
        "message": "System Normal"
    }
}

# ================= LOGIC & CALCULATIONS =================
def update_system_logic():
    """
    Run centralized logic:
    1. Compare Pole vs House power (Theft Detection)
    2. Analyze PF and Fluctuations (Predictive Maintenance)
    """
    pole = system_state["pole"]
    house = system_state["house"]
    alerts = system_state["alerts"]

    # 1. Theft Logic (Simplified)
    if pole["connected"] and house["connected"]:
        loss_threshold = 15.0 
        if (pole["power"] - house["power"]) > loss_threshold:
            alerts["theft_detected"] = True
            alerts["message"] = "THEFT DETECTED: Line Loss Exceeds Threshold!"
        else:
            alerts["theft_detected"] = False
            alerts["message"] = "System Optimal"
    
    # 2. Predictive Maintenance (PF Check)
    risk_score = 0.0
    if pole["pf"] > 0 and pole["pf"] < 0.85:
        risk_score += 0.4
    if house["pf"] > 0 and house["pf"] < 0.85:
        risk_score += 0.3
        
    alerts["risk_score"] = min(risk_score, 1.0)
    alerts["maintenance_risk"] = risk_score > 0.6
    
    if alerts["maintenance_risk"]:
        alerts["message"] = "MAINTENANCE ALERT: High Grid Instability"

# ================= WEBSOCKET MANAGER =================
class ConnectionManager:
    def __init__(self):
        self.hardware_connections: Dict[str, WebSocket] = {}
        self.frontend_connections: List[WebSocket] = []

    async def connect_hardware(self, websocket: WebSocket, device_type: str):
        await websocket.accept()
        self.hardware_connections[device_type] = websocket
        logger.info(f"Hardware connected: {device_type}")
        if device_type in system_state:
            system_state[device_type]["connected"] = True
        await self.broadcast_state()

    def disconnect_hardware(self, device_type: str):
        if device_type in self.hardware_connections:
            del self.hardware_connections[device_type]
        if device_type in system_state:
            system_state[device_type]["connected"] = False
        logger.info(f"Hardware disconnected: {device_type}")

    async def connect_frontend(self, websocket: WebSocket):
        await websocket.accept()
        self.frontend_connections.append(websocket)
        logger.info("Frontend client connected")

    def disconnect_frontend(self, websocket: WebSocket):
        if websocket in self.frontend_connections:
            self.frontend_connections.remove(websocket)
            logger.info("Frontend client disconnected")

    async def broadcast_state(self):
        for connection in self.frontend_connections:
            try:
                await connection.send_json(system_state)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")

    async def send_command_to_house(self, command: dict):
        if "house" in self.hardware_connections:
            try:
                await self.hardware_connections["house"].send_text(json.dumps(command))
            except Exception as e:
                logger.error(f"Failed to send command to house: {e}")

manager = ConnectionManager()

# ================= LIFECYCLE EVENTS =================
@app.on_event("startup")
async def startup_event():
    await db_manager.connect()

@app.on_event("shutdown")
async def shutdown_event():
    await db_manager.disconnect()

# ================= WEBSOCKET ENDPOINTS =================

@app.websocket("/ws/hardware/{device_type}")
async def websocket_hardware(websocket: WebSocket, device_type: str):
    # device_type should be "pole" or "house"
    await manager.connect_hardware(websocket, device_type)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # --- DATABASE SAVE LOGIC ---
            db_data = {}
            
            if device_type == "pole":
                # Pole Data Update
                # Pole sends flat JSON structure
                system_state["pole"].update({
                    "voltage": payload.get("voltage", 0),
                    "current": payload.get("current", 0),
                    "power": payload.get("power", 0),
                    "energy": payload.get("energy", 0),
                    "frequency": payload.get("frequency", 50), # Expecting frequency here
                    "pf": payload.get("pf", 0),
                    "last_seen": datetime.now().isoformat()
                })
                db_data = payload 
                
            elif device_type == "house":
                # House Data Update
                # House sends nested structure: { "sensors": {...}, "relays": [...] }
                sensors = payload.get("sensors", {})
                relays = payload.get("relays", [False, False, False, False])
                
                system_state["house"].update({
                    "voltage": sensors.get("voltage", 0),
                    "current": sensors.get("current", 0),
                    "power": sensors.get("power", 0),
                    "energy": sensors.get("energy", 0),
                    "temperature": sensors.get("temperature", 25),
                    "frequency": sensors.get("frequency", 50), # Ensure Indoor Code sends this!
                    "pf": sensors.get("pf", 0),
                    "relays": relays,
                    "last_seen": datetime.now().isoformat()
                })
                db_data = sensors # Pass the sensors object to DB
            
            # Async Insert to Database
            # This runs in background so it doesn't slow down the websocket
            asyncio.create_task(db_manager.insert_reading(device_type, db_data))

            update_system_logic()
            await manager.broadcast_state()
            
    except WebSocketDisconnect:
        manager.disconnect_hardware(device_type)
        await manager.broadcast_state()

@app.websocket("/ws/client")
async def websocket_frontend(websocket: WebSocket):
    await manager.connect_frontend(websocket)
    try:
        await manager.broadcast_state()
        while True:
            data = await websocket.receive_text()
            command = json.loads(data)
            if command.get("action") == "set_relay":
                await manager.send_command_to_house(command)
    except WebSocketDisconnect:
        manager.disconnect_frontend(websocket)

@app.get("/")
def read_root():
    return {"status": "SmartGridx Backend Running", "db_status": "Connected" if db_manager.pool else "Disconnected"}

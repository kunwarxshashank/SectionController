
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import json
import os
import copy
from fastapi.middleware.cors import CORSMiddleware

# Import from the existing optimizer script
from railway_optimizer_hybrid import (
    RailwayGraph, Train, HybridScheduleOptimizer, 
    STATION_ORDER, time_to_minutes, minutes_to_time
)

app = FastAPI(title="Railway Simulation Server")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global data cache
GRAPH = None
BASE_TRAINS = []
SCHEMA_DATA = None
TRAINS_DATA = None

def load_data():
    global GRAPH, BASE_TRAINS, SCHEMA_DATA, TRAINS_DATA
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    schema_path = os.path.join(script_dir, "database_schema.json")
    trains_path = os.path.join(script_dir, "trains.json")
    
    # Load Schema
    with open(schema_path, 'r') as f:
        SCHEMA_DATA = json.load(f)
    
    GRAPH = RailwayGraph()
    GRAPH.load_from_schema(SCHEMA_DATA)
    
    # Load Trains
    with open(trains_path, 'r') as f:
        TRAINS_DATA = json.load(f)
        
    BASE_TRAINS = [Train.from_dict(t) for t in TRAINS_DATA]
    print(f"Server loaded {len(BASE_TRAINS)} trains and graph.")

# Load data on startup
load_data()

# Pydantic Models for Request
class TrainOverride(BaseModel):
    trainId: str
    trainCategory: Optional[str] = None
    trainType: Optional[str] = None
    priority: Optional[int] = None
    isEmergency: Optional[bool] = None
    maxSpeed: Optional[int] = None
    direction: Optional[str] = None

class GlobalSettings(BaseModel):
    weather: Optional[str] = "Clear"  # Clear, Rain, Fog
    loopUsagePenalty: Optional[int] = 500
    trackClosure: Optional[str] = None # Edge ID to close

class SimulationRequest(BaseModel):
    trainOverrides: List[TrainOverride] = []
    globalSettings: GlobalSettings = GlobalSettings()

@app.get("/")
def read_root():
    return {"status": "Railway Simulation Server Running"}

@app.get("/trains")
def get_trains():
    return TRAINS_DATA

@app.get("/stations")
def get_stations():
    return STATION_ORDER

@app.post("/simulate")
def run_simulation(request: SimulationRequest):
    global GRAPH, BASE_TRAINS
    
    # 1. Prepare Data
    # Deep copy trains to avoid modifying global state
    current_trains = [copy.deepcopy(t) for t in BASE_TRAINS]
    train_map = {t.train_id: t for t in current_trains}
    
    # Apply Train Overrides
    for override in request.trainOverrides:
        if override.trainId in train_map:
            train = train_map[override.trainId]
            if override.trainCategory is not None:
                train.train_category = override.trainCategory # Note: Train class might not have this field mapped in __init__ but it's in JSON
            if override.trainType is not None:
                train.train_type = override.trainType
            if override.priority is not None:
                train.priority = override.priority
            if override.isEmergency is not None:
                train.is_emergency = override.isEmergency
            if override.maxSpeed is not None:
                train.max_speed = override.maxSpeed
            if override.direction is not None:
                train.direction = override.direction
    
    # 2. Configure Optimizer
    config = {
        'horizon_s': 24 * 3600,
        'headway_s': 180,
        'min_dwell_s': 120,
        'max_delay_s': 3600,
        'throughput_weight': 100000,
        'delay_weight_mult': 100,
        'loop_penalty': request.globalSettings.loopUsagePenalty or 500,
        'solver_time_limit_s': 30, # Increased time limit for larger horizon
        'max_paths_per_train': 3,
    }
    
    # Apply Weather (Global Speed Reduction)
    weather = request.globalSettings.weather.lower()
    speed_factor = 1.0
    if weather == "rain":
        speed_factor = 0.8
    elif weather == "fog":
        speed_factor = 0.6
        
    if speed_factor < 1.0:
        for train in current_trains:
            train.max_speed = int(train.max_speed * speed_factor)
            
    # Apply Track Closure
    # We need to temporarily modify the graph status. 
    # Since RailwayGraph is shared, we should probably not modify it directly if we want concurrency.
    # However, for this single-user local simulation, we can modify and revert, or copy.
    # Copying the graph might be expensive. Let's modify and revert.
    closed_edge = None
    original_status = None
    
    if request.globalSettings.trackClosure:
        edge_id = request.globalSettings.trackClosure
        if edge_id in GRAPH.edges:
            closed_edge = GRAPH.edges[edge_id]
            original_status = closed_edge.status
            closed_edge.status = "maintenance"
            print(f"Closed track {edge_id} for simulation")

    try:
        # 3. Run Optimization
        optimizer = HybridScheduleOptimizer(GRAPH, current_trains, config)
        optimizer.build_model()
        result = optimizer.solve()
        
        return result
        
    finally:
        # Revert graph changes
        if closed_edge and original_status:
            closed_edge.status = original_status
            print(f"Reverted track {closed_edge.edge_id} status")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

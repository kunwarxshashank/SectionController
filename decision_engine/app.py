"""
Railway Decision Engine API Server v2.0
FastAPI-based API for train scheduling optimization
"""
import os
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from scheduler import run_optimization
from data_converter import convert_data_format

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Railway Decision Engine API",
    description="FastAPI-based API for train scheduling optimization",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    features: list


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Railway Decision Engine v2.0",
        "version": "2.0.0",
        "features": [
            "Optional intervals for loop routing",
            "Hard passenger schedule constraints", 
            "Freight throughput maximization",
            "Loop decision optimization",
            "Time-distance graph generation"
        ]
    }


class OptimizeRequest(BaseModel):
    sectionData: Optional[Dict[str, Any]] = None
    section: Optional[Dict[str, Any]] = None
    stations: Optional[list] = None
    tracks: Optional[list] = None
    trains: list


@app.post("/api/optimize")
async def optimize(request: OptimizeRequest):
    """
    Main optimization endpoint
    
    Expects JSON body with sectionData.json format:
    - section: section metadata
    - stations: array of stations
    - tracks: array of tracks with blocks
    - trains: array of trains
    
    Returns optimized schedule with time-distance profiles
    """
    try:
        data = request.dict(exclude_none=True)
        
        if not data:
            raise HTTPException(status_code=400, detail="No data provided")
        
        # Validate required fields
        if "trains" not in data or not data["trains"]:
            raise HTTPException(status_code=400, detail="Missing 'trains' in request")
        
        if "tracks" not in data and "sectionData" not in data:
            raise HTTPException(status_code=400, detail="Missing 'tracks' or 'sectionData' in request")
        
        # Support both formats
        if "sectionData" in data:
            # Old format - extract from sectionData
            section_data = data["sectionData"]
            optimization_data = {
                "section": {
                    "id": section_data.get("_id", ""),
                    "name": section_data.get("name", "")
                },
                "stations": section_data.get("stations", []),
                "tracks": section_data.get("tracks", []),
                "trains": data.get("trains", [])
            }
        else:
            # New format - use directly
            optimization_data = data
        
        # Convert data format if needed (from edges/nodes to blocks)
        optimization_data = convert_data_format(optimization_data)
        
        section_name = optimization_data.get("section", {}).get("name", "Unknown")
        train_count = len(optimization_data.get("trains", []))
        
        print(f"\n{'='*60}")
        print(f"Optimization request received")
        print(f"Section: {section_name}")
        print(f"Trains: {train_count}")
        print(f"{'='*60}\n")
        
        # Run optimization
        result = run_optimization(optimization_data)
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error during optimization: {str(e)}")
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"Optimization error: {str(e)}"
        )


class ValidateRequest(BaseModel):
    sectionData: Optional[Dict[str, Any]] = None
    section: Optional[Dict[str, Any]] = None
    stations: Optional[list] = None
    tracks: Optional[list] = None
    trains: Optional[list] = None


@app.post("/api/validate")
async def validate(request: ValidateRequest):
    """Validate input data structure"""
    try:
        data = request.dict(exclude_none=True)
        
        if not data:
            raise HTTPException(status_code=400, detail="No data provided")
        
        # Check for required fields
        issues = []
        
        if "tracks" not in data and "sectionData" not in data:
            issues.append("Missing 'tracks' or 'sectionData'")
        
        if "trains" not in data:
            issues.append("Missing 'trains'")
        
        if issues:
            return {
                "valid": False,
                "message": "Validation failed",
                "issues": issues
            }
        
        # Count elements
        tracks = data.get("tracks", [])
        trains = data.get("trains", [])
        stations = data.get("stations", [])
        
        # Handle both edges and blocks format
        if tracks and "edges" in tracks[0]:
            # edges/nodes format
            total_blocks = sum(len(t.get("edges", [])) for t in tracks)
        else:
            # blocks format
            total_blocks = sum(len(t.get("blocks", [])) for t in tracks)
        
        passenger_trains = [t for t in trains if "freight" not in t.get("name", "").lower() 
                           and not t.get("number", "").startswith("FRE")
                           and t.get("trainCategory", "").lower() != "freight"]
        freight_trains = [t for t in trains if "freight" in t.get("name", "").lower() 
                          or t.get("number", "").startswith("FRE")
                          or t.get("trainCategory", "").lower() == "freight"]
        
        return {
            "valid": True,
            "message": "Data validated successfully",
            "structure": {
                "sectionName": data.get("section", {}).get("name", ""),
                "totalTracks": len(tracks),
                "totalBlocks": total_blocks,
                "totalStations": len(stations),
                "stationNames": [s.get("name", "") or s.get("stationName", "") for s in stations],
                "totalTrains": len(trains),
                "passengerTrains": len(passenger_trains),
                "freightTrains": len(freight_trains)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Validation error: {str(e)}"
        )


@app.post("/api/time-distance")
async def time_distance(request: OptimizeRequest):
    """Get time-distance profiles for visualization"""
    try:
        data = request.dict(exclude_none=True)
        
        # Support both formats
        if "sectionData" in data:
            section_data = data["sectionData"]
            optimization_data = {
                "section": {
                    "id": section_data.get("_id", ""),
                    "name": section_data.get("name", "")
                },
                "stations": section_data.get("stations", []),
                "tracks": section_data.get("tracks", []),
                "trains": data.get("trains", [])
            }
        else:
            optimization_data = data
        
        # Convert data format if needed
        optimization_data = convert_data_format(optimization_data)
        
        result = run_optimization(optimization_data)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("message", "Optimization failed"))
        
        # Extract just time-distance profiles
        profiles = []
        for train_schedule in result.get("trainSchedules", []):
            profiles.append({
                "trainId": train_schedule.get("trainId"),
                "trainName": train_schedule.get("trainName"),
                "trainNumber": train_schedule.get("trainNumber"),
                "isPassenger": train_schedule.get("isPassenger"),
                "isFreight": train_schedule.get("isFreight"),
                "direction": train_schedule.get("direction"),
                "profile": train_schedule.get("timeDistanceProfile", [])
            })
        
        return {
            "success": True,
            "profiles": profiles,
            "summary": result.get("summary", {})
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )


class ConflictsRequest(BaseModel):
    trains: list


@app.post("/api/conflicts")
async def analyze_conflicts(request: ConflictsRequest):
    """Analyze potential conflicts without full optimization"""
    try:
        trains = request.trains
        
        # Group trains by current block/edge
        block_occupancy = {}
        for train in trains:
            # Handle both formats: current_block or currentEdge
            block = train.get("current_block") or train.get("currentEdge", "")
            if block:
                if block not in block_occupancy:
                    block_occupancy[block] = []
                block_occupancy[block].append({
                    "trainId": train.get("id") or train.get("trainId"),
                    "trainName": train.get("name") or train.get("trainName"),
                    "trainNumber": train.get("number") or train.get("trainId"),
                    "direction": train.get("direction")
                })
        
        # Find conflicts (multiple trains in same block)
        conflicts = []
        for block, trains_in_block in block_occupancy.items():
            if len(trains_in_block) > 1:
                conflicts.append({
                    "blockId": block,
                    "trainCount": len(trains_in_block),
                    "trains": trains_in_block,
                    "severity": "HIGH" if len(trains_in_block) > 2 else "MEDIUM"
                })
        
        return {
            "success": True,
            "totalConflicts": len(conflicts),
            "conflicts": conflicts
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "true").lower() == "true"
    
    print("=" * 60)
    print("🚂 Railway Decision Engine v2.0")
    print("=" * 60)
    print(f"Starting server on port {port}")
    print(f"Debug mode: {debug}")
    print("")
    print("Available endpoints:")
    print("  GET  /                  - Health check")
    print("  POST /api/optimize      - Run full optimization")
    print("  POST /api/validate      - Validate input data")  
    print("  POST /api/time-distance - Get time-distance profiles")
    print("  POST /api/conflicts     - Analyze potential conflicts")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="debug" if debug else "info")

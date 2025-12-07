"""
FastAPI server for Railway Optimization Engine.
Provides REST API endpoints for train scheduling and optimization.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
from dotenv import load_dotenv
import os
from typing import Optional, Dict, Any

from orengine import get_train_priorities, RailwayOptimizer

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Railway Optimization Engine",
    description="Train scheduling and optimization API using Google OR-Tools",
    version="2.0.0"
)

NODEJS_BACKEND_API = os.getenv("NODEJS_BACKEND_API", "http://localhost:5000")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def fetch_section_data(section_id: str) -> Dict[str, Any]:
    """Fetch section data from the Node.js backend API."""
    url = f"{NODEJS_BACKEND_API}/api/section/{section_id}/export"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data from API: {str(e)}")


@app.get("/")
def home():
    """Health check endpoint."""
    return {
        "message": "Railway Optimization Engine is running!",
        "version": "2.0.0",
        "endpoints": {
            "optimize": "/api/optimize?sectionid=<ID>",
            "orengine": "/api/orengine?sectionid=<ID>",
            "health": "/"
        }
    }


@app.get("/api/orengine")
def priority_api(sectionid: str = Query(None, description="Section ID to fetch data for")):
    """
    Legacy endpoint for train priorities.
    Returns train priorities and basic scheduling.
    """
    try:
        if sectionid:
            section_data = fetch_section_data(sectionid)
        else:
            section_data = None
        
        result = get_train_priorities(section_data)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/optimize")
def optimize_section(
    sectionid: str = Query(..., description="Section ID to optimize"),
    time_limit: int = Query(30, description="Solver time limit in seconds")
):
    """
    Full optimization endpoint.
    Returns optimized train schedules with signal states.
    
    Args:
        sectionid: Section ID to fetch and optimize
        time_limit: Maximum solver time (default 30s)
    
    Returns:
        Optimized schedules, signal states, and decisions
    """
    try:
        section_data = fetch_section_data(sectionid)
        
        optimizer = RailwayOptimizer()
        optimizer.load_data(section_data)
        
        result = optimizer.optimize(time_limit)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/optimize")
async def optimize_with_data(
    section_data: Dict[str, Any],
    time_limit: int = Query(30, description="Solver time limit in seconds")
):
    """
    Optimization endpoint with data in request body.
    
    Args:
        section_data: Section data JSON in request body
        time_limit: Maximum solver time (default 30s)
    
    Returns:
        Optimized schedules, signal states, and decisions
    """
    try:
        optimizer = RailwayOptimizer()
        optimizer.load_data(section_data)
        
        result = optimizer.optimize(time_limit)
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/signals")
def get_signals(sectionid: str = Query(..., description="Section ID")):
    """
    Get current signal states for a section.
    """
    try:
        section_data = fetch_section_data(sectionid)
        
        optimizer = RailwayOptimizer()
        optimizer.load_data(section_data)
        
        # Update signals
        if optimizer.signal_controller:
            signals = optimizer.signal_controller.update_all_signals()
            return JSONResponse({
                "signals": {k: v.value for k, v in signals.items()},
                "blocks": optimizer.signal_controller.get_block_status()
            })
        
        return JSONResponse({"error": "Signal controller not initialized"}, status_code=500)
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/routes")
def find_routes(
    sectionid: str = Query(..., description="Section ID"),
    from_station: str = Query(..., description="Origin station"),
    to_station: str = Query(..., description="Destination station"),
    k: int = Query(3, description="Number of alternative routes")
):
    """
    Find routes between two stations.
    """
    try:
        section_data = fetch_section_data(sectionid)
        
        optimizer = RailwayOptimizer()
        optimizer.load_data(section_data)
        
        if optimizer.route_finder:
            path = optimizer.route_finder.get_path_between_stations(from_station, to_station)
            
            if path:
                return JSONResponse({
                    "route": {
                        "edges": path.edges,
                        "nodes": path.nodes,
                        "length_m": path.total_length,
                        "time_s": path.total_time,
                        "uses_loop": path.uses_loop
                    }
                })
            else:
                return JSONResponse({"error": "No route found"}, status_code=404)
        
        return JSONResponse({"error": "Route finder not initialized"}, status_code=500)
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

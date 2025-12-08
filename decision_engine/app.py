"""
Railway Decision Engine API Server
Flask-based API that exposes optimization endpoints
"""
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from scheduler import run_optimization

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


@app.route("/", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Railway Decision Engine",
        "version": "1.0.0"
    })


@app.route("/api/optimize", methods=["POST"])
def optimize():
    """
    Main optimization endpoint
    
    Expects JSON body with:
    - sectionData: section infrastructure data
    - trains: array of train objects
    
    Returns:
    - success: boolean
    - message: status message
    - trainSchedules: optimized schedule for each train
    - conflictsResolved: list of resolved conflicts
    - summary: optimization summary
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        if "sectionData" not in data:
            return jsonify({
                "success": False,
                "message": "Missing sectionData in request"
            }), 400
        
        if "trains" not in data:
            return jsonify({
                "success": False,
                "message": "Missing trains in request"
            }), 400
        
        print(f"Received optimization request")
        print(f"Section: {data['sectionData'].get('name', 'Unknown')}")
        print(f"Trains: {len(data['trains'])}")
        
        # Run optimization
        result = run_optimization(data)
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error during optimization: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            "success": False,
            "message": f"Optimization error: {str(e)}"
        }), 500


@app.route("/api/validate", methods=["POST"])
def validate():
    """
    Validate input data without running full optimization
    Returns structure info about the section
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "valid": False,
                "message": "No data provided"
            }), 400
        
        section_data = data.get("sectionData", {})
        trains = data.get("trains", [])
        
        # Count elements
        tracks = section_data.get("tracks", [])
        total_nodes = sum(len(t.get("nodes", [])) for t in tracks)
        total_edges = sum(len(t.get("edges", [])) for t in tracks)
        stations = section_data.get("stations", [])
        
        passenger_trains = [t for t in trains if t.get("trainCategory") == "Passenger"]
        freight_trains = [t for t in trains if t.get("trainCategory") == "Freight"]
        
        return jsonify({
            "valid": True,
            "message": "Data validated successfully",
            "structure": {
                "sectionId": section_data.get("section_id", ""),
                "sectionName": section_data.get("name", ""),
                "totalTracks": len(tracks),
                "totalNodes": total_nodes,
                "totalEdges": total_edges,
                "totalStations": len(stations),
                "stationNames": [s.get("stationName", "") for s in stations],
                "totalTrains": len(trains),
                "passengerTrains": len(passenger_trains),
                "freightTrains": len(freight_trains)
            }
        })
    
    except Exception as e:
        return jsonify({
            "valid": False,
            "message": f"Validation error: {str(e)}"
        }), 500


@app.route("/api/time-distance", methods=["POST"])
def time_distance():
    """
    Get time-distance data for visualization
    Returns simplified data for plotting
    """
    try:
        data = request.get_json()
        result = run_optimization(data)
        
        if not result.get("success"):
            return jsonify(result), 500
        
        # Extract just time-distance profiles
        profiles = []
        for train_schedule in result.get("trainSchedules", []):
            profiles.append({
                "trainId": train_schedule.get("trainId"),
                "trainName": train_schedule.get("trainName"),
                "trainCategory": train_schedule.get("trainCategory"),
                "direction": train_schedule.get("direction"),
                "profile": train_schedule.get("timeDistanceProfile", [])
            })
        
        return jsonify({
            "success": True,
            "profiles": profiles
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "true").lower() == "true"
    
    print("=" * 60)
    print("🚂 Railway Decision Engine")
    print("=" * 60)
    print(f"Starting server on port {port}")
    print(f"Debug mode: {debug}")
    print("")
    print("Available endpoints:")
    print("  GET  /                 - Health check")
    print("  POST /api/optimize     - Run optimization")
    print("  POST /api/validate     - Validate input data")
    print("  POST /api/time-distance - Get time-distance profiles")
    print("=" * 60)
    
    app.run(host="0.0.0.0", port=port, debug=debug)

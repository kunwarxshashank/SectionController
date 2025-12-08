"""
Railway Decision Engine API Server v2.0
Flask-based API for train scheduling optimization
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
CORS(app)


@app.route("/", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
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
    })


@app.route("/api/optimize", methods=["POST"])
def optimize():
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
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        # Validate required fields
        if "trains" not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'trains' in request"
            }), 400
        
        if "tracks" not in data and "sectionData" not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'tracks' or 'sectionData' in request"
            }), 400
        
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
        
        section_name = optimization_data.get("section", {}).get("name", "Unknown")
        train_count = len(optimization_data.get("trains", []))
        
        print(f"\n{'='*60}")
        print(f"Optimization request received")
        print(f"Section: {section_name}")
        print(f"Trains: {train_count}")
        print(f"{'='*60}\n")
        
        # Run optimization
        result = run_optimization(optimization_data)
        
        return jsonify(result)
    
    except Exception as e:
        import traceback
        print(f"Error during optimization: {str(e)}")
        traceback.print_exc()
        
        return jsonify({
            "success": False,
            "message": f"Optimization error: {str(e)}"
        }), 500


@app.route("/api/validate", methods=["POST"])
def validate():
    """Validate input data structure"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"valid": False, "message": "No data provided"}), 400
        
        # Check for required fields
        issues = []
        
        if "tracks" not in data and "sectionData" not in data:
            issues.append("Missing 'tracks' or 'sectionData'")
        
        if "trains" not in data:
            issues.append("Missing 'trains'")
        
        if issues:
            return jsonify({
                "valid": False,
                "message": "Validation failed",
                "issues": issues
            }), 400
        
        # Count elements
        tracks = data.get("tracks", [])
        trains = data.get("trains", [])
        stations = data.get("stations", [])
        
        total_blocks = sum(len(t.get("blocks", [])) for t in tracks)
        
        passenger_trains = [t for t in trains if "freight" not in t.get("name", "").lower() 
                           and not t.get("number", "").startswith("FRE")]
        freight_trains = [t for t in trains if "freight" in t.get("name", "").lower() 
                          or t.get("number", "").startswith("FRE")]
        
        return jsonify({
            "valid": True,
            "message": "Data validated successfully",
            "structure": {
                "sectionName": data.get("section", {}).get("name", ""),
                "totalTracks": len(tracks),
                "totalBlocks": total_blocks,
                "totalStations": len(stations),
                "stationNames": [s.get("name", "") for s in stations],
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
    """Get time-distance profiles for visualization"""
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
                "trainNumber": train_schedule.get("trainNumber"),
                "isPassenger": train_schedule.get("isPassenger"),
                "isFreight": train_schedule.get("isFreight"),
                "direction": train_schedule.get("direction"),
                "profile": train_schedule.get("timeDistanceProfile", [])
            })
        
        return jsonify({
            "success": True,
            "profiles": profiles,
            "summary": result.get("summary", {})
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500


@app.route("/api/conflicts", methods=["POST"])
def analyze_conflicts():
    """Analyze potential conflicts without full optimization"""
    try:
        data = request.get_json()
        trains = data.get("trains", [])
        
        # Group trains by current block
        block_occupancy = {}
        for train in trains:
            block = train.get("current_block", "")
            if block:
                if block not in block_occupancy:
                    block_occupancy[block] = []
                block_occupancy[block].append({
                    "trainId": train.get("id"),
                    "trainName": train.get("name"),
                    "trainNumber": train.get("number"),
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
        
        return jsonify({
            "success": True,
            "totalConflicts": len(conflicts),
            "conflicts": conflicts
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
    
    app.run(host="0.0.0.0", port=port, debug=debug)

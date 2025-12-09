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
from infrastructure_advisor import run_infrastructure_analysis

# Load environment variables
load_dotenv()

# ❗ FIXED: use __name__ not _name_
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
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        if "trains" not in data:
            return jsonify({"success": False, "message": "Missing 'trains' in request"}), 400

        if "tracks" not in data and "sectionData" not in data:
            return jsonify({"success": False, "message": "Missing 'tracks' or 'sectionData'"}), 400

        # Support old + new format
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

        section_name = optimization_data.get("section", {}).get("name", "Unknown")
        train_count = len(optimization_data.get("trains", []))

        print("\n" + "=" * 60)
        print("Optimization request received")
        print(f"Section: {section_name}")
        print(f"Trains: {train_count}")
        print("=" * 60 + "\n")

        result = run_optimization(optimization_data)
        return jsonify(result)

    except Exception as e:
        import traceback
        print(f"Error during optimization: {str(e)}")
        traceback.print_exc()

        return jsonify({"success": False, "message": f"Optimization error: {str(e)}"}), 500


# ============================================================
# TEST CASE ENDPOINTS - 3 Separate Analysis APIs
# ============================================================

@app.route("/api/testcase/loop", methods=["POST"])
def testcase_loop():
    """
    TEST CASE 1: Where to add loop line
    Finds the best station to add a loop for maximum freight throughput.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        from loop_placement_planner import run_loop_placement_analysis

        analysis_data = {
            "sectionData": data.get("sectionData", data),
            "trains": data.get("trains", [])
        }

        print("\n" + "=" * 60)
        print("TEST CASE 1: Loop Placement Analysis")
        print(f"Trains: {len(analysis_data.get('trains', []))}")
        print("=" * 60 + "\n")

        result = run_loop_placement_analysis(analysis_data)
        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Loop analysis error: {str(e)}"}), 500


@app.route("/api/testcase/signalling", methods=["POST"])
def testcase_signalling():
    """
    TEST CASE 2: Where to add automatic signalling
    Finds the best station-to-station segment to upgrade from block to automatic.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        from auto_signalling_advisor import run_auto_signalling_analysis

        analysis_data = {
            "sectionData": data.get("sectionData", data),
            "trains": data.get("trains", [])
        }

        print("\n" + "=" * 60)
        print("TEST CASE 2: Auto Signalling Analysis")
        print(f"Trains: {len(analysis_data.get('trains', []))}")
        print("=" * 60 + "\n")

        result = run_auto_signalling_analysis(analysis_data)
        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Signalling analysis error: {str(e)}"}), 500


@app.route("/api/testcase/freight", methods=["POST"])
def testcase_freight():
    """
    TEST CASE 3: What if we add extra freight trains
    Simulates adding more freight trains and shows impact on schedule.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        from infrastructure_advisor import NetworkGraph, Train, FreightCapacityAnalyzer

        analysis_data = {
            "sectionData": data.get("sectionData", data),
            "trains": data.get("trains", [])
        }

        print("\n" + "=" * 60)
        print("TEST CASE 3: Freight Capacity Analysis")
        print(f"Trains: {len(analysis_data.get('trains', []))}")
        print("=" * 60 + "\n")

        graph = NetworkGraph()
        graph.build(analysis_data)
        trains = [Train.from_dict(t) for t in analysis_data.get("trains", [])]
        
        analyzer = FreightCapacityAnalyzer(graph, trains)
        result = analyzer.analyze()
        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Freight analysis error: {str(e)}"}), 500


@app.route("/api/testcase/loop-simulate", methods=["POST"])
def testcase_loop_simulate():
    """
    TEST CASE 4: Loop Placement Simulation
    Given a specific station, simulate adding a loop and return:
    - Impact on trains (benefited/unaffected)
    - Time-distance graph data (before/after)
    - Estimated extra freight trains possible
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        target_station_id = data.get("targetStationId", "")
        if not target_station_id:
            return jsonify({
                "success": False, 
                "message": "Missing 'targetStationId' parameter. Specify which station to add the loop."
            }), 400

        from loop_placement_simulator import run_loop_placement_simulation

        simulation_data = {
            "sectionData": data.get("sectionData", data),
            "trains": data.get("trains", []),
            "targetStationId": target_station_id
        }

        print("\n" + "=" * 60)
        print("TEST CASE 4: Loop Placement Simulation")
        print(f"Target Station: {target_station_id}")
        print(f"Trains: {len(simulation_data.get('trains', []))}")
        print("=" * 60 + "\n")

        result = run_loop_placement_simulation(simulation_data)
        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Loop simulation error: {str(e)}"}), 500


#TEST CASE 5: Automatic Block Upgrade Simulation

@app.route("/api/testcase/autoblockupgrade", methods=["POST"])
def testcase_autoblockupgrade():
    """
    TEST CASE 5: Automatic Block Upgrade Simulation
    Given two stations (fromStation, toStation), simulate upgrading the segment
    between them to automatic signalling and return:
    - Segment analysis (block counts, length, capacity gain)
    - Time-distance graph data for baseline
    - Estimated extra freight trains if upgraded
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        from_station = data.get("fromStationId", data.get("fromStation", ""))
        to_station = data.get("toStationId", data.get("toStation", ""))

        if not from_station or not to_station:
            return jsonify({
                "success": False, 
                "message": "Missing 'fromStationId' and/or 'toStationId' parameters. Specify which stations to upgrade between."
            }), 400

        from auto_blockupgrade import run_automatic_upgrade_between

        simulation_data = {
            "sectionData": data.get("sectionData", data),
            "trains": data.get("trains", [])
        }

        print("\n" + "=" * 60)
        print("TEST CASE 5: Automatic Block Upgrade Simulation")
        print(f"From Station: {from_station}")
        print(f"To Station: {to_station}")
        print(f"Trains: {len(simulation_data.get('trains', []))}")
        print("=" * 60 + "\n")

        result = run_automatic_upgrade_between(simulation_data, from_station, to_station)
        
        print("\n" + "=" * 60)
        print("AUTO BLOCK UPGRADE RESULT RECEIVED")
        print(f"Success: {result.get('success', False)}")
        print(f"Message: {result.get('message', 'N/A')}")
        if result.get('segment'):
            print(f"Segment: {result['segment'].get('fromStationName')} -> {result['segment'].get('toStationName')}")
        print("Returning JSON response...")
        print("=" * 60 + "\n")
        
        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Auto upgrade simulation error: {str(e)}"}), 500

@app.route("/api/validate", methods=["POST"])
def validate():
    """Validate input data structure"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"valid": False, "message": "No data provided"}), 400

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

        tracks = data.get("tracks", [])
        trains = data.get("trains", [])
        stations = data.get("stations", [])

        total_blocks = sum(len(t.get("blocks", [])) for t in tracks)

        passenger_trains = [
            t for t in trains 
            if "freight" not in t.get("name", "").lower()
        ]
        freight_trains = [
            t for t in trains
            if "freight" in t.get("name", "").lower()
        ]

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
        return jsonify({"valid": False, "message": f"Validation error: {str(e)}"}), 500


@app.route("/api/time-distance", methods=["POST"])
def time_distance():
    """Get time-distance profiles for visualization"""
    try:
        data = request.get_json()
        result = run_optimization(data)

        if not result.get("success"):
            return jsonify(result), 500

        profiles = []
        for train_schedule in result.get("trainSchedules", []):
            profiles.append({
                "trainId": train_schedule.get("trainId"),
                "trainName": train_schedule.get("trainName"),
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
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500



# ============================================================
# TEST CASE ENDPOINTS - 4 Separate Analysis APIs
# ============================================================







@app.route("/api/conflicts", methods=["POST"])
def analyze_conflicts():
    """Analyze potential conflicts without full optimization"""
    try:
        data = request.get_json()
        trains = data.get("trains", [])

        block_occupancy = {}
        for train in trains:
            block = train.get("current_block", "")
            if block:
                block_occupancy.setdefault(block, []).append(train)

        conflicts = []
        for block, trains_in_block in block_occupancy.items():
            if len(trains_in_block) > 1:
                conflicts.append({
                    "blockId": block,
                    "trainCount": len(trains_in_block),
                    "trains": trains_in_block,
                    "severity": "HIGH" if len(trains_in_block) > 2 else "MEDIUM"
                })

        return jsonify({"success": True, "totalConflicts": len(conflicts), "conflicts": conflicts})

    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500


# ❗ FIXED: use __name__ not _name_
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    debug = os.environ.get("DEBUG", "true").lower() == "true"

    print("=" * 60)
    print("🚂 Railway Decision Engine v2.0")
    print("=" * 60)
    print(f"Starting server on port {port}")
    print(f"Debug mode: {debug}")
    print("Available endpoints:")
    print("  GET  /                          - Health check")
    print("  POST /api/optimize              - Run full optimization")
    print("  POST /api/testcase/loop         - Test Case 1: Best loop location")
    print("  POST /api/testcase/signalling   - Test Case 2: Best signalling upgrade")
    print("  POST /api/testcase/freight      - Test Case 3: Freight capacity analysis")
    print("  POST /api/testcase/loop-simulate - Test Case 4: Loop simulation")
    print("  POST /api/testcase/auto-upgrade - Test Case 5: Auto block upgrade what-if")
    print("  POST /api/validate              - Validate input data")
    print("  POST /api/time-distance         - Get time-distance profiles")
    print("  POST /api/conflicts             - Analyze conflicts")
    print("=" * 60)

    app.run(host="0.0.0.0", port=port, debug=debug)

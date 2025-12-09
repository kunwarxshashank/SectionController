#!/usr/bin/env python3
"""
Test script for all 3 test case APIs
Tests directly with data.json format
"""

import json
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def load_test_data():
    """Load data.json from backend folder"""
    data_path = os.path.join(os.path.dirname(__file__), "..", "backend", "data.json")
    with open(data_path, "r") as f:
        return json.load(f)

def test_auto_signalling():
    """Test Case 2: Auto Signalling Advisor"""
    print("\n" + "=" * 60)
    print("TEST CASE 2: Auto Signalling Advisor")
    print("=" * 60)
    
    from auto_signalling_advisor import run_auto_signalling_analysis
    
    data = load_test_data()
    
    # Prepare data in API format
    analysis_data = {
        "sectionData": data.get("sectionData", {}),
        "trains": data.get("trains", [])
    }
    
    print(f"Section: {analysis_data['sectionData'].get('name', 'Unknown')}")
    print(f"Tracks: {len(analysis_data['sectionData'].get('tracks', []))}")
    print(f"Trains: {len(analysis_data.get('trains', []))}")
    
    result = run_auto_signalling_analysis(analysis_data)
    
    print("\n--- RESULTS ---")
    print(f"Success: {result.get('success')}")
    print(f"Message: {result.get('message')}")
    
    best = result.get("bestSegmentToConvert")
    if best:
        print(f"\nBest Segment to Convert:")
        print(f"  {best['fromStation']} -> {best['toStation']}")
        print(f"  Blocks: {best['segmentBlocks']}")
        print(f"  Length: {best['segmentLengthKm']} km")
        print(f"  Passenger Trains: {best['passengerTrains']}")
        print(f"  Freight Trains: {best['freightTrains']}")
        print(f"  Current Trains: {best['currentTrains']}")
        print(f"  Extra Freight if Auto: +{best['extraFreightIfAutomatic']}")
    
    rankings = result.get("segmentRankings", [])
    print(f"\nAll {len(rankings)} Segments Ranked:")
    for i, seg in enumerate(rankings):
        print(f"  {i+1}. {seg['fromStation']} -> {seg['toStation']}: +{seg['extraFreightIfAutomatic']} extra freight")
    
    return result

def test_loop_placement():
    """Test Case 1: Loop Placement Advisor"""
    print("\n" + "=" * 60)
    print("TEST CASE 1: Loop Placement Advisor")
    print("=" * 60)
    
    from loop_placement_planner import run_loop_placement_analysis
    
    data = load_test_data()
    
    analysis_data = {
        "sectionData": data.get("sectionData", {}),
        "trains": data.get("trains", [])
    }
    
    print(f"Section: {analysis_data['sectionData'].get('name', 'Unknown')}")
    print(f"Trains: {len(analysis_data.get('trains', []))}")
    
    result = run_loop_placement_analysis(analysis_data)
    
    print("\n--- RESULTS ---")
    print(f"Success: {result.get('success')}")
    
    best = result.get("bestStationToAddLoop")
    if best:
        print(f"\nBest Station to Add Loop:")
        print(f"  {best.get('stationName', 'Unknown')} ({best.get('stationCode', '?')})")
        print(f"  Extra Freight: +{best.get('estimatedExtraFreightTrainsIfOneMoreLoop', 0)}")
    
    rankings = result.get("stationRankings", [])
    print(f"\nAll {len(rankings)} Stations Ranked:")
    for i, s in enumerate(rankings):
        print(f"  {i+1}. {s.get('stationName', 'Unknown')}: +{s.get('estimatedExtraFreightTrainsIfOneMoreLoop', 0)} extra freight")
    
    return result

def test_freight_capacity():
    """Test Case 3: Freight Capacity Analyzer"""
    print("\n" + "=" * 60)
    print("TEST CASE 3: Freight Capacity Analyzer")
    print("=" * 60)
    
    from infrastructure_advisor import NetworkGraph, Train, FreightCapacityAnalyzer
    
    data = load_test_data()
    
    analysis_data = {
        "sectionData": data.get("sectionData", {}),
        "trains": data.get("trains", [])
    }
    
    print(f"Section: {analysis_data['sectionData'].get('name', 'Unknown')}")
    print(f"Trains: {len(analysis_data.get('trains', []))}")
    
    graph = NetworkGraph()
    graph.build(analysis_data)
    trains = [Train.from_dict(t) for t in analysis_data.get("trains", [])]
    
    analyzer = FreightCapacityAnalyzer(graph, trains)
    result = analyzer.analyze()
    
    print("\n--- RESULTS ---")
    
    current = result.get("currentState", {})
    print(f"Current State:")
    print(f"  Passenger Trains: {current.get('passengerTrains', 0)}")
    print(f"  Freight Trains: {current.get('freightTrains', 0)}")
    print(f"  Total Loops: {current.get('totalLoops', 0)}")
    
    print(f"\nRecommended Max Additional Freight: +{result.get('recommendedMaxAdditionalFreight', 0)}")
    
    scenarios = result.get("scenarios", [])
    if scenarios:
        print(f"\nScenarios ({len(scenarios)}):")
        for s in scenarios:
            print(f"  +{s['additionalFreightTrains']} trains: {s['conflictRisk']} risk, {s['recommendation']}")
    
    return result


def test_loop_simulate():
    """Test Case 4: Loop Placement Simulation"""
    print("\n" + "=" * 60)
    print("TEST CASE 4: Loop Placement Simulation")
    print("=" * 60)
    
    from loop_placement_simulator import run_loop_placement_simulation
    
    data = load_test_data()
    
    # Test with each station
    test_stations = ["bhopal", "vidisha", "bina"]
    
    for station_id in test_stations:
        print(f"\n--- Testing with station: {station_id} ---")
        
        simulation_data = {
            "sectionData": data.get("sectionData", {}),
            "trains": data.get("trains", []),
            "targetStationId": station_id
        }
        
        result = run_loop_placement_simulation(simulation_data)
        
        if result.get("success"):
            target = result.get("targetStation", {})
            current = result.get("currentState", {})
            simulated = result.get("simulatedState", {})
            impact = result.get("impactAnalysis", {})
            
            print(f"  Target: {target.get('stationName', 'Unknown')} ({target.get('stationCode', '?')})")
            print(f"  Current loops: UP={current.get('existingLoops', {}).get('UP', 0)}, DOWN={current.get('existingLoops', {}).get('DOWN', 0)}")
            print(f"  Current trains: {current.get('passengerTrains', 0)} passenger, {current.get('freightTrains', 0)} freight")
            print(f"  Extra freight if loop added: +{simulated.get('estimatedExtraFreightTrains', 0)}")
            print(f"  Capacity increase: {simulated.get('capacityIncrease', '0%')}")
            print(f"  Benefited trains: {len(impact.get('benefitedTrains', []))}")
            print(f"  Summary: {impact.get('summary', '')}")
            
            # Check time-distance graph data
            td_graph = result.get("timeDistanceGraph", {})
            print(f"  Time-Distance graph: {len(td_graph.get('before', []))} before, {len(td_graph.get('after', []))} after")
        else:
            print(f"  Error: {result.get('message', 'Unknown error')}")
    
    return result


if __name__ == "__main__":
    print("=" * 60)
    print("  TESTING ALL 4 TEST CASE APIs")
    print("  Using data from: backend/data.json")
    print("=" * 60)
    
    results = {}
    
    # Test 1: Loop Placement
    try:
        results["loop"] = test_loop_placement()
        print("\n[PASS] Loop Placement Test PASSED")
    except Exception as e:
        print(f"\n[FAIL] Loop Placement Test FAILED: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 2: Auto Signalling
    try:
        results["signalling"] = test_auto_signalling()
        print("\n[PASS] Auto Signalling Test PASSED")
    except Exception as e:
        print(f"\n[FAIL] Auto Signalling Test FAILED: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 3: Freight Capacity
    try:
        results["freight"] = test_freight_capacity()
        print("\n[PASS] Freight Capacity Test PASSED")
    except Exception as e:
        print(f"\n[FAIL] Freight Capacity Test FAILED: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 4: Loop Placement Simulation
    try:
        results["loop_simulate"] = test_loop_simulate()
        print("\n[PASS] Loop Placement Simulation Test PASSED")
    except Exception as e:
        print(f"\n[FAIL] Loop Placement Simulation Test FAILED: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("  TEST SUMMARY")
    print("=" * 60)
    
    for name, res in results.items():
        status = "[PASS]" if res and res.get("success") else "[FAIL]"
        print(f"  {status} {name}")
    
    print("\n")

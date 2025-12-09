#!/usr/bin/env python3
"""
Infrastructure Improvement Advisor

Combines multiple analysis modules:
1. Loop Placement Analysis - Where to add loops
2. Signalling Analysis - Where to add automatic signalling  
3. Freight Capacity Analysis - What if we add more freight trains

All use the same input format as /api/optimize
"""

import json
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional

from loop_placement_planner import (
    NetworkGraph, 
    Train, 
    Station, 
    Edge, 
    run_loop_placement_analysis
)


# ============================================================
# SIGNALLING ADVISOR
# ============================================================

class SignallingAdvisor:
    """
    Analyzes where to add automatic signalling for better throughput.
    
    Heuristic:
    - Find block sections with highest traffic density
    - Identify sections that are currently "block" type (manual)
    - Prioritize sections between busy stations
    - Recommend converting to "automatic" signalling
    """

    def __init__(self, graph: NetworkGraph, trains: List[Train]) -> None:
        self.graph = graph
        self.trains = trains

    def analyze(self) -> dict:
        # Find block-type edges (manual signalling)
        block_edges: List[Dict[str, Any]] = []
        
        for edge_id, edge in self.graph.edges.items():
            if edge.edge_type == "block" and not edge.is_loop:
                # Count trains that use this edge
                trains_using = 0
                passenger_count = 0
                freight_count = 0
                
                for train in self.trains:
                    if train.current_edge == edge_id:
                        trains_using += 1
                        if train.is_passenger:
                            passenger_count += 1
                        else:
                            freight_count += 1
                
                # Calculate benefit score
                # More passenger trains = higher priority for auto signalling
                # Longer blocks = higher priority (more time savings)
                benefit_score = (passenger_count * 3 + freight_count * 1) * edge.length
                
                block_edges.append({
                    "edgeId": edge_id,
                    "startNode": edge.start_node,
                    "endNode": edge.end_node,
                    "length": edge.length,
                    "direction": edge.direction,
                    "stationCode": edge.station_code,
                    "currentType": "block",
                    "recommendedType": "automatic",
                    "trainsCurrentlyUsing": trains_using,
                    "passengerTrains": passenger_count,
                    "freightTrains": freight_count,
                    "benefitScore": round(benefit_score, 2),
                    "estimatedTimeSavingsMinutes": round(edge.length * 0.5, 1),  # ~0.5 min per km
                    "estimatedExtraTrainsPerDay": max(1, int(benefit_score / 10)),
                })
        
        # Sort by benefit score
        block_edges.sort(key=lambda x: x["benefitScore"], reverse=True)
        
        # Get summary
        total_block_length = sum(e["length"] for e in block_edges)
        total_potential_savings = sum(e["estimatedTimeSavingsMinutes"] for e in block_edges)
        
        return {
            "success": True,
            "message": "Signalling analysis completed",
            "summary": {
                "totalBlockSections": len(block_edges),
                "totalBlockLengthKm": round(total_block_length, 2),
                "totalPotentialSavingsMinutes": round(total_potential_savings, 1),
                "existingAutomaticSections": len([e for e in self.graph.edges.values() if e.edge_type == "automatic"]),
            },
            "bestSectionsForAutomaticSignalling": block_edges[:5],  # Top 5
            "allBlockSections": block_edges,
        }


# ============================================================
# FREIGHT CAPACITY ANALYZER
# ============================================================

class FreightCapacityAnalyzer:
    """
    Analyzes what happens if we add more freight trains.
    
    Simulates adding 1, 2, 5, 10 more freight trains and estimates:
    - Delay impact on passenger trains
    - Loop utilization increase
    - Conflict probability
    - Recommended maximum additional freight
    """

    def __init__(self, graph: NetworkGraph, trains: List[Train]) -> None:
        self.graph = graph
        self.trains = trains
        
        # Count existing trains
        self.passenger_count = sum(1 for t in trains if t.is_passenger)
        self.freight_count = sum(1 for t in trains if t.is_freight)
        self.up_freight = sum(1 for t in trains if t.is_freight and t.direction.upper() == "UP")
        self.down_freight = sum(1 for t in trains if t.is_freight and t.direction.upper() == "DOWN")
        
        # Count infrastructure
        self.total_loops = sum(
            sum(d.values()) for d in self.graph.loop_counts.values()
        )
        self.up_loops = sum(
            d.get("UP", 0) for d in self.graph.loop_counts.values()
        )
        self.down_loops = sum(
            d.get("DOWN", 0) for d in self.graph.loop_counts.values()
        )

    def _simulate_additional_freight(self, additional: int) -> Dict[str, Any]:
        """Simulate impact of adding N more freight trains."""
        
        total_freight = self.freight_count + additional
        total_trains = self.passenger_count + total_freight
        
        # Estimate loop utilization
        # Each freight train may need ~0.5 loop usages per day on average
        estimated_loop_usages = total_freight * 0.5
        loop_utilization_percent = min(100, (estimated_loop_usages / max(1, self.total_loops * 24)) * 100)
        
        # Estimate delay impact on passengers
        # More freight = more potential conflicts = more delays
        # Heuristic: each additional freight adds ~0.5-1 min avg delay
        base_delay = 0.5  # min per freight train
        if additional > 5:
            base_delay = 1.0
        if additional > 10:
            base_delay = 1.5
        
        avg_passenger_delay = base_delay * additional
        
        # Conflict probability (rough estimate)
        # Higher if freight/loop ratio is high
        freight_per_loop = total_freight / max(1, self.total_loops)
        if freight_per_loop > 3:
            conflict_risk = "HIGH"
        elif freight_per_loop > 2:
            conflict_risk = "MEDIUM"
        else:
            conflict_risk = "LOW"
        
        # Throughput efficiency
        max_section_capacity = self.total_loops * 8 + 20  # rough estimate
        efficiency = min(100, (total_trains / max_section_capacity) * 100)
        
        return {
            "additionalFreightTrains": additional,
            "totalFreightTrains": total_freight,
            "totalTrains": total_trains,
            "loopUtilizationPercent": round(loop_utilization_percent, 1),
            "estimatedAvgPassengerDelayMinutes": round(avg_passenger_delay, 1),
            "conflictRisk": conflict_risk,
            "throughputEfficiencyPercent": round(efficiency, 1),
            "recommendation": self._get_recommendation(conflict_risk, efficiency, avg_passenger_delay),
        }

    def _get_recommendation(self, risk: str, efficiency: float, delay: float) -> str:
        if risk == "HIGH" or delay > 3:
            return "NOT_RECOMMENDED"
        if risk == "MEDIUM" or delay > 1.5:
            return "CAUTION"
        return "SAFE"

    def analyze(self) -> dict:
        # Run simulations for different freight counts
        scenarios = [
            self._simulate_additional_freight(0),
            self._simulate_additional_freight(1),
            self._simulate_additional_freight(2),
            self._simulate_additional_freight(5),
            self._simulate_additional_freight(10),
            self._simulate_additional_freight(15),
        ]
        
        # Find recommended max
        recommended_max = 0
        for scenario in scenarios:
            if scenario["recommendation"] == "SAFE":
                recommended_max = scenario["additionalFreightTrains"]
        
        # Calculate direction balance
        direction_balance = {
            "currentUp": self.up_freight,
            "currentDown": self.down_freight,
            "upLoops": self.up_loops,
            "downLoops": self.down_loops,
            "recommendedAdditionalUp": max(0, self.down_freight - self.up_freight + 2),
            "recommendedAdditionalDown": max(0, self.up_freight - self.down_freight + 2),
        }
        
        return {
            "success": True,
            "message": "Freight capacity analysis completed",
            "currentState": {
                "passengerTrains": self.passenger_count,
                "freightTrains": self.freight_count,
                "totalLoops": self.total_loops,
                "upLoops": self.up_loops,
                "downLoops": self.down_loops,
            },
            "recommendedMaxAdditionalFreight": recommended_max,
            "directionBalance": direction_balance,
            "scenarios": scenarios,
        }


# ============================================================
# COMBINED ANALYSIS
# ============================================================

def run_infrastructure_analysis(data: dict) -> dict:
    """
    Run all infrastructure improvement analyses:
    - Loop placement
    - Signalling improvements
    - Freight capacity
    """
    graph = NetworkGraph()
    graph.build(data)
    trains = [Train.from_dict(t) for t in data.get("trains", [])]
    
    # Run analyses
    loop_analysis = run_loop_placement_analysis(data)
    
    signalling_advisor = SignallingAdvisor(graph, trains)
    signalling_analysis = signalling_advisor.analyze()
    
    freight_analyzer = FreightCapacityAnalyzer(graph, trains)
    freight_analysis = freight_analyzer.analyze()
    
    return {
        "success": True,
        "message": "Infrastructure analysis completed",
        "loopPlacement": loop_analysis,
        "signalling": signalling_analysis,
        "freightCapacity": freight_analysis,
        "summary": {
            "bestStationForLoop": loop_analysis.get("bestStationToAddLoop", {}).get("stationCode"),
            "extraFreightFromLoop": loop_analysis.get("bestStationToAddLoop", {}).get("estimatedExtraFreightTrainsIfOneMoreLoop", 0),
            "bestSectionForSignalling": signalling_analysis.get("bestSectionsForAutomaticSignalling", [{}])[0].get("edgeId") if signalling_analysis.get("bestSectionsForAutomaticSignalling") else None,
            "recommendedMaxAdditionalFreight": freight_analysis.get("recommendedMaxAdditionalFreight", 0),
        }
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python infrastructure_advisor.py <data.json>")
        sys.exit(1)

    with open(sys.argv[1], "r") as f:
        data = json.load(f)

    result = run_infrastructure_analysis(data)
    print(json.dumps(result, indent=2))

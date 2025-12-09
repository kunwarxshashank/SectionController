#!/usr/bin/env python3
"""
Loop Placement Simulator

Goal:
- Given a SPECIFIC station where user wants to add a loop,
  simulate the impact and return:
  - Time-distance graph data (before/after)
  - Number of extra freight trains possible
  - Impact on existing train schedules

Input:
  data dict with keys:
    - sectionData.stations[]
    - sectionData.tracks[].edges[]
    - sectionData.tracks[].nodes[]
    - trains[]
    - targetStationId (which station to add the loop)

Output example:
{
  "success": true,
  "message": "Loop placement simulation completed",
  "targetStation": {
    "stationId": "bhopal",
    "stationName": "Bhopal",
    "stationCode": "BPL"
  },
  "currentState": {
    "existingLoops": {"UP": 2, "DOWN": 2},
    "passengerTrains": 5,
    "freightTrains": 15,
    "totalTrains": 20
  },
  "simulatedState": {
    "newLoops": {"UP": 3, "DOWN": 3},
    "estimatedExtraFreightTrains": 4,
    "capacityIncrease": "25%",
    "conflictReduction": "15%"
  },
  "impactAnalysis": {
    "benefitedTrains": [...],
    "unaffectedTrains": [...],
    "summary": "Adding loop at Bhopal will reduce waiting time by ~12 minutes for 8 trains"
  },
  "timeDistanceGraph": {
    "before": [...],
    "after": [...]
  }
}
"""

import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any


# ============================================================
# BASIC MODELS
# ============================================================

@dataclass
class Edge:
    edge_id: str
    start_node: str
    end_node: str
    edge_type: str
    stream: str
    direction: str
    length: float
    max_speed: float
    station_code: str
    loop_group: str
    loop_number: int
    is_occupied: bool

    @classmethod
    def from_dict(cls, data: dict) -> "Edge":
        max_speed = data.get("maxspeed", 120)
        if isinstance(max_speed, str):
            try:
                max_speed = float(max_speed) if max_speed else 120
            except Exception:
                max_speed = 120

        return cls(
            edge_id=data.get("edgeId", ""),
            start_node=data.get("startNode", ""),
            end_node=data.get("endNode", ""),
            edge_type=data.get("edgeType", "block"),
            stream=data.get("stream", "up"),
            direction=data.get("direction", "UP"),
            length=float(data.get("length", 1)),
            max_speed=float(max_speed),
            station_code=data.get("stationCode", ""),
            loop_group=data.get("loopGroup", ""),
            loop_number=int(data.get("loopNumber", 0) or 0),
            is_occupied=bool(data.get("isOccupied", False)),
        )

    @property
    def is_loop(self) -> bool:
        return self.edge_type == "loop"


@dataclass
class Node:
    node_id: str
    node_type: str
    x: float
    y: float
    line: str

    @classmethod
    def from_dict(cls, data: dict) -> "Node":
        return cls(
            node_id=data.get("nodeId", ""),
            node_type=data.get("nodeType", "main"),
            x=float(data.get("x", 0)),
            y=float(data.get("y", 0)),
            line=data.get("line", ""),
        )


@dataclass
class Station:
    station_id: str
    station_name: str
    station_code: str

    @classmethod
    def from_dict(cls, data: dict) -> "Station":
        sid = data.get("stationId", "") or ""
        name = data.get("stationName", sid)
        code = (data.get("stationCode") or sid).upper()[:4]
        return cls(station_id=sid, station_name=name, station_code=code)


@dataclass
class TrainSchedule:
    station_id: str
    scheduled_arrival: str
    scheduled_departure: str


@dataclass
class Train:
    train_id: str
    train_name: str
    train_type: str
    train_category: str
    train_priority: int
    max_speed: float
    direction: str
    current_edge: str
    schedule: Dict[str, TrainSchedule]

    @classmethod
    def from_dict(cls, data: dict) -> "Train":
        schedule: Dict[str, TrainSchedule] = {}
        raw_schedule = data.get("schedule", {})
        for station_id, sched in raw_schedule.items():
            if isinstance(sched, dict):
                schedule[station_id] = TrainSchedule(
                    station_id=station_id,
                    scheduled_arrival=sched.get("scheduledArrival", ""),
                    scheduled_departure=sched.get("scheduledDeparture", ""),
                )

        return cls(
            train_id=data.get("trainId", ""),
            train_name=data.get("trainName", ""),
            train_type=data.get("trainType", ""),
            train_category=data.get("trainCategory", "Freight"),
            train_priority=int(data.get("trainPriority", 10) or 10),
            max_speed=float(data.get("maxSpeed", 65) or 65),
            direction=data.get("direction", "UP"),
            current_edge=data.get("currentEdge", ""),
            schedule=schedule,
        )

    @property
    def is_passenger(self) -> bool:
        return self.train_category == "Passenger"

    @property
    def is_freight(self) -> bool:
        return self.train_category == "Freight"


# ============================================================
# NETWORK GRAPH
# ============================================================

@dataclass
class SimulationGraph:
    section_name: str = ""
    stations: List[Station] = field(default_factory=list)
    edges: Dict[str, Edge] = field(default_factory=dict)
    nodes: Dict[str, Node] = field(default_factory=dict)
    loop_counts: Dict[str, Dict[str, int]] = field(default_factory=dict)
    station_id_to_station: Dict[str, Station] = field(default_factory=dict)
    station_code_to_station: Dict[str, Station] = field(default_factory=dict)

    def build(self, data: dict) -> None:
        section_data = data.get("sectionData", {})
        self.section_name = section_data.get("name", "")

        # Stations
        for st in section_data.get("stations", []):
            station = Station.from_dict(st)
            self.stations.append(station)
            self.station_id_to_station[station.station_id.lower()] = station
            self.station_code_to_station[station.station_code.upper()] = station

        # If no stations, derive from train schedules
        if not self.stations:
            trains = data.get("trains", [])
            seen_ids = set()
            for train in trains:
                schedule = train.get("schedule", {})
                for station_id in schedule.keys():
                    sid = station_id.lower()
                    if sid not in seen_ids:
                        seen_ids.add(sid)
                        code = sid.upper()[:4]
                        name = sid.title()
                        station = Station(station_id=sid, station_name=name, station_code=code)
                        self.stations.append(station)
                        self.station_id_to_station[sid] = station
                        self.station_code_to_station[code] = station

        # Edges and nodes
        for track in section_data.get("tracks", []):
            for ed in track.get("edges", []):
                edge = Edge.from_dict(ed)
                self.edges[edge.edge_id] = edge

                # Count existing loops
                if edge.is_loop and edge.station_code:
                    sc = edge.station_code.upper()
                    dirn = edge.direction.upper() if edge.direction else "UP"
                    self.loop_counts.setdefault(sc, {}).setdefault(dirn, 0)
                    self.loop_counts[sc][dirn] += 1

            for nd in track.get("nodes", []):
                node = Node.from_dict(nd)
                self.nodes[node.node_id] = node


# ============================================================
# LOOP PLACEMENT SIMULATOR
# ============================================================

class LoopPlacementSimulator:
    """
    Simulates adding a loop at a specific station and calculates impact.
    """

    # Map schedule station IDs to edge station codes
    SCHEDULE_TO_EDGE_MAP = {
        "bhopal": "BPL",
        "vidisha": "VDA",
        "bina": "BINA",
    }

    def __init__(self, graph: SimulationGraph, trains: List[Train], target_station_id: str) -> None:
        self.graph = graph
        self.trains = trains
        self.target_station_id = target_station_id.lower()
        self.target_station = None

        # Find target station
        self._resolve_target_station()

    def _resolve_target_station(self) -> None:
        """Find the target station by ID or code"""
        # Try by station_id
        if self.target_station_id in self.graph.station_id_to_station:
            self.target_station = self.graph.station_id_to_station[self.target_station_id]
            return

        # Try by station_code
        upper_code = self.target_station_id.upper()
        if upper_code in self.graph.station_code_to_station:
            self.target_station = self.graph.station_code_to_station[upper_code]
            return

        # Try partial match
        for st in self.graph.stations:
            if self.target_station_id in st.station_id.lower() or \
               self.target_station_id in st.station_name.lower() or \
               self.target_station_id in st.station_code.lower():
                self.target_station = st
                return

    def _get_edge_station_code(self) -> str:
        """Get the edge station code for the target station"""
        if not self.target_station:
            return ""
        
        # Check mapping first
        sid = self.target_station.station_id.lower()
        if sid in self.SCHEDULE_TO_EDGE_MAP:
            return self.SCHEDULE_TO_EDGE_MAP[sid]
        
        # Otherwise use station code directly
        return self.target_station.station_code

    def _count_station_loops(self) -> Dict[str, int]:
        """Count existing loops at target station"""
        edge_code = self._get_edge_station_code()
        return self.graph.loop_counts.get(edge_code, {"UP": 0, "DOWN": 0})

    def _count_trains_at_station(self) -> Dict[str, int]:
        """Count trains passing through target station"""
        passenger = 0
        freight = 0
        current = 0

        sid = self.target_station.station_id.lower() if self.target_station else ""
        edge_code = self._get_edge_station_code()

        for train in self.trains:
            # Check if train passes through this station
            passes_station = sid in [s.lower() for s in train.schedule.keys()]

            if passes_station:
                if train.is_passenger:
                    passenger += 1
                else:
                    freight += 1

            # Check if currently at this station
            if train.current_edge:
                edge = self.graph.edges.get(train.current_edge)
                if edge and edge.station_code == edge_code:
                    current += 1

        return {
            "passenger": passenger,
            "freight": freight,
            "current": current,
            "total": passenger + freight
        }

    def _calculate_capacity_gain(self, existing_loops: Dict[str, int]) -> Dict[str, Any]:
        """Calculate capacity gain from adding one more loop"""
        total_existing = sum(existing_loops.values())
        
        # Heuristic: Each new loop adds capacity proportional to train load
        trains_at_station = self._count_trains_at_station()
        
        # Base capacity gain
        if total_existing == 0:
            # First loop has highest impact
            base_gain = 4
        elif total_existing <= 2:
            base_gain = 3
        elif total_existing <= 4:
            base_gain = 2
        else:
            base_gain = 1  # Diminishing returns

        # Adjust by traffic
        traffic_factor = 1.0
        if trains_at_station["freight"] >= 10:
            traffic_factor = 1.5
        elif trains_at_station["freight"] >= 5:
            traffic_factor = 1.2

        extra_freight = int(base_gain * traffic_factor)
        capacity_increase = round((extra_freight / max(trains_at_station["freight"], 1)) * 100, 1)

        return {
            "extraFreightTrains": extra_freight,
            "capacityIncrease": f"{capacity_increase}%",
            "conflictReduction": f"{min(15 + total_existing * 5, 40)}%"
        }

    def _identify_benefited_trains(self) -> Dict[str, List[Dict[str, str]]]:
        """Identify which trains would benefit from the new loop"""
        benefited = []
        unaffected = []

        sid = self.target_station.station_id.lower() if self.target_station else ""

        for train in self.trains:
            passes_station = sid in [s.lower() for s in train.schedule.keys()]
            
            train_info = {
                "trainId": train.train_id,
                "trainName": train.train_name,
                "direction": train.direction,
                "category": train.train_category
            }

            if passes_station and train.is_freight:
                # Freight trains that stop here benefit most
                schedule_entry = train.schedule.get(sid) or train.schedule.get(self.target_station_id)
                if schedule_entry and (schedule_entry.scheduled_arrival or schedule_entry.scheduled_departure):
                    train_info["benefit"] = "Reduced waiting time"
                    benefited.append(train_info)
                else:
                    train_info["benefit"] = "Potential crossing opportunity"
                    benefited.append(train_info)
            elif passes_station:
                unaffected.append(train_info)

        return {
            "benefited": benefited,
            "unaffected": unaffected
        }

    def _generate_time_distance_graph(self) -> Dict[str, List[Dict[str, Any]]]:
        """Generate simplified time-distance graph data for before/after"""
        # Get station positions (x coordinates)
        station_positions = {}
        for station in self.graph.stations:
            # Find max x position from edges at this station
            edge_code = self.SCHEDULE_TO_EDGE_MAP.get(station.station_id.lower(), station.station_code)
            max_x = 0
            for edge in self.graph.edges.values():
                if edge.station_code == edge_code:
                    node = self.graph.nodes.get(edge.start_node)
                    if node:
                        max_x = max(max_x, node.x)
            station_positions[station.station_id.lower()] = max_x

        # Generate train paths
        before_paths = []
        after_paths = []

        for train in self.trains:
            path_before = []
            path_after = []
            
            # Sort schedule by station position
            sorted_schedule = sorted(
                train.schedule.items(),
                key=lambda x: station_positions.get(x[0].lower(), 0)
            )

            base_time = 0
            for station_id, sched in sorted_schedule:
                x_pos = station_positions.get(station_id.lower(), 0)
                
                # Before: normal timing
                path_before.append({
                    "x": x_pos,
                    "time": base_time,
                    "station": station_id,
                    "type": "arrival"
                })
                
                # After: reduced time at target station
                time_reduction = 0
                if station_id.lower() == self.target_station_id and train.is_freight:
                    time_reduction = 5  # 5 minute reduction

                path_after.append({
                    "x": x_pos,
                    "time": max(0, base_time - time_reduction),
                    "station": station_id,
                    "type": "arrival"
                })

                base_time += 15  # Assume 15 min between stations

            if path_before:
                before_paths.append({
                    "trainId": train.train_id,
                    "trainName": train.train_name,
                    "category": train.train_category,
                    "direction": train.direction,
                    "path": path_before
                })

            if path_after:
                after_paths.append({
                    "trainId": train.train_id,
                    "trainName": train.train_name,
                    "category": train.train_category,
                    "direction": train.direction,
                    "path": path_after
                })

        return {
            "before": before_paths,
            "after": after_paths,
            "stationPositions": station_positions
        }

    def simulate(self) -> dict:
        """Run the simulation"""
        if not self.target_station:
            return {
                "success": False,
                "message": f"Station '{self.target_station_id}' not found",
                "availableStations": [
                    {"id": s.station_id, "name": s.station_name, "code": s.station_code}
                    for s in self.graph.stations
                ]
            }

        # Current state
        existing_loops = self._count_station_loops()
        train_counts = self._count_trains_at_station()

        # Simulated state
        capacity_gain = self._calculate_capacity_gain(existing_loops)

        # Impact analysis
        train_impact = self._identify_benefited_trains()
        benefited_count = len(train_impact["benefited"])
        
        summary = f"Adding loop at {self.target_station.station_name} will benefit {benefited_count} freight trains"
        if benefited_count > 0:
            summary += f", reducing average waiting time by ~10 minutes"

        # Time-distance graph
        time_distance = self._generate_time_distance_graph()

        return {
            "success": True,
            "message": "Loop placement simulation completed",
            "targetStation": {
                "stationId": self.target_station.station_id,
                "stationName": self.target_station.station_name,
                "stationCode": self.target_station.station_code
            },
            "currentState": {
                "existingLoops": existing_loops,
                "passengerTrains": train_counts["passenger"],
                "freightTrains": train_counts["freight"],
                "totalTrains": train_counts["total"],
                "currentlyAtStation": train_counts["current"]
            },
            "simulatedState": {
                "newLoops": {
                    "UP": existing_loops.get("UP", 0) + 1,
                    "DOWN": existing_loops.get("DOWN", 0) + 1
                },
                "estimatedExtraFreightTrains": capacity_gain["extraFreightTrains"],
                "capacityIncrease": capacity_gain["capacityIncrease"],
                "conflictReduction": capacity_gain["conflictReduction"]
            },
            "impactAnalysis": {
                "benefitedTrains": train_impact["benefited"],
                "unaffectedTrains": train_impact["unaffected"],
                "summary": summary
            },
            "timeDistanceGraph": time_distance
        }


# ============================================================
# PUBLIC API
# ============================================================

def run_loop_placement_simulation(data: dict) -> dict:
    """
    Main entry point for loop placement simulation.
    
    Args:
        data: dict containing sectionData, trains, and targetStationId
    
    Returns:
        Simulation results with impact analysis and time-distance graph
    """
    target_station_id = data.get("targetStationId", "")
    
    if not target_station_id:
        return {
            "success": False,
            "message": "Missing 'targetStationId' parameter. Specify which station to add the loop.",
            "requiredParams": ["sectionData", "trains", "targetStationId"]
        }

    graph = SimulationGraph()
    graph.build(data)
    
    trains = [Train.from_dict(t) for t in data.get("trains", [])]
    
    simulator = LoopPlacementSimulator(graph, trains, target_station_id)
    return simulator.simulate()


# ============================================================
# CLI ENTRY
# ============================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python loop_placement_simulator.py <data.json> <station_id>")
        print("Example: python loop_placement_simulator.py ../backend/data.json bhopal")
        sys.exit(1)

    data_path = sys.argv[1]
    station_id = sys.argv[2]

    with open(data_path, "r") as f:
        data = json.load(f)
    
    data["targetStationId"] = station_id
    
    result = run_loop_placement_simulation(data)
    print(json.dumps(result, indent=2))

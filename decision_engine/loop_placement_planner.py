#!/usr/bin/env python3
"""
Loop Placement Advisor

Goal:
- Given current section data (tracks, stations, loops) and trains
  (current positions + upcoming passenger schedules),
  estimate at which station adding ONE extra loop
  will give the maximum additional freight throughput.

Input:
  data.json-like dict with keys:
    - sectionData.stations[]
    - sectionData.tracks[].edges[]
    - sectionData.tracks[].nodes[]
    - trains[]

Output (example shape):
{
  "success": true,
  "message": "Loop placement analysis completed",
  "bestStationToAddLoop": {
    "stationId": "bhopal",
    "stationName": "Bhopal Jn",
    "stationCode": "BPL",
    "estimatedExtraFreightTrainsIfOneMoreLoop": 3,
    "existingLoops": {"UP": 1, "DOWN": 0},
    "passengerTrainsPassing": {"UP": 5, "DOWN": 4},
    "freightTrainsPassing": {"UP": 3, "DOWN": 2},
    "currentTrainsAtStation": {"UP": 1, "DOWN": 0},
    "directionBreakdown": [...]
  },
  "stationRankings": [...]
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
    edge_type: str      # "block", "automatic", "loop", "crossing"
    stream: str         # "up", "down", "both"
    direction: str      # "UP", "DOWN", "BOTH"
    length: float       # km
    max_speed: float    # km/h
    station_code: str   # "BPL", "VDA", "BINA", or ""
    loop_group: str     # station loop group (A/B/...)
    loop_number: int    # 1,2,3...
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

    @property
    def is_crossing(self) -> bool:
        return self.edge_type == "crossing" or "CROSS" in (self.edge_id or "")

    @property
    def is_main(self) -> bool:
        return self.edge_type in ["block", "automatic"] and not self.is_loop and not self.is_crossing


@dataclass
class Node:
    node_id: str
    node_type: str
    x: float
    y: float
    line: str
    block_boundary: bool

    @classmethod
    def from_dict(cls, data: dict) -> "Node":
        return cls(
            node_id=data.get("nodeId", ""),
            node_type=data.get("nodeType", "main"),
            x=float(data.get("x", 0)),
            y=float(data.get("y", 0)),
            line=data.get("line", ""),
            block_boundary=bool(data.get("blockBoundary", False)),
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
    base_priority: int
    train_priority: int
    max_speed: float
    direction: str
    current_edge: str
    is_emergency: bool
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
            base_priority=int(data.get("basePriority", 10) or 10),
            train_priority=int(data.get("trainPriority", 10) or 10),
            max_speed=float(data.get("maxSpeed", 65) or 65),
            direction=data.get("direction", "UP"),
            current_edge=data.get("currentEdge", ""),
            is_emergency=bool(data.get("isEmergency", False)),
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
class NetworkGraph:
    section_id: str = ""
    section_name: str = ""
    stations: List[Station] = field(default_factory=list)
    edges: Dict[str, Edge] = field(default_factory=dict)
    nodes: Dict[str, Node] = field(default_factory=dict)
    loop_counts: Dict[str, Dict[str, int]] = field(default_factory=dict)
    station_id_to_station: Dict[str, Station] = field(default_factory=dict)
    station_code_to_station: Dict[str, Station] = field(default_factory=dict)

    def build(self, data: dict) -> None:
        section_data = data.get("sectionData", {})
        self.section_id = section_data.get("section_id", "")
        self.section_name = section_data.get("name", "")

        for st in section_data.get("stations", []):
            station = Station.from_dict(st)
            self.stations.append(station)
            self.station_id_to_station[station.station_id.lower()] = station
            self.station_code_to_station[station.station_code.upper()] = station

        for track in section_data.get("tracks", []):
            for ed in track.get("edges", []):
                edge = Edge.from_dict(ed)
                self.edges[edge.edge_id] = edge

                if edge.is_loop and edge.station_code:
                    sc = edge.station_code.upper()
                    dirn = edge.direction.upper() if edge.direction else "UP"
                    self.loop_counts.setdefault(sc, {}).setdefault(dirn, 0)
                    self.loop_counts[sc][dirn] += 1

            for nd in track.get("nodes", []):
                node = Node.from_dict(nd)
                self.nodes[node.node_id] = node

        print(f"[LoopPlanner] Network: {len(self.edges)} edges, {len(self.nodes)} nodes")
        print(f"[LoopPlanner] Stations: {[s.station_code for s in self.stations]}")
        print(f"[LoopPlanner] Existing loops: {self.loop_counts}")


# ============================================================
# LOOP PLANNER
# ============================================================

class LoopPlanner:
    """Heuristic loop-placement advisor."""

    def __init__(self, graph: NetworkGraph, trains: List[Train]) -> None:
        self.graph = graph
        self.trains = trains
        self.station_id_to_code: Dict[str, str] = {}
        for st in self.graph.stations:
            self.station_id_to_code[st.station_id.lower()] = st.station_code.upper()

    def _get_station_code_for_schedule_id(self, sched_station_id: str) -> Optional[str]:
        if not sched_station_id:
            return None
        return self.station_id_to_code.get(sched_station_id.lower())

    def analyze(self) -> dict:
        station_stats: Dict[str, Dict[str, Any]] = {}

        def ensure_station_stats(station_code: str) -> Dict[str, Any]:
            station_code = station_code.upper()
            if station_code not in station_stats:
                station = self.graph.station_code_to_station.get(station_code)
                if station is None:
                    station = Station(station_id=station_code.lower(),
                                      station_name=station_code,
                                      station_code=station_code)
                station_stats[station_code] = {
                    "stationId": station.station_id,
                    "stationName": station.station_name,
                    "stationCode": station.station_code,
                    "passengerTrainsPassing": {"UP": 0, "DOWN": 0},
                    "freightTrainsPassing": {"UP": 0, "DOWN": 0},
                    "currentTrainsAtStation": {"UP": 0, "DOWN": 0},
                    "existingLoops": {
                        "UP": self.graph.loop_counts.get(station_code, {}).get("UP", 0),
                        "DOWN": self.graph.loop_counts.get(station_code, {}).get("DOWN", 0),
                    },
                    "estimatedExtraFreightTrainsIfOneMoreLoop": 0,
                    "directionBreakdown": [],
                }
            return station_stats[station_code]

        # Count trains passing at each station
        for train in self.trains:
            direction = (train.direction or "UP").upper()
            if direction not in ("UP", "DOWN"):
                direction = "UP"

            for sched_station_id in train.schedule.keys():
                scode = self._get_station_code_for_schedule_id(sched_station_id)
                if not scode:
                    continue
                stats = ensure_station_stats(scode)
                if train.is_passenger:
                    stats["passengerTrainsPassing"][direction] += 1
                elif train.is_freight:
                    stats["freightTrainsPassing"][direction] += 1

            if train.current_edge and train.current_edge in self.graph.edges:
                edge = self.graph.edges[train.current_edge]
                if edge.station_code:
                    scode = edge.station_code.upper()
                    stats = ensure_station_stats(scode)
                    stats["currentTrainsAtStation"][direction] += 1

        for st in self.graph.stations:
            ensure_station_stats(st.station_code)

        # Compute heuristic extra freight capacity
        station_rankings: List[Dict[str, Any]] = []
        for scode, stats in station_stats.items():
            dir_breakdown = []
            total_extra_freight = 0

            for direction in ("UP", "DOWN"):
                P = stats["passengerTrainsPassing"].get(direction, 0)
                F = stats["freightTrainsPassing"].get(direction, 0)
                C = stats["currentTrainsAtStation"].get(direction, 0)
                L_existing = stats["existingLoops"].get(direction, 0)

                if P <= 0:
                    extra_dir = 0
                else:
                    base_capacity_gain = max(1, P // 2)
                    discount = max(1, L_existing + 1)
                    extra_dir = base_capacity_gain // discount
                    if F + C >= 3 and extra_dir > 0:
                        extra_dir += 1

                total_extra_freight += extra_dir

                dir_breakdown.append({
                    "direction": direction,
                    "existingLoops": L_existing,
                    "passengerTrains": P,
                    "freightTrains": F,
                    "currentTrains": C,
                    "estimatedExtraFreightTrainsIfOneMoreLoop": extra_dir,
                })

            stats["estimatedExtraFreightTrainsIfOneMoreLoop"] = int(total_extra_freight)
            stats["directionBreakdown"] = dir_breakdown
            station_rankings.append(stats)

        def station_load(st: Dict[str, Any]) -> int:
            p = st["passengerTrainsPassing"]["UP"] + st["passengerTrainsPassing"]["DOWN"]
            f = st["freightTrainsPassing"]["UP"] + st["freightTrainsPassing"]["DOWN"]
            c = st["currentTrainsAtStation"]["UP"] + st["currentTrainsAtStation"]["DOWN"]
            return p + f + 2 * c

        station_rankings.sort(
            key=lambda st: (st["estimatedExtraFreightTrainsIfOneMoreLoop"], station_load(st)),
            reverse=True,
        )

        best_station = station_rankings[0] if station_rankings else None

        return {
            "success": True,
            "message": "Loop placement analysis completed",
            "bestStationToAddLoop": best_station,
            "stationRankings": station_rankings,
        }


# ============================================================
# PUBLIC API
# ============================================================

def run_loop_placement_analysis(data: dict) -> dict:
    """Main entry point for loop placement analysis."""
    graph = NetworkGraph()
    graph.build(data)
    trains = [Train.from_dict(t) for t in data.get("trains", [])]
    planner = LoopPlanner(graph, trains)
    return planner.analyze()


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python loop_placement_planner.py <data.json>")
        sys.exit(1)

    with open(sys.argv[1], "r") as f:
        data = json.load(f)

    result = run_loop_placement_analysis(data)
    print(json.dumps(result, indent=2))

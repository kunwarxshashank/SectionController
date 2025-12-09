#!/usr/bin/env python3
"""
Automatic Block Upgrade Segment Simulator

Goal:
- Given current section data (tracks, stations, nodes, trains)
  and TWO stations (fromStation, toStation),
  estimate how much extra freight capacity you get if the
  MAIN line between those two stations is upgraded to
  automatic signalling.

Input:
  data dict (same style as your data.json):
    - sectionData.stations[]
    - sectionData.tracks[].edges[]
    - sectionData.tracks[].nodes[]
    - trains[]

  + from_station_id: e.g. "bhopal" or "BPL"
  + to_station_id  : e.g. "vidisha" or "VDA"

Output example:
{
  "success": true,
  "message": "Automatic signalling upgrade what-if completed",
  "segment": {
    "fromStationId": "bhopal",
    "fromStationName": "Bhopal Jn",
    "fromStationCode": "BPL",
    "toStationId": "vidisha",
    "toStationName": "Vidisha",
    "toStationCode": "VDA",
    "currentBlockCount": 3,
    "currentAutomaticCount": 0,
    "segmentLengthKm": 42.5,
    "targetAutomaticBlockLengthKm": 5.0,
    "estimatedAutomaticBlocks": 9,
    "capacityGainFactor": 3.0,
    "passengerTrainsPassing": 5,
    "freightTrainsPassing": 7,
    "estimatedExtraFreightTrainsIfAutomatic": 4
  },
  "baseline": {
    "summary": { ... from CP-SAT ... },
    "timeDistanceGraphData": [...],
    "freightCompleted": 5
  },
  "upgraded": {
    "summary": { ... (same infra here; we only do heuristic what-if) ... },
    "timeDistanceGraphData": [...],
    "estimatedExtraFreightTrainsIfAutomatic": 4
  }
}

NOTE:
- This is a heuristic capacity advisor PLUS a call to your CP-SAT
  scheduler to produce time-distance data.
- The CP-SAT model itself currently does not distinguish "block"
  vs "automatic" in constraints, so the *schedule* will not change
  automatically just by re-labelling edges. The capacity gain
  is estimated heuristically from geometry + train counts.
"""

import json
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple

# <- your CP-SAT engine from the big file
from scheduler import run_optimization


# ============================================================
# CONFIG / HEURISTIC PARAMETERS
# ============================================================
TARGET_AUTOMATIC_BLOCK_LENGTH_KM = 5.0   # desired automatic block length
MIN_SEGMENT_LENGTH_KM = 1.0             # ignore tiny inter-station segments
MIN_FREIGHT_THRESHOLD = 1               # ignore segments with no freight


# ============================================================
# BASIC MODELS (lightweight, only what's needed here)
# ============================================================

@dataclass
class Station:
    station_id: str
    station_name: str
    station_code: str
    x_start: float
    x_end: float

    @classmethod
    def from_dict(cls, data: dict) -> "Station":
        sid = data.get("stationId", "")
        name = data.get("stationName", sid)
        # We assume station has "startNode" and "endNode" like in your earlier schema
        start_node = data.get("startNode", {}) or {}
        end_node = data.get("endNode", {}) or {}
        x_start = float(start_node.get("x", 0.0))
        x_end = float(end_node.get("x", x_start))
        code = (data.get("stationCode") or sid or name or "").upper()[:4]
        return cls(
            station_id=sid,
            station_name=name,
            station_code=code,
            x_start=x_start,
            x_end=x_end,
        )


@dataclass
class Node:
    node_id: str
    x: float

    @classmethod
    def from_dict(cls, data: dict) -> "Node":
        return cls(
            node_id=data.get("nodeId", ""),
            x=float(data.get("x", 0.0)),
        )


@dataclass
class Edge:
    edge_id: str
    edge_type: str      # "block", "automatic", ...
    length: float       # km
    station_code: str
    start_node: str
    end_node: str

    @classmethod
    def from_dict(cls, data: dict) -> "Edge":
        return cls(
            edge_id=data.get("edgeId", ""),
            edge_type=data.get("edgeType", "block"),
            length=float(data.get("length", 1.0)),
            station_code=(data.get("stationCode") or ""),
            start_node=data.get("startNode", ""),
            end_node=data.get("endNode", ""),
        )


@dataclass
class TrainScheduleEntry:
    station_id: str
    scheduled_arrival: str
    scheduled_departure: str


@dataclass
class Train:
    train_id: str
    train_name: str
    train_category: str  # "Passenger" or "Freight"
    direction: str       # "UP" or "DOWN"
    schedule: Dict[str, TrainScheduleEntry]

    @classmethod
    def from_dict(cls, data: dict) -> "Train":
        schedule: Dict[str, TrainScheduleEntry] = {}
        raw_sched = data.get("schedule", {}) or {}
        for station_id, s in raw_sched.items():
            if not isinstance(s, dict):
                continue
            schedule[station_id] = TrainScheduleEntry(
                station_id=station_id,
                scheduled_arrival=s.get("scheduledArrival", ""),
                scheduled_departure=s.get("scheduledDeparture", ""),
            )
        return cls(
            train_id=data.get("trainId", data.get("_id", "")),
            train_name=data.get("trainName", ""),
            train_category=data.get("trainCategory", "Freight"),
            direction=data.get("direction", "UP"),
            schedule=schedule,
        )

    @property
    def is_passenger(self) -> bool:
        return self.train_category.lower().startswith("pass")

    @property
    def is_freight(self) -> bool:
        return not self.is_passenger


# ============================================================
# CORE ANALYSER
# ============================================================

class AutomaticBlockSegmentSimulator:
    def __init__(self, data: dict, from_station_arg: str, to_station_arg: str) -> None:
        self.raw_data = data
        self.section_data = data.get("sectionData", {})

        self.stations: List[Station] = []
        self.station_by_id: Dict[str, Station] = {}
        self.station_by_code: Dict[str, Station] = {}

        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, Edge] = {}

        self.trains: List[Train] = []

        self.from_station_arg = from_station_arg
        self.to_station_arg = to_station_arg

        self._load_infrastructure()
        self._load_trains()

    # -------------------------
    # LOADERS
    # -------------------------
    def _load_infrastructure(self) -> None:
        # Stations
        for st in self.section_data.get("stations", []):
            station = Station.from_dict(st)
            self.stations.append(station)
            self.station_by_id[station.station_id.lower()] = station
            self.station_by_code[station.station_code.upper()] = station

        # Sort stations in physical order along x
        self.stations.sort(key=lambda s: min(s.x_start, s.x_end))

        # Nodes
        for track in self.section_data.get("tracks", []):
            for nd in track.get("nodes", []):
                node = Node.from_dict(nd)
                self.nodes[node.node_id] = node

        # Edges (we keep ALL, but we mainly care about main-line "block" / "automatic")
        for track in self.section_data.get("tracks", []):
            for ed in track.get("edges", []):
                e = Edge.from_dict(ed)
                self.edges[e.edge_id] = e

    def _load_trains(self) -> None:
        self.trains = [Train.from_dict(t) for t in self.raw_data.get("trains", [])]

    # -------------------------
    # STATION RESOLUTION
    # -------------------------
    def _resolve_station(self, arg: str) -> Optional[Station]:
        if not arg:
            return None
        aid = arg.lower()
        acode = arg.upper()

        # 1) Try by stationId
        if aid in self.station_by_id:
            return self.station_by_id[aid]

        # 2) Try by stationCode
        if acode in self.station_by_code:
            return self.station_by_code[acode]

        # 3) Try by stationName (case-insensitive) as a fallback
        for st in self.stations:
            if st.station_name.lower() == aid:
                return st

        return None

    # -------------------------
    # SEGMENT GEOMETRY
    # -------------------------
    def _segment_geometry(self, s_from: Station, s_to: Station) -> Tuple[float, float]:
        """
        Compute approximate x-range between two stations.
        """
        # assume x_start < x_end for each station; use "right" of from, "left" of to
        x_from = max(s_from.x_start, s_from.x_end)
        x_to = min(s_to.x_start, s_to.x_end)
        # if weird, fallback to station centres
        if x_to <= x_from:
            x_from = (s_from.x_start + s_from.x_end) / 2.0
            x_to = (s_to.x_start + s_to.x_end) / 2.0
        if x_to < x_from:
            x_from, x_to = x_to, x_from
        return x_from, x_to

    # -------------------------
    # TRAIN COUNTING
    # -------------------------
    def _count_trains_between(self, from_station_id: str, to_station_id: str) -> Tuple[int, int]:
        """
        Approximate "passing through this pair" by:
        - train has BOTH stations in timetable.
        """
        from_id = (from_station_id or "").lower()
        to_id = (to_station_id or "").lower()

        passenger = 0
        freight = 0

        for t in self.trains:
            sched_keys = [sid.lower() for sid in t.schedule.keys()]
            if from_id in sched_keys and to_id in sched_keys:
                if t.is_passenger:
                    passenger += 1
                else:
                    freight += 1
        return passenger, freight

    # -------------------------
    # MAIN ANALYSIS
    # -------------------------
    def analyze_segment(self) -> Dict[str, Any]:
        # 1) Resolve stations
        s_from = self._resolve_station(self.from_station_arg)
        s_to = self._resolve_station(self.to_station_arg)

        if s_from is None:
            return {
                "success": False,
                "message": f"Could not resolve fromStation '{self.from_station_arg}'",
            }
        if s_to is None:
            return {
                "success": False,
                "message": f"Could not resolve toStation '{self.to_station_arg}'",
            }
        if s_from.station_id == s_to.station_id:
            return {
                "success": False,
                "message": "fromStation and toStation must be different",
            }

        # Ensure direction along x (we don't care UP/DOWN here, just geometry)
        # If stations are out of order in list, swap so that x_from < x_to
        x_from, x_to = self._segment_geometry(s_from, s_to)

        if x_to - x_from < MIN_SEGMENT_LENGTH_KM * 0.1:  # rough tolerance
            return {
                "success": False,
                "message": "Inter-station geometric segment too small / invalid",
            }

        # 2) Collect edges lying between these x's (main-line like in advisor)
        node_x: Dict[str, float] = {nid: n.x for nid, n in self.nodes.items()}
        block_edges: List[Edge] = []
        auto_edges: List[Edge] = []
        total_length = 0.0

        for e in self.edges.values():
            # treat edges with stationCode == "" as inter-station main line
            # and of type "block" or "automatic"
            if e.station_code:
                continue
            if e.edge_type not in ("block", "automatic"):
                continue
            x_edge = node_x.get(e.start_node, None)
            if x_edge is None:
                continue
            if x_edge < x_from or x_edge > x_to:
                continue

            total_length += e.length
            if e.edge_type == "block":
                block_edges.append(e)
            elif e.edge_type == "automatic":
                auto_edges.append(e)

        if total_length < MIN_SEGMENT_LENGTH_KM:
            return {
                "success": False,
                "message": "No meaningful inter-station main-line found between these stations",
            }

        current_block_count = len(block_edges)
        current_auto_count = len(auto_edges)

        if current_block_count == 0:
            # Already automatic or empty; no capacity gain for freight
            passenger_count, freight_count = self._count_trains_between(
                s_from.station_id, s_to.station_id
            )
            return {
                "success": True,
                "message": "Segment already has no block sections (no additional automatic gain)",
                "segment": {
                    "fromStationId": s_from.station_id,
                    "fromStationName": s_from.station_name,
                    "fromStationCode": s_from.station_code,
                    "toStationId": s_to.station_id,
                    "toStationName": s_to.station_name,
                    "toStationCode": s_to.station_code,
                    "currentBlockCount": current_block_count,
                    "currentAutomaticCount": current_auto_count,
                    "segmentLengthKm": round(total_length, 3),
                    "targetAutomaticBlockLengthKm": TARGET_AUTOMATIC_BLOCK_LENGTH_KM,
                    "estimatedAutomaticBlocks": current_auto_count,
                    "capacityGainFactor": 1.0,
                    "passengerTrainsPassing": passenger_count,
                    "freightTrainsPassing": freight_count,
                    "estimatedExtraFreightTrainsIfAutomatic": 0,
                },
                "baseline": {},
                "upgraded": {},
            }

        # 3) Heuristic automatic-block capacity gain
        estimated_auto_blocks = max(
            current_block_count,
            int(round(total_length / TARGET_AUTOMATIC_BLOCK_LENGTH_KM)) or 1,
        )
        capacity_gain_factor = estimated_auto_blocks / float(current_block_count)

        # 4) Count trains using this corridor
        passenger_count, freight_count = self._count_trains_between(
            s_from.station_id, s_to.station_id
        )

        if freight_count < MIN_FREIGHT_THRESHOLD:
            estimated_extra_freight = 0
        else:
            base_gain = max(0.0, capacity_gain_factor - 1.0)
            # Similar heuristic to advisor:
            #   extra ≈ (gain_factor - 1) * (freight + 0.5 * passenger)
            extra_freight = base_gain * (freight_count + 0.5 * passenger_count)
            estimated_extra_freight = int(round(extra_freight))

        segment_info = {
            "fromStationId": s_from.station_id,
            "fromStationName": s_from.station_name,
            "fromStationCode": s_from.station_code,
            "toStationId": s_to.station_id,
            "toStationName": s_to.station_name,
            "toStationCode": s_to.station_code,
            "currentBlockCount": current_block_count,
            "currentAutomaticCount": current_auto_count,
            "segmentLengthKm": round(total_length, 3),
            "targetAutomaticBlockLengthKm": TARGET_AUTOMATIC_BLOCK_LENGTH_KM,
            "estimatedAutomaticBlocks": estimated_auto_blocks,
            "capacityGainFactor": round(capacity_gain_factor, 3),
            "passengerTrainsPassing": passenger_count,
            "freightTrainsPassing": freight_count,
            "estimatedExtraFreightTrainsIfAutomatic": max(0, estimated_extra_freight),
        }

        # 5) Run CP-SAT once to get time-distance data for current section
        #    (We keep infra as-is; capacity gain is heuristic)
        cp_result = run_optimization(self.raw_data)

        if not cp_result.get("success", False):
            # If solver fails, still return segment info
            return {
                "success": False,
                "message": f"CP-SAT optimization failed: {cp_result.get('message', 'Unknown')}",
                "segment": segment_info,
                "baseline": {},
                "upgraded": {
                    "estimatedExtraFreightTrainsIfAutomatic": segment_info[
                        "estimatedExtraFreightTrainsIfAutomatic"
                    ]
                },
            }

        train_schedules = cp_result.get("trainSchedules", [])
        freight_completed = len(
            [ts for ts in train_schedules if ts.get("isFreight") and ts.get("completed")]
        )

        baseline_summary = cp_result.get("summary", {})
        baseline_summary = {
            **baseline_summary,
            "freightCompleted": freight_completed,
        }

        result = {
            "success": True,
            "message": "Automatic signalling upgrade what-if completed",
            "segment": segment_info,
            "baseline": {
                "summary": baseline_summary,
                "timeDistanceGraphData": cp_result.get("timeDistanceGraphData", []),
                "trainSchedules": train_schedules,
            },
            "upgraded": {
                # Here we only provide capacity *estimate*; if later you modify
                # CP-SAT to model automatic blocks explicitly, you can add a second
                # run_optimization() call with modified infra and compare.
                "estimatedExtraFreightTrainsIfAutomatic": segment_info[
                    "estimatedExtraFreightTrainsIfAutomatic"
                ]
            },
        }
        return result


# ============================================================
# PUBLIC API
# ============================================================

def run_automatic_upgrade_between(
    data: dict, from_station_id: str, to_station_id: str
) -> dict:
    """
    Programmatic entry point.

    Example:

        import json
        from automatic_block_upgrade_segment_simulator import (
            run_automatic_upgrade_between
        )

        with open("data.json", "r") as f:
            data = json.load(f)

        result = run_automatic_upgrade_between(data, "bhopal", "vidisha")
        print(json.dumps(result, indent=2))
    """
    sim = AutomaticBlockSegmentSimulator(data, from_station_id, to_station_id)
    return sim.analyze_segment()


# ============================================================
# CLI ENTRY
# ============================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 4:
        print(
            "Usage: python automatic_block_upgrade_segment_simulator.py "
            "<data.json> <fromStationIdOrCode> <toStationIdOrCode>"
        )
        sys.exit(1)

    data_path = sys.argv[1]
    from_station = sys.argv[2]
    to_station = sys.argv[3]

    with open(data_path, "r") as f:
        data = json.load(f)

    result = run_automatic_upgrade_between(data, from_station, to_station)
    print(json.dumps(result, indent=2))
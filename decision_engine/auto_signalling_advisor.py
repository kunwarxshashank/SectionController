#!/usr/bin/env python3
"""
Auto Signalling Advisor

Goal:
- Determine which station-to-station segment should be converted 
  from Manual Block to Automatic Signalling to increase freight throughput.

Option B (Your Selection):
- Combine multiple blocks between two stations into ONE segment.

Input:
    - sectionData.stations[] (optional - will derive from edges if missing)
    - sectionData.tracks[].edges[]
    - trains[]

Output:
{
  "success": true,
  "message": "Auto signalling analysis completed",
  "bestSegmentToConvert": {
      "fromStation": "BPL",
      "toStation": "VDA",
      "passengerTrains": 12,
      "freightTrains": 8,
      "currentTrains": 3,
      "segmentBlocks": 4,
      "segmentLengthKm": 22.5,
      "extraFreightIfAutomatic": 5
  },
  "segmentRankings": [ ...sorted... ]
}
"""

import json
from typing import Dict, List, Any
from dataclasses import dataclass, field


# ============================================================
# BASIC MODELS
# ============================================================

@dataclass
class Edge:
    edge_id: str
    start_node: str
    end_node: str
    edge_type: str
    station_code: str
    length: float
    direction: str

    @classmethod
    def from_dict(cls, d):
        return cls(
            edge_id=d.get("edgeId", ""),
            start_node=d.get("startNode", ""),
            end_node=d.get("endNode", ""),
            edge_type=d.get("edgeType", "block"),
            station_code=(d.get("stationCode") or "").upper(),
            length=float(d.get("length", 1)),
            direction=(d.get("direction") or "UP").upper(),
        )


@dataclass
class Train:
    train_id: str
    direction: str
    current_edge: str
    is_passenger: bool
    is_freight: bool
    schedule: Dict[str, Any]

    @classmethod
    def from_dict(cls, d):
        # Check trainCategory first (from data.json format)
        category = (d.get("trainCategory") or "").lower()
        name = (d.get("trainName") or "").lower()

        is_freight = category == "freight" or "freight" in name or "rake" in name or "tanker" in name
        is_passenger = not is_freight

        return cls(
            train_id=d.get("trainId", ""),
            direction=(d.get("direction") or "UP").upper(),
            current_edge=d.get("currentEdge", ""),
            is_passenger=is_passenger,
            is_freight=is_freight,
            schedule=d.get("schedule", {}),
        )


@dataclass
class Station:
    station_id: str
    station_code: str
    station_name: str

    @classmethod
    def from_dict(cls, d):
        code = (d.get("stationCode") or "").upper()
        return cls(
            station_id=d.get("stationId", code.lower()),
            station_code=code,
            station_name=d.get("stationName", code),
        )


# ============================================================
# NETWORK GRAPH (for segmentation)
# ============================================================

@dataclass
class AutoSignalGraph:
    stations: List[Station] = field(default_factory=list)
    edges: Dict[str, Edge] = field(default_factory=dict)

    # Mapping: station_code → list of edges originating from that station
    station_to_edges: Dict[str, List[str]] = field(default_factory=dict)

    def build(self, data):
        sd = data.get("sectionData", data)  # Support both formats

        # Collect stations if available
        for st in sd.get("stations", []):
            station = Station.from_dict(st)
            self.stations.append(station)

        # Collect edges
        for track in sd.get("tracks", []):
            for ed in track.get("edges", []):
                edge = Edge.from_dict(ed)
                self.edges[edge.edge_id] = edge

                if edge.station_code:
                    self.station_to_edges.setdefault(edge.station_code, []).append(edge.edge_id)

        # If no stations array, derive from TRAIN SCHEDULES 
        if not self.stations:
            trains = data.get("trains", [])
            
            # Collect unique station IDs from train schedules
            seen_ids = set()
            station_list = []
            
            for train in trains:
                schedule = train.get("schedule", {})
                for station_id in schedule.keys():
                    sid = station_id.lower()
                    if sid not in seen_ids:
                        seen_ids.add(sid)
                        
                        # Derive code from station ID (like loop_placement does)
                        code = sid.upper()[:4]  # BHOP, VIDI, BINA
                        name = sid.title()      # Bhopal, Vidisha, Bina
                        
                        station_list.append(Station(
                            station_id=sid,
                            station_code=code,
                            station_name=name
                        ))
            
            # Sort by known order
            known_order = ["BHOP", "VIDI", "BINA"]
            def order_key(st):
                if st.station_code in known_order:
                    return known_order.index(st.station_code)
                return 999
            station_list.sort(key=order_key)
            
            self.stations = station_list
            
            # Map edge stationCodes to our station codes
            # Edges use BPL/VDA/BINA, schedules use bhopal/vidisha/bina
            edge_code_to_schedule_code = {
                "BPL": "BHOP",
                "VDA": "VIDI", 
                "BINA": "BINA",
            }
            for edge in self.edges.values():
                if edge.station_code:
                    mapped_code = edge_code_to_schedule_code.get(edge.station_code, edge.station_code)
                    self.station_to_edges.setdefault(mapped_code, []).append(edge.edge_id)
        
        print(f"[AutoSignalling] Stations: {[s.station_code for s in self.stations]}")

    def get_station_list(self):
        """Return list of station codes in order of appearance."""
        return [s.station_code for s in self.stations]


# ============================================================
# AUTO SIGNALLING ADVISOR (Main Logic)
# ============================================================

class AutoSignallingAdvisor:

    # Map edge station codes to schedule station IDs
    EDGE_TO_SCHEDULE_MAP = {
        "BPL": "bhopal",
        "VDA": "vidisha",
        "BINA": "bina",
    }
    
    SCHEDULE_TO_EDGE_MAP = {
        "bhopal": "BPL",
        "vidisha": "VDA",
        "bina": "BINA",
    }

    def __init__(self, graph: AutoSignalGraph, trains: List[Train]):
        self.graph = graph
        self.trains = trains

    # ------------------------------------------
    # Identify station-to-station segments
    # ------------------------------------------
    def build_segments(self):
        """
        Build combined segments:
        Bhopal → Vidisha
        Vidisha → Bina
        """
        # Get station IDs from stations (bhopal, vidisha, bina)
        station_ids = [s.station_id for s in self.graph.stations]

        segments = []

        for i in range(len(station_ids) - 1):
            from_id = station_ids[i]
            to_id = station_ids[i + 1]
            
            # Map schedule station IDs to edge station codes
            from_edge_code = self.SCHEDULE_TO_EDGE_MAP.get(from_id, from_id.upper())
            to_edge_code = self.SCHEDULE_TO_EDGE_MAP.get(to_id, to_id.upper())

            segment_edges = []
            block_edges = []
            
            # Collect edges belonging to this segment (using edge station codes)
            for e in self.graph.edges.values():
                if e.station_code in (from_edge_code, to_edge_code):
                    segment_edges.append(e.edge_id)
                    if e.edge_type == "block":
                        block_edges.append(e.edge_id)

            # Get station names for display
            from_station = self.graph.stations[i] if i < len(self.graph.stations) else None
            to_station = self.graph.stations[i+1] if i+1 < len(self.graph.stations) else None

            segments.append({
                "from": from_station.station_name if from_station else from_id.title(),
                "to": to_station.station_name if to_station else to_id.title(),
                "from_id": from_id,
                "to_id": to_id,
                "edges": segment_edges,
                "blockEdges": block_edges
            })

        return segments

    # ------------------------------------------
    # Count trains using each segment
    # ------------------------------------------
    def count_trains_on_segment(self, seg):
        passenger = 0
        freight = 0
        current = 0

        edge_set = set(seg["edges"])
        from_id = seg["from_id"]
        to_id = seg["to_id"]

        for t in self.trains:
            train_uses_segment = False
            
            # Check schedule if stations in path (match by station ID)
            for sid in t.schedule.keys():
                if sid.lower() in (from_id, to_id):
                    train_uses_segment = True
                    break

            if train_uses_segment:
                if t.is_passenger:
                    passenger += 1
                else:
                    freight += 1

            # Check current position
            if t.current_edge in edge_set:
                current += 1

        return passenger, freight, current

    # ------------------------------------------
    # Main heuristic analysis
    # ------------------------------------------
    def analyze(self):
        manual_headway = 10  # minutes
        auto_headway = 3     # minutes

        CAP_manual = 1440 / manual_headway   # trains per day
        CAP_auto = 1440 / auto_headway

        segments = self.build_segments()
        rankings = []

        for seg in segments:
            A = seg["from"]
            B = seg["to"]

            seg_edges = seg["edges"]
            block_edges = seg.get("blockEdges", [])
            total_blocks = len(block_edges)

            # Skip if no block edges to convert
            if total_blocks == 0:
                continue

            # approx length
            seg_length = sum(self.graph.edges[e].length for e in seg_edges if e in self.graph.edges)

            P, F, C = self.count_trains_on_segment(seg)

            # additional capacity after converting whole segment:
            gain = CAP_auto - CAP_manual  # theoretical improvement

            # Heuristic: adjust by real load
            load_factor = P + F + (2 * C)

            # Extra freight = base improvement + bonus for existing traffic
            extra_freight = int((gain * 0.1) + (F * 0.2) + (C * 0.3) + (total_blocks * 0.5))

            rankings.append({
                "fromStation": A,
                "toStation": B,
                "segmentBlocks": total_blocks,
                "segmentLengthKm": round(seg_length, 2),
                "passengerTrains": P,
                "freightTrains": F,
                "currentTrains": C,
                "extraFreightIfAutomatic": max(extra_freight, 1)
            })

        # SORT: most extra freight first, then by load
        rankings.sort(
            key=lambda x: (x["extraFreightIfAutomatic"], x["passengerTrains"] + x["freightTrains"]),
            reverse=True
        )

        best = rankings[0] if rankings else None

        return {
            "success": True,
            "message": "Auto signalling analysis completed",
            "bestSegmentToConvert": best,
            "segmentRankings": rankings
        }


# ============================================================
# PUBLIC API
# ============================================================

def run_auto_signalling_analysis(data: dict):
    graph = AutoSignalGraph()
    graph.build(data)

    trains = [Train.from_dict(t) for t in data.get("trains", [])]

    advisor = AutoSignallingAdvisor(graph, trains)
    return advisor.analyze()


# ============================================================
# CLI MODE
# ============================================================

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python auto_signalling_advisor.py <data.json>")
        exit(1)

    with open(sys.argv[1], "r") as f:
        data = json.load(f)

    result = run_auto_signalling_analysis(data)
    print(json.dumps(result, indent=2))

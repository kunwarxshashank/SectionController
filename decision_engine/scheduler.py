#!/usr/bin/env python3
"""
Railway Traffic Scheduler (Compact CP-SAT version)

Features:
- Uses OR-Tools CP-SAT
- Optional intervals for loops (freight only)
- Route-choice variables: main vs loops at station
- Capacity (NoOverlap) on each track edge
- Basic passenger schedule constraints at origin
- Freight precedence (no overtaking passenger in same direction)
- Objective: push freight earlier + small penalty on loop usage
- Outputs:
  - loopDecisionStrings: ["loop train T1 at BPL station entry 06:20 exit 06:30", ...]
  - timeDistanceGraphData: [
      {
        "train": "T1",
        "trainName": "XYZ",
        "timeSpentAtBhopal": "5 min",
        "timeToReachVidisha": "40 min",
        "timeSpentAtVidisha": "7 min",
        ...
      },
      ...
    ]
Input:
  data.json structure with keys:
  - sectionData.stations[]
  - sectionData.tracks[].edges[]
  - sectionData.tracks[].nodes[]
  - trains[]
"""

import math
import json
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Set, Any

from ortools.sat.python import cp_model

# ============================================================
# CONSTANTS
# ============================================================
PLANNING_HORIZON = 24 * 60  # 24 hours
MIN_HEADWAY = 3             # minutes (used in precedence / heuristic)

LOOP_DECEL_PENALTY = 5      # minutes
LOOP_ACCEL_PENALTY = 7      # minutes
LOOP1_SPEED_KMH = 30        # first loop speed
LOOP2_SPEED_KMH = 15        # deeper loops
DEFAULT_SPEED_KMH = 120

# Objective weights
WEIGHT_FREIGHT_COMPLETED = 10_000
WEIGHT_FREIGHT_DELAY = 1
WEIGHT_LOOP_USAGE = 100
WEIGHT_DEEP_LOOP = 200


# ============================================================
# HELPER FUNCTIONS
# ============================================================
def time_to_minutes(time_str: str) -> int:
    """Convert 'HH:MM' to minutes from midnight."""
    if not time_str:
        return 0
    try:
        h, m = time_str.split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return 0


def minutes_to_time(minutes: int) -> str:
    """Convert minutes from midnight to 'HH:MM'."""
    minutes = int(minutes) % (24 * 60)
    h = minutes // 60
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


# ============================================================
# DATA CLASSES
# ============================================================
@dataclass
class Edge:
    edge_id: str
    start_node: str
    end_node: str
    edge_type: str      # "block", "automatic", "loop", "crossing", "platform"
    stream: str         # "up", "down", "both"
    direction: str      # "UP", "DOWN", "BOTH"
    length: float       # km
    max_speed: float    # km/h

    # ✅ NEW ABS SIGNAL FIELDS
    block_id: str       # SAME for UP & DOWN edges of same physical block
    signal_type: str    # "home", "starter", "advanced"
    signal_color: str   # "red", "yellow", "green"

    station_code: str
    loop_group: str
    loop_number: int
    is_occupied: bool
    platform_number: int  # ✅ For passenger platforms

    @classmethod
    def from_dict(cls, data: dict) -> "Edge":
        return cls(
            edge_id=data.get("edgeId", ""),
            start_node=data.get("startNode", ""),
            end_node=data.get("endNode", ""),
            edge_type=data.get("edgeType", "block"),
            stream=data.get("stream", "both"),
            direction=data.get("direction", "BOTH"),
            length=float(data.get("length", 1)),
            max_speed=float(data.get("maxspeed", DEFAULT_SPEED_KMH)),

            # ✅ NEW
            block_id=data.get("blockId", data.get("edgeId", "")),
            signal_type=data.get("signalType", "advanced"),
            signal_color=data.get("signalColor", "green"),

            station_code=data.get("stationCode", ""),
            loop_group=data.get("loopGroup", ""),
            loop_number=int(data.get("loopNumber", 0)),
            is_occupied=bool(data.get("isOccupied", False)),
            platform_number=int(data.get("platformNumber", 0)),
        )

    @property
    def is_loop(self) -> bool:
        return self.edge_type == "loop"

    @property
    def is_crossing(self) -> bool:
        return self.edge_type == "crossing" or "CROSS" in self.edge_id

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
        sid = data.get("stationId", "")
        return cls(
            station_id=sid,
            station_name=data.get("stationName", sid),
            station_code=(sid or "").upper()[:4],
        )


@dataclass
class TrainSchedule:
    station_id: str
    scheduled_arrival: str
    scheduled_departure: str

    def arrival_minutes(self) -> int:
        return time_to_minutes(self.scheduled_arrival)

    def departure_minutes(self) -> int:
        return time_to_minutes(self.scheduled_departure)


@dataclass
class Train:
    train_id: str
    train_name: str
    train_type: str
    train_category: str  # "Passenger" or "Freight"
    base_priority: int
    train_priority: int
    max_speed: float
    direction: str       # "UP" or "DOWN"
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
            base_priority=int(data.get("basePriority", 10)),
            train_priority=int(data.get("trainPriority", 10)),
            max_speed=float(data.get("maxSpeed", 65)),
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

    def get_origin_departure(self) -> int:
        """Get departure time at origin station."""
        origin = "bhopal" if self.direction == "UP" else "bina"
        sched = self.schedule.get(origin)
        if sched:
            return sched.departure_minutes()
        return 0


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

    up_main_edges: List[str] = field(default_factory=list)
    down_main_edges: List[str] = field(default_factory=list)
    main_edges: List[str] = field(default_factory=list)

    # station_code -> direction -> list of (cross_in, loop, cross_out)
    station_loops: Dict[str, Dict[str, List[Tuple[str, str, str]]]] = field(default_factory=dict)

    # main_edge_id -> list of (cross_in, loop, cross_out)
    main_to_loops: Dict[str, List[Tuple[str, str, str]]] = field(default_factory=dict)

    def build(self, data: dict) -> None:
        section_data = data.get("sectionData", {})

        self.section_id = section_data.get("section_id", "")
        self.section_name = section_data.get("name", "")

        for st in section_data.get("stations", []):
            self.stations.append(Station.from_dict(st))

        for track in section_data.get("tracks", []):
            for ed in track.get("edges", []):
                edge = Edge.from_dict(ed)
                self.edges[edge.edge_id] = edge
            for nd in track.get("nodes", []):
                node = Node.from_dict(nd)
                self.nodes[node.node_id] = node

        self._categorize_edges()
        self._build_loop_structures()
        self._sort_main_edges()

        print(f"Network built: {len(self.edges)} edges, {len(self.nodes)} nodes")
        print(f"  UP main edges: {len(self.up_main_edges)}")
        print(f"  DOWN main edges: {len(self.down_main_edges)}")
        print(f"  Stations with loops: {list(self.station_loops.keys())}")

    def _categorize_edges(self) -> None:
        for edge_id, e in self.edges.items():
            if e.is_main:
                if e.direction == "UP":
                    self.up_main_edges.append(edge_id)
                elif e.direction == "DOWN":
                    self.down_main_edges.append(edge_id)
                else:
                    self.main_edges.append(edge_id)

    def _build_loop_structures(self) -> None:
        # Build station_loops: station -> direction -> list of (cross_in, loop, cross_out)
        for edge_id, edge in self.edges.items():
            if not edge.is_loop:
                continue
            station = edge.station_code
            direction = edge.direction
            if not station or not direction:
                continue

            cross_in = None
            cross_out = None
            for other_id, other in self.edges.items():
                if not other.is_crossing:
                    continue
                if other.station_code != station:
                    continue
                if other.end_node == edge.start_node:
                    cross_in = other_id
                if other.start_node == edge.end_node:
                    cross_out = other_id

            if cross_in and cross_out:
                self.station_loops.setdefault(station, {}).setdefault(direction, []).append(
                    (cross_in, edge_id, cross_out)
                )

        # Map main edges at stations to loops
        for edge_id, edge in self.edges.items():
            if edge.is_main and edge.station_code:
                station = edge.station_code
                direction = edge.direction
                loops = self.station_loops.get(station, {}).get(direction, [])
                if loops:
                    self.main_to_loops[edge_id] = loops


    #SIGNAL ENFORCEMENT (RED/YELLOW/GREEN)
    def _add_signal_constraints(self) -> None:
        print("Adding signal aspect constraints...")

        for (tid, eid), start in self.start_vars.items():
            edge = self.graph.edges[eid]

            # ❌ Red Signal → No Entry
            if edge.signal_color.lower() == "red":
                if (tid, eid) in self.use_edge_vars:
                    self.model.Add(self.use_edge_vars[(tid, eid)] == 0)

            # ⚠️ Yellow Signal → Speed restriction
            if edge.signal_color.lower() == "yellow":
                self.model.Add(
                    self.durations[(tid, eid)] >= int(self.durations[(tid, eid)] * 1.4)
                )

    def _sort_main_edges(self) -> None:
        def edge_x(eid: str) -> float:
            e = self.edges.get(eid)
            if not e:
                return 0.0
            n = self.nodes.get(e.start_node)
            return n.x if n else 0.0

        self.up_main_edges.sort(key=edge_x)
        # For DOWN we reverse so that path is from Bina->Bhopal logically
        self.down_main_edges.sort(key=edge_x, reverse=True)
        self.main_edges.sort(key=edge_x)

    def get_main_path(self, direction: str) -> List[str]:
        if direction == "UP":
            return list(self.up_main_edges)
        if direction == "DOWN":
            return list(self.down_main_edges)
        return list(self.main_edges)

    def get_loop_alternatives(self, main_edge_id: str) -> List[Tuple[str, str, str]]:
        return self.main_to_loops.get(main_edge_id, [])


# ============================================================
# CP-SAT SCHEDULER
# ============================================================
class RailwaySchedulerCompact:
    def __init__(self) -> None:
        self.graph: Optional[NetworkGraph] = None
        self.trains: List[Train] = []
        self.model: Optional[cp_model.CpModel] = None

        self.start_vars: Dict[Tuple[str, str], Any] = {}
        self.end_vars: Dict[Tuple[str, str], Any] = {}
        self.interval_vars: Dict[Tuple[str, str], Any] = {}
        self.use_edge_vars: Dict[Tuple[str, str], Any] = {}  # only for optional edges
        self.durations: Dict[Tuple[str, str], int] = {}

        # route choices
        self.use_main_vars: Dict[Tuple[str, str], Any] = {}        # (train_id, main_edge) -> Bool
        self.use_loop_vars: Dict[Tuple[str, str, int], Any] = {}   # (train_id, main_edge, idx) -> Bool

        # completion & arrivals
        self.completed_vars: Dict[str, Any] = {}
        self.arrival_vars: Dict[str, Any] = {}

    # -------------------------
    # loading & main entry
    # -------------------------
    def load_data(self, data: dict) -> None:
        self.graph = NetworkGraph()
        self.graph.build(data)
        self.trains = [Train.from_dict(t) for t in data.get("trains", [])]

        print(f"\nLoaded {len(self.trains)} trains")
        print(f"  Passenger: {len([t for t in self.trains if t.is_passenger])}")
        print(f"  Freight  : {len([t for t in self.trains if t.is_freight])}")

    def optimize(self) -> dict:
        if not self.graph or not self.trains:
            return {"success": False, "message": "No graph or trains loaded"}

        self.model = cp_model.CpModel()

        passenger_trains = [t for t in self.trains if t.is_passenger]
        freight_trains = [t for t in self.trains if t.is_freight]

        self._create_variables()
        self._add_edge_capacity_constraints()
        self._add_sequence_constraints()
        self._add_passenger_schedule_constraints(passenger_trains)
        self._add_freight_precedence_constraints(passenger_trains, freight_trains)
        self._add_route_choice_constraints(freight_trains)
        self._add_completion_constraints()
        self._set_objective(passenger_trains, freight_trains)

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 60
        solver.parameters.num_search_workers = 4
        solver.parameters.log_search_progress = False

        print("\nSolving CP-SAT model...")
        status = solver.Solve(self.model)
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            status_name = solver.StatusName(status)
            print(f"✓ Solution found: {status_name}")
            return self._extract_solution(solver, passenger_trains, freight_trains, status_name)
        else:
            print("✗ No solution, using heuristic")
            return self._generate_heuristic_solution(passenger_trains, freight_trains)

    # -------------------------
    # helpers
    # -------------------------
    def _compute_duration(self, train: Train, edge: Edge) -> int:
        speed = min(train.max_speed, edge.max_speed)
        if edge.is_loop:
            if edge.loop_number <= 1:
                speed = min(speed, LOOP1_SPEED_KMH)
            else:
                speed = min(speed, LOOP2_SPEED_KMH)
        if speed <= 0:
            speed = 10

        time_min = (edge.length / speed) * 60.0
        if edge.is_loop:
            time_min += LOOP_DECEL_PENALTY + LOOP_ACCEL_PENALTY

        return max(1, math.ceil(time_min))

    # -------------------------
    # variable creation
    # -------------------------
    def _create_variables(self) -> None:
        print("Creating variables...")

        for train in self.trains:
            main_path = self.graph.get_main_path(train.direction)

            # candidate edges
            possible_edges: Set[str] = set(main_path)

            if train.is_freight:
                for main_edge in main_path:
                    for cross_in, loop, cross_out in self.graph.get_loop_alternatives(main_edge):
                        possible_edges.update([cross_in, loop, cross_out])

            for edge_id in possible_edges:
                edge = self.graph.edges.get(edge_id)
                if not edge:
                    continue

                key = (train.train_id, edge_id)
                dur = self._compute_duration(train, edge)
                self.durations[key] = dur

                start = self.model.NewIntVar(0, PLANNING_HORIZON, f"start_{train.train_id}_{edge_id}")
                end = self.model.NewIntVar(0, PLANNING_HORIZON, f"end_{train.train_id}_{edge_id}")

                if train.is_freight:
                    # freight:
                    # - main edges at stations (with loops) => optional, tied to route choice
                    # - main edges in mid-section => mandatory
                    # - loops & crossings => optional
                    is_station_main = edge.is_main and edge.station_code and \
                        self.graph.get_loop_alternatives(edge_id)

                    if edge.is_loop or edge.is_crossing or is_station_main:
                        use_edge = self.model.NewBoolVar(f"use_{train.train_id}_{edge_id}")
                        self.use_edge_vars[key] = use_edge
                        interval = self.model.NewOptionalIntervalVar(
                            start, dur, end, use_edge, f"int_{train.train_id}_{edge_id}"
                        )
                    else:
                        # mandatory (no route choice here)
                        interval = self.model.NewIntervalVar(
                            start, dur, end, f"int_{train.train_id}_{edge_id}"
                        )
                else:
                    # passenger: only main/automatic edges, no loops
                    if edge.is_loop or edge.is_crossing:
                        continue
                    interval = self.model.NewIntervalVar(
                        start, dur, end, f"int_{train.train_id}_{edge_id}"
                    )

                self.start_vars[key] = start
                self.end_vars[key] = end
                self.interval_vars[key] = interval

            # route choices at loop stations for freight
            if train.is_freight:
                for main_edge in main_path:
                    loop_alts = self.graph.get_loop_alternatives(main_edge)
                    if not loop_alts:
                        continue
                    use_main = self.model.NewBoolVar(f"useMain_{train.train_id}_{main_edge}")
                    self.use_main_vars[(train.train_id, main_edge)] = use_main
                    for idx, _ in enumerate(loop_alts):
                        use_loop = self.model.NewBoolVar(f"useLoop_{train.train_id}_{main_edge}_{idx}")
                        self.use_loop_vars[(train.train_id, main_edge, idx)] = use_loop

            # completion & arrival
            self.completed_vars[train.train_id] = self.model.NewBoolVar(f"completed_{train.train_id}")
            self.arrival_vars[train.train_id] = self.model.NewIntVar(
                0, PLANNING_HORIZON, f"arrival_{train.train_id}"
            )

        print(f"  Intervals: {len(self.interval_vars)}")
        print(f"  Optional edges: {len(self.use_edge_vars)}")
        print(f"  Route choice points: {len(self.use_main_vars)}")

    # -------------------------
    # constraints
    # -------------------------
    def _add_edge_capacity_constraints(self) -> None:
        print("Adding ABS block capacity (bi-direction safe)...")

        block_to_intervals = {}

        for (tid, eid), interval in self.interval_vars.items():
            edge = self.graph.edges[eid]
            block_to_intervals.setdefault(edge.block_id, []).append(interval)

        for block_id, intervals in block_to_intervals.items():
            if len(intervals) > 1:
                self.model.AddNoOverlap(intervals)

        print(f"  ABS blocks protected: {len(block_to_intervals)}")


    def _add_sequence_constraints(self) -> None:
        print("Adding sequence constraints on main path...")
        count = 0
        for train in self.trains:
            main_path = self.graph.get_main_path(train.direction)
            for i in range(len(main_path) - 1):
                e1 = main_path[i]
                e2 = main_path[i + 1]
                k1 = (train.train_id, e1)
                k2 = (train.train_id, e2)
                if k1 in self.end_vars and k2 in self.start_vars:
                    self.model.Add(self.start_vars[k2] >= self.end_vars[k1])
                    count += 1
        print(f"  Sequence constraints: {count}")

    def _add_passenger_schedule_constraints(self, passengers: List[Train]) -> None:
        print("Adding passenger schedule constraints...")
        for train in passengers:
            main_path = self.graph.get_main_path(train.direction)
            if not main_path:
                continue
            first_edge = main_path[0]
            k = (train.train_id, first_edge)
            if k not in self.start_vars:
                continue
            dep = train.get_origin_departure()
            if dep > 0:
                self.model.Add(self.start_vars[k] == dep)
            else:
                # small priority-based stagger if no schedule
                self.model.Add(self.start_vars[k] >= train.train_priority * 5)

    def _add_freight_precedence_constraints(
        self, passengers: List[Train], freights: List[Train]
    ) -> None:
        print("Adding freight precedence (no overtake passenger in same direction)...")
        count = 0
        for p in passengers:
            for f in freights:
                if p.direction != f.direction:
                    continue
                main_path = self.graph.get_main_path(p.direction)
                for eid in main_path:
                    pk = (p.train_id, eid)
                    fk = (f.train_id, eid)
                    if pk in self.end_vars and fk in self.start_vars:
                        p_dep = p.get_origin_departure()
                        f_dep = f.get_origin_departure()
                        if p_dep > 0 and f_dep > 0 and p_dep <= f_dep:
                            self.model.Add(
                                self.start_vars[fk] >= self.end_vars[pk] + MIN_HEADWAY
                            )
                            count += 1
        print(f"  Precedence constraints: {count}")

    def _add_route_choice_constraints(self, freights: List[Train]) -> None:
        print("Adding route choice constraints (main vs loops)...")
        count = 0
        for train in freights:
            main_path = self.graph.get_main_path(train.direction)
            for main_edge in main_path:
                loop_alts = self.graph.get_loop_alternatives(main_edge)
                if not loop_alts:
                    continue

                use_main = self.use_main_vars.get((train.train_id, main_edge))
                if use_main is None:
                    continue

                # link main edge usage to use_main
                main_edge_key = (train.train_id, main_edge)
                if main_edge_key in self.use_edge_vars:
                    self.model.Add(self.use_edge_vars[main_edge_key] == use_main)
                    count += 1

                loop_choice_vars: List[Any] = []
                for idx, (cross_in, loop_e, cross_out) in enumerate(loop_alts):
                    choice_key = (train.train_id, main_edge, idx)
                    use_loop = self.use_loop_vars.get(choice_key)
                    if use_loop is None:
                        continue
                    loop_choice_vars.append(use_loop)

                    # link use_loop to edges cross_in, loop, cross_out
                    for eid in [cross_in, loop_e, cross_out]:
                        ek = (train.train_id, eid)
                        if ek in self.use_edge_vars:
                            self.model.Add(self.use_edge_vars[ek] == use_loop)
                            count += 1

                    # sequence inside loop path: cross_in -> loop -> cross_out
                    cin_k = (train.train_id, cross_in)
                    loop_k = (train.train_id, loop_e)
                    cout_k = (train.train_id, cross_out)
                    if (
                        cin_k in self.end_vars
                        and loop_k in self.start_vars
                        and loop_k in self.end_vars
                        and cout_k in self.start_vars
                    ):
                        self.model.Add(
                            self.start_vars[loop_k] >= self.end_vars[cin_k]
                        ).OnlyEnforceIf(use_loop)
                        self.model.Add(
                            self.start_vars[cout_k] >= self.end_vars[loop_k]
                        ).OnlyEnforceIf(use_loop)
                        count += 2

                all_choices = [use_main] + loop_choice_vars
                if len(all_choices) > 1:
                    self.model.AddExactlyOne(all_choices)
                    count += 1

        print(f"  Route choice constraints: {count}")

    def _add_completion_constraints(self) -> None:
        print("Adding completion & arrival constraints...")
        count = 0
        for train in self.trains:
            main_path = self.graph.get_main_path(train.direction)
            if not main_path:
                continue
            last_edge = main_path[-1]
            k = (train.train_id, last_edge)
            if k in self.end_vars:
                self.model.Add(self.arrival_vars[train.train_id] == self.end_vars[k])
                count += 1
            # For now: mark all trains as completed
            self.model.Add(self.completed_vars[train.train_id] == 1)
            count += 1
        print(f"  Completion constraints: {count}")

    # -------------------------
    # objective
    # -------------------------
    def _set_objective(self, passengers: List[Train], freights: List[Train]) -> None:
        print("Setting objective...")
        terms: List[Any] = []

        # big reward for freight completion (negative because we minimize)
        for t in freights:
            if t.train_id in self.completed_vars:
                terms.append(-WEIGHT_FREIGHT_COMPLETED * self.completed_vars[t.train_id])

        # small penalty on arrival time (earlier is better)
        for t in freights:
            if t.train_id in self.arrival_vars:
                terms.append(WEIGHT_FREIGHT_DELAY * self.arrival_vars[t.train_id])

        # penalty for loop usage (try to keep loops free unless needed)
        for (tid, main_edge, idx), use_loop in self.use_loop_vars.items():
            loop_alts = self.graph.get_loop_alternatives(main_edge)
            if idx >= len(loop_alts):
                continue
            _, loop_eid, _ = loop_alts[idx]
            edge = self.graph.edges.get(loop_eid)
            penalty = WEIGHT_LOOP_USAGE
            if edge and edge.loop_number >= 2:
                penalty += WEIGHT_DEEP_LOOP
            terms.append(penalty * use_loop)

        if terms:
            self.model.Minimize(sum(terms))

    # -------------------------
    # solution extraction
    # -------------------------
    def _extract_solution(
        self,
        solver: cp_model.CpSolver,
        passengers: List[Train],
        freights: List[Train],
        solver_status: str,
    ) -> dict:
        print("Extracting solution...")

        train_schedules: List[dict] = []
        all_loop_recos: List[dict] = []
        loop_decision_strings: List[str] = []
        time_distance_graph_data: List[dict] = []

        # simple maps for station naming
        station_code_map = {"BPL": "bhopal", "VDA": "vidisha", "BINA": "bina"}

        for train in self.trains:
            main_path = self.graph.get_main_path(train.direction)

            # build edge schedule
            edge_schedule: List[dict] = []
            for eid in main_path:
                key = (train.train_id, eid)
                if key not in self.start_vars:
                    continue

                # for freight optional edges: only output if actually used
                if train.is_freight and key in self.use_edge_vars:
                    if solver.Value(self.use_edge_vars[key]) == 0:
                        continue

                start = solver.Value(self.start_vars[key])
                end = solver.Value(self.end_vars[key])
                edge = self.graph.edges.get(eid)

                edge_schedule.append(
                    {
                        "edgeId": eid,
                        "edgeType": edge.edge_type if edge else "",
                        "stationCode": edge.station_code if edge else "",
                        "startTime": minutes_to_time(start),
                        "endTime": minutes_to_time(end),
                        "startMinutes": start,
                        "endMinutes": end,
                        "duration": end - start,
                    }
                )

            # loop decisions (which station/line, entry/exit)
            loop_decisions: List[dict] = []
            if train.is_freight:
                for (tid, main_edge, idx), use_loop_var in self.use_loop_vars.items():
                    if tid != train.train_id:
                        continue
                    if solver.Value(use_loop_var) != 1:
                        continue

                    loop_alts = self.graph.get_loop_alternatives(main_edge)
                    if idx >= len(loop_alts):
                        continue
                    cross_in, loop_eid, cross_out = loop_alts[idx]
                    loop_edge = self.graph.edges.get(loop_eid)

                    loop_key = (train.train_id, loop_eid)
                    entry = solver.Value(self.start_vars[loop_key]) if loop_key in self.start_vars else 0
                    exit_ = solver.Value(self.end_vars[loop_key]) if loop_key in self.end_vars else 0

                    station_code = loop_edge.station_code if loop_edge else ""
                    loop_no = loop_edge.loop_number if loop_edge else 0

                    loop_decisions.append(
                        {
                            "mainEdge": main_edge,
                            "crossIn": cross_in,
                            "loopEdge": loop_eid,
                            "crossOut": cross_out,
                            "loopNumber": loop_no,
                            "stationCode": station_code,
                            "entryTime": minutes_to_time(entry),
                            "exitTime": minutes_to_time(exit_),
                            "entryMinutes": entry,
                            "exitMinutes": exit_,
                            "reason": "Allowing higher-priority train to pass",
                        }
                    )

                    station_name = station_code or "UNKNOWN"
                    loop_decision_strings.append(
                        f"loop train {train.train_id} at {station_name} station entry {minutes_to_time(entry)} exit {minutes_to_time(exit_)}"
                    )

                    all_loop_recos.append(
                        {
                            "type": "LOOP",
                            "priority": "HIGH",
                            "trainId": train.train_id,
                            "trainName": train.train_name,
                            "action": f"Divert to Loop {loop_no}",
                            "station": station_name,
                            "reason": "Allow passenger or higher priority train to pass",
                            "description": f"Route {train.train_name} through Loop {loop_no} at {station_name}",
                        }
                    )

            # travel segments & time-distance profile
            td_profile = self._build_time_distance_profile(train, edge_schedule)
            travel_segments = self._build_travel_segments(train, edge_schedule)

            # time-distance graph data (for chart)
            graph_data = self._build_time_distance_graph_data(train, edge_schedule)
            if graph_data:
                time_distance_graph_data.append(graph_data)

            arrival_val = solver.Value(self.arrival_vars[train.train_id]) if train.train_id in self.arrival_vars else 0

            train_schedules.append(
                {
                    "trainId": train.train_id,
                    "trainName": train.train_name,
                    "trainType": train.train_type,
                    "trainCategory": train.train_category,
                    "direction": train.direction,
                    "priority": train.train_priority,
                    "maxSpeed": train.max_speed,
                    "isPassenger": train.is_passenger,
                    "isFreight": train.is_freight,
                    "timeDistanceProfile": td_profile,
                    "travelSegments": travel_segments,
                    "edgeSchedule": edge_schedule,
                    "loopDecisions": loop_decisions,
                    "completed": True,
                    "arrivalTime": minutes_to_time(arrival_val),
                    "arrivalMinutes": arrival_val,
                }
            )

        # recommendations & explanation
        recommendations = self._generate_recommendations(train_schedules, all_loop_recos)
        freight_completed = len([s for s in train_schedules if s["isFreight"] and s["completed"]])

        result = {
            "success": True,
            "message": "Optimization completed successfully",
            "trainSchedules": train_schedules,
            "loopDecisionStrings": loop_decision_strings,
            "timeDistanceGraphData": time_distance_graph_data,
            "recommendations": recommendations,
            "summary": {
                "totalTrains": len(self.trains),
                "passengerTrains": len(passengers),
                "freightTrains": len(freights),
                "freightCompleted": freight_completed,
                "totalLoopUsages": sum(len(s["loopDecisions"]) for s in train_schedules),
                "solverStatus": solver_status,
            },
            "explanation": self._generate_explanation(train_schedules),
        }
        return result

    # -------------------------
    # time-distance helpers
    # -------------------------
    def _build_time_distance_graph_data(self, train: Train, edge_schedule: List[dict]) -> dict:
        """Build compact time-distance info per train for plotting."""
        station_order = ["bhopal", "vidisha", "bina"] if train.direction == "UP" else ["bina", "vidisha", "bhopal"]
        station_code_map = {"BPL": "bhopal", "VDA": "vidisha", "BINA": "bina"}
        station_name_map = {"bhopal": "Bhopal", "vidisha": "Vidisha", "bina": "Bina"}

        station_times: Dict[str, Dict[str, int]] = {}

        for e in edge_schedule:
            code = e.get("stationCode") or ""
            if not code:
                continue
            st_id = station_code_map.get(code, code.lower())
            station_times.setdefault(st_id, {"arrival": e["startMinutes"], "departure": e["endMinutes"]})
            station_times[st_id]["departure"] = e["endMinutes"]

        # fallback to timetable if no movement info for that station
        for st_id in station_order:
            if st_id not in station_times and st_id in train.schedule:
                sched = train.schedule[st_id]
                arr = sched.arrival_minutes()
                dep = sched.departure_minutes()
                if arr > 0 or dep > 0:
                    station_times[st_id] = {
                        "arrival": arr if arr > 0 else dep,
                        "departure": dep if dep > 0 else arr,
                    }

        graph_data: Dict[str, Any] = {"train": train.train_id, "trainName": train.train_name}

        for i, st_id in enumerate(station_order):
            times = station_times.get(st_id)
            st_name = station_name_map.get(st_id, st_id.title())
            if not times:
                continue

            dwell = times["departure"] - times["arrival"]
            graph_data[f"timeSpentAt{st_name}"] = f"{dwell} min"
            graph_data[f"arrivalAt{st_name}"] = minutes_to_time(times["arrival"])
            graph_data[f"departureFrom{st_name}"] = minutes_to_time(times["departure"])

            if i < len(station_order) - 1:
                next_id = station_order[i + 1]
                next_times = station_times.get(next_id)
                if next_times:
                    travel_time = next_times["arrival"] - times["departure"]
                    next_name = station_name_map.get(next_id, next_id.title())
                    graph_data[f"timeToReach{next_name}"] = f"{travel_time} min"

        return graph_data

    def _build_travel_segments(self, train: Train, edge_schedule: List[dict]) -> List[dict]:
        """Station-to-station segments mainly for UI / summary."""
        segments: List[dict] = []
        station_order = ["bhopal", "vidisha", "bina"] if train.direction == "UP" else ["bina", "vidisha", "bhopal"]
        station_code_map = {"BPL": "bhopal", "VDA": "vidisha", "BINA": "bina"}
        station_name_map = {"bhopal": "Bhopal", "vidisha": "Vidisha", "bina": "Bina"}

        station_times: Dict[str, Dict[str, int]] = {}
        for e in edge_schedule:
            code = e.get("stationCode") or ""
            if not code:
                continue
            st_id = station_code_map.get(code, code.lower())
            station_times.setdefault(st_id, {"arrival": e["startMinutes"], "departure": e["endMinutes"]})
            station_times[st_id]["departure"] = e["endMinutes"]

        if not station_times:
            # fallback: use static schedule
            for st_id in station_order:
                if st_id in train.schedule:
                    sched = train.schedule[st_id]
                    arr = sched.arrival_minutes()
                    dep = sched.departure_minutes()
                    if arr > 0 or dep > 0:
                        station_times[st_id] = {
                            "arrival": arr if arr > 0 else dep,
                            "departure": dep if dep > 0 else arr,
                        }

        for i in range(len(station_order) - 1):
            s_from = station_order[i]
            s_to = station_order[i + 1]
            t_from = station_times.get(s_from)
            t_to = station_times.get(s_to)
            if not t_from or not t_to:
                continue

            travel = t_to["arrival"] - t_from["departure"]
            segments.append(
                {
                    "fromStation": station_name_map.get(s_from, s_from.title()),
                    "fromStationId": s_from,
                    "toStation": station_name_map.get(s_to, s_to.title()),
                    "toStationId": s_to,
                    "departureTime": minutes_to_time(t_from["departure"]),
                    "arrivalTime": minutes_to_time(t_to["arrival"]),
                    "departureMinutes": t_from["departure"],
                    "arrivalMinutes": t_to["arrival"],
                    "travelTimeMinutes": travel,
                    "travelTimeFormatted": f"{travel} min",
                }
            )
        return segments

    def _build_time_distance_profile(self, train: Train, edge_schedule: List[dict]) -> List[dict]:
        """Simple profile for charting (station vs time)."""
        profile: List[dict] = []
        station_order = ["bhopal", "vidisha", "bina"] if train.direction == "UP" else ["bina", "vidisha", "bhopal"]
        station_code_map = {"BPL": "bhopal", "VDA": "vidisha", "BINA": "bina"}

        station_times: Dict[str, Dict[str, int]] = {}
        for e in edge_schedule:
            code = e.get("stationCode") or ""
            if not code:
                continue
            st_id = station_code_map.get(code, code.lower())
            station_times.setdefault(st_id, {"arrival": e["startMinutes"], "departure": e["endMinutes"]})
            station_times[st_id]["departure"] = e["endMinutes"]

        for idx, st_id in enumerate(station_order):
            times = station_times.get(st_id)
            if not times and st_id in train.schedule:
                sched = train.schedule[st_id]
                arr = sched.arrival_minutes()
                dep = sched.departure_minutes()
                times = {
                    "arrival": arr if arr > 0 else dep,
                    "departure": dep if dep > 0 else arr,
                }
            if not times:
                continue
            profile.append(
                {
                    "stationId": st_id,
                    "stationName": st_id.title(),
                    "arrival": minutes_to_time(times["arrival"]),
                    "departure": minutes_to_time(times["departure"]),
                    "arrivalMinutes": times["arrival"],
                    "departureMinutes": times["departure"],
                    "yIndex": idx,
                }
            )
        return profile

    # -------------------------
    # recommendations & explanation
    # -------------------------
    def _generate_recommendations(self, train_schedules: List[dict], loop_recos: List[dict]) -> List[dict]:
        recos = list(loop_recos)

        for t1 in train_schedules:
            for t2 in train_schedules:
                if t1["trainId"] >= t2["trainId"]:
                    continue
                if t1["direction"] != t2["direction"]:
                    continue

                if t1["isFreight"] and t2["isPassenger"]:
                    self._check_proximity(t1, t2, recos)
                elif t2["isFreight"] and t1["isPassenger"]:
                    self._check_proximity(t2, t1, recos)

        total_loops = sum(len(s["loopDecisions"]) for s in train_schedules)
        if total_loops == 0 and not recos:
            recos.append(
                {
                    "type": "INFO",
                    "priority": "LOW",
                    "trainId": None,
                    "trainName": None,
                    "action": "No loop diversions required",
                    "station": None,
                    "reason": "All trains scheduled without conflicts",
                    "description": "Current schedule allows all trains to pass without loop diversions.",
                }
            )
        return recos

    def _check_proximity(self, freight: dict, passenger: dict, recos: List[dict]) -> None:
        for fp in freight.get("timeDistanceProfile", []):
            for pp in passenger.get("timeDistanceProfile", []):
                if fp["stationId"] != pp["stationId"]:
                    continue
                diff = fp["arrivalMinutes"] - pp["arrivalMinutes"]
                if 0 < diff < 15:
                    recos.append(
                        {
                            "type": "WARNING",
                            "priority": "MEDIUM",
                            "trainId": freight["trainId"],
                            "trainName": freight["trainName"],
                            "action": f"Consider holding at {fp['stationName']}",
                            "station": fp["stationName"],
                            "reason": f"Only {diff} min behind {passenger['trainName']}",
                            "description": f"{freight['trainName']} reaches {fp['stationName']} only {diff} min after {passenger['trainName']}.",
                        }
                    )
                    return

    def _generate_explanation(self, train_schedules: List[dict]) -> str:
        lines: List[str] = ["=== OPTIMIZATION RESULTS ===", ""]

        passenger = [s for s in train_schedules if s["isPassenger"]]
        lines.append(f"PASSENGER TRAINS ({len(passenger)}):")
        for s in passenger:
            lines.append(f"  {s['trainName']} ({s['trainId']}): {s['arrivalTime']}")
        lines.append("")

        freight = [s for s in train_schedules if s["isFreight"]]
        lines.append(f"FREIGHT TRAINS ({len(freight)}):")
        for s in freight:
            loops = len(s["loopDecisions"])
            loops_txt = f" (used {loops} loop{'s' if loops != 1 else ''})" if loops else ""
            lines.append(f"  {s['trainName']} ({s['trainId']}): {s['arrivalTime']}{loops_txt}")

        total_loops = sum(len(s["loopDecisions"]) for s in train_schedules)
        if total_loops > 0:
            lines.append("")
            lines.append(f"LOOP DIVERSIONS ({total_loops}):")
            for s in train_schedules:
                for ld in s["loopDecisions"]:
                    lines.append(f"  {s['trainName']} → Loop {ld['loopNumber']} at {ld['stationCode']}")

        return "\n".join(lines)

    # -------------------------
    # heuristic fallback
    # -------------------------
    def _generate_heuristic_solution(self, passengers: List[Train], freights: List[Train]) -> dict:
        print("Generating heuristic solution...")

        all_trains = sorted(
            self.trains,
            key=lambda t: (0 if t.is_passenger else 1, t.train_priority),
        )

        edge_free_time: Dict[str, int] = {}
        train_schedules: List[dict] = []
        loop_decision_strings: List[str] = []
        time_distance_graph_data: List[dict] = []

        for train in all_trains:
            main_path = self.graph.get_main_path(train.direction)
            cur_time = train.get_origin_departure() or (train.train_priority * 5)

            edge_schedule: List[dict] = []
            for eid in main_path:
                edge = self.graph.edges.get(eid)
                if not edge:
                    continue
                dur = self._compute_duration(train, edge)
                if eid in edge_free_time:
                    cur_time = max(cur_time, edge_free_time[eid] + MIN_HEADWAY)
                end = cur_time + dur

                edge_schedule.append(
                    {
                        "edgeId": eid,
                        "edgeType": edge.edge_type,
                        "stationCode": edge.station_code,
                        "startTime": minutes_to_time(cur_time),
                        "endTime": minutes_to_time(end),
                        "startMinutes": cur_time,
                        "endMinutes": end,
                        "duration": dur,
                    }
                )
                edge_free_time[eid] = end
                cur_time = end

            td_profile = self._build_time_distance_profile(train, edge_schedule)
            travel_segments = self._build_travel_segments(train, edge_schedule)
            graph_data = self._build_time_distance_graph_data(train, edge_schedule)
            if graph_data:
                time_distance_graph_data.append(graph_data)

            arrival_time = edge_schedule[-1]["endTime"] if edge_schedule else ""
            arrival_min = edge_schedule[-1]["endMinutes"] if edge_schedule else 0

            train_schedules.append(
                {
                    "trainId": train.train_id,
                    "trainName": train.train_name,
                    "trainType": train.train_type,
                    "trainCategory": train.train_category,
                    "direction": train.direction,
                    "priority": train.train_priority,
                    "maxSpeed": train.max_speed,
                    "isPassenger": train.is_passenger,
                    "isFreight": train.is_freight,
                    "timeDistanceProfile": td_profile,
                    "travelSegments": travel_segments,
                    "edgeSchedule": edge_schedule,
                    "loopDecisions": [],
                    "completed": True,
                    "arrivalTime": arrival_time,
                    "arrivalMinutes": arrival_min,
                }
            )

        recommendations = self._generate_recommendations(train_schedules, [])
        return {
            "success": True,
            "message": "Heuristic solution (CP-SAT infeasible/timeout)",
            "trainSchedules": train_schedules,
            "loopDecisionStrings": loop_decision_strings,
            "timeDistanceGraphData": time_distance_graph_data,
            "recommendations": recommendations,
            "summary": {
                "totalTrains": len(self.trains),
                "passengerTrains": len(passengers),
                "freightTrains": len(freights),
                "freightCompleted": len(freights),
                "totalLoopUsages": 0,
                "solverStatus": "HEURISTIC",
            },
            "explanation": "Heuristic: priority-based ordering with simple conflict avoidance.",
        }


# ============================================================
# MAIN ENTRY POINT
# ============================================================
def run_optimization(data: dict) -> dict:
    scheduler = RailwaySchedulerCompact()
    scheduler.load_data(data)
    return scheduler.optimize()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        with open(sys.argv[1], "r") as f:
            data = json.load(f)
        result = run_optimization(data)
        print(json.dumps(result, indent=2))
    else:
        print("Usage: python railway_scheduler_compact.py <data.json>")

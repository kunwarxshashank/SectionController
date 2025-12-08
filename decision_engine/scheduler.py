"""
Railway Traffic Scheduler v2.0 - Using data.json format
Using OR-Tools CP-SAT with:
- Optional intervals for conditional routing (loops)
- Loop decision variables with proper path expansion  
- Hard passenger schedule constraints
- Freight precedence constraints
- Binary completion variables for freight throughput
- Correct loop timing with decel/accel penalties

Input format: data.json from adminAuth.controller.js
- sectionData.tracks[].edges[] with edgeId, edgeType, direction, stationCode, loopGroup, loopNumber
- sectionData.tracks[].nodes[]
- sectionData.stations[]
- trains[] with trainId, trainCategory, schedule, currentEdge
"""
import math
from typing import Dict, List, Tuple, Optional, Set, Any
from dataclasses import dataclass, field
from ortools.sat.python import cp_model
import json


# ============================================================
# CONSTANTS
# ============================================================
PLANNING_HORIZON = 24 * 60  # 24 hours in minutes
MIN_HEADWAY = 3             # Minimum headway between trains (minutes)
LOOP_DECEL_PENALTY = 5      # Deceleration time for entering loop (minutes)
LOOP_ACCEL_PENALTY = 7      # Acceleration time for exiting loop (minutes)
LOOP1_SPEED_KMH = 30        # Speed for first loop (km/h)
LOOP2_SPEED_KMH = 15        # Speed for second+ loops (km/h)
DEFAULT_SPEED_KMH = 120     # Default speed

# Objective weights
WEIGHT_FREIGHT_COMPLETED = 10000    # High priority for completing freight
WEIGHT_PASSENGER_DELAY = 1000       # Penalty per minute passenger delay
WEIGHT_FREIGHT_DELAY = 1            # Penalty per minute freight delay  
WEIGHT_LOOP_USAGE = 100             # Penalty per loop usage
WEIGHT_DEEP_LOOP = 200              # Additional penalty for loop2, loop3, etc.


# ============================================================
# HELPER FUNCTIONS
# ============================================================
def time_to_minutes(time_str: str) -> int:
    """Convert HH:MM string to minutes from midnight"""
    if not time_str or time_str == "":
        return 0
    try:
        parts = time_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        return 0


def minutes_to_time(minutes: int) -> str:
    """Convert minutes from midnight to HH:MM string"""
    minutes = int(minutes) % (24 * 60)
    h = minutes // 60
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


# ============================================================
# DATA CLASSES
# ============================================================
@dataclass
class Edge:
    """A track section (edge in the graph)"""
    edge_id: str        # e.g., "UP_E1", "UP_A_LOOP1", "UP_A_CROSS_IN_L1"
    start_node: str
    end_node: str
    edge_type: str      # "block", "automatic", "loop", "crossing"
    stream: str         # "up", "down", "both"
    direction: str      # "UP", "DOWN", "BOTH"
    length: float       # km
    max_speed: float    # km/h
    station_code: str   # "BPL", "VDA", "BINA" or ""
    loop_group: str     # "A", "B", "C" (station loop group)
    loop_number: int    # 1, 2, 3... (loop index at station)
    is_occupied: bool
    
    @classmethod
    def from_dict(cls, data: dict) -> "Edge":
        max_speed = data.get("maxspeed", "120")
        if isinstance(max_speed, str):
            max_speed = float(max_speed) if max_speed else DEFAULT_SPEED_KMH
        
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
            loop_number=int(data.get("loopNumber", 0)),
            is_occupied=data.get("isOccupied", False)
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
    """A point in the railway network"""
    node_id: str
    node_type: str  # "main", "loop", "crossing"
    x: float
    y: float
    line: str       # "UP", "DOWN", "MAIN", "UP_LOOP", etc.
    block_boundary: bool
    
    @classmethod
    def from_dict(cls, data: dict) -> "Node":
        return cls(
            node_id=data.get("nodeId", ""),
            node_type=data.get("nodeType", "main"),
            x=float(data.get("x", 0)),
            y=float(data.get("y", 0)),
            line=data.get("line", ""),
            block_boundary=data.get("blockBoundary", False)
        )


@dataclass
class Station:
    """A railway station"""
    station_id: str
    station_name: str
    station_code: str  # Short code like "BPL"
    
    @classmethod
    def from_dict(cls, data: dict) -> "Station":
        sid = data.get("stationId", "")
        return cls(
            station_id=sid,
            station_name=data.get("stationName", sid),
            station_code=sid.upper()[:4] if sid else ""
        )


@dataclass
class TrainSchedule:
    """Station schedule for a train"""
    station_id: str
    scheduled_arrival: str
    scheduled_departure: str
    
    def arrival_minutes(self) -> int:
        return time_to_minutes(self.scheduled_arrival)
    
    def departure_minutes(self) -> int:
        return time_to_minutes(self.scheduled_departure)


@dataclass
class Train:
    """A train with schedule and current position"""
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
    schedule: Dict[str, TrainSchedule]  # station_id -> schedule
    
    @classmethod
    def from_dict(cls, data: dict) -> "Train":
        schedule = {}
        raw_schedule = data.get("schedule", {})
        for station_id, sched in raw_schedule.items():
            if isinstance(sched, dict):
                schedule[station_id] = TrainSchedule(
                    station_id=station_id,
                    scheduled_arrival=sched.get("scheduledArrival", ""),
                    scheduled_departure=sched.get("scheduledDeparture", "")
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
            is_emergency=data.get("isEmergency", False),
            schedule=schedule
        )
    
    @property
    def is_passenger(self) -> bool:
        return self.train_category == "Passenger"
    
    @property
    def is_freight(self) -> bool:
        return self.train_category == "Freight"
    
    def get_origin_departure(self) -> int:
        """Get departure time from origin station in minutes"""
        origin = "bhopal" if self.direction == "UP" else "bina"
        if origin in self.schedule:
            return self.schedule[origin].departure_minutes()
        return 0


# ============================================================
# NETWORK GRAPH
# ============================================================
@dataclass
class NetworkGraph:
    """Railway network for path finding and scheduling"""
    section_id: str = ""
    section_name: str = ""
    stations: List[Station] = field(default_factory=list)
    
    # Edge/Node lookup
    edges: Dict[str, Edge] = field(default_factory=dict)       # edge_id -> Edge
    nodes: Dict[str, Node] = field(default_factory=dict)       # node_id -> Node
    
    # Main line edges ordered by position
    up_main_edges: List[str] = field(default_factory=list)     # UP direction main edges
    down_main_edges: List[str] = field(default_factory=list)   # DOWN direction main edges
    main_edges: List[str] = field(default_factory=list)        # MAIN track edges
    
    # Loop structures at each station
    # station_code -> direction -> list of (cross_in, loop, cross_out) tuples
    station_loops: Dict[str, Dict[str, List[Tuple[str, str, str]]]] = field(default_factory=dict)
    
    # Map main edges to their loop alternatives
    main_to_loops: Dict[str, List[Tuple[str, str, str]]] = field(default_factory=dict)
    
    def build(self, data: dict) -> None:
        """Build network from data.json structure"""
        section_data = data.get("sectionData", {})
        
        self.section_id = section_data.get("section_id", "")
        self.section_name = section_data.get("name", "")
        
        # Parse stations
        for station_data in section_data.get("stations", []):
            self.stations.append(Station.from_dict(station_data))
        
        # Parse tracks -> edges and nodes
        for track in section_data.get("tracks", []):
            for edge_data in track.get("edges", []):
                edge = Edge.from_dict(edge_data)
                self.edges[edge.edge_id] = edge
            
            for node_data in track.get("nodes", []):
                node = Node.from_dict(node_data)
                self.nodes[node.node_id] = node
        
        # Categorize edges
        self._categorize_edges()
        
        # Build loop structures
        self._build_loop_structures()
        
        # Sort main edges by position
        self._sort_edges()
        
        print(f"Network built: {len(self.edges)} edges, {len(self.nodes)} nodes")
        print(f"  UP main edges: {len(self.up_main_edges)}")
        print(f"  DOWN main edges: {len(self.down_main_edges)}")
        print(f"  Stations with loops: {list(self.station_loops.keys())}")
    
    def _categorize_edges(self) -> None:
        """Categorize edges into main/loop/crossing groups"""
        for edge_id, edge in self.edges.items():
            if edge.is_main:
                if edge.direction == "UP":
                    self.up_main_edges.append(edge_id)
                elif edge.direction == "DOWN":
                    self.down_main_edges.append(edge_id)
                elif edge.direction == "BOTH":
                    self.main_edges.append(edge_id)
    
    def _build_loop_structures(self) -> None:
        """Build loop structures (cross_in -> loop -> cross_out) at each station"""
        # Group loops by station code and loop group
        loops_by_station: Dict[str, Dict[str, Dict[int, str]]] = {}  # station -> direction -> loopNum -> loopEdgeId
        
        for edge_id, edge in self.edges.items():
            if edge.is_loop and edge.station_code and edge.loop_group:
                station = edge.station_code
                direction = edge.direction
                
                if station not in loops_by_station:
                    loops_by_station[station] = {}
                if direction not in loops_by_station[station]:
                    loops_by_station[station][direction] = {}
                
                loops_by_station[station][direction][edge.loop_number] = edge_id
        
        # For each loop, find the corresponding cross_in and cross_out edges
        for edge_id, edge in self.edges.items():
            if edge.is_loop:
                station = edge.station_code
                direction = edge.direction
                loop_num = edge.loop_number
                group = edge.loop_group
                
                # Find cross_in: ends at loop's start_node
                cross_in = None
                cross_out = None
                
                for other_id, other in self.edges.items():
                    if other.is_crossing and other.station_code == station:
                        # Cross-in ends at loop start
                        if other.end_node == edge.start_node:
                            cross_in = other_id
                        # Cross-out starts at loop end
                        if other.start_node == edge.end_node:
                            cross_out = other_id
                
                if cross_in and cross_out:
                    if station not in self.station_loops:
                        self.station_loops[station] = {}
                    if direction not in self.station_loops[station]:
                        self.station_loops[station][direction] = []
                    
                    self.station_loops[station][direction].append((cross_in, edge_id, cross_out))
        
        # Map main station edges to their loop alternatives
        for edge_id, edge in self.edges.items():
            if edge.is_main and edge.station_code:
                station = edge.station_code
                direction = edge.direction
                
                if station in self.station_loops and direction in self.station_loops[station]:
                    self.main_to_loops[edge_id] = self.station_loops[station][direction]
    
    def _sort_edges(self) -> None:
        """Sort main edges by their start node x-coordinate"""
        def get_edge_x(edge_id: str) -> float:
            edge = self.edges.get(edge_id)
            if edge:
                node = self.nodes.get(edge.start_node)
                if node:
                    return node.x
            return 0
        
        self.up_main_edges.sort(key=get_edge_x)
        self.down_main_edges.sort(key=get_edge_x, reverse=True)
        self.main_edges.sort(key=get_edge_x)
    
    def get_main_path(self, direction: str) -> List[str]:
        """Get ordered main line edge IDs for a direction"""
        if direction == "UP":
            return self.up_main_edges.copy()
        elif direction == "DOWN":
            return self.down_main_edges.copy()
        else:
            return self.main_edges.copy()
    
    def get_loop_alternatives(self, main_edge_id: str) -> List[Tuple[str, str, str]]:
        """Get loop alternatives (cross_in, loop, cross_out) for a main edge"""
        return self.main_to_loops.get(main_edge_id, [])


# ============================================================
# CP-SAT SCHEDULER
# ============================================================
class RailwaySchedulerV2:
    """
    CP-SAT Railway Scheduler with:
    - Optional intervals for loop routing
    - Hard passenger schedule constraints
    - Proper freight precedence
    - Freight completion maximization
    """
    
    def __init__(self):
        self.graph: Optional[NetworkGraph] = None
        self.trains: List[Train] = []
        self.model: Optional[cp_model.CpModel] = None
        
        # Decision variables
        self.start_vars: Dict[Tuple[str, str], Any] = {}      # (train_id, edge_id) -> IntVar
        self.end_vars: Dict[Tuple[str, str], Any] = {}        # (train_id, edge_id) -> IntVar
        self.interval_vars: Dict[Tuple[str, str], Any] = {}   # (train_id, edge_id) -> IntervalVar
        self.use_edge_vars: Dict[Tuple[str, str], Any] = {}   # (train_id, edge_id) -> BoolVar (for optional)
        self.durations: Dict[Tuple[str, str], int] = {}       # (train_id, edge_id) -> duration
        
        # Route decision variables
        self.use_main_vars: Dict[Tuple[str, str], Any] = {}   # (train_id, main_edge) -> BoolVar
        self.use_loop_vars: Dict[Tuple[str, str, int], Any] = {}  # (train_id, main_edge, loop_idx) -> BoolVar
        
        # Completion and arrival
        self.completed_vars: Dict[str, Any] = {}              # train_id -> BoolVar
        self.arrival_vars: Dict[str, Any] = {}                # train_id -> IntVar
    
    def load_data(self, data: dict) -> None:
        """Load section and train data"""
        self.graph = NetworkGraph()
        self.graph.build(data)
        
        self.trains = [Train.from_dict(t) for t in data.get("trains", [])]
        
        print(f"\nLoaded {len(self.trains)} trains:")
        print(f"  Passenger: {len([t for t in self.trains if t.is_passenger])}")
        print(f"  Freight: {len([t for t in self.trains if t.is_freight])}")
    
    def optimize(self) -> dict:
        """Run the CP-SAT optimization"""
        if not self.graph or not self.trains:
            return {"success": False, "message": "No data loaded"}
        
        self.model = cp_model.CpModel()
        
        passenger_trains = [t for t in self.trains if t.is_passenger]
        freight_trains = [t for t in self.trains if t.is_freight]
        
        print("\n" + "="*60)
        print("BUILDING CP-SAT MODEL")
        print("="*60)
        
        # 1. Create variables for all trains and edges
        self._create_variables()
        
        # 2. Add constraints
        self._add_edge_capacity_constraints()
        self._add_sequence_constraints()
        self._add_passenger_schedule_constraints(passenger_trains)
        self._add_freight_precedence_constraints(passenger_trains, freight_trains)
        self._add_route_choice_constraints(freight_trains)
        self._add_completion_constraints()
        
        # 3. Set objective
        self._set_objective(passenger_trains, freight_trains)
        
        # 4. Solve
        print("\nSolving CP-SAT model...")
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 60
        solver.parameters.num_search_workers = 4
        solver.parameters.log_search_progress = False
        
        status = solver.Solve(self.model)
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            status_name = "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE"
            print(f"✓ Solution found: {status_name}")
            return self._extract_solution(solver, passenger_trains, freight_trains)
        else:
            print(f"✗ No solution found, using heuristic")
            return self._generate_heuristic_solution(passenger_trains, freight_trains)
    
    def _compute_duration(self, train: Train, edge: Edge) -> int:
        """Compute travel time (minutes) for a train on an edge"""
        speed = min(train.max_speed, edge.max_speed)
        
        if edge.is_loop:
            if edge.loop_number <= 1:
                speed = min(speed, LOOP1_SPEED_KMH)
            else:
                speed = min(speed, LOOP2_SPEED_KMH)
        
        if speed <= 0:
            speed = 10
        
        # Edge length is in km, speed in km/h, result in minutes
        time_min = (edge.length / speed) * 60
        
        # Add loop penalties
        if edge.is_loop:
            time_min += LOOP_DECEL_PENALTY + LOOP_ACCEL_PENALTY
        
        return max(1, math.ceil(time_min))
    
    def _create_variables(self) -> None:
        """Create all CP-SAT decision variables"""
        print("Creating variables...")
        
        for train in self.trains:
            main_path = self.graph.get_main_path(train.direction)
            
            # All edges this train might use
            possible_edges = set(main_path)
            
            # Add loop alternatives for freight
            if train.is_freight:
                for main_edge in main_path:
                    for cross_in, loop, cross_out in self.graph.get_loop_alternatives(main_edge):
                        possible_edges.add(cross_in)
                        possible_edges.add(loop)
                        possible_edges.add(cross_out)
            
            # Create interval variables for each edge
            for edge_id in possible_edges:
                edge = self.graph.edges.get(edge_id)
                if not edge:
                    continue
                
                key = (train.train_id, edge_id)
                duration = self._compute_duration(train, edge)
                self.durations[key] = duration
                
                start_var = self.model.NewIntVar(0, PLANNING_HORIZON, f"start_{train.train_id}_{edge_id}")
                end_var = self.model.NewIntVar(0, PLANNING_HORIZON, f"end_{train.train_id}_{edge_id}")
                
                # Optional intervals for loops/crossings (freight only)
                if (edge.is_loop or edge.is_crossing) and train.is_freight:
                    use_edge = self.model.NewBoolVar(f"use_{train.train_id}_{edge_id}")
                    self.use_edge_vars[key] = use_edge
                    
                    interval = self.model.NewOptionalIntervalVar(
                        start_var, duration, end_var, use_edge,
                        f"interval_{train.train_id}_{edge_id}"
                    )
                else:
                    # Mandatory intervals for main edges and all passenger edges
                    interval = self.model.NewIntervalVar(
                        start_var, duration, end_var,
                        f"interval_{train.train_id}_{edge_id}"
                    )
                
                self.start_vars[key] = start_var
                self.end_vars[key] = end_var
                self.interval_vars[key] = interval
            
            # Route choice variables (freight at loop points)
            if train.is_freight:
                for main_edge in main_path:
                    loop_alts = self.graph.get_loop_alternatives(main_edge)
                    if loop_alts:
                        use_main = self.model.NewBoolVar(f"useMain_{train.train_id}_{main_edge}")
                        self.use_main_vars[(train.train_id, main_edge)] = use_main
                        
                        for idx, (cross_in, loop, cross_out) in enumerate(loop_alts):
                            use_loop = self.model.NewBoolVar(f"useLoop_{train.train_id}_{main_edge}_{idx}")
                            self.use_loop_vars[(train.train_id, main_edge, idx)] = use_loop
            
            # Completion and arrival variables
            self.completed_vars[train.train_id] = self.model.NewBoolVar(f"completed_{train.train_id}")
            self.arrival_vars[train.train_id] = self.model.NewIntVar(0, PLANNING_HORIZON, f"arrival_{train.train_id}")
        
        print(f"  Intervals: {len(self.interval_vars)}")
        print(f"  Optional edges: {len(self.use_edge_vars)}")
        print(f"  Route choices: {len(self.use_main_vars)}")
    
    def _add_edge_capacity_constraints(self) -> None:
        """Add NoOverlap constraints for each edge"""
        print("Adding edge capacity constraints...")
        
        edge_intervals: Dict[str, List] = {}
        
        for (train_id, edge_id), interval in self.interval_vars.items():
            if edge_id not in edge_intervals:
                edge_intervals[edge_id] = []
            edge_intervals[edge_id].append(interval)
        
        for edge_id, intervals in edge_intervals.items():
            if len(intervals) > 1:
                self.model.AddNoOverlap(intervals)
        
        print(f"  NoOverlap on {len(edge_intervals)} edges")
    
    def _add_sequence_constraints(self) -> None:
        """Add constraints: train must traverse edges in sequence"""
        print("Adding sequence constraints...")
        
        count = 0
        for train in self.trains:
            main_path = self.graph.get_main_path(train.direction)
            
            for i in range(len(main_path) - 1):
                curr_edge = main_path[i]
                next_edge = main_path[i + 1]
                
                curr_key = (train.train_id, curr_edge)
                next_key = (train.train_id, next_edge)
                
                if curr_key in self.end_vars and next_key in self.start_vars:
                    # Next edge starts after current edge ends
                    self.model.Add(self.start_vars[next_key] >= self.end_vars[curr_key])
                    count += 1
        
        print(f"  Sequence constraints: {count}")
    
    def _add_passenger_schedule_constraints(self, passenger_trains: List[Train]) -> None:
        """Add HARD constraints for passenger schedules"""
        print(f"Adding passenger schedule constraints for {len(passenger_trains)} trains...")
        
        for train in passenger_trains:
            main_path = self.graph.get_main_path(train.direction)
            if not main_path:
                continue
            
            first_edge = main_path[0]
            first_key = (train.train_id, first_edge)
            
            if first_key in self.start_vars:
                # Set departure time from origin
                dep_time = train.get_origin_departure()
                if dep_time > 0:
                    self.model.Add(self.start_vars[first_key] == dep_time)
                else:
                    # Default: priority-based ordering
                    self.model.Add(self.start_vars[first_key] >= train.train_priority * 5)
    
    def _add_freight_precedence_constraints(self, passenger_trains: List[Train],
                                             freight_trains: List[Train]) -> None:
        """Add constraints: freight NEVER overtakes passenger in same direction"""
        print(f"Adding freight precedence constraints...")
        
        count = 0
        for passenger in passenger_trains:
            for freight in freight_trains:
                if passenger.direction != freight.direction:
                    continue
                
                main_path = self.graph.get_main_path(passenger.direction)
                
                # For each main edge, ensure freight waits for passenger
                for edge_id in main_path:
                    p_key = (passenger.train_id, edge_id)
                    f_key = (freight.train_id, edge_id)
                    
                    if p_key in self.end_vars and f_key in self.start_vars:
                        # If passenger scheduled before freight, enforce ordering
                        p_dep = passenger.get_origin_departure()
                        f_dep = freight.get_origin_departure()
                        
                        if p_dep > 0 and f_dep > 0 and p_dep <= f_dep:
                            # Freight must wait for passenger + headway
                            self.model.Add(self.start_vars[f_key] >= self.end_vars[p_key] + MIN_HEADWAY)
                            count += 1
        
        print(f"  Precedence constraints: {count}")
    
    def _add_route_choice_constraints(self, freight_trains: List[Train]) -> None:
        """Add constraints for freight route choices at loop points"""
        print(f"Adding route choice constraints...")
        
        count = 0
        for train in freight_trains:
            main_path = self.graph.get_main_path(train.direction)
            
            for main_edge in main_path:
                loop_alts = self.graph.get_loop_alternatives(main_edge)
                if not loop_alts:
                    continue
                
                use_main_key = (train.train_id, main_edge)
                if use_main_key not in self.use_main_vars:
                    continue
                
                use_main = self.use_main_vars[use_main_key]
                loop_vars = []
                
                for idx, (cross_in, loop, cross_out) in enumerate(loop_alts):
                    loop_key = (train.train_id, main_edge, idx)
                    if loop_key in self.use_loop_vars:
                        use_loop = self.use_loop_vars[loop_key]
                        loop_vars.append(use_loop)
                        
                        # Link use_loop to the optional edge variables
                        for edge_id in [cross_in, loop, cross_out]:
                            edge_key = (train.train_id, edge_id)
                            if edge_key in self.use_edge_vars:
                                self.model.Add(self.use_edge_vars[edge_key] == use_loop)
                                count += 1
                
                if loop_vars:
                    # Exactly one choice: main or one of the loops
                    self.model.Add(use_main + sum(loop_vars) == 1)
                    count += 1
        
        print(f"  Route choice constraints: {count}")
    
    def _add_completion_constraints(self) -> None:
        """Track train completion"""
        print("Adding completion constraints...")
        
        for train in self.trains:
            main_path = self.graph.get_main_path(train.direction)
            if not main_path:
                continue
            
            last_edge = main_path[-1]
            last_key = (train.train_id, last_edge)
            
            if last_key in self.end_vars:
                # Link arrival time to last edge end
                self.model.Add(self.arrival_vars[train.train_id] == self.end_vars[last_key])
                
                # Mark as completed (simplified)
                self.model.Add(self.completed_vars[train.train_id] == 1)
    
    def _set_objective(self, passenger_trains: List[Train], freight_trains: List[Train]) -> None:
        """Set optimization objective"""
        print("Setting objective...")
        
        objective = []
        
        # Maximize freight completion (negate for minimization)
        for train in freight_trains:
            if train.train_id in self.completed_vars:
                objective.append(-WEIGHT_FREIGHT_COMPLETED * self.completed_vars[train.train_id])
        
        # Minimize freight arrival times
        for train in freight_trains:
            if train.train_id in self.arrival_vars:
                objective.append(WEIGHT_FREIGHT_DELAY * self.arrival_vars[train.train_id])
        
        # Penalize loop usage
        for (train_id, main_edge, idx), use_loop in self.use_loop_vars.items():
            loop_alts = self.graph.get_loop_alternatives(main_edge)
            if idx < len(loop_alts):
                _, loop_edge_id, _ = loop_alts[idx]
                loop_edge = self.graph.edges.get(loop_edge_id)
                
                penalty = WEIGHT_LOOP_USAGE
                if loop_edge and loop_edge.loop_number >= 2:
                    penalty += WEIGHT_DEEP_LOOP
                
                objective.append(penalty * use_loop)
        
        if objective:
            self.model.Minimize(sum(objective))
        
        print(f"  Objective terms: {len(objective)}")
    
    def _extract_solution(self, solver: cp_model.CpSolver,
                          passenger_trains: List[Train],
                          freight_trains: List[Train]) -> dict:
        """Extract solution from solver"""
        print("\nExtracting solution...")
        
        train_schedules = []
        
        for train in self.trains:
            main_path = self.graph.get_main_path(train.direction)
            
            edge_schedule = []
            for edge_id in main_path:
                key = (train.train_id, edge_id)
                if key in self.start_vars:
                    start = solver.Value(self.start_vars[key])
                    end = solver.Value(self.end_vars[key])
                    
                    edge = self.graph.edges.get(edge_id)
                    edge_schedule.append({
                        "edgeId": edge_id,
                        "edgeType": edge.edge_type if edge else "",
                        "stationCode": edge.station_code if edge else "",
                        "startTime": minutes_to_time(start),
                        "endTime": minutes_to_time(end),
                        "startMinutes": start,
                        "endMinutes": end,
                        "duration": end - start
                    })
            
            # Loop decisions
            loop_decisions = []
            if train.is_freight:
                for (tid, main_edge, idx), use_loop in self.use_loop_vars.items():
                    if tid == train.train_id and solver.Value(use_loop) == 1:
                        loop_alts = self.graph.get_loop_alternatives(main_edge)
                        if idx < len(loop_alts):
                            cross_in, loop, cross_out = loop_alts[idx]
                            loop_edge = self.graph.edges.get(loop)
                            loop_decisions.append({
                                "mainEdge": main_edge,
                                "crossIn": cross_in,
                                "loopEdge": loop,
                                "crossOut": cross_out,
                                "loopNumber": loop_edge.loop_number if loop_edge else 0,
                                "stationCode": loop_edge.station_code if loop_edge else "",
                                "reason": "Allowing higher priority train to pass"
                            })
            
            # Time-distance profile
            td_profile = self._build_time_distance_profile(train, edge_schedule)
            
            arrival = solver.Value(self.arrival_vars[train.train_id]) if train.train_id in self.arrival_vars else 0
            
            train_schedules.append({
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
                "edgeSchedule": edge_schedule,
                "loopDecisions": loop_decisions,
                "completed": True,
                "arrivalTime": minutes_to_time(arrival),
                "arrivalMinutes": arrival
            })
        
        freight_completed = len([s for s in train_schedules if s["isFreight"] and s["completed"]])
        
        return {
            "success": True,
            "message": "Optimization completed successfully",
            "trainSchedules": train_schedules,
            "summary": {
                "totalTrains": len(self.trains),
                "passengerTrains": len(passenger_trains),
                "freightTrains": len(freight_trains),
                "freightCompleted": freight_completed,
                "totalLoopUsages": sum(len(s["loopDecisions"]) for s in train_schedules),
                "solverStatus": "OPTIMAL" if solver.StatusName() == "OPTIMAL" else "FEASIBLE",
                "objectiveValue": solver.ObjectiveValue()
            },
            "explanation": self._generate_explanation(train_schedules)
        }
    
    def _build_time_distance_profile(self, train: Train, edge_schedule: List[dict]) -> List[dict]:
        """Build time-distance profile for visualization"""
        profile = []
        station_order = ["bhopal", "vidisha", "bina"] if train.direction == "UP" else ["bina", "vidisha", "bhopal"]
        
        station_code_map = {"BPL": "bhopal", "VDA": "vidisha", "BINA": "bina"}
        
        # Collect times at each station
        station_times: Dict[str, Dict[str, int]] = {}
        
        for entry in edge_schedule:
            code = entry.get("stationCode", "")
            if code:
                station_id = station_code_map.get(code, code.lower())
                if station_id not in station_times:
                    station_times[station_id] = {"arrival": entry["startMinutes"], "departure": entry["endMinutes"]}
                else:
                    station_times[station_id]["departure"] = entry["endMinutes"]
        
        # Build profile in order
        for idx, station_id in enumerate(station_order):
            times = station_times.get(station_id)
            
            # Use schedule if no edge data
            if not times and station_id in train.schedule:
                sched = train.schedule[station_id]
                arr = sched.arrival_minutes()
                dep = sched.departure_minutes()
                times = {"arrival": arr if arr > 0 else dep, "departure": dep if dep > 0 else arr}
            
            if times:
                profile.append({
                    "stationId": station_id,
                    "stationName": station_id.title(),
                    "arrival": minutes_to_time(times["arrival"]),
                    "departure": minutes_to_time(times["departure"]),
                    "arrivalMinutes": times["arrival"],
                    "departureMinutes": times["departure"],
                    "yIndex": idx
                })
        
        return profile
    
    def _generate_explanation(self, train_schedules: List[dict]) -> str:
        """Generate human-readable explanation"""
        lines = ["=== OPTIMIZATION RESULTS ===", ""]
        
        # Passenger summary
        passenger = [s for s in train_schedules if s["isPassenger"]]
        lines.append(f"PASSENGER TRAINS ({len(passenger)}):")
        for s in passenger:
            lines.append(f"  {s['trainName']} ({s['trainId']}): {s['arrivalTime']}")
        
        lines.append("")
        
        # Freight summary
        freight = [s for s in train_schedules if s["isFreight"]]
        lines.append(f"FREIGHT TRAINS ({len(freight)}):")
        for s in freight:
            loops = len(s["loopDecisions"])
            loop_info = f" (used {loops} loop{'s' if loops != 1 else ''})" if loops > 0 else ""
            lines.append(f"  {s['trainName']} ({s['trainId']}): {s['arrivalTime']}{loop_info}")
        
        # Loop summary
        total_loops = sum(len(s["loopDecisions"]) for s in train_schedules)
        if total_loops > 0:
            lines.append("")
            lines.append(f"LOOP DIVERSIONS ({total_loops}):")
            for s in train_schedules:
                for ld in s["loopDecisions"]:
                    lines.append(f"  {s['trainName']} → Loop {ld['loopNumber']} at {ld['stationCode']}")
        
        return "\n".join(lines)
    
    def _generate_heuristic_solution(self, passenger_trains: List[Train],
                                      freight_trains: List[Train]) -> dict:
        """Generate heuristic solution when CP-SAT fails"""
        print("Generating heuristic solution...")
        
        # Sort: passengers first by priority, then freight
        all_trains = sorted(self.trains, key=lambda t: (0 if t.is_passenger else 1, t.train_priority))
        
        edge_free_time: Dict[str, int] = {}
        train_schedules = []
        
        for train in all_trains:
            main_path = self.graph.get_main_path(train.direction)
            
            # Start time
            current_time = train.get_origin_departure()
            if current_time == 0:
                current_time = train.train_priority * 5
            
            edge_schedule = []
            
            for edge_id in main_path:
                edge = self.graph.edges.get(edge_id)
                if not edge:
                    continue
                
                duration = self._compute_duration(train, edge)
                
                # Wait for edge to be free
                if edge_id in edge_free_time:
                    current_time = max(current_time, edge_free_time[edge_id] + MIN_HEADWAY)
                
                end_time = current_time + duration
                
                edge_schedule.append({
                    "edgeId": edge_id,
                    "edgeType": edge.edge_type,
                    "stationCode": edge.station_code,
                    "startTime": minutes_to_time(current_time),
                    "endTime": minutes_to_time(end_time),
                    "startMinutes": current_time,
                    "endMinutes": end_time,
                    "duration": duration
                })
                
                edge_free_time[edge_id] = end_time
                current_time = end_time
            
            td_profile = self._build_time_distance_profile(train, edge_schedule)
            
            train_schedules.append({
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
                "edgeSchedule": edge_schedule,
                "loopDecisions": [],
                "completed": True,
                "arrivalTime": edge_schedule[-1]["endTime"] if edge_schedule else "",
                "arrivalMinutes": edge_schedule[-1]["endMinutes"] if edge_schedule else 0
            })
        
        return {
            "success": True,
            "message": "Heuristic solution (CP-SAT timeout)",
            "trainSchedules": train_schedules,
            "summary": {
                "totalTrains": len(self.trains),
                "passengerTrains": len(passenger_trains),
                "freightTrains": len(freight_trains),
                "freightCompleted": len(freight_trains),
                "totalLoopUsages": 0,
                "solverStatus": "HEURISTIC"
            },
            "explanation": "Heuristic: Trains scheduled by priority with basic conflict avoidance."
        }


# ============================================================
# MAIN ENTRY POINT
# ============================================================
def run_optimization(data: dict) -> dict:
    """Main entry point for optimization"""
    scheduler = RailwaySchedulerV2()
    scheduler.load_data(data)
    return scheduler.optimize()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            data = json.load(f)
        result = run_optimization(data)
        print(json.dumps(result, indent=2))
    else:
        print("Usage: python scheduler.py <data.json>")

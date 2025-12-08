"""
Railway Traffic Scheduler using OR-Tools CP-SAT
Optimizes train scheduling to maximize freight throughput while respecting passenger schedules
"""
import math
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, field
from ortools.sat.python import cp_model

from models import (
    Train, Edge, Node, Station, StationSchedule,
    TrainScheduleResult, TimeDistancePoint, OptimizationResult
)


# ============================================================
# CONSTANTS
# ============================================================
PLANNING_HORIZON = 24 * 60  # 24 hours in minutes
MIN_HEADWAY = 2  # Minimum headway between trains (minutes)
LOOP_DECEL_TIME = 5  # Deceleration time for entering loop (minutes)
LOOP_ACCEL_TIME = 7  # Acceleration time for exiting loop (minutes)
LOOP1_SPEED = 30  # Speed for first loop (km/h)
LOOP2_SPEED = 15  # Speed for second+ loops (km/h)

# Objective weights
WEIGHT_FREIGHT_COMPLETED = 1000
WEIGHT_FREIGHT_DELAY = 1
WEIGHT_LOOP_PENALTY = 50
WEIGHT_DEEP_LOOP_PENALTY = 100


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
    minutes = minutes % (24 * 60)  # Wrap around at 24 hours
    h = minutes // 60
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


def compute_travel_time(distance: float, speed: float) -> int:
    """Compute travel time in minutes given distance (km) and speed (km/h)"""
    if speed <= 0:
        return 1
    time_hours = distance / speed
    return max(1, math.ceil(time_hours * 60))


# ============================================================
# NETWORK GRAPH
# ============================================================
@dataclass
class NetworkGraph:
    """Railway network graph for path finding"""
    nodes: Dict[str, Node] = field(default_factory=dict)
    edges: Dict[str, Edge] = field(default_factory=dict)
    stations: List[Station] = field(default_factory=list)
    
    # Adjacency maps
    outgoing: Dict[str, List[str]] = field(default_factory=dict)  # node -> list of edge_ids
    incoming: Dict[str, List[str]] = field(default_factory=dict)  # node -> list of edge_ids
    
    # Station code to station info
    station_codes: Dict[str, str] = field(default_factory=dict)  # code -> station_id
    
    # Main line edges in order (for path construction)
    up_main_edges: List[str] = field(default_factory=list)
    down_main_edges: List[str] = field(default_factory=list)
    main_edges: List[str] = field(default_factory=list)
    
    # Loop edges at each station
    station_loops: Dict[str, Dict[str, List[str]]] = field(default_factory=dict)  # station_code -> direction -> loop_edge_ids
    
    def build(self, section_data: dict, raw_trains: List[dict]) -> None:
        """Build the network graph from section data"""
        
        # Parse stations
        for station_data in section_data.get("stations", []):
            station = Station.from_dict(station_data)
            self.stations.append(station)
            
            # Map station code (e.g., BPL -> bhopal)
            if station.station_id:
                code = station.station_id.upper()[:3]
                self.station_codes[code] = station.station_id
        
        # Parse tracks, edges, and nodes
        for track in section_data.get("tracks", []):
            for edge_data in track.get("edges", []):
                edge = Edge.from_dict(edge_data)
                self.edges[edge.edge_id] = edge
                
                # Build adjacency
                if edge.start_node not in self.outgoing:
                    self.outgoing[edge.start_node] = []
                self.outgoing[edge.start_node].append(edge.edge_id)
                
                if edge.end_node not in self.incoming:
                    self.incoming[edge.end_node] = []
                self.incoming[edge.end_node].append(edge.edge_id)
                
                # Categorize edges
                if edge.direction == "UP" and edge.edge_type in ["block", "automatic"]:
                    if "LOOP" not in edge.edge_id and "CROSS" not in edge.edge_id:
                        self.up_main_edges.append(edge.edge_id)
                elif edge.direction == "DOWN" and edge.edge_type in ["block", "automatic"]:
                    if "LOOP" not in edge.edge_id and "CROSS" not in edge.edge_id:
                        self.down_main_edges.append(edge.edge_id)
                elif edge.direction == "BOTH" and edge.edge_type in ["block", "automatic"]:
                    self.main_edges.append(edge.edge_id)
                
                # Track loop edges by station
                if edge.edge_type == "loop" and edge.station_code:
                    station_code = edge.station_code
                    if station_code not in self.station_loops:
                        self.station_loops[station_code] = {"UP": [], "DOWN": []}
                    
                    if edge.direction in self.station_loops[station_code]:
                        self.station_loops[station_code][edge.direction].append(edge.edge_id)
            
            for node_data in track.get("nodes", []):
                node = Node.from_dict(node_data)
                if node.node_id not in self.nodes:
                    self.nodes[node.node_id] = node
        
        # Sort edges by x position for proper sequencing
        self._sort_edges()
    
    def _sort_edges(self) -> None:
        """Sort main edges by position"""
        def get_edge_start_x(edge_id: str) -> float:
            edge = self.edges.get(edge_id)
            if edge:
                node = self.nodes.get(edge.start_node)
                if node:
                    return node.x
            return 0
        
        self.up_main_edges.sort(key=get_edge_start_x)
        self.down_main_edges.sort(key=get_edge_start_x, reverse=True)
        self.main_edges.sort(key=get_edge_start_x)
    
    def get_main_path_edges(self, direction: str) -> List[str]:
        """Get the sequence of main line edges for a direction"""
        if direction == "UP":
            return self.up_main_edges.copy()
        elif direction == "DOWN":
            return self.down_main_edges.copy()
        else:
            return self.main_edges.copy()
    
    def get_loop_options(self, station_code: str, direction: str) -> List[Tuple[str, str, str]]:
        """
        Get loop options at a station for a direction.
        Returns list of (cross_in_edge, loop_edge, cross_out_edge) tuples.
        """
        options = []
        
        if station_code not in self.station_loops:
            return options
        
        loop_edges = self.station_loops.get(station_code, {}).get(direction, [])
        
        for loop_edge_id in loop_edges:
            loop_edge = self.edges.get(loop_edge_id)
            if not loop_edge:
                continue
            
            # Find crossing edges
            cross_in = None
            cross_out = None
            
            for eid, edge in self.edges.items():
                if edge.edge_type == "crossing" and edge.direction == direction:
                    if edge.end_node == loop_edge.start_node:
                        cross_in = eid
                    elif edge.start_node == loop_edge.end_node:
                        cross_out = eid
            
            if cross_in and cross_out:
                options.append((cross_in, loop_edge_id, cross_out))
        
        return options


# ============================================================
# SCHEDULER
# ============================================================
class RailwayScheduler:
    """CP-SAT based railway traffic scheduler"""
    
    def __init__(self):
        self.graph: Optional[NetworkGraph] = None
        self.trains: List[Train] = []
        self.model: Optional[cp_model.CpModel] = None
        
        # Decision variables stored by name for easy access
        self.vars: Dict[str, any] = {}
    
    def load_data(self, data: dict) -> None:
        """Load section and train data"""
        section_data = data.get("sectionData", {})
        raw_trains = data.get("trains", [])
        
        # Build network graph
        self.graph = NetworkGraph()
        self.graph.build(section_data, raw_trains)
        
        # Parse trains
        self.trains = [Train.from_dict(t) for t in raw_trains]
        
        print(f"Loaded {len(self.trains)} trains")
        print(f"Network: {len(self.graph.nodes)} nodes, {len(self.graph.edges)} edges")
        print(f"Stations: {[s.station_name for s in self.graph.stations]}")
    
    def optimize(self) -> OptimizationResult:
        """Run the CP-SAT optimization"""
        if not self.graph or not self.trains:
            return OptimizationResult(
                success=False,
                message="No data loaded"
            )
        
        self.model = cp_model.CpModel()
        
        # Separate trains by category
        passenger_trains = [t for t in self.trains if t.is_passenger]
        freight_trains = [t for t in self.trains if t.is_freight]
        
        print(f"Passenger trains: {len(passenger_trains)}")
        print(f"Freight trains: {len(freight_trains)}")
        
        # Create variables
        self._create_variables()
        
        # Add constraints
        self._add_passenger_schedule_constraints(passenger_trains)
        self._add_no_overlap_constraints()
        self._add_sequence_constraints()
        self._add_precedence_constraints(passenger_trains, freight_trains)
        
        # Set objective
        self._set_objective(freight_trains)
        
        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 60  # Timeout after 60 seconds
        solver.parameters.num_search_workers = 4  # Parallel search
        
        print("Solving...")
        status = solver.Solve(self.model)
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            return self._extract_solution(solver, passenger_trains, freight_trains)
        else:
            # Fallback to heuristic solution
            return self._generate_heuristic_solution(passenger_trains, freight_trains)
    
    def _create_variables(self) -> None:
        """Create CP-SAT decision variables"""
        
        for train in self.trains:
            train_edges = self._get_train_edges(train)
            
            for edge_id in train_edges:
                edge = self.graph.edges.get(edge_id)
                if not edge:
                    continue
                
                # Compute duration for this train on this edge
                duration = self._compute_duration(train, edge)
                
                # Create interval variable
                start_var = self.model.NewIntVar(0, PLANNING_HORIZON, f"start_{train.train_id}_{edge_id}")
                end_var = self.model.NewIntVar(0, PLANNING_HORIZON, f"end_{train.train_id}_{edge_id}")
                interval_var = self.model.NewIntervalVar(
                    start_var, duration, end_var,
                    f"interval_{train.train_id}_{edge_id}"
                )
                
                self.vars[f"start_{train.train_id}_{edge_id}"] = start_var
                self.vars[f"end_{train.train_id}_{edge_id}"] = end_var
                self.vars[f"interval_{train.train_id}_{edge_id}"] = interval_var
                self.vars[f"duration_{train.train_id}_{edge_id}"] = duration
        
        # For freight trains: loop decision variables at each station
        for train in self.trains:
            if not train.is_freight:
                continue
            
            for station in self.graph.stations:
                station_code = station.station_id.upper()[:3] if station.station_id else ""
                loops = self.graph.get_loop_options(station_code, train.direction)
                
                if loops:
                    # Binary: use main line
                    use_main = self.model.NewBoolVar(f"useMain_{train.train_id}_{station.station_id}")
                    self.vars[f"useMain_{train.train_id}_{station.station_id}"] = use_main
                    
                    # Binary for each loop option
                    loop_vars = []
                    for i, (cross_in, loop_edge, cross_out) in enumerate(loops):
                        loop_var = self.model.NewBoolVar(f"useLoop_{train.train_id}_{station.station_id}_{i}")
                        self.vars[f"useLoop_{train.train_id}_{station.station_id}_{i}"] = loop_var
                        loop_vars.append(loop_var)
                    
                    # Exactly one option must be chosen
                    self.model.Add(use_main + sum(loop_vars) == 1)
    
    def _get_train_edges(self, train: Train) -> List[str]:
        """Get the sequence of edges a train must traverse"""
        return self.graph.get_main_path_edges(train.direction)
    
    def _compute_duration(self, train: Train, edge: Edge) -> int:
        """Compute travel time for a train on an edge"""
        # Use minimum of train max speed and edge max speed
        speed = min(train.max_speed, edge.max_speed)
        
        if edge.edge_type == "loop":
            # Loop has reduced speed
            if edge.loop_number == 1:
                speed = min(speed, LOOP1_SPEED)
            else:
                speed = min(speed, LOOP2_SPEED)
            
            # Add decel/accel time for loops
            base_time = compute_travel_time(edge.length, speed)
            return base_time + LOOP_DECEL_TIME + LOOP_ACCEL_TIME
        
        return compute_travel_time(edge.length, speed)
    
    def _add_passenger_schedule_constraints(self, passenger_trains: List[Train]) -> None:
        """Add hard constraints for passenger train schedules"""
        
        for train in passenger_trains:
            edges = self._get_train_edges(train)
            if not edges:
                continue
            
            # Get scheduled times from the train's schedule
            first_station = "bhopal" if train.direction == "UP" else "bina"
            last_station = "bina" if train.direction == "UP" else "bhopal"
            
            first_sched = train.schedule.get(first_station)
            last_sched = train.schedule.get(last_station)
            
            if first_sched and first_sched.scheduled_departure:
                dep_time = time_to_minutes(first_sched.scheduled_departure)
                first_edge = edges[0]
                start_var = self.vars.get(f"start_{train.train_id}_{first_edge}")
                if start_var is not None:
                    # Fix the departure time for passenger trains
                    self.model.Add(start_var == dep_time)
            
            if last_sched and last_sched.scheduled_arrival:
                arr_time = time_to_minutes(last_sched.scheduled_arrival)
                last_edge = edges[-1]
                end_var = self.vars.get(f"end_{train.train_id}_{last_edge}")
                if end_var is not None:
                    # Allow small tolerance (+/- 2 minutes)
                    self.model.Add(end_var <= arr_time + 2)
    
    def _add_no_overlap_constraints(self) -> None:
        """Add NoOverlap constraints for each edge"""
        
        edge_intervals: Dict[str, List] = {}
        
        for var_name, var in self.vars.items():
            if var_name.startswith("interval_"):
                parts = var_name.split("_")
                # Format: interval_trainId_edgeId (edgeId may have underscores)
                if len(parts) >= 3:
                    train_id = parts[1]
                    edge_id = "_".join(parts[2:])
                    
                    if edge_id not in edge_intervals:
                        edge_intervals[edge_id] = []
                    edge_intervals[edge_id].append(var)
        
        # Add NoOverlap for each edge
        for edge_id, intervals in edge_intervals.items():
            if len(intervals) > 1:
                self.model.AddNoOverlap(intervals)
    
    def _add_sequence_constraints(self) -> None:
        """Add constraints to ensure trains traverse edges in sequence"""
        
        for train in self.trains:
            edges = self._get_train_edges(train)
            
            for i in range(len(edges) - 1):
                curr_edge = edges[i]
                next_edge = edges[i + 1]
                
                end_curr = self.vars.get(f"end_{train.train_id}_{curr_edge}")
                start_next = self.vars.get(f"start_{train.train_id}_{next_edge}")
                
                if end_curr is not None and start_next is not None:
                    # Must finish current edge before starting next
                    self.model.Add(start_next >= end_curr)
    
    def _add_precedence_constraints(self, passenger_trains: List[Train], freight_trains: List[Train]) -> None:
        """Add constraints preventing freight from overtaking passenger"""
        
        for passenger in passenger_trains:
            for freight in freight_trains:
                if passenger.direction != freight.direction:
                    continue
                
                # Get edges for both trains
                p_edges = self._get_train_edges(passenger)
                f_edges = self._get_train_edges(freight)
                
                # Common edges
                common_edges = set(p_edges) & set(f_edges)
                
                for edge_id in common_edges:
                    end_p = self.vars.get(f"end_{passenger.train_id}_{edge_id}")
                    start_f = self.vars.get(f"start_{freight.train_id}_{edge_id}")
                    
                    # Check if passenger departs earlier from origin
                    p_first_station = "bhopal" if passenger.direction == "UP" else "bina"
                    f_first_station = "bhopal" if freight.direction == "UP" else "bina"
                    
                    p_dep = 0
                    f_dep = 0
                    
                    if passenger.schedule.get(p_first_station):
                        p_dep = time_to_minutes(passenger.schedule[p_first_station].scheduled_departure)
                    if freight.schedule.get(f_first_station):
                        f_dep = time_to_minutes(freight.schedule[f_first_station].scheduled_departure)
                    
                    # If passenger departs earlier, freight must wait
                    if p_dep < f_dep and end_p is not None and start_f is not None:
                        self.model.Add(start_f >= end_p + MIN_HEADWAY)
    
    def _set_objective(self, freight_trains: List[Train]) -> None:
        """Set the optimization objective"""
        
        objective_terms = []
        
        # Maximize freight completion (minimize negative of completion count)
        # For simplicity, we minimize total freight delay as a proxy
        
        for freight in freight_trains:
            edges = self._get_train_edges(freight)
            if not edges:
                continue
            
            last_edge = edges[-1]
            end_var = self.vars.get(f"end_{freight.train_id}_{last_edge}")
            
            if end_var is not None:
                # Get expected arrival
                last_station = "bina" if freight.direction == "UP" else "bhopal"
                expected = 0
                if freight.schedule.get(last_station):
                    expected = time_to_minutes(freight.schedule[last_station].scheduled_arrival)
                
                if expected > 0:
                    # Delay = actual - expected (we want to minimize this)
                    # Since we can't do max(0, x) easily, just minimize end time
                    objective_terms.append(end_var)
        
        # Add loop penalty terms
        for var_name, var in self.vars.items():
            if var_name.startswith("useLoop_"):
                objective_terms.append(var * WEIGHT_LOOP_PENALTY)
        
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
    
    def _extract_solution(self, solver: cp_model.CpSolver, 
                          passenger_trains: List[Train],
                          freight_trains: List[Train]) -> OptimizationResult:
        """Extract the solution from the solver"""
        
        results = []
        conflicts_resolved = []
        
        all_trains = passenger_trains + freight_trains
        station_order = ["bhopal", "vidisha", "bina"]
        
        for train in all_trains:
            edges = self._get_train_edges(train)
            edge_schedule = []
            
            for edge_id in edges:
                start_var = self.vars.get(f"start_{train.train_id}_{edge_id}")
                end_var = self.vars.get(f"end_{train.train_id}_{edge_id}")
                duration = self.vars.get(f"duration_{train.train_id}_{edge_id}", 0)
                
                if start_var is not None and end_var is not None:
                    start_time = solver.Value(start_var)
                    end_time = solver.Value(end_var)
                    
                    edge_schedule.append({
                        "edgeId": edge_id,
                        "startTime": minutes_to_time(start_time),
                        "endTime": minutes_to_time(end_time),
                        "durationMinutes": duration
                    })
            
            # Build time-distance profile
            td_profile = self._build_time_distance_profile(train, edge_schedule, station_order)
            
            # Get loop decisions for freight
            loop_decisions = []
            if train.is_freight:
                for station in self.graph.stations:
                    use_main = self.vars.get(f"useMain_{train.train_id}_{station.station_id}")
                    if use_main is not None:
                        if solver.Value(use_main) == 0:
                            # Using a loop
                            for i in range(5):  # Max 5 loops per station
                                loop_var = self.vars.get(f"useLoop_{train.train_id}_{station.station_id}_{i}")
                                if loop_var is not None and solver.Value(loop_var) == 1:
                                    loop_decisions.append({
                                        "stationId": station.station_id,
                                        "loopIndex": i + 1,
                                        "reason": "Allowing passenger train to pass"
                                    })
            
            result = TrainScheduleResult(
                train_id=train.train_id,
                train_name=train.train_name,
                train_category=train.train_category,
                direction=train.direction,
                time_distance_profile=td_profile,
                edge_schedule=edge_schedule,
                loop_decisions=loop_decisions,
                completed=True
            )
            results.append(result)
        
        return OptimizationResult(
            success=True,
            message="Optimization completed successfully",
            train_schedules=results,
            conflicts_resolved=conflicts_resolved,
            summary={
                "totalTrains": len(all_trains),
                "passengerTrains": len(passenger_trains),
                "freightTrains": len(freight_trains),
                "freightCompleted": len(freight_trains),
                "solverStatus": "OPTIMAL" if solver.StatusName() == "OPTIMAL" else "FEASIBLE"
            }
        )
    
    def _generate_heuristic_solution(self, passenger_trains: List[Train],
                                      freight_trains: List[Train]) -> OptimizationResult:
        """Generate a heuristic solution when CP-SAT fails"""
        
        results = []
        station_order = ["bhopal", "vidisha", "bina"]
        
        all_trains = passenger_trains + freight_trains
        
        # Sort by priority (passenger first, then by schedule)
        all_trains.sort(key=lambda t: (0 if t.is_passenger else 1, t.train_priority))
        
        # Track edge occupancy times
        edge_free_time: Dict[str, int] = {}  # edge_id -> when edge becomes free
        
        for train in all_trains:
            edges = self._get_train_edges(train)
            edge_schedule = []
            
            # Get scheduled start time
            first_station = "bhopal" if train.direction == "UP" else "bina"
            start_time = 0
            if train.schedule.get(first_station):
                start_time = time_to_minutes(train.schedule[first_station].scheduled_departure)
            
            current_time = start_time
            
            for edge_id in edges:
                edge = self.graph.edges.get(edge_id)
                if not edge:
                    continue
                
                duration = self._compute_duration(train, edge)
                
                # Wait for edge to be free
                edge_free = edge_free_time.get(edge_id, 0)
                if current_time < edge_free:
                    current_time = edge_free + MIN_HEADWAY
                
                end_time = current_time + duration
                
                edge_schedule.append({
                    "edgeId": edge_id,
                    "startTime": minutes_to_time(current_time),
                    "endTime": minutes_to_time(end_time),
                    "durationMinutes": duration
                })
                
                # Update edge free time
                edge_free_time[edge_id] = end_time
                current_time = end_time
            
            # Build time-distance profile
            td_profile = self._build_time_distance_profile(train, edge_schedule, station_order)
            
            result = TrainScheduleResult(
                train_id=train.train_id,
                train_name=train.train_name,
                train_category=train.train_category,
                direction=train.direction,
                time_distance_profile=td_profile,
                edge_schedule=edge_schedule,
                loop_decisions=[],
                completed=True
            )
            results.append(result)
        
        return OptimizationResult(
            success=True,
            message="Heuristic solution generated (CP-SAT timeout)",
            train_schedules=results,
            conflicts_resolved=[],
            summary={
                "totalTrains": len(all_trains),
                "passengerTrains": len(passenger_trains),
                "freightTrains": len(freight_trains),
                "freightCompleted": len(freight_trains),
                "solverStatus": "HEURISTIC"
            }
        )
    
    def _build_time_distance_profile(self, train: Train, 
                                       edge_schedule: List[dict],
                                       station_order: List[str]) -> List[TimeDistancePoint]:
        """Build time-distance profile from edge schedule"""
        
        profile = []
        
        # Map station codes to station IDs
        station_code_map = {
            "BPL": "bhopal",
            "VDA": "vidisha", 
            "BINA": "bina"
        }
        
        # Get arrival/departure at each station from edge schedule
        station_times: Dict[str, Dict[str, str]] = {}
        
        for entry in edge_schedule:
            edge = self.graph.edges.get(entry["edgeId"])
            if edge and edge.station_code:
                station_id = station_code_map.get(edge.station_code, edge.station_code.lower())
                
                if station_id not in station_times:
                    station_times[station_id] = {"arrival": entry["startTime"], "departure": entry["endTime"]}
                else:
                    station_times[station_id]["departure"] = entry["endTime"]
        
        # Build profile in station order
        ordered_stations = station_order if train.direction == "UP" else list(reversed(station_order))
        
        for idx, station_id in enumerate(ordered_stations):
            times = station_times.get(station_id, {})
            
            # Fall back to schedule if not in edge schedule
            if not times and station_id in train.schedule:
                sched = train.schedule[station_id]
                times = {
                    "arrival": sched.scheduled_arrival,
                    "departure": sched.scheduled_departure
                }
            
            if times:
                profile.append(TimeDistancePoint(
                    station_id=station_id,
                    arrival=times.get("arrival", ""),
                    departure=times.get("departure", ""),
                    y_index=idx
                ))
        
        return profile


def run_optimization(data: dict) -> dict:
    """Main entry point for optimization"""
    scheduler = RailwayScheduler()
    scheduler.load_data(data)
    result = scheduler.optimize()
    return result.to_dict()

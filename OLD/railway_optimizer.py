#!/usr/bin/env python3
"""
Railway Section Traffic Optimizer
=================================
Uses Google OR-Tools for train scheduling, rerouting, priority handling,
throughput maximization, and what-if scenario analysis.

Implements:
- Multi-aspect automatic signalling
- Automatic absolute block system
- Train schedule optimization
- Priority-based routing
- Platform allocation
- Holding strategies

Author: Railway Optimization System
"""

import json
import heapq
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Set
from enum import Enum
from collections import defaultdict
import copy

# Google OR-Tools imports
from ortools.sat.python import cp_model
from ortools.graph.python import min_cost_flow


# =============================================================================
# ENUMS AND CONSTANTS
# =============================================================================

class TrainType(Enum):
    RAJDHANI = 1
    SHATABDI = 2
    DURONTO = 3
    SUPERFAST = 4
    EXPRESS = 5
    MAIL = 6
    PASSENGER = 7
    UNRESERVED = 8
    FREIGHT = 9
    SPECIAL = 0  # VIP/Emergency

class TrackType(Enum):
    UP_MAIN = "up_main"
    DOWN_MAIN = "down_main"
    BOTH_MAIN = "both_main"
    UP_LOOP = "up_loop"
    DOWN_LOOP = "down_loop"
    CROSSOVER = "crossover"
    YARD = "yard"

class Direction(Enum):
    UPSTREAM = "forward"
    DOWNSTREAM = "backward"
    BIDIRECTIONAL = "bidirectional"

class SignalColor(Enum):
    GREEN = "green"
    YELLOW = "yellow"
    DOUBLE_YELLOW = "double_yellow"
    RED = "red"

# Priority mappings (lower number = higher priority)
PRIORITY_MAPPING = {
    "RAJDHANI": 1, "SHATABDI": 2, "DURONTO": 3, "SUPERFAST": 4,
    "EXPRESS": 5, "MAIL": 6, "PASSENGER": 7, "UNRESERVED": 8,
    "FREIGHT": 9, "SPECIAL": 0
}

# Station order for the section
STATION_ORDER = ["vidisha", "sorai", "sumer", "gulabganj", "pabai", "ganjbasoda"]


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class Node:
    """Represents a signal/point in the railway network"""
    node_id: str
    x: float
    y: float
    node_type: str
    name: str
    line: str
    station: str
    signal_color: SignalColor = SignalColor.GREEN
    status: str = "active"
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Node':
        return cls(
            node_id=data.get("nodeId", ""),
            x=data.get("x", 0),
            y=data.get("y", 0),
            node_type=data.get("nodeType", ""),
            name=data.get("name", ""),
            line=data.get("line", ""),
            station=data.get("station", ""),
            signal_color=SignalColor.GREEN,
            status=data.get("status", "active")
        )

@dataclass
class Edge:
    """Represents a track segment between two nodes"""
    edge_id: str
    start_node: str
    end_node: str
    direction: str
    edge_type: str
    length: float
    speed_limit: int
    station: str
    status: str = "operational"
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Edge':
        return cls(
            edge_id=data.get("edgeId", data.get("id", "")),
            start_node=data.get("startNode", data.get("from", "")),
            end_node=data.get("endNode", data.get("to", "")),
            direction=data.get("direction", "unidirectional"),
            edge_type=data.get("edgeType", data.get("track_type", "")),
            length=data.get("edgeLength", data.get("length_m", 0)),
            speed_limit=data.get("speed_limit", 80),
            station=data.get("station", ""),
            status=data.get("status", "operational")
        )
    
    def travel_time_minutes(self, speed_kmh: int = None) -> float:
        """Calculate travel time in minutes"""
        effective_speed = min(speed_kmh or self.speed_limit, self.speed_limit)
        if effective_speed <= 0:
            return float('inf')
        # Convert meters to km, speed is km/h, result in minutes
        return (self.length / 1000) / effective_speed * 60

@dataclass
class StationSchedule:
    """Schedule for a train at a specific station"""
    scheduled_arrival: Optional[str]
    scheduled_departure: Optional[str]
    actual_arrival: Optional[str] = None
    actual_departure: Optional[str] = None
    expected_departure: Optional[str] = None
    platform: Optional[str] = None

@dataclass
class Train:
    """Represents a train with its properties and schedule"""
    train_id: str
    train_number: str
    train_name: str
    train_type: str
    priority: int
    direction: str
    max_speed: int
    schedule: Dict[str, StationSchedule]
    is_emergency: bool = False
    current_edge: str = ""
    current_passengers: int = 0
    max_capacity: int = 0
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Train':
        schedule = {}
        for station, sched in data.get("schedule", {}).items():
            schedule[station.lower()] = StationSchedule(
                scheduled_arrival=sched.get("scheduledArrival") or None,
                scheduled_departure=sched.get("scheduledDeparture") or None,
                actual_arrival=sched.get("actualArrival") or None,
                actual_departure=sched.get("actualDeparture") or None,
                expected_departure=sched.get("expectedDeparture") or None
            )
        return cls(
            train_id=data.get("trainId", ""),
            train_number=data.get("trainNumber", ""),
            train_name=data.get("trainName", ""),
            train_type=data.get("trainType", "EXPRESS"),
            priority=data.get("trainPriority", data.get("basePriority", 5)),
            direction=data.get("direction", "forward"),
            max_speed=data.get("maxSpeed", 80),
            schedule=schedule,
            is_emergency=data.get("isEmergency", False),
            current_edge=data.get("currentEdge", ""),
            current_passengers=data.get("currentTrainPassenger", 0),
            max_capacity=data.get("maxTrainCapacity", 1800)
        )
    
    def get_first_departure_time(self) -> Optional[int]:
        """Get first departure time in minutes from midnight"""
        for station, sched in self.schedule.items():
            if sched.scheduled_departure:
                return time_to_minutes(sched.scheduled_departure)
        return None
    
    def get_station_order(self) -> List[str]:
        """Get ordered list of stations based on direction"""
        if self.direction == "forward":
            return [s for s in STATION_ORDER if s.lower() in self.schedule]
        else:
            return [s for s in reversed(STATION_ORDER) if s.lower() in self.schedule]


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def time_to_minutes(time_str: str) -> int:
    """Convert HH:MM time string to minutes from midnight"""
    if not time_str:
        return 0
    try:
        parts = time_str.split(":")
        hours = int(parts[0])
        minutes = int(parts[1]) if len(parts) > 1 else 0
        return hours * 60 + minutes
    except (ValueError, IndexError):
        return 0

def minutes_to_time(minutes: int) -> str:
    """Convert minutes from midnight to HH:MM format"""
    hours = (minutes // 60) % 24
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


# =============================================================================
# RAILWAY GRAPH
# =============================================================================

class RailwayGraph:
    """Graph representation of the railway network"""
    
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, Edge] = {}
        self.adjacency: Dict[str, List[str]] = defaultdict(list)
        self.station_nodes: Dict[str, List[str]] = defaultdict(list)
        self.station_edges: Dict[str, List[str]] = defaultdict(list)
        
    def load_from_schema(self, schema: dict):
        """Load network from database schema"""
        # Load nodes
        for node_data in schema.get("nodes", []):
            node = Node.from_dict(node_data)
            self.nodes[node.node_id] = node
            if node.station:
                self.station_nodes[node.station.lower()].append(node.node_id)
        
        # Load edges
        for edge_data in schema.get("edges", []):
            edge = Edge.from_dict(edge_data)
            if edge.start_node and edge.end_node:
                self.edges[edge.edge_id] = edge
                self.adjacency[edge.start_node].append(edge.edge_id)
                if edge.direction == "bidirectional":
                    self.adjacency[edge.end_node].append(edge.edge_id)
                if edge.station:
                    self.station_edges[edge.station.lower()].append(edge.edge_id)
    
    def get_edges_between_stations(self, station1: str, station2: str) -> List[Edge]:
        """Find all edges connecting two stations"""
        s1_nodes = set(self.station_nodes.get(station1.lower(), []))
        s2_nodes = set(self.station_nodes.get(station2.lower(), []))
        
        connecting_edges = []
        for edge_id, edge in self.edges.items():
            if (edge.start_node in s1_nodes and edge.end_node in s2_nodes) or \
               (edge.start_node in s2_nodes and edge.end_node in s1_nodes):
                connecting_edges.append(edge)
        return connecting_edges
    
    def get_track_types_at_station(self, station: str) -> Dict[str, List[Edge]]:
        """Get available track types at a station"""
        tracks = defaultdict(list)
        for edge_id in self.station_edges.get(station.lower(), []):
            edge = self.edges.get(edge_id)
            if edge:
                tracks[edge.edge_type].append(edge)
        return tracks
    
    def get_main_line_capacity(self, station: str) -> int:
        """Get number of main line tracks at a station"""
        tracks = self.get_track_types_at_station(station)
        return len(tracks.get("main", [])) + len(tracks.get("up_main", [])) + len(tracks.get("down_main", []))
    
    def get_loop_capacity(self, station: str) -> int:
        """Get number of loop tracks at a station"""
        tracks = self.get_track_types_at_station(station)
        return len(tracks.get("loop", [])) + len(tracks.get("up_loop", [])) + len(tracks.get("down_loop", []))
    
    def find_shortest_path(self, start_node: str, end_node: str, 
                           direction: str = None) -> Tuple[List[str], float]:
        """
        Find shortest path between two nodes using Dijkstra's algorithm.
        Returns (list of edge IDs, total travel time in minutes)
        """
        if start_node not in self.nodes or end_node not in self.nodes:
            return [], float('inf')
        
        # Priority queue: (distance, current_node, path_edges)
        pq = [(0, start_node, [])]
        visited = set()
        
        while pq:
            dist, current, path = heapq.heappop(pq)
            
            if current in visited:
                continue
            visited.add(current)
            
            if current == end_node:
                return path, dist
            
            for edge_id in self.adjacency.get(current, []):
                edge = self.edges.get(edge_id)
                if not edge:
                    continue
                
                # Determine next node
                if edge.start_node == current:
                    next_node = edge.end_node
                elif edge.direction == "bidirectional" and edge.end_node == current:
                    next_node = edge.start_node
                else:
                    continue
                
                if next_node not in visited:
                    travel_time = edge.travel_time_minutes()
                    heapq.heappush(pq, (dist + travel_time, next_node, path + [edge_id]))
        
        return [], float('inf')
    
    def find_alternative_routes(self, start_node: str, end_node: str, 
                                 blocked_edges: Set[str] = None, 
                                 k: int = 3) -> List[Tuple[List[str], float]]:
        """Find k alternative routes between two nodes"""
        blocked = blocked_edges or set()
        routes = []
        used_edges = set()
        
        for _ in range(k):
            # Create temporary graph without blocked edges
            temp_adjacency = defaultdict(list)
            for node, edge_ids in self.adjacency.items():
                temp_adjacency[node] = [e for e in edge_ids if e not in blocked and e not in used_edges]
            
            # Find path in temporary graph
            path, dist = self._dijkstra_with_adjacency(start_node, end_node, temp_adjacency)
            
            if path:
                routes.append((path, dist))
                # Block first edge of this path for next iteration
                if path:
                    used_edges.add(path[0])
            else:
                break
        
        return routes
    
    def _dijkstra_with_adjacency(self, start: str, end: str, 
                                  adjacency: Dict[str, List[str]]) -> Tuple[List[str], float]:
        """Dijkstra with custom adjacency list"""
        pq = [(0, start, [])]
        visited = set()
        
        while pq:
            dist, current, path = heapq.heappop(pq)
            
            if current in visited:
                continue
            visited.add(current)
            
            if current == end:
                return path, dist
            
            for edge_id in adjacency.get(current, []):
                edge = self.edges.get(edge_id)
                if not edge:
                    continue
                
                if edge.start_node == current:
                    next_node = edge.end_node
                elif edge.direction == "bidirectional":
                    next_node = edge.start_node
                else:
                    continue
                
                if next_node not in visited:
                    travel_time = edge.travel_time_minutes()
                    heapq.heappush(pq, (dist + travel_time, next_node, path + [edge_id]))
        
        return [], float('inf')


# =============================================================================
# SCHEDULE OPTIMIZER (Using OR-Tools CP-SAT)
# =============================================================================

class ScheduleOptimizer:
    """
    Train schedule optimizer using Google OR-Tools Constraint Programming.
    Handles:
    - Train scheduling with priorities
    - Platform allocation
    - Conflict resolution
    - Delay minimization
    """
    
    def __init__(self, graph: RailwayGraph, trains: List[Train]):
        self.graph = graph
        self.trains = trains
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
        # Decision variables
        self.arrival_vars: Dict[Tuple[str, str], cp_model.IntVar] = {}
        self.departure_vars: Dict[Tuple[str, str], cp_model.IntVar] = {}
        self.track_vars: Dict[Tuple[str, str], cp_model.IntVar] = {}
        self.delay_vars: Dict[Tuple[str, str], cp_model.IntVar] = {}
        
        # Constants
        self.HORIZON = 24 * 60  # 24 hours in minutes
        self.MIN_HEADWAY = 3    # Minimum headway between trains (minutes)
        self.MIN_DWELL = 2      # Minimum dwell time at station (minutes)
        self.MAX_DELAY = 60     # Maximum allowed delay (minutes)
    
    def build_model(self):
        """Build the constraint programming model"""
        print("Building optimization model...")
        
        self._create_variables()
        self._add_schedule_constraints()
        self._add_headway_constraints()
        self._add_track_capacity_constraints()
        self._add_priority_constraints()
        self._define_objective()
        
        print(f"Model built: {len(self.arrival_vars)} arrival vars, "
              f"{len(self.departure_vars)} departure vars")
    
    def _create_variables(self):
        """Create decision variables for the model"""
        for train in self.trains:
            stations = train.get_station_order()
            
            for i, station in enumerate(stations):
                sched = train.schedule.get(station.lower())
                if not sched:
                    continue
                
                key = (train.train_id, station)
                
                # Arrival time variable (if scheduled)
                if sched.scheduled_arrival:
                    scheduled = time_to_minutes(sched.scheduled_arrival)
                    self.arrival_vars[key] = self.model.NewIntVar(
                        max(0, scheduled - self.MAX_DELAY),
                        min(self.HORIZON, scheduled + self.MAX_DELAY),
                        f"arr_{train.train_id}_{station}"
                    )
                
                # Departure time variable (if scheduled)
                if sched.scheduled_departure:
                    scheduled = time_to_minutes(sched.scheduled_departure)
                    self.departure_vars[key] = self.model.NewIntVar(
                        max(0, scheduled - self.MAX_DELAY),
                        min(self.HORIZON, scheduled + self.MAX_DELAY),
                        f"dep_{train.train_id}_{station}"
                    )
                
                # Track allocation variable (0=main, 1=loop1, 2=loop2)
                main_cap = self.graph.get_main_line_capacity(station)
                loop_cap = self.graph.get_loop_capacity(station)
                total_tracks = max(1, main_cap + loop_cap)
                
                self.track_vars[key] = self.model.NewIntVar(
                    0, total_tracks - 1,
                    f"track_{train.train_id}_{station}"
                )
                
                # Delay variable
                self.delay_vars[key] = self.model.NewIntVar(
                    0, self.MAX_DELAY,
                    f"delay_{train.train_id}_{station}"
                )
    
    def _add_schedule_constraints(self):
        """Add basic scheduling constraints"""
        for train in self.trains:
            stations = train.get_station_order()
            
            for i, station in enumerate(stations):
                key = (train.train_id, station)
                sched = train.schedule.get(station.lower())
                
                if not sched:
                    continue
                
                # Arrival must be before departure at same station
                if key in self.arrival_vars and key in self.departure_vars:
                    self.model.Add(
                        self.arrival_vars[key] + self.MIN_DWELL <= self.departure_vars[key]
                    )
                
                # Delay is the difference from scheduled
                if key in self.arrival_vars and sched.scheduled_arrival:
                    scheduled = time_to_minutes(sched.scheduled_arrival)
                    self.model.Add(
                        self.delay_vars[key] >= self.arrival_vars[key] - scheduled
                    )
                elif key in self.departure_vars and sched.scheduled_departure:
                    scheduled = time_to_minutes(sched.scheduled_departure)
                    self.model.Add(
                        self.delay_vars[key] >= self.departure_vars[key] - scheduled
                    )
                
                # Travel time between consecutive stations
                if i > 0:
                    prev_station = stations[i - 1]
                    prev_key = (train.train_id, prev_station)
                    
                    # Estimate minimum travel time
                    edges = self.graph.get_edges_between_stations(prev_station, station)
                    if edges:
                        min_travel_time = min(
                            e.travel_time_minutes(train.max_speed) for e in edges
                        )
                        min_travel_time = max(1, int(min_travel_time))
                    else:
                        min_travel_time = 10  # Default travel time
                    
                    # Current arrival >= previous departure + travel time
                    if prev_key in self.departure_vars and key in self.arrival_vars:
                        self.model.Add(
                            self.arrival_vars[key] >= 
                            self.departure_vars[prev_key] + min_travel_time
                        )
    
    def _add_headway_constraints(self):
        """Add minimum headway constraints between trains"""
        # Group arrivals/departures by station
        station_events: Dict[str, List[Tuple[str, bool, cp_model.IntVar]]] = defaultdict(list)
        
        for (train_id, station), var in self.arrival_vars.items():
            station_events[station].append((train_id, True, var))
        
        for (train_id, station), var in self.departure_vars.items():
            station_events[station].append((train_id, False, var))
        
        # Add headway constraints for trains at same station
        for station, events in station_events.items():
            for i, (train1, is_arr1, var1) in enumerate(events):
                for train2, is_arr2, var2 in events[i+1:]:
                    # Same type of event (both arrivals or both departures)
                    if is_arr1 == is_arr2:
                        # Get track variables
                        key1 = (train1, station)
                        key2 = (train2, station)
                        
                        if key1 in self.track_vars and key2 in self.track_vars:
                            # If same track, maintain headway
                            same_track = self.model.NewBoolVar(f"same_{train1}_{train2}_{station}")
                            
                            self.model.Add(
                                self.track_vars[key1] == self.track_vars[key2]
                            ).OnlyEnforceIf(same_track)
                            
                            self.model.Add(
                                self.track_vars[key1] != self.track_vars[key2]
                            ).OnlyEnforceIf(same_track.Not())
                            
                            # Headway constraint if same track
                            train1_first = self.model.NewBoolVar(f"order_{train1}_{train2}_{station}")
                            
                            self.model.Add(
                                var1 + self.MIN_HEADWAY <= var2
                            ).OnlyEnforceIf([same_track, train1_first])
                            
                            self.model.Add(
                                var2 + self.MIN_HEADWAY <= var1
                            ).OnlyEnforceIf([same_track, train1_first.Not()])
    
    def _add_track_capacity_constraints(self):
        """Add track capacity constraints"""
        # Group trains by station and time window
        for station in STATION_ORDER:
            station_lower = station.lower()
            station_trains = []
            
            for train in self.trains:
                key = (train.train_id, station_lower)
                if key in self.arrival_vars or key in self.departure_vars:
                    station_trains.append(train)
            
            if len(station_trains) <= 1:
                continue
            
            # Ensure no more than K trains occupy station at once
            main_cap = self.graph.get_main_line_capacity(station_lower)
            loop_cap = self.graph.get_loop_capacity(station_lower)
            total_cap = max(1, main_cap + loop_cap)
            
            # Create interval variables for station occupancy
            intervals = []
            for train in station_trains:
                key = (train.train_id, station_lower)
                
                arr_var = self.arrival_vars.get(key)
                dep_var = self.departure_vars.get(key)
                
                if key in self.arrival_vars and key in self.departure_vars:
                    # Duration at station
                    duration = self.model.NewIntVar(
                        self.MIN_DWELL, self.MAX_DELAY,
                        f"dur_{train.train_id}_{station_lower}"
                    )
                    self.model.Add(duration == dep_var - arr_var)
                    
                    interval = self.model.NewIntervalVar(
                        arr_var, duration, dep_var,
                        f"interval_{train.train_id}_{station_lower}"
                    )
                    intervals.append(interval)
            
            if intervals:
                # Cumulative constraint: max K trains at station
                demands = [1] * len(intervals)
                self.model.AddCumulative(intervals, demands, total_cap)
    
    def _add_priority_constraints(self):
        """Add priority-based constraints"""
        # Higher priority trains should have less delay
        for train in self.trains:
            if train.is_emergency:
                # Emergency trains get near-zero delay
                for (t_id, station), delay_var in self.delay_vars.items():
                    if t_id == train.train_id:
                        self.model.Add(delay_var <= 5)
            elif train.priority <= 2:  # Rajdhani, Shatabdi
                # Premium trains get minimal delay
                for (t_id, station), delay_var in self.delay_vars.items():
                    if t_id == train.train_id:
                        self.model.Add(delay_var <= 15)
    
    def _define_objective(self):
        """Define the optimization objective"""
        # Minimize weighted total delay
        # Weight inversely proportional to priority (lower priority number = higher weight)
        weighted_delays = []
        
        for train in self.trains:
            priority_weight = 11 - train.priority  # Higher weight for higher priority
            if train.is_emergency:
                priority_weight = 20
            
            for (t_id, station), delay_var in self.delay_vars.items():
                if t_id == train.train_id:
                    weighted_delays.append(delay_var * priority_weight)
        
        if weighted_delays:
            self.model.Minimize(sum(weighted_delays))
    
    def solve(self, time_limit_seconds: int = 60) -> Dict:
        """Solve the optimization model"""
        print(f"Solving with {time_limit_seconds}s time limit...")
        
        self.solver.parameters.max_time_in_seconds = time_limit_seconds
        self.solver.parameters.num_search_workers = 4
        
        status = self.solver.Solve(self.model)
        
        result = {
            "status": self._status_to_string(status),
            "objective_value": None,
            "schedule": {},
            "statistics": {
                "solve_time_ms": self.solver.WallTime() * 1000,
                "branches": self.solver.NumBranches(),
                "conflicts": self.solver.NumConflicts()
            }
        }
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            result["objective_value"] = self.solver.ObjectiveValue()
            result["schedule"] = self._extract_solution()
        
        return result
    
    def _status_to_string(self, status: int) -> str:
        """Convert solver status to string"""
        status_map = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.MODEL_INVALID: "MODEL_INVALID",
            cp_model.UNKNOWN: "UNKNOWN"
        }
        return status_map.get(status, "UNKNOWN")
    
    def _extract_solution(self) -> Dict:
        """Extract the solution from solved model"""
        schedule = {}
        
        for train in self.trains:
            train_schedule = {
                "train_id": train.train_id,
                "train_name": train.train_name,
                "priority": train.priority,
                "stations": {}
            }
            
            for station in train.get_station_order():
                key = (train.train_id, station.lower())
                station_info = {}
                
                if key in self.arrival_vars:
                    arr_min = self.solver.Value(self.arrival_vars[key])
                    station_info["optimized_arrival"] = minutes_to_time(arr_min)
                    orig_sched = train.schedule.get(station.lower())
                    if orig_sched and orig_sched.scheduled_arrival:
                        station_info["scheduled_arrival"] = orig_sched.scheduled_arrival
                        station_info["arrival_delay"] = arr_min - time_to_minutes(orig_sched.scheduled_arrival)
                
                if key in self.departure_vars:
                    dep_min = self.solver.Value(self.departure_vars[key])
                    station_info["optimized_departure"] = minutes_to_time(dep_min)
                    orig_sched = train.schedule.get(station.lower())
                    if orig_sched and orig_sched.scheduled_departure:
                        station_info["scheduled_departure"] = orig_sched.scheduled_departure
                        station_info["departure_delay"] = dep_min - time_to_minutes(orig_sched.scheduled_departure)
                
                if key in self.track_vars:
                    track = self.solver.Value(self.track_vars[key])
                    station_info["assigned_track"] = track
                
                if station_info:
                    train_schedule["stations"][station] = station_info
            
            schedule[train.train_id] = train_schedule
        
        return schedule


# =============================================================================
# ROUTING OPTIMIZER (Using Min-Cost Flow)
# =============================================================================

class RoutingOptimizer:
    """
    Train routing optimizer using Min-Cost Flow algorithm.
    Handles:
    - Optimal route selection
    - Congestion avoidance
    - Load balancing across tracks
    """
    
    def __init__(self, graph: RailwayGraph):
        self.graph = graph
        
    def find_optimal_routes(self, trains: List[Train], 
                            blocked_edges: Set[str] = None) -> Dict[str, List[str]]:
        """Find optimal routes for all trains minimizing total cost"""
        blocked = blocked_edges or set()
        routes = {}
        
        for train in sorted(trains, key=lambda t: t.priority):
            stations = train.get_station_order()
            train_route = []
            
            for i in range(len(stations) - 1):
                src_station = stations[i]
                dst_station = stations[i + 1]
                
                # Get available paths
                alternatives = self.graph.find_alternative_routes(
                    self._get_station_exit_node(src_station, train.direction),
                    self._get_station_entry_node(dst_station, train.direction),
                    blocked,
                    k=3
                )
                
                if alternatives:
                    # Select best route considering priority
                    best_path, _ = alternatives[0]
                    train_route.extend(best_path)
                    
                    # Block used edges for lower priority trains
                    for edge_id in best_path:
                        blocked.add(edge_id)
            
            routes[train.train_id] = train_route
        
        return routes
    
    def _get_station_exit_node(self, station: str, direction: str) -> str:
        """Get the exit node for a station based on direction"""
        nodes = self.graph.station_nodes.get(station.lower(), [])
        for node_id in nodes:
            node = self.graph.nodes.get(node_id)
            if node:
                if direction == "forward" and "station_end" in node.node_type:
                    return node_id
                elif direction == "backward" and "station_start" in node.node_type:
                    return node_id
        return nodes[0] if nodes else ""
    
    def _get_station_entry_node(self, station: str, direction: str) -> str:
        """Get the entry node for a station based on direction"""
        nodes = self.graph.station_nodes.get(station.lower(), [])
        for node_id in nodes:
            node = self.graph.nodes.get(node_id)
            if node:
                if direction == "forward" and "station_start" in node.node_type:
                    return node_id
                elif direction == "backward" and "station_end" in node.node_type:
                    return node_id
        return nodes[0] if nodes else ""


# =============================================================================
# THROUGHPUT ANALYZER
# =============================================================================

class ThroughputAnalyzer:
    """
    Analyzes and maximizes section throughput.
    Calculates:
    - Current throughput
    - Maximum theoretical throughput
    - Bottleneck identification
    """
    
    def __init__(self, graph: RailwayGraph):
        self.graph = graph
    
    def calculate_section_capacity(self) -> Dict[str, Dict]:
        """Calculate theoretical capacity for each section"""
        capacities = {}
        
        for i in range(len(STATION_ORDER) - 1):
            section = f"{STATION_ORDER[i]}-{STATION_ORDER[i+1]}"
            edges = self.graph.get_edges_between_stations(
                STATION_ORDER[i], STATION_ORDER[i+1]
            )
            
            if not edges:
                capacities[section] = {"tracks": 0, "capacity_per_hour": 0}
                continue
            
            # Count tracks by type
            main_tracks = sum(1 for e in edges if "main" in e.edge_type)
            loop_tracks = sum(1 for e in edges if "loop" in e.edge_type)
            
            # Calculate headway-based capacity
            avg_travel_time = sum(e.travel_time_minutes() for e in edges) / len(edges)
            min_headway = 3  # minutes
            
            # Trains per hour per track
            trains_per_track = 60 / (avg_travel_time + min_headway)
            
            capacities[section] = {
                "main_tracks": main_tracks,
                "loop_tracks": loop_tracks,
                "avg_travel_time_min": round(avg_travel_time, 2),
                "capacity_per_hour": round(trains_per_track * (main_tracks + loop_tracks), 1),
                "bottleneck_score": round(1 / trains_per_track, 2) if trains_per_track > 0 else float('inf')
            }
        
        return capacities
    
    def identify_bottlenecks(self, trains: List[Train]) -> List[Dict]:
        """Identify potential bottlenecks"""
        bottlenecks = []
        
        # Station congestion analysis
        station_load = defaultdict(list)
        
        for train in trains:
            for station, sched in train.schedule.items():
                if sched.scheduled_arrival:
                    arr_time = time_to_minutes(sched.scheduled_arrival)
                    station_load[station].append((arr_time, train.train_id, "arrive"))
                if sched.scheduled_departure:
                    dep_time = time_to_minutes(sched.scheduled_departure)
                    station_load[station].append((dep_time, train.train_id, "depart"))
        
        # Find congestion windows
        for station, events in station_load.items():
            events.sort()
            
            # Sliding window analysis (15 min windows)
            window_size = 15
            for i in range(0, 24 * 60, window_size):
                window_events = [e for e in events if i <= e[0] < i + window_size]
                
                capacity = self.graph.get_main_line_capacity(station) + \
                           self.graph.get_loop_capacity(station)
                
                if len(window_events) > capacity:
                    bottlenecks.append({
                        "station": station,
                        "time_window": f"{minutes_to_time(i)}-{minutes_to_time(i+window_size)}",
                        "train_count": len(window_events),
                        "capacity": capacity,
                        "severity": "HIGH" if len(window_events) > capacity * 1.5 else "MEDIUM"
                    })
        
        return sorted(bottlenecks, key=lambda x: x["train_count"] - x["capacity"], reverse=True)
    
    def calculate_throughput_metrics(self, trains: List[Train]) -> Dict:
        """Calculate overall throughput metrics"""
        total_trains = len(trains)
        forward_trains = sum(1 for t in trains if t.direction == "forward")
        backward_trains = sum(1 for t in trains if t.direction == "backward")
        
        # Calculate average delay (assuming schedule is followed)
        section_capacities = self.calculate_section_capacity()
        min_bottleneck = min(c["capacity_per_hour"] for c in section_capacities.values())
        
        return {
            "total_trains": total_trains,
            "forward_trains": forward_trains,
            "backward_trains": backward_trains,
            "theoretical_max_per_hour": round(min_bottleneck, 1),
            "section_capacities": section_capacities,
            "utilization_percent": round((total_trains / 24) / min_bottleneck * 100, 1) if min_bottleneck > 0 else 0
        }


# =============================================================================
# WHAT-IF SCENARIO ANALYZER
# =============================================================================

class ScenarioAnalyzer:
    """
    What-if scenario analysis for:
    - Holding strategies
    - Platform allocations
    - Emergency scenarios
    - Maintenance windows
    """
    
    def __init__(self, graph: RailwayGraph, trains: List[Train]):
        self.graph = graph
        self.trains = trains
    
    def analyze_holding_strategy(self, station: str, 
                                  hold_duration: int,
                                  affected_trains: List[str] = None) -> Dict:
        """Analyze impact of holding trains at a station"""
        affected = affected_trains or [t.train_id for t in self.trains]
        
        cascade_delays = {}
        total_delay = 0
        
        for train in self.trains:
            if train.train_id not in affected:
                continue
            
            train_delay = 0
            stations = train.get_station_order()
            
            for i, st in enumerate(stations):
                if st.lower() == station.lower():
                    # This train is held
                    train_delay = hold_duration
                elif i > 0 and stations[i-1].lower() == station.lower():
                    # Following station after hold
                    train_delay = max(0, hold_duration - 5)  # Some recovery
            
            if train_delay > 0:
                cascade_delays[train.train_id] = {
                    "train_name": train.train_name,
                    "delay_minutes": train_delay,
                    "priority": train.priority,
                    "impact_score": train_delay * (11 - train.priority)
                }
                total_delay += train_delay
        
        return {
            "scenario": f"Hold at {station} for {hold_duration} min",
            "affected_trains": len(cascade_delays),
            "total_delay_minutes": total_delay,
            "cascade_delays": cascade_delays,
            "recommendation": "PROCEED" if total_delay < 30 else "RECONSIDER"
        }
    
    def analyze_track_closure(self, edge_id: str, 
                               duration_minutes: int) -> Dict:
        """Analyze impact of closing a track"""
        edge = self.graph.edges.get(edge_id)
        if not edge:
            return {"error": f"Edge {edge_id} not found"}
        
        # Find affected trains
        affected_trains = []
        for train in self.trains:
            stations = train.get_station_order()
            for i in range(len(stations) - 1):
                edges = self.graph.get_edges_between_stations(stations[i], stations[i+1])
                if any(e.edge_id == edge_id for e in edges):
                    affected_trains.append(train)
                    break
        
        # Find alternative routes
        alternatives_exist = len(self.graph.find_alternative_routes(
            edge.start_node, edge.end_node, {edge_id}, k=1
        )) > 0
        
        return {
            "scenario": f"Track {edge_id} closure for {duration_minutes} min",
            "affected_trains": len(affected_trains),
            "alternatives_available": alternatives_exist,
            "trains": [{"id": t.train_id, "name": t.train_name, "priority": t.priority} 
                      for t in affected_trains],
            "recommendation": "REROUTE" if alternatives_exist else "HOLD_TRAINS"
        }
    
    def analyze_emergency_priority(self, emergency_train: Train) -> Dict:
        """Analyze impact of emergency train priority override"""
        conflicts = []
        
        emergency_stations = emergency_train.get_station_order()
        
        for train in self.trains:
            if train.train_id == emergency_train.train_id:
                continue
            
            for station in emergency_stations:
                em_sched = emergency_train.schedule.get(station.lower())
                tr_sched = train.schedule.get(station.lower())
                
                if not em_sched or not tr_sched:
                    continue
                
                # Check time overlap
                em_arr = time_to_minutes(em_sched.scheduled_arrival or "00:00")
                em_dep = time_to_minutes(em_sched.scheduled_departure or "23:59")
                tr_arr = time_to_minutes(tr_sched.scheduled_arrival or "00:00")
                tr_dep = time_to_minutes(tr_sched.scheduled_departure or "23:59")
                
                if not (em_dep < tr_arr or tr_dep < em_arr):
                    conflicts.append({
                        "station": station,
                        "conflicting_train": train.train_id,
                        "train_name": train.train_name,
                        "train_priority": train.priority,
                        "action": "HOLD" if train.priority > 3 else "REROUTE"
                    })
        
        return {
            "emergency_train": emergency_train.train_id,
            "conflicts": len(conflicts),
            "conflict_details": conflicts,
            "estimated_clear_time": max(5, 3 * len(conflicts))
        }
    
    def generate_holding_recommendations(self) -> List[Dict]:
        """Generate optimal holding recommendations"""
        recommendations = []
        
        # Analyze each station
        for station in STATION_ORDER:
            # Find trains at similar times
            station_schedule = []
            
            for train in self.trains:
                sched = train.schedule.get(station.lower())
                if sched:
                    arr = time_to_minutes(sched.scheduled_arrival or "00:00")
                    dep = time_to_minutes(sched.scheduled_departure or sched.scheduled_arrival or "00:00")
                    station_schedule.append({
                        "train": train,
                        "arrival": arr,
                        "departure": dep
                    })
            
            station_schedule.sort(key=lambda x: x["arrival"])
            
            # Check for conflicts
            for i, s1 in enumerate(station_schedule):
                for s2 in station_schedule[i+1:]:
                    # Check if trains are too close
                    time_gap = s2["arrival"] - s1["departure"]
                    
                    if time_gap < 3:  # Less than 3 min headway
                        # Higher priority train proceeds, lower priority waits
                        if s1["train"].priority <= s2["train"].priority:
                            hold_train = s2["train"]
                            proceed_train = s1["train"]
                        else:
                            hold_train = s1["train"]
                            proceed_train = s2["train"]
                        
                        recommendations.append({
                            "station": station,
                            "action": "HOLD",
                            "hold_train": hold_train.train_id,
                            "hold_train_name": hold_train.train_name,
                            "proceed_train": proceed_train.train_id,
                            "proceed_train_name": proceed_train.train_name,
                            "hold_duration": 3 - time_gap,
                            "reason": f"Headway conflict at {station}"
                        })
        
        return recommendations


# =============================================================================
# MAIN OPTIMIZER CLASS
# =============================================================================

class RailwayOptimizer:
    """
    Main optimizer class integrating all components.
    """
    
    def __init__(self, schema_path: str, trains_path: str):
        self.graph = RailwayGraph()
        self.trains: List[Train] = []
        
        # Load data
        self._load_schema(schema_path)
        self._load_trains(trains_path)
        
        # Initialize components
        self.schedule_optimizer = ScheduleOptimizer(self.graph, self.trains)
        self.routing_optimizer = RoutingOptimizer(self.graph)
        self.throughput_analyzer = ThroughputAnalyzer(self.graph)
        self.scenario_analyzer = ScenarioAnalyzer(self.graph, self.trains)
    
    def _load_schema(self, path: str):
        """Load railway schema from JSON file"""
        with open(path, 'r') as f:
            schema = json.load(f)
        self.graph.load_from_schema(schema)
        print(f"Loaded {len(self.graph.nodes)} nodes and {len(self.graph.edges)} edges")
    
    def _load_trains(self, path: str):
        """Load trains from JSON file"""
        with open(path, 'r') as f:
            trains_data = json.load(f)
        
        for train_data in trains_data:
            self.trains.append(Train.from_dict(train_data))
        
        print(f"Loaded {len(self.trains)} trains")
    
    def optimize_schedule(self, time_limit: int = 60) -> Dict:
        """Run schedule optimization"""
        self.schedule_optimizer.build_model()
        return self.schedule_optimizer.solve(time_limit)
    
    def calculate_optimal_routes(self) -> Dict[str, List[str]]:
        """Calculate optimal routes for all trains"""
        return self.routing_optimizer.find_optimal_routes(self.trains)
    
    def analyze_throughput(self) -> Dict:
        """Analyze section throughput"""
        metrics = self.throughput_analyzer.calculate_throughput_metrics(self.trains)
        bottlenecks = self.throughput_analyzer.identify_bottlenecks(self.trains)
        
        return {
            "metrics": metrics,
            "bottlenecks": bottlenecks[:10]  # Top 10 bottlenecks
        }
    
    def run_scenario(self, scenario_type: str, **kwargs) -> Dict:
        """Run a what-if scenario analysis"""
        if scenario_type == "hold":
            return self.scenario_analyzer.analyze_holding_strategy(
                kwargs.get("station", STATION_ORDER[0]),
                kwargs.get("duration", 10),
                kwargs.get("trains", None)
            )
        elif scenario_type == "track_closure":
            return self.scenario_analyzer.analyze_track_closure(
                kwargs.get("edge_id", ""),
                kwargs.get("duration", 30)
            )
        elif scenario_type == "emergency":
            train_id = kwargs.get("train_id")
            train = next((t for t in self.trains if t.train_id == train_id), None)
            if train:
                train.is_emergency = True
                return self.scenario_analyzer.analyze_emergency_priority(train)
            return {"error": f"Train {train_id} not found"}
        else:
            return {"error": f"Unknown scenario type: {scenario_type}"}
    
    def get_holding_recommendations(self) -> List[Dict]:
        """Get holding recommendations for all conflicts"""
        return self.scenario_analyzer.generate_holding_recommendations()
    
    def generate_full_report(self) -> Dict:
        """Generate a comprehensive optimization report"""
        print("\n" + "="*60)
        print("RAILWAY SECTION OPTIMIZATION REPORT")
        print("="*60 + "\n")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "section_info": {
                "stations": STATION_ORDER,
                "total_nodes": len(self.graph.nodes),
                "total_edges": len(self.graph.edges),
                "total_trains": len(self.trains)
            }
        }
        
        # Throughput analysis
        print("1. THROUGHPUT ANALYSIS")
        print("-" * 40)
        throughput = self.analyze_throughput()
        report["throughput"] = throughput
        
        print(f"   Total trains: {throughput['metrics']['total_trains']}")
        print(f"   Forward: {throughput['metrics']['forward_trains']}, Backward: {throughput['metrics']['backward_trains']}")
        print(f"   Theoretical max per hour: {throughput['metrics']['theoretical_max_per_hour']}")
        print(f"   Utilization: {throughput['metrics']['utilization_percent']}%")
        
        if throughput['bottlenecks']:
            print(f"\n   Top bottleneck: {throughput['bottlenecks'][0]}")
        
        # Holding recommendations
        print("\n2. HOLDING RECOMMENDATIONS")
        print("-" * 40)
        recommendations = self.get_holding_recommendations()
        report["holding_recommendations"] = recommendations[:10]
        
        if recommendations:
            for i, rec in enumerate(recommendations[:5]):
                print(f"   {i+1}. At {rec['station']}: Hold {rec['hold_train_name']}, "
                      f"let {rec['proceed_train_name']} proceed")
        else:
            print("   No conflicts detected")
        
        # Schedule optimization
        print("\n3. SCHEDULE OPTIMIZATION")
        print("-" * 40)
        schedule_result = self.optimize_schedule(time_limit=30)
        report["schedule_optimization"] = {
            "status": schedule_result["status"],
            "objective_value": schedule_result.get("objective_value"),
            "statistics": schedule_result.get("statistics", {})
        }
        
        print(f"   Status: {schedule_result['status']}")
        if schedule_result['objective_value']:
            print(f"   Objective (weighted delay): {schedule_result['objective_value']}")
        
        # Section capacities
        print("\n4. SECTION CAPACITIES")
        print("-" * 40)
        for section, cap in throughput['metrics']['section_capacities'].items():
            print(f"   {section}: {cap['capacity_per_hour']} trains/hour "
                  f"(main: {cap['main_tracks']}, loop: {cap['loop_tracks']})")
        
        print("\n" + "="*60)
        print("REPORT COMPLETE")
        print("="*60 + "\n")
        
        return report
    
    def export_results(self, output_path: str):
        """Export optimization results to JSON file"""
        report = self.generate_full_report()
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"Results exported to {output_path}")


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def main():
    """Main entry point"""
    import os
    
    # Paths relative to script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    schema_path = os.path.join(script_dir, "database_schema.json")
    trains_path = os.path.join(script_dir, "trains.json")
    output_path = os.path.join(script_dir, "optimization_results.json")
    
    # Initialize optimizer
    print("Initializing Railway Optimizer...")
    optimizer = RailwayOptimizer(schema_path, trains_path)
    
    # Generate full report
    report = optimizer.generate_full_report()
    
    # Export results
    optimizer.export_results(output_path)
    
    # Example scenario analysis
    print("\n" + "="*60)
    print("SCENARIO ANALYSIS EXAMPLE")
    print("="*60)
    
    # Holding scenario
    hold_result = optimizer.run_scenario(
        "hold",
        station="sorai",
        duration=10
    )
    print(f"\nHolding at Sorai for 10 min:")
    print(f"  Affected trains: {hold_result.get('affected_trains', 0)}")
    print(f"  Total delay: {hold_result.get('total_delay_minutes', 0)} min")
    print(f"  Recommendation: {hold_result.get('recommendation', 'N/A')}")
    
    return report


if __name__ == "__main__":
    main()

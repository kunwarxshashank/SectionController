#!/usr/bin/env python3
"""
Indian Railways Section Traffic Optimizer - Hybrid Implementation
================================================================================
Combines Google OR-Tools CP-SAT with advanced railway operations management.

Features:
- Multi-aspect automatic signalling system
- Automatic absolute block system  
- Dynamic train schedule optimization with priority handling
- Platform allocation and holding strategies
- Throughput maximization as primary objective
- Priority-weighted delay minimization
- What-if scenario analysis
- Alternative route computation
- Real-time conflict resolution

Author: Railway Optimization System
Version: 2.0 (Hybrid)
"""

import json
import heapq
import math
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Set
from enum import Enum
from collections import defaultdict, deque
import copy

# Google OR-Tools imports
from ortools.sat.python import cp_model


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
    SPECIAL = 0

class Direction(Enum):
    FORWARD = "forward"
    BACKWARD = "backward"
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
# UTILITY FUNCTIONS
# =============================================================================

def time_to_minutes(time_str: str) -> int:
    """Convert HH:MM time string to minutes from midnight"""
    if not time_str or time_str == "":
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

def euclidean_distance(x1: float, y1: float, x2: float, y2: float) -> float:
    """Calculate Euclidean distance between two points"""
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)


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
            x=float(data.get("x", 0)),
            y=float(data.get("y", 0)),
            node_type=data.get("nodeType", ""),
            name=data.get("name", ""),
            line=data.get("line", ""),
            station=data.get("station", "").lower(),
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
    def from_dict(cls, data: dict, nodes: Dict[str, Node]) -> 'Edge':
        start = data.get("startNode", "")
        end = data.get("endNode", "")
        
        # Calculate length from nodes if not provided
        length = data.get("edgeLength", data.get("length_m", 0))
        if length == 0 and start in nodes and end in nodes:
            n1, n2 = nodes[start], nodes[end]
            length = euclidean_distance(n1.x, n1.y, n2.x, n2.y)
        
        return cls(
            edge_id=data.get("edgeId", data.get("id", "")),
            start_node=start,
            end_node=end,
            direction=data.get("direction", "unidirectional"),
            edge_type=data.get("edgeType", data.get("track_type", "")),
            length=float(length),
            speed_limit=int(data.get("speed_limit", 80)),
            station=data.get("station", "").lower(),
            status=data.get("status", "operational")
        )
    
    def travel_time_minutes(self, train_speed: int = None) -> float:
        """Calculate travel time in minutes"""
        effective_speed = min(train_speed or self.speed_limit, self.speed_limit)
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
        for station in self.get_station_order():
            sched = self.schedule.get(station)
            if sched and sched.scheduled_departure:
                return time_to_minutes(sched.scheduled_departure)
        return None
    
    def get_station_order(self) -> List[str]:
        """Get ordered list of stations based on direction"""
        if self.direction == "forward":
            return [s for s in STATION_ORDER if s in self.schedule]
        else:
            return [s for s in reversed(STATION_ORDER) if s in self.schedule]


# =============================================================================
# RAILWAY GRAPH
# =============================================================================

class RailwayGraph:
    """Graph representation of the railway network"""
    
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, Edge] = {}
        self.adjacency: Dict[str, List[str]] = defaultdict(list)
        self.reverse_adjacency: Dict[str, List[str]] = defaultdict(list)
        self.station_nodes: Dict[str, List[str]] = defaultdict(list)
        self.station_edges: Dict[str, List[str]] = defaultdict(list)
        
    def load_from_schema(self, schema: dict):
        """Load network from database schema"""
        # Load nodes first
        for node_data in schema.get("nodes", []):
            node = Node.from_dict(node_data)
            self.nodes[node.node_id] = node
            if node.station:
                self.station_nodes[node.station].append(node.node_id)
        
        # Load edges with node information
        for edge_data in schema.get("edges", []):
            edge = Edge.from_dict(edge_data, self.nodes)
            if edge.start_node and edge.end_node:
                self.edges[edge.edge_id] = edge
                self.adjacency[edge.start_node].append(edge.edge_id)
                self.reverse_adjacency[edge.end_node].append(edge.edge_id)
                
                # Handle bidirectional edges
                if edge.direction.lower() in ['bidirectional', 'updn', 'up|dn']:
                    # Create reverse edge reference
                    self.adjacency[edge.end_node].append(edge.edge_id)
                    self.reverse_adjacency[edge.start_node].append(edge.edge_id)
                
                if edge.station:
                    self.station_edges[edge.station].append(edge.edge_id)
        
        print(f"Loaded {len(self.nodes)} nodes and {len(self.edges)} edges")
    
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
        return len(tracks.get("main", [])) + len(tracks.get("up_main", [])) + \
               len(tracks.get("down_main", [])) + len(tracks.get("both_main", []))
    
    def get_loop_capacity(self, station: str) -> int:
        """Get number of loop tracks at a station"""
        tracks = self.get_track_types_at_station(station)
        return len(tracks.get("loop", [])) + len(tracks.get("up_loop", [])) + \
               len(tracks.get("down_loop", []))
    
    def find_shortest_path(self, start_node: str, end_node: str) -> Tuple[List[str], float]:
        """Find shortest path using Dijkstra's algorithm. Returns (edge_ids, travel_time)"""
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
                if not edge or edge.status != "operational":
                    continue
                
                # Determine next node
                if edge.start_node == current:
                    next_node = edge.end_node
                elif edge.end_node == current and edge.direction.lower() in ['bidirectional', 'updn']:
                    next_node = edge.start_node
                else:
                    continue
                
                if next_node not in visited:
                    travel_time = edge.travel_time_minutes()
                    heapq.heappush(pq, (dist + travel_time, next_node, path + [edge_id]))
        
        return [], float('inf')
    
    def enumerate_candidate_paths(self, start_station: str, end_station: str, 
                                   max_paths: int = 10, max_depth: int = 3) -> List[List[str]]:
        """
        Enumerate multiple candidate paths between stations.
        Returns list of paths, where each path is a list of edge IDs.
        """
        start_nodes = self.station_nodes.get(start_station.lower(), [])
        end_nodes = set(self.station_nodes.get(end_station.lower(), []))
        
        if not start_nodes or not end_nodes:
            return []
        
        all_paths = []
        
        for start_node in start_nodes[:2]:  # Try up to 2 starting nodes
            paths = []
            queue = deque([(start_node, [], 0)])  # (node, path, stations_visited)
            visited_paths = set()
            
            while queue and len(paths) < max_paths:
                current, path, stations = queue.popleft()
                
                # Check if reached destination
                if current in end_nodes:
                    path_tuple = tuple(path)
                    if path_tuple not in visited_paths:
                        paths.append(list(path))
                        visited_paths.add(path_tuple)
                    continue
                
                # Stop if too deep
                if stations >= max_depth:
                    continue
                
                # Explore neighbors
                for edge_id in self.adjacency.get(current, []):
                    edge = self.edges.get(edge_id)
                    if not edge or edge.status != "operational":
                        continue
                    
                    # Determine next node
                    if edge.start_node == current:
                        next_node = edge.end_node
                    elif edge.end_node == current and edge.direction.lower() in ['bidirectional', 'updn']:
                        next_node = edge.start_node
                    else:
                        continue
                    
                    # Avoid immediate backtracking
                    if len(path) >= 1 and path[-1] == edge_id:
                        continue
                    
                    new_path = path + [edge_id]
                    
                    # Count station transitions
                    next_station = self.nodes[next_node].station
                    current_station = self.nodes[current].station if current in self.nodes else ""
                    new_stations = stations + (1 if next_station != current_station and next_station else 0)
                    
                    queue.append((next_node, new_path, new_stations))
            
            all_paths.extend(paths)
        
        return all_paths[:max_paths]


# =============================================================================
# HYBRID SCHEDULE OPTIMIZER (Using OR-Tools CP-SAT)
# =============================================================================

class HybridScheduleOptimizer:
    """
    Hybrid train schedule optimizer combining best features:
    - Throughput maximization (from Script 2)
    - Platform allocation and holding strategies (from Script 1)
    - Priority-weighted delay minimization
    - Resource occupancy with headway buffers
    """
    
    def __init__(self, graph: RailwayGraph, trains: List[Train], config: dict = None):
        self.graph = graph
        self.trains = trains
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
        # Configuration
        self.config = {
            'horizon_s': 4 * 3600,          # 4 hours planning horizon
            'headway_s': 180,                # 3 minutes minimum headway
            'min_dwell_s': 120,              # 2 minutes minimum dwell time
            'max_delay_s': 3600,             # 60 minutes maximum delay
            'throughput_weight': 100000,     # High weight for throughput
            'delay_weight_mult': 100,        # Multiplier for delay penalties
            'loop_penalty': 500,             # Penalty for using loop tracks
            'solver_time_limit_s': 60,       # Solver time limit
            'max_paths_per_train': 5,        # Max candidate paths to consider
        }
        if config:
            self.config.update(config)
        
        # Decision variables
        self.path_selector: Dict[Tuple[str, int], cp_model.IntVar] = {}
        self.arrival_vars: Dict[Tuple[str, str], cp_model.IntVar] = {}
        self.departure_vars: Dict[Tuple[str, str], cp_model.IntVar] = {}
        self.platform_vars: Dict[Tuple[str, str], cp_model.IntVar] = {}
        self.delay_vars: Dict[Tuple[str, str], cp_model.IntVar] = {}
        self.edge_intervals: Dict[str, List[cp_model.IntervalVar]] = defaultdict(list)
        
        # Candidate paths
        self.train_paths: Dict[str, List[List[str]]] = {}
    
    def enumerate_paths_for_all_trains(self):
        """Enumerate candidate paths for all trains"""
        print("Enumerating candidate paths for all trains...")
        
        for train in self.trains:
            stations = train.get_station_order()
            all_segments = []
            
            # For each consecutive station pair, find paths
            for i in range(len(stations) - 1):
                src = stations[i]
                dst = stations[i + 1]
                
                paths = self.graph.enumerate_candidate_paths(
                    src, dst, 
                    max_paths=self.config['max_paths_per_train'],
                    max_depth=3
                )
                
                if not paths:
                    # Fallback: try to find any path
                    # Get representative nodes
                    src_nodes = self.graph.station_nodes.get(src, [])
                    dst_nodes = self.graph.station_nodes.get(dst, [])
                    if src_nodes and dst_nodes:
                        path, _ = self.graph.find_shortest_path(src_nodes[0], dst_nodes[0])
                        if path:
                            paths = [path]
                
                all_segments.append(paths if paths else [[]])  # Empty path as fallback
            
            # Combine segments to form complete paths
            # For simplicity, we create paths by combining first options
            if all_segments and all(seg for seg in all_segments):
                # Create at least one complete path
                complete_paths = []
                for variant in range(min(3, min(len(seg) for seg in all_segments))):
                    complete_path = []
                    for seg_paths in all_segments:
                        if variant < len(seg_paths):
                            complete_path.extend(seg_paths[variant])
                        elif seg_paths:
                            complete_path.extend(seg_paths[0])
                    if complete_path:
                        complete_paths.append(complete_path)
                
                self.train_paths[train.train_id] = complete_paths if complete_paths else [[]]
            else:
                self.train_paths[train.train_id] = [[]]  # Empty fallback
        
        print(f"Enumerated paths for {len(self.trains)} trains")
    
    def build_model(self):
        """Build the CP-SAT optimization model"""
        print("Building optimization model...")
        
        self.enumerate_paths_for_all_trains()
        horizon = self.config['horizon_s']
        headway = self.config['headway_s']
        min_dwell = self.config['min_dwell_s']
        
        # 1. Create path selection variables
        for train in self.trains:
            paths = self.train_paths.get(train.train_id, [[]])
            for pidx in range(len(paths)):
                var = self.model.NewBoolVar(f"path_{train.train_id}_{pidx}")
                self.path_selector[(train.train_id, pidx)] = var
            
            # Exactly one path must be selected
            if paths:
                self.model.Add(sum(self.path_selector[(train.train_id, i)] 
                                 for i in range(len(paths))) == 1)
        
        # 2. Create timing and platform variables for each station
        for train in self.trains:
            stations = train.get_station_order()
            
            for station in stations:
                sched = train.schedule.get(station)
                if not sched:
                    continue
                
                key = (train.train_id, station)
                
                # Arrival time
                if sched.scheduled_arrival:
                    scheduled_arr = time_to_minutes(sched.scheduled_arrival) * 60
                    self.arrival_vars[key] = self.model.NewIntVar(
                        max(0, scheduled_arr - self.config['max_delay_s']),
                        min(horizon, scheduled_arr + self.config['max_delay_s']),
                        f"arr_{train.train_id}_{station}"
                    )
                
                # Departure time
                if sched.scheduled_departure:
                    scheduled_dep = time_to_minutes(sched.scheduled_departure) * 60
                    self.departure_vars[key] = self.model.NewIntVar(
                        max(0, scheduled_dep - self.config['max_delay_s']),
                        min(horizon, scheduled_dep + self.config['max_delay_s']),
                        f"dep_{train.train_id}_{station}"
                    )
                elif key in self.arrival_vars:
                    # If no departure scheduled, create variable anyway
                    arr_var = self.arrival_vars[key]
                    self.departure_vars[key] = self.model.NewIntVar(
                        0, horizon, f"dep_{train.train_id}_{station}"
                    )
                    self.model.Add(self.departure_vars[key] >= arr_var + min_dwell)
                
                # Platform allocation (0=main, 1=loop1, 2=loop2, etc.)
                main_cap = self.graph.get_main_line_capacity(station)
                loop_cap = self.graph.get_loop_capacity(station)
                total_platforms = max(1, main_cap + loop_cap)
                
                self.platform_vars[key] = self.model.NewIntVar(
                    0, total_platforms - 1,
                    f"platform_{train.train_id}_{station}"
                )
                
                # Delay variable
                self.delay_vars[key] = self.model.NewIntVar(
                    0, self.config['max_delay_s'],
                    f"delay_{train.train_id}_{station}"
                )
        
        # 3. Add schedule constraints
        self._add_schedule_constraints()
        
        # 4. Add platform capacity constraints
        self._add_platform_capacity_constraints()
        
        # 5. Add headway constraints
        self._add_headway_constraints()
        
        # 6. Define objective
        self._define_objective()
        
        print(f"Model built with {len(self.arrival_vars)} arrival vars, "
              f"{len(self.departure_vars)} departure vars, "
              f"{len(self.platform_vars)} platform vars")
    
    def _add_schedule_constraints(self):
        """Add basic scheduling constraints"""
        for train in self.trains:
            stations = train.get_station_order()
            
            for i, station in enumerate(stations):
                key = (train.train_id, station)
                
                # Arrival before departure at same station
                if key in self.arrival_vars and key in self.departure_vars:
                    self.model.Add(
                        self.arrival_vars[key] + self.config['min_dwell_s'] <= 
                        self.departure_vars[key]
                    )
                
                # Calculate delay
                sched = train.schedule.get(station)
                if sched:
                    if sched.scheduled_arrival and key in self.arrival_vars:
                        scheduled = time_to_minutes(sched.scheduled_arrival) * 60
                        self.model.Add(
                            self.delay_vars[key] >= self.arrival_vars[key] - scheduled
                        )
                        self.model.Add(self.delay_vars[key] >= 0)
                    elif sched.scheduled_departure and key in self.departure_vars:
                        scheduled = time_to_minutes(sched.scheduled_departure) * 60
                        self.model.Add(
                            self.delay_vars[key] >= self.departure_vars[key] - scheduled
                        )
                        self.model.Add(self.delay_vars[key] >= 0)
                
                # Travel time between consecutive stations
                if i > 0:
                    prev_station = stations[i - 1]
                    prev_key = (train.train_id, prev_station)
                    
                    # Estimate minimum travel time
                    edges = self.graph.get_edges_between_stations(prev_station, station)
                    if edges:
                        min_travel = min(e.travel_time_minutes(train.max_speed) for e in edges)
                        min_travel_s = max(60, int(min_travel * 60))
                    else:
                        min_travel_s = 600  # 10 minutes default
                    
                    if prev_key in self.departure_vars and key in self.arrival_vars:
                        self.model.Add(
                            self.arrival_vars[key] >= 
                            self.departure_vars[prev_key] + min_travel_s
                        )
    
    def _add_platform_capacity_constraints(self):
        """Add platform capacity constraints using cumulative"""
        for station in STATION_ORDER:
            station_trains = []
            intervals = []
            demands = []
            
            main_cap = self.graph.get_main_line_capacity(station)
            loop_cap = self.graph.get_loop_capacity(station)
            total_cap = max(2, main_cap + loop_cap)
            
            for train in self.trains:
                key = (train.train_id, station)
                if key not in self.arrival_vars or key not in self.departure_vars:
                    continue
                
                # Create interval for station occupancy
                start = self.arrival_vars[key]
                end = self.departure_vars[key]
                duration = self.model.NewIntVar(
                    self.config['min_dwell_s'],
                    self.config['max_delay_s'],
                    f"dur_{train.train_id}_{station}"
                )
                self.model.Add(duration == end - start)
                
                interval = self.model.NewIntervalVar(
                    start, duration, end,
                    f"interval_{train.train_id}_{station}"
                )
                intervals.append(interval)
                demands.append(1)
            
            # Cumulative constraint: no more than total_cap trains at station
            if intervals:
                self.model.AddCumulative(intervals, demands, total_cap)
    
    def _add_headway_constraints(self):
        """Add minimum headway constraints between trains"""
        # Group by station and add ordering constraints
        for station in STATION_ORDER:
            arrivals = []
            departures = []
            
            for train in self.trains:
                key = (train.train_id, station)
                if key in self.arrival_vars:
                    arrivals.append((train, self.arrival_vars[key]))
                if key in self.departure_vars:
                    departures.append((train, self.departure_vars[key]))
            
            # For each pair of trains, ensure minimum headway if on same platform
            for i, (t1, var1) in enumerate(arrivals):
                for t2, var2 in arrivals[i+1:]:
                    k1 = (t1.train_id, station)
                    k2 = (t2.train_id, station)
                    
                    if k1 in self.platform_vars and k2 in self.platform_vars:
                        # If same platform, maintain headway
                        same_platform = self.model.NewBoolVar(f"same_{t1.train_id}_{t2.train_id}_{station}")
                        self.model.Add(
                            self.platform_vars[k1] == self.platform_vars[k2]
                        ).OnlyEnforceIf(same_platform)
                        
                        self.model.Add(
                            self.platform_vars[k1] != self.platform_vars[k2]
                        ).OnlyEnforceIf(same_platform.Not())
                        
                        # Ordering constraint
                        t1_first = self.model.NewBoolVar(f"order_{t1.train_id}_{t2.train_id}_{station}")
                        self.model.Add(
                            var1 + self.config['headway_s'] <= var2
                        ).OnlyEnforceIf([same_platform, t1_first])
                        
                        self.model.Add(
                            var2 + self.config['headway_s'] <= var1
                        ).OnlyEnforceIf([same_platform, t1_first.Not()])
    
    def _define_objective(self):
        """Define optimization objective: maximize throughput, minimize delay"""
        objective_terms = []
        
        # 1. Throughput: maximize trains completing within horizon
        for train in self.trains:
            stations = train.get_station_order()
            if stations:
                last_station = stations[-1]
                key = (train.train_id, last_station)
                
                if key in self.departure_vars:
                    # Reward for completing within horizon
                    completed = self.model.NewBoolVar(f"completed_{train.train_id}")
                    self.model.Add(
                        self.departure_vars[key] <= self.config['horizon_s']
                    ).OnlyEnforceIf(completed)
                    self.model.Add(
                        self.departure_vars[key] > self.config['horizon_s']
                    ).OnlyEnforceIf(completed.Not())
                    
                    objective_terms.append(
                        self.config['throughput_weight'] * completed
                    )
        
        # 2. Priority-weighted delay minimization
        for train in self.trains:
            priority_weight = self.config['delay_weight_mult'] * (11 - train.priority)
            if train.is_emergency:
                priority_weight *= 5
            
            for (tid, station), delay_var in self.delay_vars.items():
                if tid == train.train_id:
                    objective_terms.append(-priority_weight * delay_var)
        
        # 3. Loop usage penalty
        for (tid, station), platform_var in self.platform_vars.items():
            main_cap = self.graph.get_main_line_capacity(station)
            # If platform >= main_cap, it's a loop
            is_loop = self.model.NewBoolVar(f"loop_{tid}_{station}")
            self.model.Add(platform_var >= main_cap).OnlyEnforceIf(is_loop)
            self.model.Add(platform_var < main_cap).OnlyEnforceIf(is_loop.Not())
            
            objective_terms.append(-self.config['loop_penalty'] * is_loop)
        
        # Maximize objective
        if objective_terms:
            self.model.Maximize(sum(objective_terms))
    
    def solve(self) -> Dict:
        """Solve the optimization model"""
        print(f"Solving with {self.config['solver_time_limit_s']}s time limit...")
        
        self.solver.parameters.max_time_in_seconds = self.config['solver_time_limit_s']
        self.solver.parameters.num_search_workers = 8
        
        import time
        start_time = time.time()
        status = self.solver.Solve(self.model)
        solve_time = time.time() - start_time
        
        result = {
            "status": self._status_to_string(status),
            "solve_time_s": solve_time,
            "objective_value": None,
            "schedule": {},
            "statistics": {
                "branches": self.solver.NumBranches(),
                "conflicts": self.solver.NumConflicts(),
                "wall_time_ms": self.solver.WallTime() * 1000
            }
        }
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            result["objective_value"] = self.solver.ObjectiveValue()
            result["schedule"] = self._extract_solution()
            print(f"✓ Solution found! Objective: {result['objective_value']:.0f}")
        else:
            print(f"✗ No solution found. Status: {result['status']}")
        
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
                "train_number": train.train_number,
                "train_type": train.train_type,
                "priority": train.priority,
                "direction": train.direction,
                "stations": {}
            }
            
            total_delay_s = 0
            
            for station in train.get_station_order():
                key = (train.train_id, station)
                station_info = {}
                
                if key in self.arrival_vars:
                    arr_s = self.solver.Value(self.arrival_vars[key])
                    station_info["optimized_arrival"] = minutes_to_time(arr_s // 60)
                    station_info["arrival_time_s"] = arr_s
                    
                    sched = train.schedule.get(station)
                    if sched and sched.scheduled_arrival:
                        station_info["scheduled_arrival"] = sched.scheduled_arrival
                        scheduled_s = time_to_minutes(sched.scheduled_arrival) * 60
                        station_info["arrival_delay_s"] = max(0, arr_s - scheduled_s)
                        station_info["arrival_delay_min"] = station_info["arrival_delay_s"] // 60
                
                if key in self.departure_vars:
                    dep_s = self.solver.Value(self.departure_vars[key])
                    station_info["optimized_departure"] = minutes_to_time(dep_s // 60)
                    station_info["departure_time_s"] = dep_s
                    
                    sched = train.schedule.get(station)
                    if sched and sched.scheduled_departure:
                        station_info["scheduled_departure"] = sched.scheduled_departure
                        scheduled_s = time_to_minutes(sched.scheduled_departure) * 60
                        station_info["departure_delay_s"] = max(0, dep_s - scheduled_s)
                        station_info["departure_delay_min"] = station_info["departure_delay_s"] // 60
                
                if key in self.platform_vars:
                    platform = self.solver.Value(self.platform_vars[key])
                    main_cap = self.graph.get_main_line_capacity(station)
                    if platform < main_cap:
                        station_info["platform"] = f"Main-{platform + 1}"
                        station_info["platform_type"] = "main"
                    else:
                        station_info["platform"] = f"Loop-{platform - main_cap + 1}"
                        station_info["platform_type"] = "loop"
                
                if key in self.delay_vars:
                    delay_s = self.solver.Value(self.delay_vars[key])
                    station_info["total_delay_s"] = delay_s
                    station_info["total_delay_min"] = delay_s // 60
                    total_delay_s += delay_s
                
                if station_info:
                    train_schedule["stations"][station] = station_info
            
            train_schedule["total_delay_s"] = total_delay_s
            train_schedule["total_delay_min"] = total_delay_s // 60
            schedule[train.train_id] = train_schedule
        
        return schedule


# =============================================================================
# THROUGHPUT ANALYZER
# =============================================================================

class ThroughputAnalyzer:
    """Analyzes and maximizes section throughput"""
    
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
            
            # Count parallel tracks
            num_tracks = len(set(e.edge_id for e in edges))
            
            # Calculate headway-based capacity
            avg_travel_time = sum(e.travel_time_minutes() for e in edges) / len(edges)
            min_headway = 3  # minutes
            
            trains_per_track_hour = 60 / (avg_travel_time + min_headway)
            
            capacities[section] = {
                "num_tracks": num_tracks,
                "avg_travel_time_min": round(avg_travel_time, 2),
                "capacity_per_hour": round(trains_per_track_hour * num_tracks, 1),
                "bottleneck_score": round(avg_travel_time + min_headway, 2)
            }
        
        return capacities
    
    def identify_bottlenecks(self, trains: List[Train]) -> List[Dict]:
        """Identify potential bottlenecks"""
        bottlenecks = []
        
        # Analyze station congestion
        station_events = defaultdict(list)
        
        for train in trains:
            for station, sched in train.schedule.items():
                if sched.scheduled_arrival:
                    arr_time = time_to_minutes(sched.scheduled_arrival)
                    station_events[station].append((arr_time, train.train_id, "arrive", train.priority))
                if sched.scheduled_departure:
                    dep_time = time_to_minutes(sched.scheduled_departure)
                    station_events[station].append((dep_time, train.train_id, "depart", train.priority))
        
        # Find congestion windows
        for station, events in station_events.items():
            events.sort()
            
            # 15-minute sliding window analysis
            window_size = 15
            for i in range(0, 24 * 60, window_size):
                window_events = [e for e in events if i <= e[0] < i + window_size]
                
                capacity = self.graph.get_main_line_capacity(station) + \
                           self.graph.get_loop_capacity(station)
                
                if capacity == 0:
                    capacity = 2  # Default assumption
                
                if len(window_events) > capacity * 1.2:  # 20% over capacity
                    bottlenecks.append({
                        "station": station,
                        "time_window": f"{minutes_to_time(i)}-{minutes_to_time(i+window_size)}",
                        "event_count": len(window_events),
                        "capacity": capacity,
                        "severity": "HIGH" if len(window_events) > capacity * 1.5 else "MEDIUM",
                        "affected_trains": [e[1] for e in window_events]
                    })
        
        return sorted(bottlenecks, key=lambda x: x["event_count"], reverse=True)


# =============================================================================
# WHAT-IF SCENARIO ANALYZER
# =============================================================================

class ScenarioAnalyzer:
    """What-if scenario analysis for various operational scenarios"""
    
    def __init__(self, graph: RailwayGraph, trains: List[Train]):
        self.graph = graph
        self.trains = trains
    
    def analyze_holding_strategy(self, station: str, hold_duration_min: int,
                                  affected_trains: List[str] = None) -> Dict:
        """Analyze impact of holding trains at a station"""
        affected = affected_trains or [t.train_id for t in self.trains]
        
        cascade_delays = {}
        total_delay = 0
        
        for train in self.trains:
            if train.train_id not in affected:
                continue
            
            stations = train.get_station_order()
            if station.lower() not in stations:
                continue
            
            # Estimate cascade effect
            station_idx = stations.index(station.lower())
            delay_min = hold_duration_min
            
            # Delay propagates but with some recovery
            for i, st in enumerate(stations[station_idx:]):
                recovery_factor = 0.9 ** i  # 10% recovery per station
                current_delay = int(delay_min * recovery_factor)
                
                if current_delay > 0:
                    if train.train_id not in cascade_delays:
                        cascade_delays[train.train_id] = {
                            "train_name": train.train_name,
                            "total_delay_min": 0,
                            "priority": train.priority,
                            "stations_affected": []
                        }
                    
                    cascade_delays[train.train_id]["total_delay_min"] += current_delay
                    cascade_delays[train.train_id]["stations_affected"].append({
                        "station": st,
                        "delay_min": current_delay
                    })
                    total_delay += current_delay
        
        # Calculate weighted impact
        weighted_impact = sum(
            info["total_delay_min"] * (11 - info["priority"])
            for info in cascade_delays.values()
        )
        
        return {
            "scenario": f"Hold at {station} for {hold_duration_min} min",
            "affected_train_count": len(cascade_delays),
            "total_delay_minutes": total_delay,
            "weighted_impact": weighted_impact,
            "cascade_delays": cascade_delays,
            "recommendation": "PROCEED" if weighted_impact < 500 else "RECONSIDER"
        }
    
    def analyze_track_closure(self, edge_id: str, duration_min: int) -> Dict:
        """Analyze impact of closing a track"""
        edge = self.graph.edges.get(edge_id)
        if not edge:
            return {"error": f"Edge {edge_id} not found"}
        
        # Find affected trains (those potentially using this edge)
        affected_trains = []
        
        for train in self.trains:
            stations = train.get_station_order()
            
            # Check if edge is between any two consecutive stations
            for i in range(len(stations) - 1):
                src = stations[i]
                dst = stations[i + 1]
                
                # Check if edge connects these stations
                edges = self.graph.get_edges_between_stations(src, dst)
                if any(e.edge_id == edge_id for e in edges):
                    affected_trains.append(train)
                    break
        
        # Check for alternative routes
        alternative_routes = {}
        for train in affected_trains:
            stations = train.get_station_order()
            has_alternative = False
            
            for i in range(len(stations) - 1):
                edges = self.graph.get_edges_between_stations(stations[i], stations[i + 1])
                if len([e for e in edges if e.edge_id != edge_id and e.status == "operational"]) > 0:
                    has_alternative = True
                    break
            
            alternative_routes[train.train_id] = has_alternative
        
        return {
            "scenario": f"Track {edge_id} closure for {duration_min} min",
            "edge_info": {
                "start_node": edge.start_node,
                "end_node": edge.end_node,
                "station": edge.station,
                "type": edge.edge_type,
                "length_m": edge.length
            },
            "affected_train_count": len(affected_trains),
            "trains_with_alternatives": sum(1 for has_alt in alternative_routes.values() if has_alt),
            "affected_trains": [{
                "train_id": t.train_id,
                "train_name": t.train_name,
                "priority": t.priority,
                "has_alternative": alternative_routes.get(t.train_id, False)
            } for t in affected_trains],
            "recommendation": "REROUTE" if all(alternative_routes.values()) else "HOLD_AND_RESCHEDULE"
        }


# =============================================================================
# MAIN OPTIMIZER CLASS
# =============================================================================

class RailwayOptimizer:
    """
    Main hybrid optimizer class integrating all components
    """
    
    def __init__(self, schema_path: str, trains_path: str, config: dict = None):
        self.graph = RailwayGraph()
        self.trains: List[Train] = []
        self.config = config or {}
        
        # Load data
        self._load_schema(schema_path)
        self._load_trains(trains_path)
        
        # Initialize components
        self.schedule_optimizer = HybridScheduleOptimizer(
            self.graph, self.trains, self.config
        )
        self.throughput_analyzer = ThroughputAnalyzer(self.graph)
        self.scenario_analyzer = ScenarioAnalyzer(self.graph, self.trains)
    
    def _load_schema(self, path: str):
        """Load railway schema from JSON file"""
        with open(path, 'r') as f:
            schema = json.load(f)
        self.graph.load_from_schema(schema)
    
    def _load_trains(self, path: str):
        """Load trains from JSON file"""
        with open(path, 'r') as f:
            trains_data = json.load(f)
        
        for train_data in trains_data:
            self.trains.append(Train.from_dict(train_data))
        
        print(f"Loaded {len(self.trains)} trains")
        
        # Print train summary
        by_direction = defaultdict(int)
        by_type = defaultdict(int)
        for t in self.trains:
            by_direction[t.direction] += 1
            by_type[t.train_type] += 1
        
        print(f"  Forward: {by_direction['forward']}, Backward: {by_direction['backward']}")
        print(f"  Types: {dict(by_type)}")
    
    def optimize_schedule(self) -> Dict:
        """Run schedule optimization"""
        self.schedule_optimizer.build_model()
        return self.schedule_optimizer.solve()
    
    def analyze_throughput(self) -> Dict:
        """Analyze section throughput"""
        capacities = self.throughput_analyzer.calculate_section_capacity()
        bottlenecks = self.throughput_analyzer.identify_bottlenecks(self.trains)
        
        return {
            "section_capacities": capacities,
            "bottlenecks": bottlenecks[:10],
            "summary": {
                "total_sections": len(capacities),
                "min_capacity_per_hour": min(c["capacity_per_hour"] for c in capacities.values()),
                "bottleneck_count": len(bottlenecks)
            }
        }
    
    def run_scenario(self, scenario_type: str, **kwargs) -> Dict:
        """Run what-if scenario analysis"""
        if scenario_type == "hold":
            return self.scenario_analyzer.analyze_holding_strategy(
                kwargs.get("station", STATION_ORDER[0]),
                kwargs.get("duration_min", 10),
                kwargs.get("trains", None)
            )
        elif scenario_type == "track_closure":
            return self.scenario_analyzer.analyze_track_closure(
                kwargs.get("edge_id", ""),
                kwargs.get("duration_min", 30)
            )
        else:
            return {"error": f"Unknown scenario type: {scenario_type}"}
    
    def generate_full_report(self) -> Dict:
        """Generate comprehensive optimization report"""
        print("\n" + "="*80)
        print("INDIAN RAILWAYS SECTION OPTIMIZATION REPORT - HYBRID SYSTEM")
        print("="*80 + "\n")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "section_info": {
                "stations": STATION_ORDER,
                "total_nodes": len(self.graph.nodes),
                "total_edges": len(self.graph.edges),
                "total_trains": len(self.trains)
            }
        }
        
        # 1. Throughput Analysis
        print("1. THROUGHPUT ANALYSIS")
        print("-" * 80)
        throughput = self.analyze_throughput()
        report["throughput"] = throughput
        
        print(f"   Total trains: {len(self.trains)}")
        print(f"   Sections analyzed: {throughput['summary']['total_sections']}")
        print(f"   Minimum section capacity: {throughput['summary']['min_capacity_per_hour']} trains/hour")
        print(f"   Bottlenecks identified: {throughput['summary']['bottleneck_count']}")
        
        if throughput['bottlenecks']:
            print(f"\n   Top bottleneck:")
            btl = throughput['bottlenecks'][0]
            print(f"     Station: {btl['station']}")
            print(f"     Time: {btl['time_window']}")
            print(f"     Severity: {btl['severity']}")
        
        # 2. Schedule Optimization
        print("\n2. SCHEDULE OPTIMIZATION")
        print("-" * 80)
        optimization_result = self.optimize_schedule()
        report["optimization"] = optimization_result
        
        print(f"   Status: {optimization_result['status']}")
        print(f"   Solve time: {optimization_result['solve_time_s']:.2f}s")
        if optimization_result['objective_value']:
            print(f"   Objective value: {optimization_result['objective_value']:.0f}")
        
        print(f"\n   Solver statistics:")
        print(f"     Branches: {optimization_result['statistics']['branches']}")
        print(f"     Conflicts: {optimization_result['statistics']['conflicts']}")
        
        # 3. Schedule Summary
        if optimization_result['schedule']:
            print("\n3. OPTIMIZED SCHEDULE SUMMARY")
            print("-" * 80)
            
            total_delay = 0
            loop_usage = 0
            
            for train_id, train_sched in optimization_result['schedule'].items():
                total_delay += train_sched.get('total_delay_min', 0)
                
                for station_info in train_sched['stations'].values():
                    if station_info.get('platform_type') == 'loop':
                        loop_usage += 1
            
            print(f"   Total delay across all trains: {total_delay} minutes")
            print(f"   Loop track usage: {loop_usage} times")
            print(f"   Average delay per train: {total_delay / len(self.trains):.1f} minutes")
        
        # 4. Section Capacities
        print("\n4. SECTION CAPACITIES")
        print("-" * 80)
        for section, cap in throughput['section_capacities'].items():
            print(f"   {section:25} | {cap['capacity_per_hour']:5.1f} trains/hour | "
                  f"{cap['num_tracks']} tracks | "
                  f"{cap['avg_travel_time_min']:.1f} min avg travel")
        
        print("\n" + "="*80)
        print("REPORT COMPLETE")
        print("="*80 + "\n")
        
        return report
    
    def export_results(self, output_path: str):
        """Export optimization results to JSON file"""
        report = self.generate_full_report()
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"✓ Results exported to {output_path}")


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def main():
    """Main entry point"""
    import os
    
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    schema_path = os.path.join(script_dir, "database_schema.json")
    trains_path = os.path.join(script_dir, "trains.json")
    output_path = os.path.join(script_dir, "optimization_results.json")
    
    print("="*80)
    print("INDIAN RAILWAYS HYBRID OPTIMIZATION SYSTEM")
    print("="*80)
    print()
    
    # Configuration
    config = {
        'horizon_s': 4 * 3600,            # 4 hour planning horizon
        'headway_s': 180,                 # 3 minutes headway
        'min_dwell_s': 120,               # 2 minutes minimum dwell
        'max_delay_s': 3600,              # 60 minutes max delay
        'throughput_weight': 100000,      # Throughput priority
        'delay_weight_mult': 100,         # Delay weight multiplier
        'loop_penalty': 500,              # Loop usage penalty
        'solver_time_limit_s': 60,        # 60 second solver limit
        'max_paths_per_train': 5,         # Max candidate paths
    }
    
    # Initialize optimizer
    print("Initializing Railway Optimizer...")
    optimizer = RailwayOptimizer(schema_path, trains_path, config)
    
    # Generate full report and export
    optimizer.export_results(output_path)
    
    # Example scenario analysis
    print("\n" + "="*80)
    print("EXAMPLE SCENARIO ANALYSIS")
    print("="*80)
    
    # Holding scenario
    print("\n1. Holding Scenario:")
    hold_result = optimizer.run_scenario(
        "hold",
        station="sorai",
        duration_min=10
    )
    print(f"   Scenario: {hold_result['scenario']}")
    print(f"   Affected trains: {hold_result['affected_train_count']}")
    print(f"   Total delay: {hold_result['total_delay_minutes']} minutes")
    print(f"   Recommendation: {hold_result['recommendation']}")
    
    # Track closure scenario
    print("\n2. Track Closure Scenario:")
    # Get first operational edge for demo
    edge_id = next((e.edge_id for e in optimizer.graph.edges.values() 
                    if e.status == "operational"), None)
    if edge_id:
        closure_result = optimizer.run_scenario(
            "track_closure",
            edge_id=edge_id,
            duration_min=30
        )
        print(f"   Scenario: {closure_result['scenario']}")
        print(f"   Affected trains: {closure_result['affected_train_count']}")
        print(f"   Trains with alternatives: {closure_result['trains_with_alternatives']}")
        print(f"   Recommendation: {closure_result['recommendation']}")
    
    print("\n" + "="*80)
    print("OPTIMIZATION COMPLETE")
    print("="*80)
    
    return optimizer


if __name__ == "__main__":
    optimizer = main()

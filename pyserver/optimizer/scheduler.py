"""
Train scheduler using Google OR-Tools CP-SAT solver.
Implements multi-objective optimization for train scheduling.
"""

import math
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from ortools.sat.python import cp_model

from models.graph import RailwayNetwork, Edge
from models.train import Train, TrainPriority
from algorithms.routing import RouteFinder, PathResult


SECONDS_PER_HOUR = 3600


@dataclass
class ScheduleEntry:
    """Scheduled entry/exit times for a train on an edge."""
    train_id: str
    edge_id: str
    enter_time: int  # seconds
    exit_time: int   # seconds
    duration: int    # seconds


@dataclass
class TrainSchedule:
    """Complete schedule for a train."""
    train_id: str
    train_name: str
    priority: int
    route: List[str]           # List of edge IDs
    use_loop: bool
    entries: List[ScheduleEntry]
    total_time: int            # Total journey time
    total_delay: int           # Delay from schedule
    holding_times: Dict[str, int]  # edge_id -> holding time


class TrainScheduler:
    """
    OR-Tools CP-SAT based train scheduler.
    Optimizes train schedules to minimize delays and conflicts.
    """
    
    # Default parameters
    DEFAULT_TIME_HORIZON = 6 * SECONDS_PER_HOUR  # 6 hours
    DEFAULT_HEADWAY = 180  # seconds between trains on same block
    LOOP_PENALTY = 100     # Penalty for using loop lines
    HOLDING_MAX = 600      # Maximum holding time (10 minutes)
    
    def __init__(
        self,
        network: RailwayNetwork,
        time_horizon: int = DEFAULT_TIME_HORIZON
    ):
        self.network = network
        self.time_horizon = time_horizon
        self.route_finder = RouteFinder(network)
        
        # Solver state
        self.model: Optional[cp_model.CpModel] = None
        self.trains: List[Train] = []
        self.routes: Dict[str, PathResult] = {}  # train_id -> route
        
        # Decision variables
        self.vars: Dict[str, Dict] = {}
        
        # Big-M constant for constraint linearization
        self.M = 24 * SECONDS_PER_HOUR
    
    def add_train(self, train: Train, route: Optional[PathResult] = None) -> None:
        """Add a train to be scheduled."""
        self.trains.append(train)
        
        if route:
            self.routes[train.train_id] = route
    
    def add_trains(self, trains: List[Train]) -> None:
        """Add multiple trains to be scheduled."""
        for train in trains:
            self.add_train(train)
    
    def _find_routes(self) -> None:
        """Find routes for trains that don't have one assigned."""
        for train in self.trains:
            if train.train_id in self.routes:
                continue
            
            # Find route based on train's current position and schedule
            # For now, find path through the network
            if train.current_edge:
                edge = self.network.edges.get(train.current_edge)
                if edge:
                    # Find path from current edge to section end
                    direction = 'upstream' if train.direction.value == 'upstream' else 'downstream'
                    
                    # Get section end nodes
                    end_nodes = [n for n in self.network.nodes.values() 
                                if n.node_type == 'section_end']
                    
                    for end_node in end_nodes:
                        path = self.route_finder.shortest_path(
                            edge.end_node,
                            end_node.node_id,
                            train.priority_weight,
                            direction=direction
                        )
                        if path:
                            self.routes[train.train_id] = path
                            break
    
    def _calculate_travel_time(self, edge: Edge, train: Train) -> int:
        """Calculate travel time for a train on an edge."""
        speed = min(edge.speed_limit, train.max_speed)
        if speed <= 0:
            speed = 10  # Minimum speed
        
        speed_mps = (speed * 1000) / SECONDS_PER_HOUR
        time_seconds = edge.edge_length / speed_mps
        
        return max(1, int(math.ceil(time_seconds)))
    
    def _create_variables(self) -> None:
        """Create decision variables for the model."""
        for train in self.trains:
            tid = train.train_id
            self.vars[tid] = {}
            
            route = self.routes.get(tid)
            if not route:
                continue
            
            # Loop usage variable
            self.vars[tid]['use_loop'] = self.model.NewBoolVar(f'use_loop_{tid}')
            
            # Entry/exit times for each edge
            self.vars[tid]['edge_enter'] = {}
            self.vars[tid]['edge_exit'] = {}
            self.vars[tid]['edge_duration'] = {}
            self.vars[tid]['holding'] = {}
            
            for i, edge_id in enumerate(route.edges):
                edge = self.network.edges.get(edge_id)
                if not edge:
                    continue
                
                # Entry time
                self.vars[tid]['edge_enter'][edge_id] = self.model.NewIntVar(
                    0, self.time_horizon, f'enter_{tid}_{edge_id}'
                )
                
                # Exit time
                self.vars[tid]['edge_exit'][edge_id] = self.model.NewIntVar(
                    0, self.time_horizon, f'exit_{tid}_{edge_id}'
                )
                
                # Duration (travel time + holding)
                base_duration = self._calculate_travel_time(edge, train)
                self.vars[tid]['edge_duration'][edge_id] = self.model.NewIntVar(
                    base_duration, base_duration + self.HOLDING_MAX,
                    f'duration_{tid}_{edge_id}'
                )
                
                # Holding time
                self.vars[tid]['holding'][edge_id] = self.model.NewIntVar(
                    0, self.HOLDING_MAX, f'hold_{tid}_{edge_id}'
                )
                
                # Constraint: exit = enter + duration
                self.model.Add(
                    self.vars[tid]['edge_exit'][edge_id] == 
                    self.vars[tid]['edge_enter'][edge_id] + 
                    self.vars[tid]['edge_duration'][edge_id]
                )
                
                # Constraint: duration = base_duration + holding
                self.model.Add(
                    self.vars[tid]['edge_duration'][edge_id] == 
                    base_duration + self.vars[tid]['holding'][edge_id]
                )
            
            # Constraint: Sequential edge traversal
            edges = route.edges
            for i in range(len(edges) - 1):
                if edges[i] in self.vars[tid]['edge_exit'] and edges[i+1] in self.vars[tid]['edge_enter']:
                    self.model.Add(
                        self.vars[tid]['edge_enter'][edges[i+1]] >= 
                        self.vars[tid]['edge_exit'][edges[i]]
                    )
            
            # Track if route uses loops
            uses_loop = route.uses_loop
            if not uses_loop:
                self.model.Add(self.vars[tid]['use_loop'] == 0)
    
    def _add_headway_constraints(self) -> None:
        """Add headway constraints between trains on same edges."""
        # Group trains by edges they traverse
        edge_trains: Dict[str, List[str]] = {}
        
        for train in self.trains:
            tid = train.train_id
            route = self.routes.get(tid)
            if not route:
                continue
            
            for edge_id in route.edges:
                if edge_id not in edge_trains:
                    edge_trains[edge_id] = []
                edge_trains[edge_id].append(tid)
        
        # Add constraints for each edge with multiple trains
        for edge_id, train_ids in edge_trains.items():
            if len(train_ids) < 2:
                continue
            
            edge = self.network.edges.get(edge_id)
            headway = self.DEFAULT_HEADWAY
            
            for i in range(len(train_ids)):
                for j in range(i + 1, len(train_ids)):
                    t1, t2 = train_ids[i], train_ids[j]
                    
                    if edge_id not in self.vars[t1].get('edge_enter', {}):
                        continue
                    if edge_id not in self.vars[t2].get('edge_enter', {}):
                        continue
                    
                    # Either t1 before t2 or t2 before t1
                    b = self.model.NewBoolVar(f'order_{t1}_{t2}_{edge_id}')
                    
                    # If b=1: t1 exits before t2 enters (t1 first)
                    self.model.Add(
                        self.vars[t1]['edge_exit'][edge_id] + headway <= 
                        self.vars[t2]['edge_enter'][edge_id]
                    ).OnlyEnforceIf(b)
                    
                    # If b=0: t2 exits before t1 enters (t2 first)
                    self.model.Add(
                        self.vars[t2]['edge_exit'][edge_id] + headway <= 
                        self.vars[t1]['edge_enter'][edge_id]
                    ).OnlyEnforceIf(b.Not())
    
    def _add_block_occupancy_constraints(self) -> None:
        """Add constraints ensuring no two trains on same block simultaneously."""
        # Similar to headway but stricter - no overlap at all
        edge_trains: Dict[str, List[str]] = {}
        
        for train in self.trains:
            tid = train.train_id
            route = self.routes.get(tid)
            if not route:
                continue
            
            for edge_id in route.edges:
                if edge_id not in edge_trains:
                    edge_trains[edge_id] = []
                edge_trains[edge_id].append(tid)
        
        for edge_id, train_ids in edge_trains.items():
            if len(train_ids) < 2:
                continue
            
            for i in range(len(train_ids)):
                for j in range(i + 1, len(train_ids)):
                    t1, t2 = train_ids[i], train_ids[j]
                    
                    if edge_id not in self.vars[t1].get('edge_enter', {}):
                        continue
                    if edge_id not in self.vars[t2].get('edge_enter', {}):
                        continue
                    
                    # Intervals must not overlap
                    b = self.model.NewBoolVar(f'no_overlap_{t1}_{t2}_{edge_id}')
                    
                    self.model.Add(
                        self.vars[t1]['edge_exit'][edge_id] <= 
                        self.vars[t2]['edge_enter'][edge_id]
                    ).OnlyEnforceIf(b)
                    
                    self.model.Add(
                        self.vars[t2]['edge_exit'][edge_id] <= 
                        self.vars[t1]['edge_enter'][edge_id]
                    ).OnlyEnforceIf(b.Not())
    
    def _add_priority_constraints(self) -> None:
        """Add constraints for priority-based ordering."""
        # Higher priority trains should generally go first
        sorted_trains = sorted(self.trains, key=lambda t: -t.priority_weight)
        
        for i in range(len(sorted_trains)):
            for j in range(i + 1, len(sorted_trains)):
                high = sorted_trains[i]
                low = sorted_trains[j]
                
                # Find common edges
                high_route = self.routes.get(high.train_id)
                low_route = self.routes.get(low.train_id)
                
                if not high_route or not low_route:
                    continue
                
                common_edges = set(high_route.edges) & set(low_route.edges)
                
                for edge_id in common_edges:
                    if edge_id not in self.vars[high.train_id].get('edge_enter', {}):
                        continue
                    if edge_id not in self.vars[low.train_id].get('edge_enter', {}):
                        continue
                    
                    # Soft constraint: prefer high priority first
                    # This is handled in the objective function
    
    def _add_objective(self) -> None:
        """Add multi-objective optimization function."""
        objective_terms = []
        
        for train in self.trains:
            tid = train.train_id
            route = self.routes.get(tid)
            if not route:
                continue
            
            priority = train.priority_weight
            
            # Minimize entry time (weighted by priority)
            if route.edges and route.edges[0] in self.vars[tid].get('edge_enter', {}):
                first_edge = route.edges[0]
                objective_terms.append(
                    priority * self.vars[tid]['edge_enter'][first_edge]
                )
            
            # Minimize total holding time
            for edge_id, hold_var in self.vars[tid].get('holding', {}).items():
                objective_terms.append(priority * hold_var)
            
            # Penalty for using loops
            objective_terms.append(
                self.LOOP_PENALTY * self.vars[tid].get('use_loop', 0)
            )
        
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
    
    def solve(self, time_limit_seconds: int = 30) -> List[TrainSchedule]:
        """
        Solve the scheduling problem.
        
        Returns:
            List of TrainSchedule objects
        """
        # Initialize model
        self.model = cp_model.CpModel()
        
        # Find routes if needed
        self._find_routes()
        
        # Create variables
        self._create_variables()
        
        # Add constraints
        self._add_headway_constraints()
        self._add_block_occupancy_constraints()
        self._add_priority_constraints()
        
        # Add objective
        self._add_objective()
        
        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        
        status = solver.Solve(self.model)
        
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            print(f"No solution found. Status: {status}")
            return []
        
        # Extract solution
        schedules = []
        
        for train in self.trains:
            tid = train.train_id
            route = self.routes.get(tid)
            if not route:
                continue
            
            entries = []
            holding_times = {}
            
            for edge_id in route.edges:
                if edge_id not in self.vars[tid].get('edge_enter', {}):
                    continue
                
                enter_time = solver.Value(self.vars[tid]['edge_enter'][edge_id])
                exit_time = solver.Value(self.vars[tid]['edge_exit'][edge_id])
                duration = solver.Value(self.vars[tid]['edge_duration'][edge_id])
                holding = solver.Value(self.vars[tid]['holding'][edge_id])
                
                entries.append(ScheduleEntry(
                    train_id=tid,
                    edge_id=edge_id,
                    enter_time=enter_time,
                    exit_time=exit_time,
                    duration=duration
                ))
                
                if holding > 0:
                    holding_times[edge_id] = holding
            
            use_loop = False
            if 'use_loop' in self.vars[tid]:
                use_loop = bool(solver.Value(self.vars[tid]['use_loop']))
            
            total_time = 0
            if entries:
                total_time = entries[-1].exit_time - entries[0].enter_time
            
            schedules.append(TrainSchedule(
                train_id=tid,
                train_name=train.train_name,
                priority=train.priority_weight,
                route=route.edges,
                use_loop=use_loop,
                entries=entries,
                total_time=total_time,
                total_delay=sum(holding_times.values()),
                holding_times=holding_times
            ))
        
        return schedules
    
    def to_dict(self, schedules: List[TrainSchedule]) -> List[Dict[str, Any]]:
        """Convert schedules to dictionary format."""
        result = []
        
        for schedule in schedules:
            result.append({
                'train_id': schedule.train_id,
                'train_name': schedule.train_name,
                'priority': schedule.priority,
                'use_loop': schedule.use_loop,
                'route': schedule.route,
                'total_time_seconds': schedule.total_time,
                'total_delay_seconds': schedule.total_delay,
                'holding_times': schedule.holding_times,
                'schedule': [
                    {
                        'edge_id': e.edge_id,
                        'enter_at_s': e.enter_time,
                        'exit_at_s': e.exit_time,
                        'duration_s': e.duration
                    }
                    for e in schedule.entries
                ]
            })
        
        return result

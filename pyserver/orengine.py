"""
Railway Optimization Engine
Main entry point for the train scheduling and optimization system.

Usage:
    python orengine.py database_schema.json
    
Or via API:
    GET /api/optimize?sectionid=<ID>
"""

import json
import sys
from typing import Dict, List, Any, Optional
from pathlib import Path

from models.graph import RailwayNetwork, SignalAspect
from models.train import Train, TrainPriority
from utils.data_loader import SectionDataLoader
from algorithms.routing import RouteFinder
from algorithms.signaling import SignalController
from optimizer.scheduler import TrainScheduler
from optimizer.decision_engine import DecisionEngine


class RailwayOptimizer:
    """
    Main optimization engine integrating all components.
    """
    
    def __init__(self, time_horizon: int = 6 * 3600):
        self.time_horizon = time_horizon
        self.network: Optional[RailwayNetwork] = None
        self.trains: List[Train] = []
        self.loader = SectionDataLoader()
        
        # Components (initialized after loading data)
        self.route_finder: Optional[RouteFinder] = None
        self.signal_controller: Optional[SignalController] = None
        self.scheduler: Optional[TrainScheduler] = None
        self.decision_engine: Optional[DecisionEngine] = None
    
    def load_data(self, source: str | Dict[str, Any]) -> None:
        """Load section data from file or dictionary."""
        if isinstance(source, str):
            self.network = self.loader.load_from_file(source)
        else:
            self.network = self.loader.load_from_dict(source)
        
        # Initialize components
        self._initialize_components()
        
        # Load trains if available
        trains_data = self.loader.get_trains()
        for train_data in trains_data:
            self.trains.append(Train.from_dict(train_data))
    
    def _initialize_components(self) -> None:
        """Initialize all optimization components."""
        if not self.network:
            return
        
        self.route_finder = RouteFinder(self.network)
        self.signal_controller = SignalController(self.network)
        self.scheduler = TrainScheduler(self.network, self.time_horizon)
        self.decision_engine = DecisionEngine(self.network)
    
    def add_train(self, train: Train) -> None:
        """Add a train to be optimized."""
        self.trains.append(train)
    
    def add_trains_from_dict(self, trains_data: List[Dict[str, Any]]) -> None:
        """Add multiple trains from dictionary data."""
        for data in trains_data:
            self.trains.append(Train.from_dict(data))
    
    def optimize(self, time_limit: int = 30) -> Dict[str, Any]:
        """
        Run the full optimization pipeline.
        
        Returns:
            Dictionary with optimization results
        """
        if not self.network:
            return {'error': 'No network data loaded'}
        
        if not self.trains:
            # Return just signal states if no trains
            return self._generate_output([], [])
        
        # Step 1: Generate decisions for current scenario
        decisions = self.decision_engine.evaluate_scenario(self.trains)
        
        # Step 2: Find routes for trains
        for train in self.trains:
            if train.current_edge:
                edge = self.network.edges.get(train.current_edge)
                if edge:
                    direction = 'upstream' if train.direction.value == 'upstream' else 'downstream'
                    
                    # Find shortest path
                    path = self.route_finder.shortest_path(
                        edge.end_node,
                        self._find_exit_node(direction),
                        train.priority_weight,
                        direction=direction
                    )
                    
                    if path:
                        train.assigned_route = path.edges
                        self.scheduler.add_train(train, path)
                    else:
                        self.scheduler.add_train(train)
        
        # Step 3: Solve scheduling problem
        schedules = self.scheduler.solve(time_limit)
        
        # Step 4: Update signal states
        self.signal_controller.update_all_signals()
        
        # Step 5: Generate output
        return self._generate_output(schedules, decisions)
    
    def _find_exit_node(self, direction: str) -> str:
        """Find the exit node for a given direction."""
        for node in self.network.nodes.values():
            if node.node_type == 'section_end':
                return node.node_id
        
        # Fallback: return last station end
        for node in self.network.nodes.values():
            if node.node_type == 'station_end':
                return node.node_id
        
        return list(self.network.nodes.keys())[-1]
    
    def _generate_output(
        self,
        schedules: List,
        decisions: List
    ) -> Dict[str, Any]:
        """Generate output dictionary matching input schema structure."""
        # Get section info
        section_info = self.loader.get_section_info()
        
        # Build nodes with signal states
        nodes_output = []
        for node_id, node in self.network.nodes.items():
            nodes_output.append({
                'nodeId': node.node_id,
                'x': node.x,
                'y': node.y,
                'nodeType': node.node_type,
                'name': node.name,
                'line': node.line,
                'station': node.station,
                'status': node.status,
                'description': node.description,
                'signalColor': node.signal_color
            })
        
        # Build edges with occupancy and signal states
        edges_output = []
        for edge_id, edge in self.network.edges.items():
            block = self.signal_controller.blocks.get(edge_id) if self.signal_controller else None
            
            edges_output.append({
                'id': edge.edge_id,
                'startNode': edge.start_node,
                'endNode': edge.end_node,
                'stream': edge.stream,
                'direction': edge.direction,
                'edgeType': edge.edge_type,
                'edgeLength': edge.edge_length,
                'speed_limit': edge.speed_limit,
                'station': edge.station,
                'status': edge.status,
                'edgeColor': edge.edge_color,
                # Additional optimization info
                'isOccupied': block.is_occupied if block else False,
                'occupyingTrain': block.occupying_train if block else None,
                'signalAspect': block.signal_aspect.value if block else 'green'
            })
        
        # Build train schedules
        train_schedules = []
        for schedule in schedules:
            train_schedules.append({
                'train_id': schedule.train_id,
                'train_name': schedule.train_name,
                'priority': schedule.priority,
                'use_loop': schedule.use_loop,
                'route': schedule.route,
                'total_time_seconds': schedule.total_time,
                'total_delay_seconds': schedule.total_delay,
                'holding_times': schedule.holding_times,
                'entries': [
                    {
                        'edge_id': e.edge_id,
                        'enter_at_s': e.enter_time,
                        'exit_at_s': e.exit_time,
                        'duration_s': e.duration
                    }
                    for e in schedule.entries
                ]
            })
        
        # Build decisions
        decisions_output = self.decision_engine.to_dict() if self.decision_engine else []
        
        return {
            'railway_section': section_info,
            'nodes': nodes_output,
            'edges': edges_output,
            'trains': [t.to_dict() for t in self.trains],
            'schedules': train_schedules,
            'decisions': decisions_output,
            'signals': self.signal_controller.get_block_status() if self.signal_controller else {},
            'conflicts': self.signal_controller.get_conflicts() if self.signal_controller else []
        }


def get_train_priorities(section_data: Dict[str, Any] = None, json_file: str = None) -> Dict[str, Any]:
    """
    Main function to get train priorities and schedules.
    Used by the FastAPI server.
    
    Args:
        section_data: Section data dictionary (from API)
        json_file: Path to JSON file
    
    Returns:
        Optimization results dictionary
    """
    optimizer = RailwayOptimizer()
    
    if section_data:
        optimizer.load_data(section_data)
    elif json_file:
        optimizer.load_data(json_file)
    else:
        return {'error': 'No data source provided'}
    
    return optimizer.optimize()


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python orengine.py <section_data.json>")
        print("\nThis will output optimized schedules to stdout as JSON.")
        sys.exit(1)
    
    filepath = sys.argv[1]
    
    if not Path(filepath).exists():
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    # Run optimization
    result = get_train_priorities(json_file=filepath)
    
    # Output as JSON
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()

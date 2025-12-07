"""
Routing algorithms for railway network.
Implements path finding with dynamic weights and alternative routes.
"""

import heapq
from typing import Dict, List, Tuple, Optional, Set, Callable
from dataclasses import dataclass

from models.graph import RailwayNetwork, Edge, Node


@dataclass
class PathResult:
    """Result of a path finding operation."""
    edges: List[str]
    nodes: List[str]
    total_length: float  # meters
    total_time: float    # seconds
    cost: float          # weighted cost
    uses_loop: bool


class RouteFinder:
    """Path finding algorithms for the railway network."""
    
    # Weight penalties
    OCCUPANCY_PENALTY = 100000  # Very high penalty for occupied edges
    LOOP_PENALTY = 50          # Small penalty for using loop lines
    SPEED_REDUCTION_PENALTY = 10  # Penalty per km/h below max speed
    
    def __init__(self, network: RailwayNetwork):
        self.network = network
        self._edge_weights: Dict[str, float] = {}
    
    def calculate_edge_weight(
        self,
        edge: Edge,
        train_priority: int = 50,
        consider_occupancy: bool = True
    ) -> float:
        """
        Calculate edge weight for path finding.
        
        Weight = base_time + occupancy_penalty + loop_penalty - priority_bonus
        """
        # Base weight is travel time
        weight = edge.travel_time_seconds
        
        # Add occupancy penalty
        if consider_occupancy and edge.is_occupied:
            weight += self.OCCUPANCY_PENALTY
        
        # Add loop penalty (prefer main lines)
        if edge.is_loop:
            weight += self.LOOP_PENALTY
        
        # Apply priority bonus (higher priority trains get slightly lower weights)
        priority_factor = 1.0 - (train_priority / 2000)  # Max 50% reduction for emergency
        weight *= max(0.5, priority_factor)
        
        return weight
    
    def shortest_path(
        self,
        start_node: str,
        end_node: str,
        train_priority: int = 50,
        avoid_edges: Optional[Set[str]] = None,
        direction: Optional[str] = None
    ) -> Optional[PathResult]:
        """
        Find shortest path using Dijkstra's algorithm with dynamic weights.
        
        Args:
            start_node: Starting node ID
            end_node: Destination node ID
            train_priority: Train priority for weight calculation
            avoid_edges: Set of edge IDs to avoid
            direction: 'upstream' or 'downstream' to prefer certain streams
        
        Returns:
            PathResult or None if no path found
        """
        if start_node not in self.network.nodes or end_node not in self.network.nodes:
            return None
        
        avoid_edges = avoid_edges or set()
        
        # Priority queue: (cost, node_id, path_edges, path_nodes)
        pq = [(0.0, start_node, [], [start_node])]
        visited = set()
        
        while pq:
            cost, current, path_edges, path_nodes = heapq.heappop(pq)
            
            if current == end_node:
                return self._create_path_result(path_edges)
            
            if current in visited:
                continue
            visited.add(current)
            
            # Explore outgoing edges
            for edge in self.network.get_outgoing_edges(current):
                if edge.edge_id in avoid_edges:
                    continue
                
                # Determine next node
                if edge.start_node == current:
                    next_node = edge.end_node
                elif edge.is_bidirectional and edge.end_node == current:
                    next_node = edge.start_node
                else:
                    continue  # Can't traverse this edge from current node
                
                if next_node in visited:
                    continue
                
                # Check direction preference
                if direction:
                    if direction == 'upstream' and edge.stream == 'downstream':
                        continue
                    if direction == 'downstream' and edge.stream == 'upstream':
                        continue
                
                edge_weight = self.calculate_edge_weight(edge, train_priority)
                new_cost = cost + edge_weight
                
                heapq.heappush(pq, (
                    new_cost,
                    next_node,
                    path_edges + [edge.edge_id],
                    path_nodes + [next_node]
                ))
        
        return None  # No path found
    
    def k_shortest_paths(
        self,
        start_node: str,
        end_node: str,
        k: int = 3,
        train_priority: int = 50
    ) -> List[PathResult]:
        """
        Find k shortest paths using Yen's algorithm.
        
        Args:
            start_node: Starting node ID
            end_node: Destination node ID
            k: Number of paths to find
            train_priority: Train priority for weight calculation
        
        Returns:
            List of up to k PathResults, sorted by cost
        """
        paths: List[PathResult] = []
        
        # Find first shortest path
        first_path = self.shortest_path(start_node, end_node, train_priority)
        if not first_path:
            return []
        paths.append(first_path)
        
        # Candidates for additional paths
        candidates: List[PathResult] = []
        
        for i in range(1, k):
            if not paths:
                break
            
            prev_path = paths[-1]
            
            # For each node in previous path (except last)
            for j in range(len(prev_path.nodes) - 1):
                spur_node = prev_path.nodes[j]
                root_path = prev_path.edges[:j]
                
                # Avoid edges used by other paths at this spur point
                avoid = set()
                for p in paths:
                    if len(p.edges) > j and p.edges[:j] == root_path:
                        if len(p.edges) > j:
                            avoid.add(p.edges[j])
                
                # Find alternative from spur node
                spur_path = self.shortest_path(
                    spur_node, 
                    end_node, 
                    train_priority, 
                    avoid_edges=avoid
                )
                
                if spur_path:
                    # Combine root and spur paths
                    combined_edges = root_path + spur_path.edges
                    combined = self._create_path_result(combined_edges)
                    
                    # Check if this path is already known
                    is_duplicate = any(
                        p.edges == combined.edges for p in paths + candidates
                    )
                    if not is_duplicate:
                        candidates.append(combined)
            
            if not candidates:
                break
            
            # Sort candidates and add best one
            candidates.sort(key=lambda p: p.cost)
            paths.append(candidates.pop(0))
        
        return paths
    
    def find_route_with_loops(
        self,
        start_node: str,
        end_node: str,
        train_priority: int = 50,
        require_loop: bool = False
    ) -> Tuple[Optional[PathResult], Optional[PathResult]]:
        """
        Find both main line and loop line routes.
        
        Returns:
            Tuple of (main_line_path, loop_path)
        """
        # Find main line path (avoiding loops)
        main_path = None
        if not require_loop:
            loop_edges = {e.edge_id for e in self.network.get_loop_edges()}
            main_path = self.shortest_path(
                start_node, 
                end_node, 
                train_priority,
                avoid_edges=loop_edges
            )
        
        # Find loop path (must use at least one loop edge)
        main_edges = {e.edge_id for e in self.network.get_main_line_edges()}
        loop_path = self.shortest_path(
            start_node,
            end_node,
            train_priority,
            avoid_edges=main_edges if require_loop else None
        )
        
        return main_path, loop_path
    
    def _create_path_result(self, edge_ids: List[str]) -> PathResult:
        """Create a PathResult from a list of edge IDs."""
        if not edge_ids:
            return PathResult([], [], 0, 0, 0, False)
        
        # Extract nodes from edges
        nodes = []
        total_length = 0
        total_time = 0
        total_cost = 0
        uses_loop = False
        
        for i, eid in enumerate(edge_ids):
            edge = self.network.edges.get(eid)
            if not edge:
                continue
            
            if i == 0:
                nodes.append(edge.start_node)
            nodes.append(edge.end_node)
            
            total_length += edge.edge_length
            total_time += edge.travel_time_seconds
            total_cost += self.calculate_edge_weight(edge)
            
            if edge.is_loop:
                uses_loop = True
        
        return PathResult(
            edges=edge_ids,
            nodes=nodes,
            total_length=total_length,
            total_time=total_time,
            cost=total_cost,
            uses_loop=uses_loop
        )
    
    def get_path_between_stations(
        self,
        from_station: str,
        to_station: str,
        train_priority: int = 50,
        direction: Optional[str] = None
    ) -> Optional[PathResult]:
        """Find path between two stations."""
        # Get station boundary nodes
        from_nodes = self.network.get_station_nodes(from_station)
        to_nodes = self.network.get_station_nodes(to_station)
        
        if not from_nodes or not to_nodes:
            return None
        
        # Find best path considering exit/entry points
        best_path = None
        best_cost = float('inf')
        
        for from_node in from_nodes:
            if from_node.node_type not in ['station_end', 'section_start']:
                continue
            for to_node in to_nodes:
                if to_node.node_type not in ['station_start', 'section_end']:
                    continue
                
                path = self.shortest_path(
                    from_node.node_id,
                    to_node.node_id,
                    train_priority,
                    direction=direction
                )
                
                if path and path.cost < best_cost:
                    best_path = path
                    best_cost = path.cost
        
        return best_path

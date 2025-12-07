"""
Graph data structures for railway network representation.
Implements node-edge topology for the Vidisha Railway Complex.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from enum import Enum


class NodeType(Enum):
    """Types of nodes in the railway network."""
    SECTION_START = "section_start"
    SECTION_END = "section_end"
    STATION_START = "station_start"
    STATION_END = "station_end"
    TURNING = "turning"
    LOOP_START = "loop_start"
    LOOP_END = "loop_end"
    LOOP_CORNER = "loop_corner"
    YARD = "yard"
    SIGNAL = "signal"


class StreamType(Enum):
    """Stream types for edges (track direction)."""
    UPSTREAM = "upstream"           # Red - towards Bina
    DOWNSTREAM = "downstream"       # Blue - towards Bhopal
    BIDIRECTIONAL = "bidirectional" # Yellow - both directions
    UPSTREAM_LOOP = "upstream_loop" # Purple
    DOWNSTREAM_LOOP = "downstream_loop"  # Green
    YARD = "yard"                   # Black
    CROSSOVER = "crossover"         # Orange - turning/switching


class EdgeType(Enum):
    """Types of track segments."""
    UP_MAIN = "up_main"
    DOWN_MAIN = "down_main"
    BOTH_MAIN = "both_main"
    UP_LOOP = "up_loop"
    DOWN_LOOP = "down_loop"
    CROSSOVER = "crossover"
    YARD_LINE = "yard_line"
    MAIN = "main"


class SignalAspect(Enum):
    """4-aspect signaling system."""
    GREEN = "green"           # Proceed at full speed
    DOUBLE_YELLOW = "double_yellow"  # Caution, prepare to reduce speed
    SINGLE_YELLOW = "single_yellow"  # Prepare to stop at next signal
    RED = "red"               # Stop


@dataclass
class Node:
    """Represents a point in the railway network."""
    node_id: str
    x: float
    y: float
    node_type: str
    name: str
    line: str
    station: str
    status: str = "active"
    description: str = ""
    signal_color: str = ""
    
    @property
    def is_station_boundary(self) -> bool:
        return self.node_type in ["station_start", "station_end"]
    
    @property
    def is_loop_point(self) -> bool:
        return self.node_type in ["loop_start", "loop_end", "loop_corner"]
    
    @property
    def is_yard(self) -> bool:
        return self.node_type == "yard"


@dataclass
class Edge:
    """Represents a track segment between two nodes."""
    edge_id: str
    start_node: str
    end_node: str
    stream: str
    direction: str
    edge_type: str
    edge_length: float  # meters
    speed_limit: float  # km/h
    station: str
    status: str = "operational"
    edge_color: str = ""
    
    # Dynamic state
    is_occupied: bool = False
    occupying_train: Optional[str] = None
    signal_aspect: SignalAspect = field(default=SignalAspect.GREEN)
    
    @property
    def is_bidirectional(self) -> bool:
        return self.direction == "bidirectional"
    
    @property
    def is_loop(self) -> bool:
        return "loop" in self.edge_type.lower() or "loop" in self.stream.lower()
    
    @property
    def is_main_line(self) -> bool:
        return "main" in self.edge_type.lower() and not self.is_loop
    
    @property
    def travel_time_seconds(self) -> float:
        """Calculate travel time based on length and speed limit."""
        if self.speed_limit <= 0:
            return float('inf')
        speed_mps = (self.speed_limit * 1000) / 3600
        return self.edge_length / speed_mps


@dataclass
class RailwayNetwork:
    """Graph representation of the railway network."""
    nodes: Dict[str, Node] = field(default_factory=dict)
    edges: Dict[str, Edge] = field(default_factory=dict)
    adjacency: Dict[str, List[str]] = field(default_factory=dict)  # node_id -> [edge_ids]
    reverse_adjacency: Dict[str, List[str]] = field(default_factory=dict)  # node_id -> [incoming edge_ids]
    stations: Set[str] = field(default_factory=set)
    
    def add_node(self, node: Node) -> None:
        """Add a node to the network."""
        self.nodes[node.node_id] = node
        if node.node_id not in self.adjacency:
            self.adjacency[node.node_id] = []
        if node.node_id not in self.reverse_adjacency:
            self.reverse_adjacency[node.node_id] = []
        if node.station:
            self.stations.add(node.station)
    
    def add_edge(self, edge: Edge) -> None:
        """Add an edge to the network."""
        self.edges[edge.edge_id] = edge
        
        # Add to adjacency list (outgoing edges)
        if edge.start_node not in self.adjacency:
            self.adjacency[edge.start_node] = []
        self.adjacency[edge.start_node].append(edge.edge_id)
        
        # Add to reverse adjacency (incoming edges)
        if edge.end_node not in self.reverse_adjacency:
            self.reverse_adjacency[edge.end_node] = []
        self.reverse_adjacency[edge.end_node].append(edge.edge_id)
        
        # For bidirectional edges, add both directions
        if edge.is_bidirectional:
            if edge.end_node not in self.adjacency:
                self.adjacency[edge.end_node] = []
            self.adjacency[edge.end_node].append(edge.edge_id)
            
            if edge.start_node not in self.reverse_adjacency:
                self.reverse_adjacency[edge.start_node] = []
            self.reverse_adjacency[edge.start_node].append(edge.edge_id)
    
    def get_outgoing_edges(self, node_id: str) -> List[Edge]:
        """Get all edges leaving from a node."""
        edge_ids = self.adjacency.get(node_id, [])
        return [self.edges[eid] for eid in edge_ids if eid in self.edges]
    
    def get_incoming_edges(self, node_id: str) -> List[Edge]:
        """Get all edges arriving at a node."""
        edge_ids = self.reverse_adjacency.get(node_id, [])
        return [self.edges[eid] for eid in edge_ids if eid in self.edges]
    
    def get_neighbors(self, node_id: str) -> List[str]:
        """Get all neighboring node IDs."""
        neighbors = set()
        for edge in self.get_outgoing_edges(node_id):
            if edge.start_node == node_id:
                neighbors.add(edge.end_node)
            elif edge.is_bidirectional:
                neighbors.add(edge.start_node)
        return list(neighbors)
    
    def get_station_nodes(self, station: str) -> List[Node]:
        """Get all nodes belonging to a station."""
        return [n for n in self.nodes.values() if n.station.lower() == station.lower()]
    
    def get_main_line_edges(self) -> List[Edge]:
        """Get all main line edges."""
        return [e for e in self.edges.values() if e.is_main_line]
    
    def get_loop_edges(self) -> List[Edge]:
        """Get all loop line edges."""
        return [e for e in self.edges.values() if e.is_loop]
    
    def get_edges_by_stream(self, stream: str) -> List[Edge]:
        """Get edges by stream type."""
        return [e for e in self.edges.values() if e.stream == stream]
    
    def set_edge_occupied(self, edge_id: str, train_id: Optional[str] = None) -> None:
        """Mark an edge as occupied by a train."""
        if edge_id in self.edges:
            self.edges[edge_id].is_occupied = True
            self.edges[edge_id].occupying_train = train_id
    
    def set_edge_free(self, edge_id: str) -> None:
        """Mark an edge as free."""
        if edge_id in self.edges:
            self.edges[edge_id].is_occupied = False
            self.edges[edge_id].occupying_train = None
    
    def get_occupied_edges(self) -> List[Edge]:
        """Get all currently occupied edges."""
        return [e for e in self.edges.values() if e.is_occupied]
    
    def calculate_path_length(self, edge_ids: List[str]) -> float:
        """Calculate total length of a path."""
        return sum(self.edges[eid].edge_length for eid in edge_ids if eid in self.edges)
    
    def calculate_path_time(self, edge_ids: List[str]) -> float:
        """Calculate total travel time of a path in seconds."""
        return sum(self.edges[eid].travel_time_seconds for eid in edge_ids if eid in self.edges)

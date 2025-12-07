"""
Section data loader for railway network.
Loads and parses section data from JSON files or API responses.
"""

import json
from typing import Dict, List, Any, Optional
from pathlib import Path

from models.graph import Node, Edge, RailwayNetwork


class SectionDataLoader:
    """Loads and parses railway section data."""
    
    def __init__(self):
        self.network: Optional[RailwayNetwork] = None
        self.raw_data: Dict[str, Any] = {}
    
    def load_from_file(self, filepath: str) -> RailwayNetwork:
        """Load section data from a JSON file."""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"Section data file not found: {filepath}")
        
        with open(path, 'r') as f:
            self.raw_data = json.load(f)
        
        return self._parse_data(self.raw_data)
    
    def load_from_dict(self, data: Dict[str, Any]) -> RailwayNetwork:
        """Load section data from a dictionary (e.g., API response)."""
        self.raw_data = data
        return self._parse_data(data)
    
    def _parse_data(self, data: Dict[str, Any]) -> RailwayNetwork:
        """Parse raw data into RailwayNetwork structure."""
        self.network = RailwayNetwork()
        
        # Parse nodes
        nodes = data.get('nodes', [])
        for node_data in nodes:
            node = self._parse_node(node_data)
            self.network.add_node(node)
        
        # Parse edges
        edges = data.get('edges', [])
        for edge_data in edges:
            edge = self._parse_edge(edge_data)
            self.network.add_edge(edge)
        
        return self.network
    
    def _parse_node(self, data: Dict[str, Any]) -> Node:
        """Parse a single node from data."""
        return Node(
            node_id=str(data.get('nodeId', data.get('id', ''))),
            x=float(data.get('x', 0)),
            y=float(data.get('y', 0)),
            node_type=data.get('nodeType', 'turning'),
            name=data.get('name', ''),
            line=data.get('line', ''),
            station=data.get('station', ''),
            status=data.get('status', 'active'),
            description=data.get('description', ''),
            signal_color=data.get('signalColor', '')
        )
    
    def _parse_edge(self, data: Dict[str, Any]) -> Edge:
        """Parse a single edge from data."""
        return Edge(
            edge_id=str(data.get('id', data.get('edgeId', ''))),
            start_node=str(data.get('startNode', '')),
            end_node=str(data.get('endNode', '')),
            stream=data.get('stream', 'bidirectional'),
            direction=data.get('direction', 'unidirectional'),
            edge_type=data.get('edgeType', 'main'),
            edge_length=float(data.get('edgeLength', 1000)),
            speed_limit=float(data.get('speed_limit', data.get('speedLimit', 180))),
            station=data.get('station', ''),
            status=data.get('status', 'operational'),
            edge_color=data.get('edgeColor', '')
        )
    
    def get_section_info(self) -> Dict[str, Any]:
        """Get metadata about the loaded section."""
        section_info = self.raw_data.get('railway_section', {})
        return {
            'name': section_info.get('name', 'Unknown Section'),
            'date': section_info.get('date', ''),
            'units': section_info.get('units', 'meters'),
            'description': section_info.get('description', ''),
            'total_nodes': len(self.network.nodes) if self.network else 0,
            'total_edges': len(self.network.edges) if self.network else 0,
            'stations': list(self.network.stations) if self.network else []
        }
    
    def get_trains(self) -> List[Dict[str, Any]]:
        """Get train data from the loaded section, if available."""
        return self.raw_data.get('trains', [])
    
    def get_tracks(self) -> List[Dict[str, Any]]:
        """Get track data with blocks, if available (legacy format)."""
        return self.raw_data.get('tracks', [])


def load_section_data(source: str | Dict[str, Any]) -> RailwayNetwork:
    """Convenience function to load section data."""
    loader = SectionDataLoader()
    
    if isinstance(source, dict):
        return loader.load_from_dict(source)
    elif isinstance(source, str):
        return loader.load_from_file(source)
    else:
        raise ValueError("Source must be a file path or dictionary")

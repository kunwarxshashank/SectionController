"""
Data format converter
Converts from edges/nodes format (data.json) to blocks format expected by scheduler
"""
from typing import Dict, List, Any, Optional, Tuple


def convert_data_format(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert data from edges/nodes format to blocks format
    
    Input format (data.json):
    - tracks: [{ edges: [...], nodes: [...] }]
    - trains: [{ trainId, currentEdge, trainCategory, ... }]
    
    Output format (scheduler expected):
    - tracks: [{ blocks: [...] }]
    - trains: [{ id, current_block, ... }]
    """
    converted = data.copy()
    
    # Create edge to block ID mapping
    edge_to_block_map = {}
    
    # Convert tracks from edges/nodes to blocks
    if "tracks" in converted:
        converted_tracks, edge_map = convert_tracks(converted["tracks"])
        converted["tracks"] = converted_tracks
        edge_to_block_map.update(edge_map)
    
    # Convert trains format (using edge to block mapping)
    if "trains" in converted:
        converted["trains"] = convert_trains(converted["trains"], edge_to_block_map)
    
    # Convert stations format
    if "stations" in converted:
        converted["stations"] = convert_stations(converted["stations"])
    
    return converted


def convert_tracks(tracks: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """
    Convert tracks from edges/nodes format to blocks format
    Returns: (converted_tracks, edge_to_block_map)
    """
    converted_tracks = []
    edge_to_block_map = {}  # Maps edgeId/_id to block id
    
    for track in tracks:
        # Check if already in blocks format
        if "blocks" in track and track["blocks"]:
            # Still create mapping for existing blocks
            for block in track["blocks"]:
                block_id = block.get("id", "")
                block_id_alt = block.get("block_id", "")
                if block_id_alt:
                    edge_to_block_map[block_id_alt] = block_id
            converted_tracks.append(track)
            continue
        
        # Convert from edges/nodes format
        edges = track.get("edges", [])
        nodes = track.get("nodes", [])
        
        if not edges:
            # Skip empty tracks
            continue
        
        # Create blocks from edges
        blocks = []
        node_map = {node.get("nodeId"): node for node in nodes}
        
        for idx, edge in enumerate(edges):
            edge_id_mongo = edge.get("_id", "")
            edge_id = edge.get("edgeId", edge_id_mongo)
            edge_type = edge.get("edgeType", "block")
            
            # Use MongoDB _id as the block id (for internal reference)
            block_id = edge_id_mongo if edge_id_mongo else edge_id
            
            # Map edgeId to block id
            edge_to_block_map[edge_id] = block_id
            if edge_id_mongo and edge_id_mongo != edge_id:
                edge_to_block_map[edge_id_mongo] = block_id
            
            # Determine block type
            if edge_type == "loop":
                block_type = "LOOP"
                loop_group = edge.get("loopGroup", "")
                loop_num = edge.get("loopNumber", 1)
                loop_id = f"{loop_group}_L{loop_num}" if loop_group else f"L{loop_num}"
            else:
                block_type = "MAIN"
                loop_id = None
            
            # Get start and end nodes
            start_node_id = edge.get("startNode", "")
            end_node_id = edge.get("endNode", "")
            
            # Find next edges (edges that start where this one ends)
            next_blocks = []
            for other_edge in edges:
                if other_edge.get("startNode") == end_node_id:
                    other_edge_id = other_edge.get("_id") or other_edge.get("edgeId", "")
                    next_blocks.append(other_edge_id)
            
            # Find previous edges (edges that end where this one starts)
            prev_blocks = []
            for other_edge in edges:
                if other_edge.get("endNode") == start_node_id:
                    other_edge_id = other_edge.get("_id") or other_edge.get("edgeId", "")
                    prev_blocks.append(other_edge_id)
            
            # Get length and speed
            length_km = float(edge.get("length", 1))
            # If length seems too small, assume it's in km, otherwise assume meters
            if length_km < 100:
                length_m = length_km * 1000  # Convert km to meters
            else:
                length_m = length_km  # Already in meters
            
            max_speed_kmph = float(edge.get("maxspeed", 120))
            
            # Determine direction
            direction = edge.get("direction", track.get("direction", "UP"))
            if direction == "BOTH":
                direction = track.get("direction", "UP")
            
            # Headway (default 3 minutes = 180 seconds)
            headway_seconds = 180
            if edge_type == "automatic":
                headway_seconds = 60  # Shorter headway for automatic sections
            
            block = {
                "id": block_id,
                "block_id": edge_id,
                "index": idx,
                "length_m": length_m,
                "max_speed_kmph": max_speed_kmph,
                "blockType": block_type,
                "loopId": loop_id,
                "trackDirection": direction,
                "headwaySeconds": headway_seconds,
                "nextBlocks": next_blocks,
                "prevBlocks": prev_blocks
            }
            
            blocks.append(block)
        
        # Create converted track
        converted_track = {
            "id": track.get("_id", track.get("id", "")),
            "track_id": track.get("_id", track.get("id", "")),
            "name": track.get("name", ""),
            "type": "MAIN" if not any(e.get("edgeType") == "loop" for e in edges) else "LOOP",
            "direction": track.get("direction", "UP"),
            "isLoop": any(e.get("edgeType") == "loop" for e in edges),
            "parentTrack": None,
            "blocks": blocks
        }
        
        converted_tracks.append(converted_track)
    
    return converted_tracks, edge_to_block_map


def convert_trains(trains: List[Dict[str, Any]], edge_to_block_map: Dict[str, str] = None) -> List[Dict[str, Any]]:
    """Convert trains from data.json format to scheduler format"""
    if edge_to_block_map is None:
        edge_to_block_map = {}
    
    converted_trains = []
    
    for train in trains:
        # Check if already in correct format
        if "id" in train and "current_block" in train:
            converted_trains.append(train)
            continue
        
        # Convert from data.json format
        train_id = train.get("trainId") or train.get("_id", "")
        train_name = train.get("trainName", "")
        train_number = train.get("trainId", "")  # Use trainId as number
        train_type = train.get("trainType", "EXPRESS")
        train_category = train.get("trainCategory", "Passenger")
        
        # Determine priority
        priority = train.get("trainPriority") or train.get("basePriority", 10)
        
        # Current block/edge - map edgeId to block id
        current_edge = train.get("currentEdge") or train.get("current_block", "")
        current_block = edge_to_block_map.get(current_edge, current_edge)
        
        # Direction
        direction = train.get("direction", "UP")
        
        # Performance characteristics
        max_speed = float(train.get("maxSpeed", 100))
        
        # Determine if freight or passenger
        is_freight = (
            train_category.lower() == "freight" or
            "freight" in train_name.lower() or
            train_number.startswith("FRE")
        )
        
        converted_train = {
            "id": train_id,
            "name": train_name,
            "number": train_number,
            "type": train_type,
            "priority": priority,
            "delay_min": 0,
            "current_block": current_block,
            "offset_m": 0,
            "speed_kmph": 0,
            "direction": direction,
            "status": "RUNNING",
            "perf": {
                "maxSpeedKmph": max_speed,
                "accelMps2": 0.6,
                "decelMps2": 0.7,
                "lengthM": 200
            }
        }
        
        converted_trains.append(converted_train)
    
    return converted_trains


def convert_stations(stations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert stations format if needed"""
    converted_stations = []
    
    for station in stations:
        # Check if already in correct format
        if "id" in station and "name" in station:
            # May need to add position
            if "position" not in station:
                # Try to extract from startNode/endNode
                start_node = station.get("startNode", {})
                if isinstance(start_node, dict):
                    station["position"] = [start_node.get("x", 0), start_node.get("y", 0)]
                else:
                    station["position"] = [0, 0]
            converted_stations.append(station)
            continue
        
        # Convert from data.json format
        converted_station = {
            "id": station.get("stationId") or station.get("_id", ""),
            "name": station.get("stationName") or station.get("name", ""),
            "position": [0, 0]  # Default position
        }
        
        # Try to get position from nodes
        start_node = station.get("startNode", {})
        if isinstance(start_node, dict):
            converted_station["position"] = [start_node.get("x", 0), start_node.get("y", 0)]
        
        converted_stations.append(converted_station)
    
    return converted_stations


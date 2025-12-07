"""
Signaling system for railway network.
Implements 4-aspect signaling, block management, and interlocking.
"""

from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum

from models.graph import RailwayNetwork, Edge, SignalAspect


@dataclass
class BlockSection:
    """Represents a block section (edge) for signaling purposes."""
    edge_id: str
    is_occupied: bool = False
    occupying_train: Optional[str] = None
    signal_aspect: SignalAspect = SignalAspect.GREEN
    reserved_for: Optional[str] = None  # Train ID that has reserved this block
    
    def occupy(self, train_id: str) -> None:
        self.is_occupied = True
        self.occupying_train = train_id
    
    def release(self) -> None:
        self.is_occupied = False
        self.occupying_train = None
        self.reserved_for = None


@dataclass
class RouteReservation:
    """Represents a reserved route for a train."""
    train_id: str
    edge_ids: List[str]
    start_time: int  # seconds from simulation start
    end_time: int    # expected time when route is released
    is_active: bool = True


class SignalController:
    """
    Controls railway signaling for the network.
    Implements 4-aspect signaling and interlocking logic.
    """
    
    # Number of clear blocks required for each signal aspect
    ASPECT_REQUIREMENTS = {
        SignalAspect.GREEN: 3,          # 3+ blocks clear
        SignalAspect.DOUBLE_YELLOW: 2,  # 2 blocks clear
        SignalAspect.SINGLE_YELLOW: 1,  # 1 block clear
        SignalAspect.RED: 0             # Block ahead occupied
    }
    
    def __init__(self, network: RailwayNetwork):
        self.network = network
        self.blocks: Dict[str, BlockSection] = {}
        self.reservations: Dict[str, RouteReservation] = {}  # train_id -> reservation
        self.conflicts: List[Tuple[str, str]] = []  # List of conflicting train pairs
        
        # Initialize blocks from edges
        self._initialize_blocks()
    
    def _initialize_blocks(self) -> None:
        """Initialize block sections from network edges."""
        for edge_id, edge in self.network.edges.items():
            self.blocks[edge_id] = BlockSection(edge_id=edge_id)
    
    def calculate_signal_aspect(
        self,
        edge_id: str,
        direction: str = "forward"
    ) -> SignalAspect:
        """
        Calculate signal aspect based on blocks ahead.
        
        4-Aspect Signaling:
        - GREEN: 3+ blocks clear ahead
        - DOUBLE YELLOW: 2 blocks clear
        - SINGLE YELLOW: 1 block clear
        - RED: Block immediately ahead occupied
        """
        if edge_id not in self.network.edges:
            return SignalAspect.RED
        
        edge = self.network.edges[edge_id]
        
        # Get next node to check blocks ahead
        next_node = edge.end_node if direction == "forward" else edge.start_node
        
        # Count clear blocks ahead
        clear_blocks = self._count_clear_blocks_ahead(next_node, direction, max_depth=3)
        
        # Determine aspect
        if clear_blocks >= 3:
            return SignalAspect.GREEN
        elif clear_blocks == 2:
            return SignalAspect.DOUBLE_YELLOW
        elif clear_blocks == 1:
            return SignalAspect.SINGLE_YELLOW
        else:
            return SignalAspect.RED
    
    def _count_clear_blocks_ahead(
        self,
        from_node: str,
        direction: str,
        max_depth: int = 3
    ) -> int:
        """Count number of consecutive clear blocks ahead."""
        clear_count = 0
        current_node = from_node
        visited = set()
        
        for _ in range(max_depth):
            if current_node in visited:
                break
            visited.add(current_node)
            
            # Get outgoing edges
            edges = self.network.get_outgoing_edges(current_node)
            if not edges:
                break
            
            # Find next edge in the direction
            next_edge = None
            for edge in edges:
                # Check if edge goes in the right direction
                if direction == "forward":
                    if edge.stream in ['upstream', 'bidirectional', 'upstream_loop']:
                        next_edge = edge
                        break
                else:
                    if edge.stream in ['downstream', 'bidirectional', 'downstream_loop']:
                        next_edge = edge
                        break
            
            if not next_edge:
                # Try first available edge
                next_edge = edges[0]
            
            # Check if block is clear
            block = self.blocks.get(next_edge.edge_id)
            if block and block.is_occupied:
                break
            
            clear_count += 1
            
            # Move to next node
            if next_edge.start_node == current_node:
                current_node = next_edge.end_node
            else:
                current_node = next_edge.start_node
        
        return clear_count
    
    def update_all_signals(self) -> Dict[str, SignalAspect]:
        """Update signal aspects for all edges based on current occupancy."""
        signals = {}
        
        for edge_id, edge in self.network.edges.items():
            # Determine direction based on stream type
            if edge.stream in ['upstream', 'upstream_loop']:
                direction = "forward"
            elif edge.stream in ['downstream', 'downstream_loop']:
                direction = "backward"
            else:
                direction = "forward"  # Default for bidirectional
            
            aspect = self.calculate_signal_aspect(edge_id, direction)
            self.blocks[edge_id].signal_aspect = aspect
            signals[edge_id] = aspect
        
        return signals
    
    def occupy_block(self, edge_id: str, train_id: str) -> bool:
        """
        Occupy a block with a train.
        Returns True if successful, False if block is already occupied.
        """
        if edge_id not in self.blocks:
            return False
        
        block = self.blocks[edge_id]
        
        # Check if already occupied by another train
        if block.is_occupied and block.occupying_train != train_id:
            return False
        
        # Check if reserved by another train
        if block.reserved_for and block.reserved_for != train_id:
            return False
        
        block.occupy(train_id)
        
        # Update network edge state
        self.network.set_edge_occupied(edge_id, train_id)
        
        return True
    
    def release_block(self, edge_id: str, train_id: str) -> bool:
        """Release a block after train has passed."""
        if edge_id not in self.blocks:
            return False
        
        block = self.blocks[edge_id]
        
        # Only release if this train owns the block
        if block.occupying_train != train_id:
            return False
        
        block.release()
        self.network.set_edge_free(edge_id)
        
        return True
    
    def reserve_route(
        self,
        train_id: str,
        edge_ids: List[str],
        start_time: int,
        end_time: int
    ) -> bool:
        """
        Reserve a route for a train.
        Returns True if successful, False if conflicts exist.
        """
        # Check for conflicts with existing reservations
        for eid in edge_ids:
            block = self.blocks.get(eid)
            if block and block.reserved_for and block.reserved_for != train_id:
                # Check time overlap with existing reservation
                existing = self.reservations.get(block.reserved_for)
                if existing and existing.is_active:
                    # Time overlap check
                    if not (end_time <= existing.start_time or start_time >= existing.end_time):
                        self.conflicts.append((train_id, block.reserved_for))
                        return False
        
        # Create reservation
        self.reservations[train_id] = RouteReservation(
            train_id=train_id,
            edge_ids=edge_ids,
            start_time=start_time,
            end_time=end_time
        )
        
        # Mark blocks as reserved
        for eid in edge_ids:
            if eid in self.blocks:
                self.blocks[eid].reserved_for = train_id
        
        return True
    
    def release_route(self, train_id: str) -> None:
        """Release all route reservations for a train."""
        if train_id in self.reservations:
            reservation = self.reservations[train_id]
            reservation.is_active = False
            
            for eid in reservation.edge_ids:
                block = self.blocks.get(eid)
                if block and block.reserved_for == train_id:
                    block.reserved_for = None
    
    def check_interlocking(
        self,
        train_id: str,
        requested_edges: List[str]
    ) -> Tuple[bool, List[str]]:
        """
        Check interlocking rules for requested route.
        
        Returns:
            (is_clear, conflicting_edge_ids)
        """
        conflicts = []
        
        for eid in requested_edges:
            block = self.blocks.get(eid)
            if not block:
                continue
            
            # Check if occupied
            if block.is_occupied and block.occupying_train != train_id:
                conflicts.append(eid)
            
            # Check if reserved by another train
            if block.reserved_for and block.reserved_for != train_id:
                conflicts.append(eid)
        
        return (len(conflicts) == 0, conflicts)
    
    def get_block_status(self) -> Dict[str, Dict]:
        """Get status of all blocks."""
        status = {}
        for eid, block in self.blocks.items():
            status[eid] = {
                'is_occupied': block.is_occupied,
                'occupying_train': block.occupying_train,
                'signal_aspect': block.signal_aspect.value,
                'reserved_for': block.reserved_for
            }
        return status
    
    def get_conflicts(self) -> List[Tuple[str, str]]:
        """Get list of detected conflicts."""
        return self.conflicts.copy()
    
    def clear_conflicts(self) -> None:
        """Clear detected conflicts."""
        self.conflicts = []

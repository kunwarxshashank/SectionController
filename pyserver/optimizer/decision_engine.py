"""
Decision engine for railway conflict resolution.
Implements decision trees from DECISION_TREE_ALL_SCENARIOS.md
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

from models.graph import RailwayNetwork
from models.train import Train, TrainPriority, TrainStatus


class ActionType(Enum):
    """Types of actions the decision engine can recommend."""
    PROCEED = "proceed"
    HALT = "halt"
    REROUTE_LOOP = "reroute_loop"
    REROUTE_ALTERNATE = "reroute_alternate"
    EXPEDITE_EXIT = "expedite_exit"
    HOLD_AT_SIGNAL = "hold_at_signal"
    QUEUE = "queue"
    EMERGENCY_OVERRIDE = "emergency_override"


@dataclass
class Decision:
    """A decision made by the engine."""
    train_id: str
    action: ActionType
    target_edge: Optional[str] = None
    hold_duration: int = 0  # seconds
    priority_override: Optional[int] = None
    message: str = ""
    affected_trains: List[str] = None
    
    def __post_init__(self):
        if self.affected_trains is None:
            self.affected_trains = []


class DecisionEngine:
    """
    Decision engine for handling railway scenarios.
    Implements the decision trees from DECISION_TREE_ALL_SCENARIOS.md
    """
    
    # Priority thresholds
    PRIORITY_EMERGENCY = TrainPriority.EMERGENCY.value
    PRIORITY_VIP = TrainPriority.VIP.value
    PRIORITY_HIGH = TrainPriority.EXPRESS.value
    
    def __init__(self, network: RailwayNetwork):
        self.network = network
        self.decisions: List[Decision] = []
    
    def evaluate_scenario(
        self,
        trains: List[Train],
        current_time: int = 0
    ) -> List[Decision]:
        """
        Evaluate current scenario and generate decisions.
        
        Scenarios are evaluated in order of priority:
        1. Emergency trains
        2. VIP trains
        3. High priority delayed trains
        4. Multiple train conflicts
        5. Normal operations
        """
        self.decisions = []
        
        if not trains:
            return []
        
        # Sort trains by priority (highest first)
        sorted_trains = sorted(trains, key=lambda t: -t.priority_weight)
        
        # Check for emergency scenarios
        emergency_trains = [t for t in trains if t.is_emergency]
        if emergency_trains:
            self._handle_emergency_scenario(emergency_trains, sorted_trains)
            return self.decisions
        
        # Check for VIP scenarios
        vip_trains = [t for t in trains if t.priority == TrainPriority.VIP]
        if vip_trains:
            self._handle_vip_scenario(vip_trains, sorted_trains)
        
        # Check for high priority delayed trains
        delayed_high_priority = [
            t for t in trains 
            if t.is_high_priority and t.total_delay > 0
        ]
        if delayed_high_priority:
            self._handle_delayed_priority_scenario(delayed_high_priority, sorted_trains)
        
        # Check for multiple train conflicts
        if len(trains) >= 2:
            self._handle_multi_train_scenario(sorted_trains)
        
        # Normal single train operations
        for train in sorted_trains:
            if not any(d.train_id == train.train_id for d in self.decisions):
                self._handle_single_train(train)
        
        return self.decisions
    
    def _handle_emergency_scenario(
        self,
        emergency_trains: List[Train],
        all_trains: List[Train]
    ) -> None:
        """
        Scenario 5: Emergency train arrival
        Clear all tracks for emergency trains.
        """
        for emergency in emergency_trains:
            # Clear path for emergency train
            self.decisions.append(Decision(
                train_id=emergency.train_id,
                action=ActionType.EMERGENCY_OVERRIDE,
                message=f"EMERGENCY: Train {emergency.train_name} - highest priority, clear all tracks"
            ))
            
            # Move other trains out of the way
            for other in all_trains:
                if other.train_id == emergency.train_id:
                    continue
                
                # Check if on same route
                if self._routes_conflict(emergency, other):
                    # Reroute to loop or hold at signal
                    loop_available = self._find_available_loop(other)
                    
                    if loop_available:
                        self.decisions.append(Decision(
                            train_id=other.train_id,
                            action=ActionType.REROUTE_LOOP,
                            target_edge=loop_available,
                            message=f"REROUTE {other.train_name} to loop for emergency",
                            affected_trains=[emergency.train_id]
                        ))
                    else:
                        self.decisions.append(Decision(
                            train_id=other.train_id,
                            action=ActionType.HALT,
                            hold_duration=300,  # 5 minutes
                            message=f"HALT {other.train_name} - emergency train passing",
                            affected_trains=[emergency.train_id]
                        ))
    
    def _handle_vip_scenario(
        self,
        vip_trains: List[Train],
        all_trains: List[Train]
    ) -> None:
        """
        Scenario 15: VIP train special handling
        Clear tracks 10 minutes before VIP arrival.
        """
        for vip in vip_trains:
            self.decisions.append(Decision(
                train_id=vip.train_id,
                action=ActionType.PROCEED,
                priority_override=TrainPriority.VIP.value,
                message=f"VIP train {vip.train_name} - reserved main line, no parallel movements"
            ))
            
            # Hold regular trains
            for other in all_trains:
                if other.train_id == vip.train_id:
                    continue
                if other.priority.value >= TrainPriority.VIP.value:
                    continue
                
                if self._routes_conflict(vip, other):
                    self.decisions.append(Decision(
                        train_id=other.train_id,
                        action=ActionType.REROUTE_LOOP,
                        message=f"Move {other.train_name} to loop - VIP approaching",
                        affected_trains=[vip.train_id]
                    ))
    
    def _handle_delayed_priority_scenario(
        self,
        delayed_trains: List[Train],
        all_trains: List[Train]
    ) -> None:
        """
        Scenario 1: High priority train delayed
        Expedite exit of lower priority trains.
        """
        for delayed in delayed_trains:
            # Check platforms
            blocking_trains = [
                t for t in all_trains 
                if t.train_id != delayed.train_id 
                and t.priority_weight < delayed.priority_weight
                and self._routes_conflict(delayed, t)
            ]
            
            for blocker in blocking_trains:
                self.decisions.append(Decision(
                    train_id=blocker.train_id,
                    action=ActionType.EXPEDITE_EXIT,
                    message=f"Fast-track exit of {blocker.train_name} for {delayed.train_name}",
                    affected_trains=[delayed.train_id]
                ))
            
            self.decisions.append(Decision(
                train_id=delayed.train_id,
                action=ActionType.PROCEED,
                message=f"High priority {delayed.train_name} - prioritized after clearance"
            ))
    
    def _handle_multi_train_scenario(self, sorted_trains: List[Train]) -> None:
        """
        Scenarios 3, 4, 8: Multiple train handling
        - Same priority: FIFO with optional loop
        - Different priority: Priority ordering
        - Peak hour: Queue by priority
        """
        # Group by approximate priority level
        high_priority = [t for t in sorted_trains if t.priority_weight >= self.PRIORITY_HIGH]
        low_priority = [t for t in sorted_trains if t.priority_weight < self.PRIORITY_HIGH]
        
        # High priority trains get main line
        main_line_assigned = 0
        for train in high_priority:
            if main_line_assigned == 0:
                self.decisions.append(Decision(
                    train_id=train.train_id,
                    action=ActionType.PROCEED,
                    message=f"{train.train_name} (Priority: {train.priority.name}) on Main Line"
                ))
                main_line_assigned += 1
            elif main_line_assigned == 1:
                # Second high priority train to loop
                self.decisions.append(Decision(
                    train_id=train.train_id,
                    action=ActionType.REROUTE_LOOP,
                    message=f"{train.train_name} to Loop Line 1"
                ))
                main_line_assigned += 1
            else:
                # Queue additional trains
                self.decisions.append(Decision(
                    train_id=train.train_id,
                    action=ActionType.QUEUE,
                    message=f"QUEUE: {train.train_name} (Priority: {train.priority.name})"
                ))
        
        # Low priority trains to remaining capacity
        for i, train in enumerate(low_priority):
            if main_line_assigned < 2:
                if main_line_assigned == 0:
                    self.decisions.append(Decision(
                        train_id=train.train_id,
                        action=ActionType.PROCEED,
                        message=f"{train.train_name} on Main Line"
                    ))
                else:
                    self.decisions.append(Decision(
                        train_id=train.train_id,
                        action=ActionType.REROUTE_LOOP,
                        message=f"{train.train_name} to Loop Line"
                    ))
                main_line_assigned += 1
            else:
                self.decisions.append(Decision(
                    train_id=train.train_id,
                    action=ActionType.QUEUE,
                    message=f"QUEUE: {train.train_name} - all tracks occupied"
                ))
    
    def _handle_single_train(self, train: Train) -> None:
        """
        Scenario 2: Single train arrival (normal operation)
        """
        # Check main line availability
        main_edges = self.network.get_main_line_edges()
        main_occupied = any(e.is_occupied for e in main_edges)
        
        if not main_occupied:
            self.decisions.append(Decision(
                train_id=train.train_id,
                action=ActionType.PROCEED,
                message=f"{train.train_name} continues on Main Line - fastest route"
            ))
        else:
            # Check loop availability
            loop_edge = self._find_available_loop(train)
            if loop_edge:
                self.decisions.append(Decision(
                    train_id=train.train_id,
                    action=ActionType.REROUTE_LOOP,
                    target_edge=loop_edge,
                    message=f"REROUTE {train.train_name} to Loop Line"
                ))
            else:
                self.decisions.append(Decision(
                    train_id=train.train_id,
                    action=ActionType.HALT,
                    message=f"HALT {train.train_name} at entry signal - all tracks occupied"
                ))
    
    def _routes_conflict(self, train1: Train, train2: Train) -> bool:
        """Check if two trains have conflicting routes."""
        # Simplified: check if on same edge or adjacent edges
        if train1.current_edge == train2.current_edge:
            return True
        
        # Check assigned routes for overlap
        route1 = set(train1.assigned_route)
        route2 = set(train2.assigned_route)
        
        return len(route1 & route2) > 0
    
    def _find_available_loop(self, train: Train) -> Optional[str]:
        """Find an available loop line for the train."""
        loop_edges = self.network.get_loop_edges()
        
        for edge in loop_edges:
            if not edge.is_occupied:
                # Check if loop is in the right direction
                if train.direction.value == 'upstream' and 'up' in edge.edge_type:
                    return edge.edge_id
                elif train.direction.value == 'downstream' and 'down' in edge.edge_type:
                    return edge.edge_id
        
        # Return any available loop
        for edge in loop_edges:
            if not edge.is_occupied:
                return edge.edge_id
        
        return None
    
    def get_decisions_for_train(self, train_id: str) -> List[Decision]:
        """Get all decisions for a specific train."""
        return [d for d in self.decisions if d.train_id == train_id]
    
    def to_dict(self) -> List[Dict[str, Any]]:
        """Convert decisions to dictionary format."""
        return [
            {
                'train_id': d.train_id,
                'action': d.action.value,
                'target_edge': d.target_edge,
                'hold_duration': d.hold_duration,
                'message': d.message,
                'affected_trains': d.affected_trains
            }
            for d in self.decisions
        ]

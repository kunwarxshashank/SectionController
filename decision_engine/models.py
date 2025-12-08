"""
Data models for railway decision engine
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


class TrainCategory(Enum):
    PASSENGER = "Passenger"
    FREIGHT = "Freight"
    SPECIAL = "Special"


class EdgeType(Enum):
    BLOCK = "block"
    AUTOMATIC = "automatic"
    LOOP = "loop"
    CROSSING = "crossing"


class Direction(Enum):
    UP = "UP"
    DOWN = "DOWN"
    BOTH = "BOTH"


@dataclass
class StationSchedule:
    """Schedule for a single station"""
    scheduled_arrival: str = ""
    scheduled_departure: str = ""
    actual_arrival: str = ""
    actual_departure: str = ""
    expected_departure: str = ""


@dataclass
class Node:
    """Railway network node"""
    node_id: str
    node_type: str
    x: float
    y: float
    line: str
    block_boundary: bool = False
    
    @classmethod
    def from_dict(cls, data: dict) -> "Node":
        return cls(
            node_id=data.get("nodeId", ""),
            node_type=data.get("nodeType", "main"),
            x=data.get("x", 0),
            y=data.get("y", 0),
            line=data.get("line", ""),
            block_boundary=data.get("blockBoundary", False)
        )


@dataclass
class Edge:
    """Railway network edge (track segment)"""
    edge_id: str
    start_node: str
    end_node: str
    edge_type: str
    stream: str
    direction: str
    length: float
    max_speed: float
    station_code: str = ""
    loop_group: str = ""
    loop_number: int = 0
    is_occupied: bool = False
    
    @classmethod
    def from_dict(cls, data: dict) -> "Edge":
        max_speed = data.get("maxspeed", "120")
        if isinstance(max_speed, str):
            max_speed = float(max_speed) if max_speed else 120.0
        
        return cls(
            edge_id=data.get("edgeId", ""),
            start_node=data.get("startNode", ""),
            end_node=data.get("endNode", ""),
            edge_type=data.get("edgeType", "block"),
            stream=data.get("stream", "up"),
            direction=data.get("direction", "UP"),
            length=data.get("length", 0),
            max_speed=float(max_speed),
            station_code=data.get("stationCode", ""),
            loop_group=data.get("loopGroup", ""),
            loop_number=data.get("loopNumber", 0),
            is_occupied=data.get("isOccupied", False)
        )


@dataclass 
class Station:
    """Railway station"""
    station_id: str
    station_name: str
    start_node: Optional[dict] = None
    end_node: Optional[dict] = None
    
    @classmethod
    def from_dict(cls, data: dict) -> "Station":
        return cls(
            station_id=data.get("stationId", ""),
            station_name=data.get("stationName", ""),
            start_node=data.get("startNode"),
            end_node=data.get("endNode")
        )


@dataclass
class Train:
    """Train with schedule and properties"""
    train_id: str
    train_name: str
    train_type: str
    train_category: str
    base_priority: int
    train_priority: int
    max_speed: float
    direction: str
    current_edge: str = ""
    is_emergency: bool = False
    schedule: Dict[str, StationSchedule] = field(default_factory=dict)
    
    @classmethod
    def from_dict(cls, data: dict) -> "Train":
        schedule = {}
        raw_schedule = data.get("schedule", {})
        for station_id, sched in raw_schedule.items():
            if isinstance(sched, dict):
                schedule[station_id] = StationSchedule(
                    scheduled_arrival=sched.get("scheduledArrival", ""),
                    scheduled_departure=sched.get("scheduledDeparture", ""),
                    actual_arrival=sched.get("actualArrival", ""),
                    actual_departure=sched.get("actualDeparture", ""),
                    expected_departure=sched.get("expectedDeparture", "")
                )
        
        return cls(
            train_id=data.get("trainId", ""),
            train_name=data.get("trainName", ""),
            train_type=data.get("trainType", ""),
            train_category=data.get("trainCategory", "Freight"),
            base_priority=data.get("basePriority", 10),
            train_priority=data.get("trainPriority", 10),
            max_speed=data.get("maxSpeed", 65),
            direction=data.get("direction", "UP"),
            current_edge=data.get("currentEdge", ""),
            is_emergency=data.get("isEmergency", False),
            schedule=schedule
        )
    
    @property
    def is_passenger(self) -> bool:
        return self.train_category == "Passenger"
    
    @property
    def is_freight(self) -> bool:
        return self.train_category == "Freight"


@dataclass
class TimeDistancePoint:
    """A point on the time-distance graph"""
    station_id: str
    arrival: str
    departure: str
    y_index: int
    
    def to_dict(self) -> dict:
        return {
            "stationId": self.station_id,
            "arrival": self.arrival,
            "departure": self.departure,
            "yIndex": self.y_index
        }


@dataclass
class TrainScheduleResult:
    """Optimized schedule result for a train"""
    train_id: str
    train_name: str
    train_category: str
    direction: str
    time_distance_profile: List[TimeDistancePoint] = field(default_factory=list)
    edge_schedule: List[dict] = field(default_factory=list)
    loop_decisions: List[dict] = field(default_factory=list)
    total_delay_minutes: int = 0
    completed: bool = True
    
    def to_dict(self) -> dict:
        return {
            "trainId": self.train_id,
            "trainName": self.train_name,
            "trainCategory": self.train_category,
            "direction": self.direction,
            "timeDistanceProfile": [p.to_dict() for p in self.time_distance_profile],
            "edgeSchedule": self.edge_schedule,
            "loopDecisions": self.loop_decisions,
            "totalDelayMinutes": self.total_delay_minutes,
            "completed": self.completed
        }


@dataclass
class OptimizationResult:
    """Complete optimization result"""
    success: bool
    message: str
    train_schedules: List[TrainScheduleResult] = field(default_factory=list)
    conflicts_resolved: List[dict] = field(default_factory=list)
    summary: dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "message": self.message,
            "trainSchedules": [t.to_dict() for t in self.train_schedules],
            "conflictsResolved": self.conflicts_resolved,
            "summary": self.summary
        }

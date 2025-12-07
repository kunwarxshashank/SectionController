"""
Train data structures for railway optimization.
Implements train models with priority-based scheduling.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


class TrainPriority(Enum):
    """Train priority levels with weights for optimization."""
    EMERGENCY = 1000
    VIP = 500
    SUPERFAST = 100
    EXPRESS = 50
    PASSENGER = 20
    FREIGHT = 5
    
    @classmethod
    def from_string(cls, priority_str: str) -> 'TrainPriority':
        """Convert string priority to enum."""
        mapping = {
            'emergency': cls.EMERGENCY,
            'vip': cls.VIP,
            'superfast': cls.SUPERFAST,
            'express': cls.EXPRESS,
            'passenger': cls.PASSENGER,
            'freight': cls.FREIGHT,
        }
        return mapping.get(priority_str.lower(), cls.PASSENGER)
    
    @classmethod
    def from_numeric(cls, priority_value: int) -> 'TrainPriority':
        """Convert numeric priority (1-10) to enum. Lower number = higher priority."""
        if priority_value <= 1:
            return cls.EMERGENCY
        elif priority_value <= 2:
            return cls.VIP
        elif priority_value <= 3:
            return cls.SUPERFAST
        elif priority_value <= 5:
            return cls.EXPRESS
        elif priority_value <= 7:
            return cls.PASSENGER
        else:
            return cls.FREIGHT


class TrainType(Enum):
    """Types of trains."""
    RAJDHANI = "Rajdhani"
    SHATABDI = "Shatabdi"
    DURONTO = "Duronto"
    SUPERFAST = "Superfast"
    EXPRESS = "Express"
    PASSENGER = "Passenger"
    FREIGHT = "Freight"
    SPECIAL = "Special"
    
    @classmethod
    def from_string(cls, type_str: str) -> 'TrainType':
        """Convert string to train type."""
        type_str = type_str.lower() if type_str else ""
        for t in cls:
            if t.value.lower() in type_str or type_str in t.value.lower():
                return t
        return cls.EXPRESS


class TrainStatus(Enum):
    """Current status of a train."""
    APPROACHING = "approaching"
    AT_STATION = "at_station"
    RUNNING = "running"
    WAITING = "waiting"
    DEPARTED = "departed"
    EMERGENCY = "emergency"


class TrainDirection(Enum):
    """Direction of train movement."""
    UPSTREAM = "upstream"      # Bhopal to Bina (UP)
    DOWNSTREAM = "downstream"  # Bina to Bhopal (DOWN)
    
    @classmethod
    def from_string(cls, dir_str: str) -> 'TrainDirection':
        if dir_str and ('up' in dir_str.lower() or 'forward' in dir_str.lower()):
            return cls.UPSTREAM
        return cls.DOWNSTREAM


@dataclass
class ScheduleEntry:
    """Schedule entry for a train at a station."""
    station: str
    scheduled_arrival: Optional[str] = None  # HH:MM format
    scheduled_departure: Optional[str] = None
    actual_arrival: Optional[str] = None
    actual_departure: Optional[str] = None
    platform: Optional[str] = None
    
    @property
    def arrival_delay_minutes(self) -> int:
        """Calculate arrival delay in minutes."""
        if not self.scheduled_arrival or not self.actual_arrival:
            return 0
        try:
            sched_h, sched_m = map(int, self.scheduled_arrival.split(':'))
            actual_h, actual_m = map(int, self.actual_arrival.split(':'))
            sched_total = sched_h * 60 + sched_m
            actual_total = actual_h * 60 + actual_m
            return actual_total - sched_total
        except:
            return 0


@dataclass
class Train:
    """Represents a train in the railway system."""
    train_id: str
    train_number: str
    train_name: str
    train_type: str
    priority: TrainPriority
    direction: TrainDirection
    
    # Current state
    current_edge: Optional[str] = None
    current_speed: float = 0.0  # km/h
    max_speed: float = 180.0    # km/h
    status: TrainStatus = TrainStatus.RUNNING
    
    # Physical properties
    length: float = 500.0       # meters
    weight: float = 1000.0      # tons
    passenger_count: int = 0
    max_capacity: int = 1000
    
    # Scheduling
    schedule: Dict[str, ScheduleEntry] = field(default_factory=dict)
    assigned_route: List[str] = field(default_factory=list)  # List of edge IDs
    holding_time: int = 0       # seconds to hold at current position
    
    # Optimization variables (set by solver)
    use_loop: bool = False
    entry_time: int = 0         # seconds from simulation start
    exit_time: int = 0
    total_delay: int = 0        # seconds
    
    @property
    def priority_weight(self) -> int:
        """Get numeric priority weight for optimization."""
        return self.priority.value
    
    @property
    def is_emergency(self) -> bool:
        return self.priority == TrainPriority.EMERGENCY or self.status == TrainStatus.EMERGENCY
    
    @property
    def is_high_priority(self) -> bool:
        return self.priority.value >= TrainPriority.EXPRESS.value
    
    def calculate_braking_distance(self, current_speed_kmh: Optional[float] = None) -> float:
        """Calculate required braking distance in meters."""
        speed = current_speed_kmh or self.current_speed
        speed_mps = speed * 1000 / 3600
        # Assuming deceleration of 0.5 m/s² for safety
        deceleration = 0.5
        return (speed_mps ** 2) / (2 * deceleration)
    
    def can_stop_within(self, distance: float) -> bool:
        """Check if train can stop within given distance."""
        return self.calculate_braking_distance() <= distance
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Train':
        """Create Train from dictionary data (e.g., from API)."""
        # Determine priority
        if 'trainPriority' in data:
            priority = TrainPriority.from_numeric(data['trainPriority'])
        elif 'priority' in data:
            priority = TrainPriority.from_string(str(data['priority']))
        else:
            priority = TrainPriority.PASSENGER
        
        # Determine direction
        direction = TrainDirection.from_string(data.get('direction', 'downstream'))
        
        # Parse schedule
        schedule = {}
        if 'schedule' in data and isinstance(data['schedule'], dict):
            for station, times in data['schedule'].items():
                schedule[station] = ScheduleEntry(
                    station=station,
                    scheduled_arrival=times.get('scheduledArrival'),
                    scheduled_departure=times.get('scheduledDeparture'),
                    actual_arrival=times.get('actualArrival'),
                    actual_departure=times.get('actualDeparture'),
                    platform=times.get('platform')
                )
        
        return cls(
            train_id=str(data.get('trainId', data.get('id', ''))),
            train_number=str(data.get('trainNumber', '')),
            train_name=data.get('trainName', data.get('name', '')),
            train_type=data.get('trainType', 'Express'),
            priority=priority,
            direction=direction,
            current_edge=data.get('currentEdge'),
            current_speed=float(data.get('currentSpeed', data.get('speed', 0))),
            max_speed=float(data.get('maxSpeed', 180)),
            passenger_count=int(data.get('currentTrainPassenger', 0)),
            max_capacity=int(data.get('maxTrainCapacity', 1000)),
            schedule=schedule,
            status=TrainStatus.EMERGENCY if data.get('isEmergency') else TrainStatus.RUNNING
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert train to dictionary for output."""
        return {
            'trainId': self.train_id,
            'trainNumber': self.train_number,
            'trainName': self.train_name,
            'trainType': self.train_type,
            'priority': self.priority.name,
            'priorityWeight': self.priority_weight,
            'direction': self.direction.value,
            'currentEdge': self.current_edge,
            'currentSpeed': self.current_speed,
            'status': self.status.value,
            'useLoop': self.use_loop,
            'entryTime': self.entry_time,
            'exitTime': self.exit_time,
            'totalDelay': self.total_delay,
            'assignedRoute': self.assigned_route,
            'holdingTime': self.holding_time
        }

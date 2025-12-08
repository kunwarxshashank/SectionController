"""
Data models for railway decision engine v2.0
Supports the new sectionData.json format with blocks instead of edges
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any


@dataclass
class TrainPerformance:
    """Train performance characteristics"""
    max_speed_kmph: float = 100
    accel_mps2: float = 0.6
    decel_mps2: float = 0.7
    length_m: float = 200
    
    @classmethod
    def from_dict(cls, data: dict) -> "TrainPerformance":
        return cls(
            max_speed_kmph=data.get("maxSpeedKmph", 100),
            accel_mps2=data.get("accelMps2", 0.6),
            decel_mps2=data.get("decelMps2", 0.7),
            length_m=data.get("lengthM", 200)
        )


@dataclass
class Block:
    """A block section (track segment)"""
    id: str
    block_id: str
    index: int
    length_m: float
    max_speed_kmph: float
    block_type: str  # MAIN, LOOP
    loop_id: Optional[str]
    track_direction: str  # UP, DOWN
    headway_seconds: int
    next_blocks: List[str]
    prev_blocks: List[str]
    signal_aspect: str = "GREEN"
    
    @classmethod
    def from_dict(cls, data: dict) -> "Block":
        signal = data.get("signal", {})
        return cls(
            id=data.get("id", ""),
            block_id=data.get("block_id", ""),
            index=data.get("index", 0),
            length_m=data.get("length_m", 1000),
            max_speed_kmph=data.get("max_speed_kmph", 110),
            block_type=data.get("blockType", "MAIN"),
            loop_id=data.get("loopId"),
            track_direction=data.get("trackDirection", "UP"),
            headway_seconds=data.get("headwaySeconds", 180),
            next_blocks=data.get("nextBlocks", []),
            prev_blocks=data.get("prevBlocks", []),
            signal_aspect=signal.get("aspect", "GREEN")
        )
    
    @property
    def is_loop(self) -> bool:
        return self.block_type == "LOOP" or self.loop_id is not None
    
    @property
    def loop_number(self) -> int:
        if not self.loop_id:
            return 0
        try:
            return int(self.loop_id.replace("L", "").replace("l", ""))
        except:
            return 1
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "blockId": self.block_id,
            "index": self.index,
            "lengthM": self.length_m,
            "maxSpeedKmph": self.max_speed_kmph,
            "blockType": self.block_type,
            "isLoop": self.is_loop,
            "loopNumber": self.loop_number
        }


@dataclass
class Station:
    """Railway station"""
    id: str
    name: str
    position: Tuple[float, float]
    
    @classmethod
    def from_dict(cls, data: dict) -> "Station":
        pos = data.get("position", [0, 0])
        return cls(
            id=data.get("id", ""),
            name=data.get("name", ""),
            position=(pos[0] if len(pos) > 0 else 0, pos[1] if len(pos) > 1 else 0)
        )
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "position": list(self.position)
        }


@dataclass
class Track:
    """A railway track containing blocks"""
    id: str
    track_id: str
    name: str
    track_type: str  # MAIN, LOOP
    direction: str   # UP, DOWN
    is_loop: bool
    parent_track: Optional[str]
    blocks: List[Block]
    
    @classmethod
    def from_dict(cls, data: dict) -> "Track":
        blocks = [Block.from_dict(b) for b in data.get("blocks", [])]
        return cls(
            id=data.get("id", ""),
            track_id=data.get("track_id", ""),
            name=data.get("name", ""),
            track_type=data.get("type", "MAIN"),
            direction=data.get("direction", "UP"),
            is_loop=data.get("isLoop", False),
            parent_track=data.get("parentTrack"),
            blocks=blocks
        )


@dataclass
class Train:
    """Train with current state and performance"""
    id: str
    name: str
    number: str
    train_type: str  # EXPRESS, FREIGHT, etc.
    priority: int    # Lower = higher priority
    delay_min: int
    current_block: str
    offset_m: float
    speed_kmph: float
    direction: str
    status: str
    perf: TrainPerformance
    
    @classmethod
    def from_dict(cls, data: dict) -> "Train":
        perf_data = data.get("perf", {})
        perf = TrainPerformance.from_dict(perf_data)
        return cls(
            id=data.get("id", ""),
            name=data.get("name", ""),
            number=data.get("number", ""),
            train_type=data.get("type", "EXPRESS"),
            priority=data.get("priority", 10),
            delay_min=data.get("delay_min", 0),
            current_block=data.get("current_block", ""),
            offset_m=data.get("offset_m", 0),
            speed_kmph=data.get("speed_kmph", 0),
            direction=data.get("direction", "UP"),
            status=data.get("status", "RUNNING"),
            perf=perf
        )
    
    @property
    def is_freight(self) -> bool:
        name_lower = self.name.lower()
        return "freight" in name_lower or "goods" in name_lower or self.number.startswith("FRE")
    
    @property
    def is_passenger(self) -> bool:
        return not self.is_freight
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "number": self.number,
            "trainType": self.train_type,
            "priority": self.priority,
            "direction": self.direction,
            "isPassenger": self.is_passenger,
            "isFreight": self.is_freight,
            "currentBlock": self.current_block,
            "status": self.status
        }


@dataclass
class TimeDistancePoint:
    """A point on the time-distance graph"""
    station_id: str
    station_name: str
    arrival: str
    departure: str
    y_index: int
    arrival_minutes: int = 0
    departure_minutes: int = 0
    
    def to_dict(self) -> dict:
        return {
            "stationId": self.station_id,
            "stationName": self.station_name,
            "arrival": self.arrival,
            "departure": self.departure,
            "yIndex": self.y_index,
            "arrivalMinutes": self.arrival_minutes,
            "departureMinutes": self.departure_minutes
        }


@dataclass
class LoopDecision:
    """Decision to route a train through a loop"""
    main_block: str
    loop_block: str
    reason: str
    
    def to_dict(self) -> dict:
        return {
            "mainBlock": self.main_block,
            "loopBlock": self.loop_block,
            "reason": self.reason
        }


@dataclass
class EdgeScheduleEntry:
    """Schedule entry for a single block/edge"""
    block_id: str
    block_name: str
    start_time: str
    end_time: str
    start_minutes: int
    end_minutes: int
    duration: int
    
    def to_dict(self) -> dict:
        return {
            "blockId": self.block_id,
            "blockName": self.block_name,
            "startTime": self.start_time,
            "endTime": self.end_time,
            "startMinutes": self.start_minutes,
            "endMinutes": self.end_minutes,
            "duration": self.duration
        }


@dataclass
class TrainScheduleResult:
    """Optimized schedule result for a train"""
    train_id: str
    train_number: str
    train_name: str
    train_type: str
    is_passenger: bool
    is_freight: bool
    direction: str
    priority: int
    time_distance_profile: List[TimeDistancePoint] = field(default_factory=list)
    edge_schedule: List[EdgeScheduleEntry] = field(default_factory=list)
    loop_decisions: List[LoopDecision] = field(default_factory=list)
    completed: bool = True
    arrival_time: str = ""
    total_delay_minutes: int = 0
    
    def to_dict(self) -> dict:
        return {
            "trainId": self.train_id,
            "trainNumber": self.train_number,
            "trainName": self.train_name,
            "trainType": self.train_type,
            "isPassenger": self.is_passenger,
            "isFreight": self.is_freight,
            "direction": self.direction,
            "priority": self.priority,
            "timeDistanceProfile": [p.to_dict() for p in self.time_distance_profile],
            "edgeSchedule": [e.to_dict() for e in self.edge_schedule],
            "loopDecisions": [d.to_dict() for d in self.loop_decisions],
            "completed": self.completed,
            "arrivalTime": self.arrival_time,
            "totalDelayMinutes": self.total_delay_minutes
        }


@dataclass
class OptimizationSummary:
    """Summary of optimization results"""
    total_trains: int = 0
    passenger_trains: int = 0
    freight_trains: int = 0
    freight_completed: int = 0
    solver_status: str = ""
    objective_value: float = 0
    
    def to_dict(self) -> dict:
        return {
            "totalTrains": self.total_trains,
            "passengerTrains": self.passenger_trains,
            "freightTrains": self.freight_trains,
            "freightCompleted": self.freight_completed,
            "solverStatus": self.solver_status,
            "objectiveValue": self.objective_value
        }


@dataclass
class OptimizationResult:
    """Complete optimization result"""
    success: bool
    message: str
    train_schedules: List[TrainScheduleResult] = field(default_factory=list)
    conflicts_resolved: List[dict] = field(default_factory=list)
    summary: OptimizationSummary = field(default_factory=OptimizationSummary)
    explanation: str = ""
    
    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "message": self.message,
            "trainSchedules": [t.to_dict() for t in self.train_schedules],
            "conflictsResolved": self.conflicts_resolved,
            "summary": self.summary.to_dict(),
            "explanation": self.explanation
        }

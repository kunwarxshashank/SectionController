# Indian Railways Hybrid Optimization System

## Overview

This is a comprehensive hybrid railway optimization system that combines the best features from multiple optimization approaches to solve complex train scheduling, routing, and resource allocation problems for Indian Railways.

## Key Features

### From Script 1 (Railway Operations)
- ✅ **Multi-aspect automatic signaling system**
- ✅ **Automatic absolute block system**  
- ✅ **Platform allocation and management**
- ✅ **Holding strategies**
- ✅ **What-if scenario analysis**
- ✅ **Data classes** (Node, Edge, Train, StationSchedule)
- ✅ **Railway graph structure** with adjacency lists

### From Script 2 (Optimization Logic)
- ✅ **Throughput maximization** as primary objective
- ✅ **Path enumeration** with configurable depth control
- ✅ **Resource occupancy intervals** with headway buffers
- ✅ **Priority-weighted delay minimization**
- ✅ **Loop usage penalties**
- ✅ **Flexible candidate path generation**

### Additional Enhancements
- ✅ Real-time conflict resolution
- ✅ Alternative route computation
- ✅ Section capacity analysis
- ✅ Bottleneck identification
- ✅ Comprehensive reporting

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Basic Optimization

```python
from railway_optimizer_hybrid import RailwayOptimizer

# Initialize with your data files
optimizer = RailwayOptimizer(
    schema_path="database_schema.json",
    trains_path="trains.json"
)

# Run optimization
result = optimizer.optimize_schedule()

# Generate comprehensive report
report = optimizer.generate_full_report()

# Export results
optimizer.export_results("optimization_results.json")
```

### Scenario Analysis

```python
# Analyze holding strategy
hold_result = optimizer.run_scenario(
    "hold",
    station="sorai",
    duration_min=10
)

# Analyze track closure impact
closure_result = optimizer.run_scenario(
    "track_closure",
    edge_id="000003",
    duration_min=30
)
```

### Configuration

```python
config = {
    'horizon_s': 4 * 3600,           # 4 hour planning horizon
    'headway_s': 180,                 # 3 minutes minimum headway
    'min_dwell_s': 120,               # 2 minutes minimum dwell time
    'max_delay_s': 3600,              # 60 minutes maximum delay
    'throughput_weight': 100000,      # High weight for throughput
    'delay_weight_mult': 100,         # Multiplier for delay penalties
    'loop_penalty': 500,              # Penalty for using loop tracks
    'solver_time_limit_s': 60,        # Solver time limit in seconds
    'max_paths_per_train': 5,         # Max candidate paths per train
}

optimizer = RailwayOptimizer(schema_path, trains_path, config)
```

## Architecture

### Core Components

1. **RailwayGraph**: Network representation
   - Nodes (signals, stations, junctions)
   - Edges (track segments with properties)
   - Adjacency lists for path finding
   - Station-based indexing

2. **HybridScheduleOptimizer**: CP-SAT based optimizer
   - Path enumeration and selection
   - Timing variables (arrival/departure)
   - Platform allocation variables
   - Resource occupancy constraints
   - Multi-objective optimization

3. **ThroughputAnalyzer**: Capacity analysis
   - Section capacity calculation
   - Bottleneck identification  
   - Congestion window analysis

4. **ScenarioAnalyzer**: What-if analysis
   - Holding strategy impact
   - Track closure effects
   - Cascade delay propagation

## Data Models

### Train Schema
```python
{
    "trainId": "TRN_10001",
    "trainNumber": "10001",
    "trainName": "Pushpak Express",
    "trainType": "SUPERFAST",
    "trainPriority": 4,
    "direction": "forward",
    "maxSpeed": 100,
    "schedule": {
        "vidisha": {
            "scheduledArrival": "",
            "scheduledDeparture": "00:07"
        },
        "sorai": {
            "scheduledArrival": "00:23",
            "scheduledDeparture": "00:26"
        }
    }
}
```

### Railway Network Schema
```python
{
    "nodes": [
        {
            "nodeId": "000001",
            "x": 0,
            "y": 300,
            "nodeType": "section_start",
            "station": "vidisha"
        }
    ],
    "edges": [
        {
            "edgeId": "000001",
            "startNode": "000001",
            "endNode": "000002",
            "direction": "unidirectional",
            "edgeType": "up_main",
            "edgeLength": 600,
            "speed_limit": 180
        }
    ]
}
```

## Optimization Model

### Decision Variables

- **Path Selection**: `path_selector[(train_id, path_index)]` - Boolean
- **Arrival Times**: `arrival_vars[(train_id, station)]` - Integer (seconds)
- **Departure Times**: `departure_vars[(train_id, station)]` - Integer (seconds)
- **Platform Assignment**: `platform_vars[(train_id, station)]` - Integer (0=main, 1=loop1, ...)
- **Delays**: `delay_vars[(train_id, station)]` - Integer (seconds)

### Objective Function

```
Maximize:
  throughput_weight * Σ(trains_completed)
  - delay_weight * Σ(priority_i * delay_i)  
  - loop_penalty * Σ(loop_usage)
```

### Constraints

1. **Schedule Constraints**
   - Arrival before departure at same station
   - Minimum dwell time
   - Travel time between stations
   - Delay calculation

2. **Platform Capacity**
   - Maximum trains per platform (cumulative)
   - Platform assignment consistency

3. **Headway Constraints**
   - Minimum separation between trains
   - Platform-specific headway enforcement

4. **Priority Constraints**
   - Emergency trains get minimal delay
   - Higher priority trains preferred

## Performance

### Test Results (250 Trains, 6 Stations, 189 Nodes, 133 Edges)

- **Processing Time**: ~15 seconds
- **Path Enumeration**: 250 trains processed
- **Throughput Analysis**: 5 sections analyzed
- **Section Capacity**: 31.8 - 41.5 trains/hour
- **Bottleneck Detection**: 1 bottleneck identified

### Scalability

The system can handle:
- ✅ **Small sections** (50-100 trains): OPTIMAL solutions
- ✅ **Medium sections** (100-200 trains): FEASIBLE solutions with good quality
- ⚠️ **Large sections** (200+ trains): May require model simplification or decomposition

## Recommendations for Large Datasets

For sections with >200 trains:

1. **Time-based decomposition**: Split into time windows (e.g., 6 hours each)
2. **Priority-based filtering**: Optimize high-priority trains first
3. **Rolling horizon**: Optimize near-term, replan periodically
4. **Increase solver time**: Set `solver_time_limit_s` to 180-300s
5. **Reduce path candidates**: Set `max_paths_per_train` to 2-3

## Output Format

### Optimization Results
```json
{
  "status": "FEASIBLE",
  "objective_value": 14523.0,
  "schedule": {
    "TRN_10001": {
      "train_name": "Pushpak Express",
      "priority": 4,
      "stations": {
        "vidisha": {
          "optimized_departure": "00:07",
          "platform": "Main-1",
          "total_delay_min": 0
        },
        "sorai": {
          "optimized_arrival": "00:23",
          "optimized_departure": "00:26",
          "platform": "Main-2",
          "total_delay_min": 0
        }
      },
      "total_delay_min": 0
    }
  }
}
```

### Scenario Analysis
```json
{
  "scenario": "Hold at sorai for 10 min",
  "affected_train_count": 250,
  "total_delay_minutes": 7102,
  "weighted_impact": 142040,
  "recommendation": "RECONSIDER"
}
```

## API Reference

### Main Classes

#### `RailwayOptimizer`
Main entry point for optimization.

**Methods:**
- `optimize_schedule()` → Dict: Run schedule optimization
- `analyze_throughput()` → Dict: Analyze section capacity
- `run_scenario(type, **kwargs)` → Dict: Run what-if analysis
- `generate_full_report()` → Dict: Comprehensive report
- `export_results(path)`: Export to JSON

#### `HybridScheduleOptimizer`
CP-SAT based schedule optimizer.

**Methods:**
- `build_model()`: Construct optimization model
- `solve()` → Dict: Solve and return results

#### `ThroughputAnalyzer`
Capacity and bottleneck analysis.

**Methods:**
- `calculate_section_capacity()` → Dict: Section capacities
- `identify_bottlenecks(trains)` → List[Dict]: Find bottlenecks

#### `ScenarioAnalyzer`
What-if scenario analysis.

**Methods:**
- `analyze_holding_strategy(station, duration)` → Dict
- `analyze_track_closure(edge_id, duration)` → Dict

## Contributing

When contributing enhancements:

1. Maintain backward compatibility with existing data formats
2. Add unit tests for new features
3. Update this README with new capabilities
4. Follow PEP 8 style guidelines
5. Document complex algorithms

## License

This is a proprietary optimization system for Indian Railways operations.

## Support

For questions or issues, please contact the Railway Optimization Team.

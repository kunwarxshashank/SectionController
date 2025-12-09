# Railway Decision Engine

A Python-based railway traffic optimization engine using OR-Tools CP-SAT solver.

## Features

- **Maximize freight throughput** while respecting passenger schedules
- **No passenger delays** - passenger schedules are hard constraints
- **Loop decision optimization** for freight trains
- **Time-distance graph data** output for visualization
- **Conflict resolution** between trains

## Installation

```bash
cd decision_engine
pip install -r requirements.txt
```

## Running the Server

```bash
python app.py
```

Server runs on `http://localhost:5000` by default.

## API Endpoints

### `GET /`
Health check endpoint.

### `POST /api/optimize`
Run the optimization with section and train data.

**Request Body:**
```json
{
  "sectionData": { ... },
  "trains": [ ... ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Optimization completed",
  "trainSchedules": [
    {
      "trainId": "12001",
      "trainName": "Shatabdi Express",
      "trainCategory": "Passenger",
      "direction": "UP",
      "timeDistanceProfile": [
        {
          "stationId": "bhopal",
          "arrival": "05:50",
          "departure": "06:00",
          "yIndex": 0
        }
      ],
      "edgeSchedule": [...],
      "loopDecisions": [...],
      "completed": true
    }
  ],
  "summary": {
    "totalTrains": 20,
    "passengerTrains": 5,
    "freightTrains": 15,
    "freightCompleted": 15
  }
}
```

### `POST /api/validate`
Validate input data structure.

### `POST /api/time-distance`
Get time-distance profiles for visualization.

## Algorithm Overview

1. **Network Graph Building**: Parse tracks, edges, nodes, and stations
2. **Train Path Computation**: Determine edge sequence for each train
3. **CP-SAT Model**: Create interval variables and constraints
4. **Optimization**: Maximize freight throughput, minimize delays
5. **Solution Extraction**: Generate schedules and time-distance graphs

## Constraints

- **Block sections**: Only one train at a time
- **Automatic sections**: Multiple trains with proper headway
- **Loops**: Speed restrictions (30/15 km/h), decel/accel penalties
- **Passenger precedence**: Freight cannot overtake passenger

#!/usr/bin/env python3
"""
Updated priority.py
- Loads train data from a local JSON file if provided and present, otherwise fetches
  live JSON from https://train.madplay.site/api/sections/rkmkp
- Keeps your existing priority logic unchanged.
- Requires `requests` to fetch from the API: `pip install requests`
"""

import json
import requests
from datetime import datetime
from pathlib import Path

# ------------------------
# Configuration loader
# ------------------------
API_URL = "https://train.madplay.site/api/sections/rkmkp"


def load_config(json_file: str | None = None) -> dict:
    """Load configuration and train list.

    If json_file is provided and exists, load from the file. Otherwise fetch from API.

    Returns a dict with keys: "constraints" and "trains" (list).
    """
    # Try local file first (if provided)
    if json_file:
        base = Path(__file__).parent if "__file__" in globals() else Path.cwd()
        json_path = base / json_file
        try:
            with open(json_path, "r") as f:
                data = json.load(f)
            return data
        except FileNotFoundError:
            print(f"Local file '{json_file}' not found at {json_path}. Falling back to API...")
        except json.JSONDecodeError:
            print(f"Local file '{json_file}' contains invalid JSON. Falling back to API...")

    # Fetch from API
    try:
        resp = requests.get(API_URL, timeout=10)
        resp.raise_for_status()
        api_data = resp.json()

        # If the API already returns an object with 'constraints' and 'trains', pass through.
        if isinstance(api_data, dict) and ("trains" in api_data or "constraints" in api_data):
            # Ensure keys exist
            return {
                "constraints": api_data.get("constraints", {}),
                "trains": api_data.get("trains", []) if isinstance(api_data.get("trains", []), list) else []
            }

        # Otherwise, assume API returned a structure where 'trains' is a top-level key
        return {
            "constraints": {},
            "trains": api_data.get("trains", []) if isinstance(api_data, dict) else []
        }

    except Exception as e:
        print("Error fetching API:", e)
        return {"constraints": {}, "trains": []}


# ------------------------
# Load config (change arg to a filename if you prefer local file)
# ------------------------
config = load_config(None)  # pass a filename like 'train_input.json' to prefer local file
if not config:
    # If load_config returned an empty dict or None, normalize it
    config = {"constraints": {}, "trains": []}

# ------------------------
# Constraint shortcuts (with safe defaults)
# ------------------------
CONSTRAINTS = config.get("constraints", {})
TRAIN_TYPE_PRIORITIES = CONSTRAINTS.get("train_type_priorities", {})
TRAIN_SPEED_PRIORITIES = CONSTRAINTS.get("train_speed_priorities", {})
CONGESTION_THRESHOLDS = CONSTRAINTS.get("congestion_levels", {"low": 0.3, "medium": 0.7})
STATION_PRIORITY_MAP = CONSTRAINTS.get("station_types", {"Default": 1})
FREIGHT_IMPORTANCE_MAP = CONSTRAINTS.get("freight_types", {"regular": 1})
DELAY_THRESHOLDS = CONSTRAINTS.get("delay_thresholds", {"minimal": 5, "low": 15})
PRIORITY_WEIGHTS = CONSTRAINTS.get("priority_weights", {})
PASSENGER_COUNT_THRESHOLDS = CONSTRAINTS.get("passenger_count_thresholds", {"low": 50, "medium": 200, "high": 500})
PASSENGER_PRIORITY_VALUES = CONSTRAINTS.get("passenger_count_priority_values", {"low": 1, "medium": 3, "high": 5})


# ------------------------
# Train class
# ------------------------
class Train:
    def __init__(self, train_type, train_name, scheduled_arrival, actual_arrival,
                 no_of_tracks_occupied, total_no_of_tracks, station_type,
                 freight_type, is_emergency, passenger_count=0):
        self.train_type = train_type
        self.train_name = train_name
        self.scheduled_arrival = scheduled_arrival
        self.actual_arrival = actual_arrival
        self.no_of_tracks_occupied = no_of_tracks_occupied
        self.total_no_of_tracks = total_no_of_tracks
        self.station_type = station_type
        self.freight_type = freight_type
        self.is_emergency = is_emergency
        try:
            self.passenger_count = int(passenger_count or 0)
        except (TypeError, ValueError):
            self.passenger_count = 0
        self.priority = 0.0

    def __repr__(self):
        return f"Train({self.train_name}, Type: {self.train_type}, Priority: {self.priority})"


# ------------------------
# Priority subroutines
# ------------------------

def delay_minutes(scheduled, actual):
    if actual is None or scheduled is None:
        return 0
    try:
        delay = actual - scheduled
        delay_minutes_val = int(delay.total_seconds() / 60)
        if delay_minutes_val < 0:
            return 0
        elif delay_minutes_val < DELAY_THRESHOLDS.get("minimal", 5):
            return 1
        elif delay_minutes_val < DELAY_THRESHOLDS.get("low", 15):
            return 2
        else:
            return 3
    except TypeError:
        return 0


def get_congestion_level(no_of_tracks_occupied, total_no_of_tracks):
    try:
        if not total_no_of_tracks or total_no_of_tracks <= 0:
            return 0
        level = float(no_of_tracks_occupied) / float(total_no_of_tracks)
        if level < CONGESTION_THRESHOLDS.get("low", 0.3):
            return 0
        elif level < CONGESTION_THRESHOLDS.get("medium", 0.7):
            return 1
        else:
            return 2
    except (TypeError, ZeroDivisionError, ValueError):
        return 0


def station_priority(station_type):
    return STATION_PRIORITY_MAP.get(station_type, STATION_PRIORITY_MAP.get("Default", 1))


def freight_importance(freight_type):
    return FREIGHT_IMPORTANCE_MAP.get(freight_type, FREIGHT_IMPORTANCE_MAP.get("regular", 1))


def emergency_priority(is_emergency):
    return 50 if is_emergency else 0


def arme_priority(train):
    if train.train_type == "ARME_GOING":
        return 100
    elif train.train_type == "ARME_RETURNING":
        return 10
    return 0


def passenger_count_priority(count):
    try:
        count = int(count or 0)
    except (TypeError, ValueError):
        count = 0

    if count <= 0:
        return 0

    # NEW LOGIC:
    # 0–100 -> 1
    # 100–200 -> 2
    # 200–300 -> 3
    # ...
    # up to 2000 -> 20
    if count > 2000:
        count = 2000

    # Priority increases by 1 for each 100 passengers
    priority = (count - 1) // 100 + 1

    return priority



def get_final_priority(train, verbose=False):
    type_priority = TRAIN_TYPE_PRIORITIES.get(train.train_type, 0)
    speed_priority = TRAIN_SPEED_PRIORITIES.get(train.train_name, 0)
    delay_priority = delay_minutes(train.scheduled_arrival, train.actual_arrival)
    congestion_priority = get_congestion_level(train.no_of_tracks_occupied, train.total_no_of_tracks)
    station_p = station_priority(train.station_type)
    freight_p = freight_importance(train.freight_type)
    emergency_p = emergency_priority(train.is_emergency)
    arme_p = arme_priority(train)
    passenger_p = passenger_count_priority(getattr(train, "passenger_count", 0))

    wt = lambda key, default: PRIORITY_WEIGHTS.get(key, default)

    if verbose:
        print(f"\n--  Priority breakdown for {train.train_name} --")
        print(f"type: {type_priority} * {wt('train_type', 1)}")
        print(f"speed: {speed_priority} * {wt('train_speed', 1)}")
        print(f"delay: {delay_priority} * {wt('delay', 1)}")
        print(f"congestion: {congestion_priority} * {wt('congestion', 1)}")
        print(f"station: {station_p} * {wt('station', 1)}")
        print(f"freight: {freight_p} * {wt('freight', 1)}")
        print(f"emergency: {emergency_p} * {wt('emergency', 1)}")
        print(f"arme: {arme_p} * {wt('arme', 1)}")
        print(f"passenger: {passenger_p} * {wt('passenger', 1)} (count={train.passenger_count})")

    final_priority = (
        type_priority * wt("train_type", 1)
        + speed_priority * wt("train_speed", 1)
        + delay_priority * wt("delay", 1)
        + congestion_priority * wt("congestion", 1)
        + station_p * wt("station", 1)
        + freight_p * wt("freight", 1)
        + emergency_p * wt("emergency", 1)
        + arme_p * wt("arme", 1)
        + passenger_p * wt("passenger", 1)
    )

    return round(final_priority, 2)


# ------------------------
# Main execution
# ------------------------
if __name__ == "__main__":
    trains = []

    # Populate Train objects from config['trains']
    for train_data in config.get("trains", []):
        try:
            # The API may already have keys like 'scheduled_arrival'/'actual_arrival'
            scheduled = None
            actual = None
            if train_data.get("scheduled_arrival"):
                try:
                    scheduled = datetime.fromisoformat(train_data["scheduled_arrival"])
                except Exception:
                    scheduled = None
            if train_data.get("actual_arrival"):
                try:
                    actual = datetime.fromisoformat(train_data["actual_arrival"]) if train_data["actual_arrival"] else None
                except Exception:
                    actual = None

            train = Train(
                train_type=train_data.get("train_type", ""),
                train_name=train_data.get("train_name", train_data.get("train_id", "Unnamed")),
                scheduled_arrival=scheduled,
                actual_arrival=actual,
                no_of_tracks_occupied=train_data.get("no_of_tracks_occupied", 0),
                total_no_of_tracks=train_data.get("total_no_of_tracks", 1),
                station_type=train_data.get("station_type", "Default"),
                freight_type=train_data.get("freight_type", "regular"),
                is_emergency=train_data.get("is_emergency", False),
                passenger_count=train_data.get("passenger_count", 0),
            )
            trains.append(train)
        except (KeyError, ValueError) as e:
            print(f"Error processing train data: {e}")
            continue

    #valid_trains = [t for t in trains if t.actual_arrival is not None]
    valid_trains = trains

    if not valid_trains:
        print("No trains with actual arrival timestamps to process.")
        raise SystemExit(0)

    for train in valid_trains:
        train.priority = get_final_priority(train, verbose=True)
        print(f"{train.train_name}: {train.priority}")

    trains_sorted = sorted(valid_trains, key=lambda x: x.priority, reverse=True)

    print("\n=== TRAIN PRIORITY RANKING ===")
    for i, train in enumerate(trains_sorted, start=1):
        print(f"{i}. {train.train_name} — Priority: {train.priority}")

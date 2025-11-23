import json
import requests
from datetime import datetime
from pathlib import Path

API_URL = "https://train.madplay.site/api/sections/rkmkp"

# -------------------------
# LOAD CONFIG
# -------------------------

def load_config(json_file: str | None = None) -> dict:
    if json_file:
        base = Path(__file__).parent if "__file__" in globals() else Path.cwd()
        json_path = base / json_file
        try:
            with open(json_path, "r") as f:
                return json.load(f)
        except:
            pass

    try:
        resp = requests.get(API_URL, timeout=10)
        resp.raise_for_status()
        api_data = resp.json()
        return {
            "constraints": api_data.get("constraints", {}),
            "trains": api_data.get("trains", [])
        }
    except:
        return {"constraints": {}, "trains": []}


# -------------------------------------------------
# Load initial constraints and maps dynamically
# -------------------------------------------------

config = load_config()

CONSTRAINTS = config.get("constraints", {})
TRAIN_TYPE_PRIORITIES = CONSTRAINTS.get("train_type_priorities", {})
TRAIN_SPEED_PRIORITIES = CONSTRAINTS.get("train_speed_priorities", {})
CONGESTION_THRESHOLDS = CONSTRAINTS.get("congestion_levels", {"low": 0.3, "medium": 0.7})
STATION_PRIORITY_MAP = CONSTRAINTS.get("station_types", {"Default": 1})
FREIGHT_IMPORTANCE_MAP = CONSTRAINTS.get("freight_types", {"regular": 1})
DELAY_THRESHOLDS = CONSTRAINTS.get("delay_thresholds", {"minimal": 5, "low": 15})
PRIORITY_WEIGHTS = CONSTRAINTS.get("priority_weights", {})
PASSENGER_COUNT_THRESHOLDS = CONSTRAINTS.get("passenger_count_thresholds", {"low": 50, "medium": 200})
PASSENGER_PRIORITY_VALUES = CONSTRAINTS.get("passenger_count_priority_values", {"low": 1, "medium": 3, "high": 5})


# -------------------------------------------------
# CLASSES
# -------------------------------------------------

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
        self.passenger_count = int(passenger_count or 0)
        self.priority = 0.0


# -------------------------------------------------
# PRIORITY FUNCTIONS
# -------------------------------------------------

def delay_minutes(scheduled, actual):
    if not scheduled or not actual:
        return 0
    try:
        delay = (actual - scheduled).total_seconds() / 60
        delay = max(0, int(delay))
        if delay < DELAY_THRESHOLDS["minimal"]:
            return 1
        elif delay < DELAY_THRESHOLDS["low"]:
            return 2
        else:
            return 3
    except:
        return 0


def get_congestion_level(occ, total):
    try:
        if total <= 0:
            return 0
        ratio = occ / total
        if ratio < CONGESTION_THRESHOLDS["low"]:
            return 0
        elif ratio < CONGESTION_THRESHOLDS["medium"]:
            return 1
        else:
            return 2
    except:
        return 0


def station_priority(station_type):
    return STATION_PRIORITY_MAP.get(station_type, 1)


def freight_importance(freight_type):
    return FREIGHT_IMPORTANCE_MAP.get(freight_type, 1)


def emergency_priority(flag):
    return 50 if flag else 0


def arme_priority(train_type):
    if train_type == "ARME_GOING":
        return 100
    elif train_type == "ARME_RETURNING":
        return 10
    return 0


def passenger_count_priority(count):
    try:
        count = int(count)
    except:
        return 0
    if count > 2000:
        count = 2000
    return (count - 1) // 100 + 1


def get_final_priority(train):
    wt = lambda key: PRIORITY_WEIGHTS.get(key, 1)
    final = (
        TRAIN_TYPE_PRIORITIES.get(train.train_type, 0) * wt("train_type")
        + TRAIN_SPEED_PRIORITIES.get(train.train_name, 0) * wt("train_speed")
        + delay_minutes(train.scheduled_arrival, train.actual_arrival) * wt("delay")
        + get_congestion_level(train.no_of_tracks_occupied, train.total_no_of_tracks) * wt("congestion")
        + station_priority(train.station_type) * wt("station")
        + freight_importance(train.freight_type) * wt("freight")
        + emergency_priority(train.is_emergency) * wt("emergency")
        + arme_priority(train.train_type) * wt("arme")
        + passenger_count_priority(train.passenger_count) * wt("passenger")
    )
    return round(final, 2)


# -------------------------------------------------
# MAIN CALCULATION FUNCTION (THIS WILL BE IMPORTED)
# -------------------------------------------------

def get_train_priorities():
    cfg = load_config()
    trains_raw = cfg.get("trains", [])

    processed = []
    for t in trains_raw:
        try:
            scheduled = datetime.fromisoformat(t["scheduled_arrival"]) if t.get("scheduled_arrival") else None
        except:
            scheduled = None
        try:
            actual = datetime.fromisoformat(t["actual_arrival"]) if t.get("actual_arrival") else None
        except:
            actual = None

        train = Train(
            t.get("train_type", ""),
            t.get("train_name", t.get("train_id", "Unnamed")),
            scheduled,
            actual,
            t.get("no_of_tracks_occupied", 0),
            t.get("total_no_of_tracks", 1),
            t.get("station_type", "Default"),
            t.get("freight_type", "regular"),
            t.get("is_emergency", False),
            t.get("passenger_count", 0),
        )

        train.priority = get_final_priority(train)
        t["priority"] = train.priority
        processed.append(t)

    processed_sorted = sorted(processed, key=lambda x: x["priority"], reverse=True)
    return {"trains": processed_sorted}

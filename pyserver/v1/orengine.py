# or_engine_with_loops.py
"""
Run with: python or_engine_with_loops.py sectionData.json
"""

import json
import math
import sys
from ortools.sat.python import cp_model


SECONDS_PER_HOUR = 3600


def travel_time_seconds(length_m, speed_kmph):
    if speed_kmph <= 0.1:
        speed_kmph = 5
    mps = (speed_kmph * 1000) / SECONDS_PER_HOUR
    secs = math.ceil(length_m / mps)
    return max(1, int(secs))


class RailOptimizerWithLoops:
    def __init__(self, data, time_horizon_s=3600 * 6):
        self.data = data
        self.model = cp_model.CpModel()
        self.time_horizon = time_horizon_s
        self.trains = data.get("trains", [])
        self.block_map = {}
        self.M = 24 * 3600
        self.vars = {}
        self.order_bools = []

        # Flatten block map safely
        for track in data.get("tracks", []):
            for b in track.get("blocks", []):
                b_id = b.get("id") or b.get("_id")
                if isinstance(b_id, dict):
                    b_id = b_id.get("$oid")
                if b_id:
                    self.block_map[b_id] = b

    # Normalize ID values
    def normalize_ids(self, arr):
        norm = []
        for x in arr or []:
            if isinstance(x, str):
                norm.append(x)
            elif isinstance(x, dict):
                if "$oid" in x:
                    norm.append(x["$oid"])
        return norm

    def detect_next_options(self, train):
        cur_block_id = train.get("current_block")
        if not cur_block_id:
            return None, []

        cur_block = self.block_map.get(cur_block_id)
        if not cur_block:
            return None, []

        next_ids = self.normalize_ids(cur_block.get("nextBlocks"))
        next_ids = [nid for nid in next_ids if nid in self.block_map]

        # MAIN BLOCK first
        main_next = None
        for nid in next_ids:
            if self.block_map[nid].get("blockType", "MAIN") == "MAIN":
                main_next = nid
                break
        if not main_next and next_ids:
            main_next = next_ids[0]

        # LOOP BLOCKS
        loop_options = []
        for bid, b in self.block_map.items():
            if b.get("blockType") == "LOOP":
                prev_norm = self.normalize_ids(b.get("prevBlocks"))
                if cur_block_id in prev_norm:
                    loop_options.append(bid)

        # direct next loops too
        for nid in next_ids:
            if self.block_map[nid].get("blockType") == "LOOP":
                if nid not in loop_options:
                    loop_options.append(nid)

        return main_next, loop_options

    def create_variables(self):
        for tr in self.trains:
            tid = tr["id"]
            self.vars[tid] = {}
            self.vars[tid]["use_loop"] = self.model.NewBoolVar(f"use_loop_{tid}")
            self.vars[tid]["t_enter"] = self.model.NewIntVar(0, self.time_horizon, f"t_enter_{tid}")
            self.vars[tid]["duration"] = self.model.NewIntVar(1, self.time_horizon, f"dur_{tid}")

            main_next, loop_options = self.detect_next_options(tr)
            self.vars[tid]["main_next"] = main_next
            self.vars[tid]["loop_options"] = loop_options

            if not loop_options:
                self.model.Add(self.vars[tid]["use_loop"] == 0)

        # Now duration logic
        for tr in self.trains:
            tid = tr["id"]
            main_next = self.vars[tid]["main_next"]
            loop_opts = self.vars[tid]["loop_options"]

            if not main_next and not loop_opts:
                self.model.Add(self.vars[tid]["duration"] == 5)
                continue

            speed = tr.get("speed_kmph", 40)

            if main_next:
                dur_main = travel_time_seconds(self.block_map[main_next].get("length_m", 1000), speed)
            else:
                dur_main = 5

            if loop_opts:
                b = self.block_map[loop_opts[0]]
                dur_loop = travel_time_seconds(b.get("length_m", 1000), speed)
            else:
                dur_loop = dur_main

            diff = dur_loop - dur_main
            self.model.Add(self.vars[tid]["duration"] == dur_main + diff * self.vars[tid]["use_loop"])

    def add_headway_and_no_overlap(self):
        headway_default = 180
        trains = self.trains

        possible_targets = {}
        for tr in trains:
            tid = tr["id"]
            main_next = self.vars[tid]["main_next"]
            loops = self.vars[tid]["loop_options"]
            s = set()
            if main_next:
                s.add(main_next)
            for l in loops:
                s.add(l)
            possible_targets[tid] = s

        for i in range(len(trains)):
            for j in range(i + 1, len(trains)):
                t1 = trains[i]["id"]
                t2 = trains[j]["id"]

                common = possible_targets[t1].intersection(possible_targets[t2])
                if not common:
                    continue

                b12 = self.model.NewBoolVar(f"order_{t1}before{t2}")
                b21 = self.model.NewBoolVar(f"order_{t2}before{t1}")
                self.order_bools.append((b12, b21))
                self.model.Add(b12 + b21 == 1)

                max_hw = max([self.block_map[bid].get("headwaySeconds", headway_default) for bid in common])

                self.model.Add(
                    self.vars[t1]["t_enter"] + self.vars[t1]["duration"] + max_hw
                    <= self.vars[t2]["t_enter"] + self.M * (1 - b12)
                )

                self.model.Add(
                    self.vars[t2]["t_enter"] + self.vars[t2]["duration"] + max_hw
                    <= self.vars[t1]["t_enter"] + self.M * (1 - b21)
                )

    def add_objective(self):
        obj = []
        for tr in self.trains:
            tid = tr["id"]
            priority = max(1, int(tr.get("priority", 1)))
            t_enter = self.vars[tid]["t_enter"]

            obj.append(priority * t_enter)
            obj.append(100 * self.vars[tid]["use_loop"])

        self.model.Minimize(sum(obj))

    def solve(self, time_limit_seconds=10):
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds

        res = solver.Solve(self.model)

        if res in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            out = []
            for tr in self.trains:
                tid = tr["id"]
                use_loop = solver.Value(self.vars[tid]["use_loop"])
                main_next = self.vars[tid]["main_next"]
                loops = self.vars[tid]["loop_options"]

                chosen = loops[0] if use_loop and loops else main_next

                out.append({
                    "train_id": tid,
                    "train_name": tr.get("name"),
                    "chosen_target_block": chosen,
                    "use_loop": bool(use_loop),
                    "enter_at_s": solver.Value(self.vars[tid]["t_enter"]),
                    "duration_s": solver.Value(self.vars[tid]["duration"]),
                    "exit_at_s": solver.Value(self.vars[tid]["t_enter"]) + solver.Value(self.vars[tid]["duration"])
                })
            return out

        print("No feasible solution. Solver status =", res)
        return None


def load_json(file):
    with open(file, "r") as f:
        return json.load(f)


# this function is used to send data to python server
def get_train_priorities(json_file="sectionData.json"):
    data = load_json(json_file)
    engine = RailOptimizerWithLoops(data)
    engine.create_variables()
    engine.add_headway_and_no_overlap()
    engine.add_objective()
    schedule = engine.solve()

    if not schedule:
        return []

    rows = []

    for info in schedule:
        rows.append({
            "train_id": info["train_id"],
            "train_name": info.get("train_name"),
            "target_block": info.get("chosen_target_block"),
            "use_loop": info.get("use_loop"),
            "enter_at_s": info.get("enter_at_s"),
            "exit_at_s": info.get("exit_at_s"),
            "duration_s": info.get("duration_s")
        })

    return rows


#main function
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python or_engine_with_loops.py sectionData.json")
        sys.exit(1)

    data = load_json(sys.argv[1])
    engine = RailOptimizerWithLoops(data)
    engine.create_variables()
    engine.add_headway_and_no_overlap()
    engine.add_objective()
    schedule = engine.solve()

    # print(schedule)
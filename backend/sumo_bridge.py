"""SUMO bridge for live traffic simulation.

If SUMO is not installed locally, this will gracefully fall back to a dummy
state so the backend does not crash. To enable real SUMO, install SUMO and
set the environment variable SUMO_HOME to your SUMO root; ensure `sumo` and
`sumo-gui` are on PATH.
"""
from __future__ import annotations

import os
import random
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import traci  # type: ignore

    HAS_SUMO = True
except Exception:
    traci = None  # type: ignore
    HAS_SUMO = False

ROOT = Path(__file__).resolve().parent
SUMO_DIR = ROOT / "sumo"
SUMO_CFG = SUMO_DIR / "simple.sumocfg"


class SumoBridge:
    def __init__(self) -> None:
        self.started: bool = False
        self.step_count: int = 0
        self.last_state: Dict[str, Any] = {}

    def _ensure_sumo_binaries(self) -> bool:
        if not HAS_SUMO:
            return False
        if shutil.which("sumo") is None and shutil.which("sumo-gui") is None:
            return False
        return True

    def start(self, gui: bool = False) -> bool:
        if not self._ensure_sumo_binaries():
            self.started = False
            return False
        if not SUMO_CFG.exists():
            self.started = False
            return False
        binary = shutil.which("sumo-gui" if gui else "sumo") or "sumo"
        cmd = [binary, "-c", str(SUMO_CFG), "--start", "--quit-on-end"]
        try:
            # If TraCI already connected, close
            if HAS_SUMO and traci.isLoaded():  # type: ignore[attr-defined]
                traci.close()  # type: ignore[call-arg]
            traci.start(cmd)  # type: ignore[attr-defined]
            self.started = True
            self.step_count = 0
            return True
        except Exception:
            self.started = False
            return False

    def step(self) -> Dict[str, Any]:
        if not HAS_SUMO or not self.started:
            # Dummy fallback state
            self.step_count += 1
            t = self.step_count * 0.5
            vehicles = [
                {"id": f"dummy_car_{i}", "x": 20 + i * 10 + t * 2, "y": 0, "angle": 0.0, "speed": 8.0}
                for i in range(3)
            ]
            persons = [
                {"id": "dummy_ped", "x": 0, "y": 10 + (t % 10), "angle": 90.0, "speed": 1.2}
            ]
            lights = {
                "phase": "NS_GREEN" if int(t) % 2 == 0 else "EW_GREEN",
                "vehLights": {"N": "green", "S": "green", "E": "red", "W": "red"}
                if int(t) % 2 == 0
                else {"N": "red", "S": "red", "E": "green", "W": "green"},
                "pedLights": {"N": "red", "S": "red", "E": "green", "W": "green"}
                if int(t) % 2 == 0
                else {"N": "green", "S": "green", "E": "red", "W": "red"},
            }
            self.last_state = {"vehicles": vehicles, "persons": persons, "traffic_lights": lights, "time": t}
            return self.last_state

        # Real SUMO step
        try:
            traci.simulationStep()  # type: ignore[attr-defined]
            self.step_count += 1
            vehicles: List[Dict[str, Any]] = []
            for vid in traci.vehicle.getIDList():  # type: ignore[attr-defined]
                x, y = traci.vehicle.getPosition(vid)  # type: ignore[attr-defined]
                angle = traci.vehicle.getAngle(vid)  # type: ignore[attr-defined]
                speed = traci.vehicle.getSpeed(vid)  # type: ignore[attr-defined]
                vehicles.append({"id": vid, "x": x, "y": y, "angle": angle, "speed": speed})

            persons: List[Dict[str, Any]] = []
            for pid in traci.person.getIDList():  # type: ignore[attr-defined]
                x, y = traci.person.getPosition(pid)  # type: ignore[attr-defined]
                angle = traci.person.getAngle(pid)  # type: ignore[attr-defined]
                speed = traci.person.getSpeed(pid)  # type: ignore[attr-defined]
                persons.append({"id": pid, "x": x, "y": y, "angle": angle, "speed": speed})

            # Use the first traffic light as reference if exists
            tl_state: Dict[str, Any] = {
                "phase": "UNKNOWN",
                "vehLights": {"N": "red", "S": "red", "E": "red", "W": "red"},
                "pedLights": {"N": "red", "S": "red", "E": "red", "W": "red"},
            }
            lights = traci.trafficlight.getIDList()  # type: ignore[attr-defined]
            if lights:
                lid = lights[0]
                program = traci.trafficlight.getRedYellowGreenState(lid)  # type: ignore[attr-defined]
                # Map SUMO string (e.g., "GrGr") roughly to phases
                if program in ("GrGr", "GgGg"):
                    tl_state["phase"] = "NS_GREEN"
                    tl_state["vehLights"] = {"N": "green", "S": "green", "E": "red", "W": "red"}
                elif program in ("rGrG", "rGgG"):
                    tl_state["phase"] = "EW_GREEN"
                    tl_state["vehLights"] = {"N": "red", "S": "red", "E": "green", "W": "green"}
                elif program.lower().count("y"):
                    tl_state["phase"] = "YELLOW"
                else:
                    tl_state["phase"] = program
            self.last_state = {"vehicles": vehicles, "persons": persons, "traffic_lights": tl_state, "time": traci.simulation.getTime()}  # type: ignore[attr-defined]
            return self.last_state
        except Exception:
            self.started = False
            self.last_state = {}
            return {}

    def stop(self) -> None:
        if HAS_SUMO:
            try:
                traci.close()  # type: ignore[attr-defined]
            except Exception:
                pass
        self.started = False


def find_sumo_home() -> Optional[str]:
    env = os.environ.get("SUMO_HOME")
    return env


__all__ = ["SumoBridge", "HAS_SUMO", "find_sumo_home"]

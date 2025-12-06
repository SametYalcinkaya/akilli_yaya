from __future__ import annotations

from typing import Dict


class TrafficController:
    def __init__(self) -> None:
        self.state: Dict[str, Dict[str, object]] = {}
        self.initialize_intersection()

    def initialize_intersection(self) -> None:
        self.state = {
            direction: {
                "vehicle_light": "red" if direction != "north" else "green",
                "pedestrian_light": "green" if direction != "north" else "red",
                "countdown": 10,
            }
            for direction in ["north", "south", "east", "west"]
        }

    def update_light_state(self, direction: str, vehicle_color: str, pedestrian_color: str, duration: int) -> None:
        if direction not in self.state:
            return
        self.state[direction].update(
            {
                "vehicle_light": vehicle_color,
                "pedestrian_light": pedestrian_color,
                "countdown": duration,
            }
        )

    def synchronize_lights(self, extended_time: float) -> None:
        # Placeholder: extend the active direction's countdown.
        active = "north"
        self.state[active]["countdown"] = int(self.state[active]["countdown"] + extended_time)
        for direction, data in self.state.items():
            if direction != active:
                data["vehicle_light"] = "red"
                data["pedestrian_light"] = "green"

    def get_current_state(self) -> Dict[str, Dict[str, object]]:
        return self.state

    def reset(self) -> None:
        self.initialize_intersection()

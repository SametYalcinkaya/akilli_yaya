from __future__ import annotations

from typing import Dict, List


class TrafficController:
    def __init__(self) -> None:
        self.state: Dict[str, Dict[str, object]] = {}
        self.directions: List[str] = ["north", "east", "south", "west"]
        self.active_index: int = 0
        self.base_green: float = 10.0
        self.initialize_intersection()

    def initialize_intersection(self) -> None:
        self.active_index = 0
        self.state = {}
        for i, direction in enumerate(self.directions):
            active = i == self.active_index
            self.state[direction] = {
                "vehicle_light": "green" if active else "red",
                "pedestrian_light": "red" if active else "green",
                "countdown": self.base_green if active else 10,
            }

    def apply_extension(self, extended_time: float) -> None:
        active = self.directions[self.active_index]
        self.state[active]["countdown"] = max(
            0, self.state[active]["countdown"] + float(extended_time)
        )

    def tick(self, dt: float) -> None:
        if dt <= 0:
            return
        active = self.directions[self.active_index]
        self.state[active]["countdown"] = max(0.0, self.state[active]["countdown"] - dt)
        if self.state[active]["countdown"] <= 0.0:
            self._rotate()

    def _rotate(self) -> None:
        # Move to next direction
        self.active_index = (self.active_index + 1) % len(self.directions)
        for i, direction in enumerate(self.directions):
            active = i == self.active_index
            self.state[direction]["vehicle_light"] = "green" if active else "red"
            self.state[direction]["pedestrian_light"] = "red" if active else "green"
            self.state[direction]["countdown"] = self.base_green if active else 10

    def get_current_state(self) -> Dict[str, Dict[str, object]]:
        return self.state

    def reset(self) -> None:
        self.initialize_intersection()

from __future__ import annotations

from typing import Dict, List, Optional


class DecisionAlgorithm:
    BASE_TIMES: Dict[str, float] = {
        "elderly": 5.0,
        "child": 4.0,
        "disabled": 7.0,
        "pregnant": 6.0,
        "adult": 0.0,
    }

    def __init__(self, road_length_m: float = 8.0, min_green: float = 10.0) -> None:
        self.road_length_m = road_length_m
        self.min_green = min_green

    def calculate_required_time(self, persons: List[dict]) -> Dict[str, Optional[float]]:
        if not persons:
            return {"extension_time": 0.0, "critical_person": None}

        critical_person = self._find_critical_person(persons)
        base_extension = self.BASE_TIMES.get(critical_person.get("category", "adult"), 0.0)

        distance_remaining = self._distance_remaining(critical_person.get("position_percent", 0.0))
        time_needed = self.predict_crossing_time(
            speed=critical_person.get("speed_mps", 1.0), distance=distance_remaining
        )

        # Assume current green has min_green remaining; extend if calculated need is higher.
        total_required = max(self.min_green, time_needed + base_extension)
        extension_time = max(0.0, total_required - self.min_green)

        return {
            "extension_time": round(extension_time, 2),
            "critical_person": critical_person,
        }

    def predict_crossing_time(self, speed: float, distance: float) -> float:
        speed_safe = max(speed, 0.1)
        return distance / speed_safe

    def _distance_remaining(self, position_percent: float) -> float:
        return max(0.0, 1.0 - position_percent) * self.road_length_m

    def _find_critical_person(self, persons: List[dict]) -> dict:
        def remaining_time(person: dict) -> float:
            distance = self._distance_remaining(person.get("position_percent", 0.0))
            speed = person.get("speed_mps", 1.0)
            return self.predict_crossing_time(speed, distance)

        return max(persons, key=remaining_time)

from __future__ import annotations

from typing import Dict, List, Optional


class TrackingSystem:
    def __init__(self) -> None:
        self.track_history: Dict[int, List[dict]] = {}
        self._next_id = 1

    def update_tracks(self, detections: List[dict]) -> List[dict]:
        tracked: List[dict] = []
        for det in detections:
            track_id = det.get("id") or self._allocate_id()
            position_percent = self.calculate_position(det.get("bbox"))
            speed = self.estimate_speed(track_id, position_percent)

            track_record = {
                "track_id": track_id,
                "bbox": det.get("bbox"),
                "category": det.get("category", "adult"),
                "score": det.get("score", 0.0),
                "position_percent": position_percent,
                "speed_mps": speed,
            }

            tracked.append(track_record)
            self.track_history.setdefault(track_id, []).append(track_record)

        return tracked

    def calculate_position(self, bbox: Optional[List[int]]) -> float:
        if not bbox:
            return 0.0
        # Placeholder: map y-position to completion percentage.
        _, y1, _, y2 = bbox
        center_y = (y1 + y2) / 2
        return max(0.0, min(1.0, center_y / 720))

    def estimate_speed(self, track_id: int, position_percent: float) -> float:
        history = self.track_history.get(track_id, [])
        if len(history) < 1:
            return 1.2  # default walking speed m/s
        last = history[-1]
        delta = position_percent - last.get("position_percent", 0.0)
        # Assume 0.1s tick; convert percent of crossing (assume 8m road) to meters.
        meters_travelled = delta * 8.0
        return max(0.1, meters_travelled / 0.1)

    def get_critical_person(self, tracks: List[dict]) -> Optional[dict]:
        if not tracks:
            return None
        return min(tracks, key=lambda t: t.get("speed_mps", 0.0))

    def reset(self) -> None:
        self.track_history = {}
        self._next_id = 1

    def _allocate_id(self) -> int:
        current = self._next_id
        self._next_id += 1
        return current

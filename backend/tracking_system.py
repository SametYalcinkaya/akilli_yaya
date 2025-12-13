from __future__ import annotations

import time
from typing import Dict, List, Optional


class TrackingSystem:
    def __init__(self) -> None:
        self.track_history: Dict[int, List[dict]] = {}
        self._next_id = 1
        self.frame_height: float = 360.0
        self.last_ts: Dict[int, float] = {}
        self.road_length_m: float = 8.0
        self.calibration_lines: Optional[List[List[float]]] = None

    def update_tracks(self, detections: List[dict], frame_height: Optional[float] = None) -> List[dict]:
        if frame_height:
            self.frame_height = frame_height

        now = time.monotonic()
        tracked: List[dict] = []
        for det in detections:
            track_id = det.get("id") or self._allocate_id()
            position_percent = self.calculate_position(det.get("bbox"))
            speed = self.estimate_speed(track_id, position_percent, now)

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
            self.last_ts[track_id] = now

        return tracked

    def calculate_position(self, bbox: Optional[List[int]]) -> float:
        if not bbox:
            return 0.0
        if self.calibration_lines and len(self.calibration_lines) == 2:
            try:
                (x1, y1), (x2, y2) = self.calibration_lines
                px, py = self._bbox_center(bbox)
                t = self._project_ratio(px, py, x1, y1, x2, y2)
                return max(0.0, min(1.0, t))
            except Exception:
                pass

        _, y1, _, y2 = bbox
        center_y = (y1 + y2) / 2
        return max(0.0, min(1.0, center_y / float(self.frame_height or 360.0)))

    def estimate_speed(self, track_id: int, position_percent: float, now: float) -> float:
        history = self.track_history.get(track_id, [])
        if len(history) < 1:
            return 1.2  # default walking speed m/s

        last = history[-1]
        delta = position_percent - last.get("position_percent", 0.0)
        dt = max(0.05, now - self.last_ts.get(track_id, now))
        meters_travelled = delta * self.road_length_m
        speed = meters_travelled / dt
        return max(0.1, min(speed, 5.0))

    def set_calibration_lines(self, start_line: List[float], end_line: List[float]) -> None:
        self.calibration_lines = [start_line, end_line]

    # ---- Geometry helpers ----
    def _bbox_center(self, bbox: List[int]) -> tuple[float, float]:
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    def _project_ratio(self, px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
        dx = x2 - x1
        dy = y2 - y1
        if dx == 0 and dy == 0:
            return 0.0
        t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
        return t

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

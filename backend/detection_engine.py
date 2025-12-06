from __future__ import annotations

import time
from typing import List, Optional


class DetectionEngine:
    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = model_path
        self.last_detections: List[dict] = []
        self._tick = 0

    def load_model(self, model_path: str) -> None:
        self.model_path = model_path

    def detect_persons(self, frame: Optional[object]) -> List[dict]:
        if frame is None:
            self.last_detections = []
            return self.last_detections

        # Demo: hareket eden tek bir bbox üret.
        self._tick += 1
        phase = (time.time() * 0.3 + self._tick * 0.05) % 1.0
        x_offset = int(40 + phase * 180)
        y_top = 140
        width = 70
        height = 140

        self.last_detections = [
            {
                "id": 1,
                "bbox": [x_offset, y_top, x_offset + width, y_top + height],
                "score": 0.9,
                "category": "elderly" if phase < 0.33 else "adult",
            }
        ]
        return self.last_detections

    def classify_category(self, bbox: List[int], frame: Optional[object] = None) -> str:
        return "adult"

    def get_bounding_boxes(self) -> List[List[int]]:
        return [det["bbox"] for det in self.last_detections]

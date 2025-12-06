from __future__ import annotations

from typing import List, Optional


class DetectionEngine:
    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = model_path
        self.last_detections: List[dict] = []

    def load_model(self, model_path: str) -> None:
        self.model_path = model_path

    def detect_persons(self, frame: Optional[object]) -> List[dict]:
        if frame is None:
            self.last_detections = []
            return self.last_detections

        # Placeholder detection output; integrate YOLOv8 here later.
        self.last_detections = [
            {
                "id": 1,
                "bbox": [100, 200, 180, 320],
                "score": 0.9,
                "category": "adult",
            }
        ]
        return self.last_detections

    def classify_category(self, bbox: List[int], frame: Optional[object] = None) -> str:
        return "adult"

    def get_bounding_boxes(self) -> List[List[int]]:
        return [det["bbox"] for det in self.last_detections]

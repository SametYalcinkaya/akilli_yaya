from __future__ import annotations

import os
import time
from typing import List, Optional, Sequence, Tuple

import numpy as np
from ultralytics import YOLO


BEST_MODEL_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "runs",
        "detect",
        "akilli_yaya_mvp",
        "weights",
        "best.pt",
    )
)


class DetectionEngine:
    def __init__(self, model_path: Optional[str] = None) -> None:
        # Öncelik: parametre > dokümandaki best.pt > backend/models/mvp_best.pt > backend/models/yolov8n.pt
        self.model_path = model_path
        self.last_detections: List[dict] = []
        self._tick = 0
        self._model: Optional[YOLO] = None

    def _ensure_model(self) -> bool:
        if self._model:
            return True

        candidates = []
        if self.model_path:
            candidates.append(self.model_path)
        # Dokümandaki eğitim çıktısı (best.pt) öncelikli
        candidates.append(BEST_MODEL_PATH)
        # Backend modelleri
        candidates.append(os.path.join(os.path.dirname(__file__), "models", "mvp_best.pt"))
        candidates.append(os.path.join(os.path.dirname(__file__), "models", "yolov8n.pt"))

        model_path: Optional[str] = None
        for path in candidates:
            if path and os.path.exists(path):
                model_path = path
                break

        if not model_path:
            return False
        try:
            self._model = YOLO(model_path)
            self.model_path = model_path
            return True
        except Exception:
            return False

    def load_model(self, model_path: str) -> None:
        self.model_path = model_path
        self._model = None

    def detect_persons(self, frame: Optional[object]) -> List[dict]:
        if frame is None:
            self.last_detections = []
            return self.last_detections

        if self._ensure_model():
            results = self._model.predict(frame, verbose=False)
            detections: List[dict] = []
            frame_h, frame_w = frame.shape[0], frame.shape[1]
            for r in results:
                boxes = r.boxes
                if boxes is None:
                    continue
                for box in boxes:
                    cls_id = int(box.cls[0]) if box.cls is not None else -1
                    if cls_id != 0:  # keep only person class
                        continue
                    xyxy = box.xyxy[0].tolist()
                    score = float(box.conf[0]) if box.conf is not None else 0.0
                    category = self._infer_category(xyxy, (frame_h, frame_w))
                    detections.append(
                        {
                            "id": len(detections) + 1,
                            "bbox": [int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])],
                            "score": score,
                            "category": category,
                        }
                    )
            self.last_detections = detections
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

    # ---- Helpers ----
    def _infer_category(self, bbox: Sequence[float], frame_shape: Tuple[int, int]) -> str:
        """Very rough heuristic until a classifier is added."""
        x1, y1, x2, y2 = bbox
        h = max(1.0, y2 - y1)
        w = max(1.0, x2 - x1)
        frame_h, frame_w = frame_shape
        h_ratio = h / max(frame_h, 1)
        aspect = w / h

        if h_ratio < 0.22:
            return "child"
        if aspect > 0.75 and h_ratio < 0.4:
            return "disabled"
        if h_ratio > 0.5:
            return "elderly"
        return "adult"

    def classify_category(self, bbox: List[int], frame: Optional[object] = None) -> str:
        return "adult"

    def get_bounding_boxes(self) -> List[List[int]]:
        return [det["bbox"] for det in self.last_detections]

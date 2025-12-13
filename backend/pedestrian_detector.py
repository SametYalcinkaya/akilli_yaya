"""
Gelişmiş Yaya Tespit Motoru
4 sınıflı YOLO modeli ile yaya tespiti: child, elderly, disabled, adult
"""
from __future__ import annotations

import os
from typing import List, Optional, Tuple
import numpy as np

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None


class PedestrianDetector:
    """
    YOLOv8 tabanlı 4 sınıflı yaya tespit motoru.
    Sınıflar: child (0), elderly (1), disabled (2), adult (3)
    """
    
    # Sınıf isimleri (model eğitim sırasına göre)
    CLASS_NAMES = ["child", "elderly", "disabled", "adult"]
    
    # Her sınıf için varsayılan özellikler
    CLASS_PROPERTIES = {
        "child": {
            "display_name": "Çocuk",
            "emoji": "👶",
            "color": "#ef4444",  # Kırmızı
            "avg_speed": 0.9,  # m/s
            "extra_time": 4,  # saniye
            "priority": 3
        },
        "elderly": {
            "display_name": "Yaşlı",
            "emoji": "👴",
            "color": "#a855f7",  # Mor
            "avg_speed": 0.6,
            "extra_time": 5,
            "priority": 4
        },
        "disabled": {
            "display_name": "Engelli",
            "emoji": "♿",
            "color": "#f59e0b",  # Turuncu
            "avg_speed": 0.4,
            "extra_time": 7,
            "priority": 5
        },
        "adult": {
            "display_name": "Yetişkin",
            "emoji": "🚶",
            "color": "#3b82f6",  # Mavi
            "avg_speed": 1.2,
            "extra_time": 0,
            "priority": 1
        }
    }
    
    # Model arama yolları (öncelik sırasına göre)
    MODEL_SEARCH_PATHS = [
        # Ana eğitilmiş 4 sınıflı model (child, elderly, disabled, adult)
        "runs/train/ai2_balanced_v1/weights/best.pt",
        # Alternatif eğitilmiş modeller
        "runs/train/ai2_ai2balanced_v1/weights/best.pt",
        "runs/train/ai2_ai2balanced_v1_small/weights/best.pt",
        "runs/detect/akilli_yaya_mvp/weights/best.pt",
        # Backend modelleri
        "backend/models/mvp_best.pt",
        "backend/models/yolov8n.pt",
        # Root
        "yolov8n.pt"
    ]
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        confidence_threshold: float = 0.25,
        iou_threshold: float = 0.45,
        device: str = "auto"  # auto, cpu, cuda, mps
    ):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.device = device
        
        self._model: Optional[YOLO] = None
        self._model_loaded = False
        self._is_custom_model = False  # 4 sınıflı mı yoksa genel COCO mu?
        
        # İstatistikler
        self.total_detections = 0
        self.detections_by_class = {cls: 0 for cls in self.CLASS_NAMES}
        
    def load_model(self, model_path: Optional[str] = None) -> bool:
        """Model yükle."""
        if YOLO is None:
            print("⚠️ Ultralytics YOLO yüklü değil!")
            return False
        
        path = model_path or self.model_path
        
        # Model yolu belirtilmemişse ara
        if not path:
            path = self._find_model()
        
        if not path or not os.path.exists(path):
            print(f"⚠️ Model bulunamadı: {path}")
            return False
        
        try:
            self._model = YOLO(path)
            self.model_path = path
            self._model_loaded = True
            
            # Model sınıf sayısına göre custom mu kontrol et
            if hasattr(self._model, 'names'):
                num_classes = len(self._model.names)
                self._is_custom_model = num_classes == 4
                print(f"✅ Model yüklendi: {path}")
                print(f"   Sınıf sayısı: {num_classes}")
                print(f"   Custom model: {self._is_custom_model}")
            
            return True
        except Exception as e:
            print(f"❌ Model yükleme hatası: {e}")
            return False
    
    def _find_model(self) -> Optional[str]:
        """Mevcut modeli bul."""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        for rel_path in self.MODEL_SEARCH_PATHS:
            full_path = os.path.join(base_dir, rel_path)
            if os.path.exists(full_path):
                return full_path
        
        return None
    
    def detect(
        self, 
        frame: np.ndarray,
        return_annotated: bool = False
    ) -> Tuple[List[dict], Optional[np.ndarray]]:
        """
        Frame üzerinde yaya tespiti yap.
        
        Args:
            frame: BGR numpy array (OpenCV formatı)
            return_annotated: Annotated frame döndür
            
        Returns:
            (detections_list, annotated_frame or None)
            Her detection: {
                "bbox": [x1, y1, x2, y2],
                "category": str,
                "confidence": float,
                "class_id": int,
                "properties": dict
            }
        """
        if not self._model_loaded:
            if not self.load_model():
                return [], None
        
        if frame is None:
            return [], None
        
        # Inference
        results = self._model.predict(
            frame,
            conf=self.confidence_threshold,
            iou=self.iou_threshold,
            verbose=False,
            device=self.device if self.device != "auto" else None
        )
        
        detections = []
        annotated_frame = None
        
        for result in results:
            if return_annotated:
                annotated_frame = result.plot()
            
            boxes = result.boxes
            if boxes is None:
                continue
            
            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                xyxy = box.xyxy[0].tolist()
                
                # Sınıf ismini belirle
                if self._is_custom_model:
                    # Custom 4 sınıflı model
                    category = self.CLASS_NAMES[cls_id] if cls_id < len(self.CLASS_NAMES) else "adult"
                else:
                    # COCO modeli - sadece person sınıfını al
                    if cls_id != 0:  # COCO'da person=0
                        continue
                    # Heuristic ile kategori tahmin et
                    category = self._infer_category_heuristic(xyxy, frame.shape[:2])
                
                detection = {
                    "bbox": [int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])],
                    "category": category,
                    "confidence": round(conf, 3),
                    "class_id": cls_id,
                    "properties": self.CLASS_PROPERTIES.get(category, self.CLASS_PROPERTIES["adult"])
                }
                
                detections.append(detection)
                self.total_detections += 1
                self.detections_by_class[category] = self.detections_by_class.get(category, 0) + 1
        
        return detections, annotated_frame
    
    def _infer_category_heuristic(
        self, 
        bbox: List[float], 
        frame_shape: Tuple[int, int]
    ) -> str:
        """
        COCO modeliyle tespit edilmiş person için kategori tahmini.
        Bu sadece fallback - asıl model 4 sınıf üzerinde eğitilmiş olmalı.
        """
        x1, y1, x2, y2 = bbox
        h = max(1.0, y2 - y1)
        w = max(1.0, x2 - x1)
        frame_h, frame_w = frame_shape
        
        h_ratio = h / frame_h  # Kişinin frame'deki göreceli boyutu
        aspect = w / h
        
        # Çocuk: Küçük boy
        if h_ratio < 0.20:
            return "child"
        
        # Engelli: Geniş aspect ratio (tekerlekli sandalye vb.)
        if aspect > 0.8 and h_ratio < 0.35:
            return "disabled"
        
        # Yaşlı: Daha kısa boy
        if h_ratio < 0.30:
            return "elderly"
        
        return "adult"
    
    def get_class_properties(self, category: str) -> dict:
        """Sınıf özelliklerini getir."""
        return self.CLASS_PROPERTIES.get(category, self.CLASS_PROPERTIES["adult"])
    
    def get_statistics(self) -> dict:
        """Tespit istatistiklerini döndür."""
        return {
            "total_detections": self.total_detections,
            "by_class": self.detections_by_class.copy(),
            "model_path": self.model_path,
            "is_custom_model": self._is_custom_model,
            "confidence_threshold": self.confidence_threshold
        }
    
    def reset_statistics(self) -> None:
        """İstatistikleri sıfırla."""
        self.total_detections = 0
        self.detections_by_class = {cls: 0 for cls in self.CLASS_NAMES}
    
    @property
    def is_loaded(self) -> bool:
        return self._model_loaded
    
    @property
    def model_info(self) -> dict:
        """Model bilgilerini döndür."""
        if not self._model_loaded:
            return {"loaded": False}
        
        return {
            "loaded": True,
            "path": self.model_path,
            "is_custom": self._is_custom_model,
            "classes": self.CLASS_NAMES if self._is_custom_model else ["person"],
            "device": str(self._model.device) if self._model else "unknown"
        }

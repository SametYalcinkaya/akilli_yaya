"""
Gelişmiş Yaya Takip Sistemi
DeepSORT benzeri ID atama ve tracking ile yaya hareketlerini izler.
Her yayaya benzersiz ID atar ve zaman içinde takip eder.
"""
from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import numpy as np
from scipy.optimize import linear_sum_assignment


@dataclass
class PedestrianTrack:
    """Tek bir yaya için takip bilgisi."""
    track_id: int
    bbox: List[int]  # [x1, y1, x2, y2]
    category: str  # adult, elderly, child, disabled
    confidence: float
    
    # Konum ve hareket bilgileri
    center: Tuple[float, float] = (0, 0)
    velocity: Tuple[float, float] = (0, 0)  # piksel/saniye
    speed_mps: float = 0.0  # metre/saniye
    direction: str = "unknown"  # north, south, east, west, crossing
    
    # Yaya geçidi metrikleri
    position_percent: float = 0.0  # Geçitteki konum (0-1)
    distance_remaining_m: float = 0.0  # Kalan mesafe
    eta_seconds: float = 0.0  # Tahmini geçiş süresi
    time_in_crosswalk: float = 0.0  # Geçitte geçirilen süre
    
    # Tracking meta
    age: int = 0  # Frame sayısı
    hits: int = 0  # Başarılı eşleşme sayısı
    time_since_update: int = 0  # Son görülmeden bu yana frame
    first_seen: float = 0.0
    last_seen: float = 0.0
    
    # Tarihçe
    position_history: List[Tuple[float, float]] = field(default_factory=list)
    speed_history: List[float] = field(default_factory=list)


class PedestrianTracker:
    """
    Yaya takip sistemi.
    IoU tabanlı eşleştirme ve Kalman filtre benzeri tahmin.
    """
    
    def __init__(
        self,
        max_age: int = 30,  # Kaybolma toleransı (frame)
        min_hits: int = 3,   # Onay için minimum görülme
        iou_threshold: float = 0.3,
        road_length_m: float = 10.0  # Varsayılan yaya geçidi uzunluğu
    ):
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        self.road_length_m = road_length_m
        
        self.tracks: Dict[int, PedestrianTrack] = {}
        self._next_id = 1
        self._frame_count = 0
        
        # Kalibrasyon
        self.crosswalk_start: Optional[Tuple[float, float]] = None
        self.crosswalk_end: Optional[Tuple[float, float]] = None
        self.pixels_per_meter: float = 50.0  # Varsayılan
        
        # İstatistikler
        self.total_pedestrians_seen = 0
        self.pedestrians_crossed = 0
        
    def update(
        self, 
        detections: List[dict],
        frame_shape: Tuple[int, int] = (480, 640)
    ) -> List[PedestrianTrack]:
        """
        Yeni tespitlerle track'leri güncelle.
        
        Args:
            detections: [{"bbox": [x1,y1,x2,y2], "category": str, "score": float}, ...]
            frame_shape: (height, width)
        
        Returns:
            Aktif track listesi
        """
        self._frame_count += 1
        now = time.time()
        frame_h, frame_w = frame_shape
        
        # Track yaşlarını artır
        for track in self.tracks.values():
            track.time_since_update += 1
            track.age += 1
        
        if not detections:
            # Tespit yoksa sadece eski track'leri temizle
            self._remove_dead_tracks()
            return self._get_confirmed_tracks()
        
        # Detection bbox'larını çıkar
        det_bboxes = np.array([d["bbox"] for d in detections])
        det_categories = [d.get("category", "adult") for d in detections]
        det_scores = [d.get("score", 0.0) for d in detections]
        
        # Track bbox'larını çıkar
        if self.tracks:
            track_ids = list(self.tracks.keys())
            track_bboxes = np.array([self.tracks[tid].bbox for tid in track_ids])
            
            # IoU matrisi hesapla
            iou_matrix = self._compute_iou_matrix(det_bboxes, track_bboxes)
            
            # Hungarian algoritması ile eşleştir
            matched_det_idx, matched_track_idx, unmatched_dets, unmatched_tracks = \
                self._associate_detections(iou_matrix, track_ids)
            
            # Eşleşen track'leri güncelle
            for det_idx, track_idx in zip(matched_det_idx, matched_track_idx):
                track_id = track_ids[track_idx]
                self._update_track(
                    track_id,
                    detections[det_idx],
                    frame_shape,
                    now
                )
            
            # Eşleşmeyen tespitler için yeni track oluştur
            for det_idx in unmatched_dets:
                self._create_track(detections[det_idx], frame_shape, now)
        else:
            # Track yok, hepsini yeni track olarak oluştur
            for det in detections:
                self._create_track(det, frame_shape, now)
        
        # Ölü track'leri temizle
        self._remove_dead_tracks()
        
        return self._get_confirmed_tracks()
    
    def _compute_iou_matrix(
        self, 
        det_bboxes: np.ndarray, 
        track_bboxes: np.ndarray
    ) -> np.ndarray:
        """IoU matrisini hesapla."""
        n_det = len(det_bboxes)
        n_track = len(track_bboxes)
        iou_matrix = np.zeros((n_det, n_track))
        
        for d in range(n_det):
            for t in range(n_track):
                iou_matrix[d, t] = self._iou(det_bboxes[d], track_bboxes[t])
        
        return iou_matrix
    
    def _iou(self, bbox1: np.ndarray, bbox2: np.ndarray) -> float:
        """İki bbox arasındaki IoU."""
        x1 = max(bbox1[0], bbox2[0])
        y1 = max(bbox1[1], bbox2[1])
        x2 = min(bbox1[2], bbox2[2])
        y2 = min(bbox1[3], bbox2[3])
        
        intersection = max(0, x2 - x1) * max(0, y2 - y1)
        
        area1 = (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1])
        area2 = (bbox2[2] - bbox2[0]) * (bbox2[3] - bbox2[1])
        union = area1 + area2 - intersection
        
        return intersection / union if union > 0 else 0
    
    def _associate_detections(
        self, 
        iou_matrix: np.ndarray,
        track_ids: List[int]
    ) -> Tuple[List[int], List[int], List[int], List[int]]:
        """Hungarian algoritması ile eşleştir."""
        if iou_matrix.size == 0:
            return [], [], list(range(iou_matrix.shape[0])), []
        
        # Cost matrix (1 - IoU)
        cost_matrix = 1 - iou_matrix
        
        # Linear sum assignment
        row_indices, col_indices = linear_sum_assignment(cost_matrix)
        
        matched_det_idx = []
        matched_track_idx = []
        unmatched_dets = list(range(iou_matrix.shape[0]))
        unmatched_tracks = list(range(iou_matrix.shape[1]))
        
        for row, col in zip(row_indices, col_indices):
            if iou_matrix[row, col] >= self.iou_threshold:
                matched_det_idx.append(row)
                matched_track_idx.append(col)
                unmatched_dets.remove(row)
                if col in unmatched_tracks:
                    unmatched_tracks.remove(col)
        
        return matched_det_idx, matched_track_idx, unmatched_dets, unmatched_tracks
    
    def _create_track(
        self, 
        detection: dict,
        frame_shape: Tuple[int, int],
        timestamp: float
    ) -> PedestrianTrack:
        """Yeni track oluştur."""
        track_id = self._next_id
        self._next_id += 1
        self.total_pedestrians_seen += 1
        
        bbox = detection["bbox"]
        center = self._bbox_center(bbox)
        
        track = PedestrianTrack(
            track_id=track_id,
            bbox=bbox,
            category=detection.get("category", "adult"),
            confidence=detection.get("score", 0.0),
            center=center,
            first_seen=timestamp,
            last_seen=timestamp,
            hits=1,
            age=1,
            time_since_update=0
        )
        
        # Konum bilgilerini hesapla
        self._update_position_metrics(track, frame_shape)
        track.position_history.append(center)
        
        self.tracks[track_id] = track
        return track
    
    def _update_track(
        self,
        track_id: int,
        detection: dict,
        frame_shape: Tuple[int, int],
        timestamp: float
    ) -> None:
        """Mevcut track'i güncelle."""
        track = self.tracks[track_id]
        
        old_center = track.center
        old_time = track.last_seen
        
        # Temel bilgileri güncelle
        track.bbox = detection["bbox"]
        track.category = detection.get("category", track.category)
        track.confidence = detection.get("score", track.confidence)
        track.center = self._bbox_center(track.bbox)
        track.last_seen = timestamp
        track.hits += 1
        track.time_since_update = 0
        
        # Hız hesapla
        dt = timestamp - old_time
        if dt > 0.01:
            dx = track.center[0] - old_center[0]
            dy = track.center[1] - old_center[1]
            track.velocity = (dx / dt, dy / dt)
            
            # Piksel hızından metre/saniye'ye çevir
            pixel_speed = np.sqrt(dx**2 + dy**2) / dt
            track.speed_mps = pixel_speed / self.pixels_per_meter
            track.speed_mps = max(0.1, min(track.speed_mps, 3.0))  # 0.1-3 m/s arası
            
            # Yön hesapla
            track.direction = self._calculate_direction(dx, dy)
        
        # Konum bilgilerini güncelle
        self._update_position_metrics(track, frame_shape)
        
        # Tarihçeye ekle
        track.position_history.append(track.center)
        if len(track.position_history) > 100:
            track.position_history = track.position_history[-100:]
        
        track.speed_history.append(track.speed_mps)
        if len(track.speed_history) > 30:
            track.speed_history = track.speed_history[-30:]
    
    def _update_position_metrics(
        self, 
        track: PedestrianTrack,
        frame_shape: Tuple[int, int]
    ) -> None:
        """Yaya geçidi metrikleri hesapla."""
        frame_h, frame_w = frame_shape
        cx, cy = track.center
        
        if self.crosswalk_start and self.crosswalk_end:
            # Kalibrasyon varsa ona göre hesapla
            start = self.crosswalk_start
            end = self.crosswalk_end
            
            # Noktanın çizgi üzerindeki projeksiyonu
            line_vec = (end[0] - start[0], end[1] - start[1])
            line_len = np.sqrt(line_vec[0]**2 + line_vec[1]**2)
            
            if line_len > 0:
                point_vec = (cx - start[0], cy - start[1])
                t = (point_vec[0] * line_vec[0] + point_vec[1] * line_vec[1]) / (line_len ** 2)
                track.position_percent = max(0.0, min(1.0, t))
        else:
            # Varsayılan: Y eksenine göre (yukarıdan aşağı)
            track.position_percent = cy / frame_h
        
        # Kalan mesafe
        track.distance_remaining_m = (1.0 - track.position_percent) * self.road_length_m
        
        # ETA hesapla
        if track.speed_mps > 0.1:
            track.eta_seconds = track.distance_remaining_m / track.speed_mps
        else:
            track.eta_seconds = float('inf')
        
        # Geçitte geçirilen süre
        track.time_in_crosswalk = track.last_seen - track.first_seen
    
    def _calculate_direction(self, dx: float, dy: float) -> str:
        """Hareket yönünü hesapla."""
        if abs(dx) < 5 and abs(dy) < 5:
            return "stationary"
        
        angle = np.arctan2(dy, dx) * 180 / np.pi
        
        if -45 <= angle < 45:
            return "east"
        elif 45 <= angle < 135:
            return "south"
        elif -135 <= angle < -45:
            return "north"
        else:
            return "west"
    
    def _bbox_center(self, bbox: List[int]) -> Tuple[float, float]:
        """Bbox merkezini hesapla."""
        return ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
    
    def _remove_dead_tracks(self) -> None:
        """Artık görülmeyen track'leri kaldır."""
        dead_tracks = []
        for track_id, track in self.tracks.items():
            if track.time_since_update > self.max_age:
                dead_tracks.append(track_id)
                # Geçişi tamamladı mı kontrol et
                if track.position_percent > 0.9:
                    self.pedestrians_crossed += 1
        
        for track_id in dead_tracks:
            del self.tracks[track_id]
    
    def _get_confirmed_tracks(self) -> List[PedestrianTrack]:
        """Onaylanmış (yeterli hit'e sahip) track'leri döndür."""
        return [
            track for track in self.tracks.values()
            if track.hits >= self.min_hits
        ]
    
    def set_crosswalk_calibration(
        self,
        start_point: Tuple[float, float],
        end_point: Tuple[float, float],
        road_length_m: float = 10.0
    ) -> None:
        """Yaya geçidi kalibrasyonu."""
        self.crosswalk_start = start_point
        self.crosswalk_end = end_point
        self.road_length_m = road_length_m
        
        # Piksel/metre oranını hesapla
        pixel_distance = np.sqrt(
            (end_point[0] - start_point[0])**2 + 
            (end_point[1] - start_point[1])**2
        )
        if road_length_m > 0:
            self.pixels_per_meter = pixel_distance / road_length_m
    
    def get_track_by_id(self, track_id: int) -> Optional[PedestrianTrack]:
        """ID ile track getir."""
        return self.tracks.get(track_id)
    
    def get_all_tracks(self) -> List[PedestrianTrack]:
        """Tüm aktif track'leri getir."""
        return list(self.tracks.values())
    
    def get_critical_pedestrian(self) -> Optional[PedestrianTrack]:
        """En kritik (en yavaş veya en uzun ETA'lı) yayayı bul."""
        confirmed = self._get_confirmed_tracks()
        if not confirmed:
            return None
        
        # En yüksek ETA'ya sahip olanı döndür
        return max(confirmed, key=lambda t: t.eta_seconds if t.eta_seconds != float('inf') else 0)
    
    def get_pedestrians_by_category(self) -> Dict[str, List[PedestrianTrack]]:
        """Kategorilere göre grupla."""
        result: Dict[str, List[PedestrianTrack]] = defaultdict(list)
        for track in self._get_confirmed_tracks():
            result[track.category].append(track)
        return dict(result)
    
    def get_statistics(self) -> dict:
        """İstatistikleri döndür."""
        confirmed = self._get_confirmed_tracks()
        categories = self.get_pedestrians_by_category()
        
        avg_speed = 0.0
        if confirmed:
            avg_speed = np.mean([t.speed_mps for t in confirmed])
        
        return {
            "total_seen": self.total_pedestrians_seen,
            "total_crossed": self.pedestrians_crossed,
            "current_count": len(confirmed),
            "by_category": {cat: len(tracks) for cat, tracks in categories.items()},
            "average_speed_mps": round(avg_speed, 2)
        }
    
    def reset(self) -> None:
        """Tüm track'leri sıfırla."""
        self.tracks.clear()
        self._next_id = 1
        self._frame_count = 0
        self.total_pedestrians_seen = 0
        self.pedestrians_crossed = 0
    
    def to_dict_list(self) -> List[dict]:
        """Track'leri JSON serileştirilebilir dict listesine çevir."""
        return [
            {
                "track_id": t.track_id,
                "bbox": t.bbox,
                "category": t.category,
                "confidence": round(t.confidence, 2),
                "center": [round(t.center[0], 1), round(t.center[1], 1)],
                "velocity": [round(t.velocity[0], 1), round(t.velocity[1], 1)],
                "speed_mps": round(t.speed_mps, 2),
                "direction": t.direction,
                "position_percent": round(t.position_percent, 2),
                "distance_remaining_m": round(t.distance_remaining_m, 2),
                "eta_seconds": round(t.eta_seconds, 1) if t.eta_seconds != float('inf') else None,
                "time_in_crosswalk": round(t.time_in_crosswalk, 1),
                "age": t.age,
                "hits": t.hits
            }
            for t in self._get_confirmed_tracks()
        ]

"""
Yaya Metrikleri Hesaplama Modülü
Her yaya için detaylı metrikler: hız, yön, ETA, kalan mesafe vb.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import numpy as np
from pedestrian_tracker import PedestrianTrack


@dataclass
class CrosswalkMetrics:
    """Yaya geçidi bazlı metrikler."""
    total_pedestrians: int = 0
    pedestrians_crossing: int = 0
    pedestrians_waiting: int = 0
    pedestrians_crossed: int = 0
    
    avg_crossing_time: float = 0.0
    avg_speed: float = 0.0
    
    critical_pedestrian_id: Optional[int] = None
    required_green_time: float = 0.0
    extension_time: float = 0.0
    
    # Kategori bazlı sayımlar
    by_category: Dict[str, int] = field(default_factory=dict)
    
    # Risk seviyesi
    risk_level: str = "low"  # low, medium, high, critical


@dataclass 
class PedestrianMetrics:
    """Tek bir yaya için hesaplanan metrikler."""
    track_id: int
    category: str
    
    # Konum
    position_x: float  # Piksel
    position_y: float
    position_percent: float  # Geçitteki ilerleme (0-1)
    
    # Hareket
    speed_mps: float  # Metre/saniye
    speed_kmh: float  # Km/saat
    direction: str  # north, south, east, west
    velocity_x: float  # Piksel/saniye
    velocity_y: float
    
    # Zaman
    time_in_frame: float  # Saniye
    eta_seconds: float  # Tahmini geçiş süresi
    
    # Mesafe
    distance_traveled_m: float
    distance_remaining_m: float
    
    # Durum
    is_crossing: bool  # Geçiş yapıyor mu
    is_stationary: bool  # Duruyor mu
    priority_level: int  # 1-5 arası öncelik
    
    # Görsel
    bbox: List[int]
    color: str


class MetricsCalculator:
    """
    Yaya metriklerini hesaplayan ana sınıf.
    TrackingSystem'dan gelen verileri işler.
    """
    
    # Kategori öncelikleri
    CATEGORY_PRIORITIES = {
        "disabled": 5,
        "elderly": 4,
        "child": 3,
        "adult": 1
    }
    
    # Kategori ek süreleri (saniye)
    CATEGORY_EXTRA_TIME = {
        "disabled": 7,
        "elderly": 5,
        "child": 4,
        "adult": 0
    }
    
    # Kategori renkleri
    CATEGORY_COLORS = {
        "child": "#ef4444",
        "elderly": "#a855f7", 
        "disabled": "#f59e0b",
        "adult": "#3b82f6"
    }
    
    def __init__(
        self,
        road_length_m: float = 10.0,
        min_green_time: float = 10.0,
        crossing_threshold: float = 0.1  # Geçitte sayılma için minimum ilerleme
    ):
        self.road_length_m = road_length_m
        self.min_green_time = min_green_time
        self.crossing_threshold = crossing_threshold
        
        # Geçmiş veriler
        self._crossing_times: List[float] = []
        self._speed_samples: List[float] = []
        
    def calculate_pedestrian_metrics(
        self, 
        track: PedestrianTrack
    ) -> PedestrianMetrics:
        """Tek bir yaya için tüm metrikleri hesapla."""
        
        is_crossing = track.position_percent >= self.crossing_threshold
        is_stationary = track.speed_mps < 0.2
        
        # Kat edilen mesafe (tarihçeden)
        distance_traveled = 0.0
        if len(track.position_history) > 1:
            for i in range(1, len(track.position_history)):
                p1 = track.position_history[i-1]
                p2 = track.position_history[i]
                distance_traveled += np.sqrt((p2[0]-p1[0])**2 + (p2[1]-p1[1])**2)
        
        return PedestrianMetrics(
            track_id=track.track_id,
            category=track.category,
            position_x=track.center[0],
            position_y=track.center[1],
            position_percent=track.position_percent,
            speed_mps=track.speed_mps,
            speed_kmh=track.speed_mps * 3.6,
            direction=track.direction,
            velocity_x=track.velocity[0],
            velocity_y=track.velocity[1],
            time_in_frame=track.time_in_crosswalk,
            eta_seconds=track.eta_seconds if track.eta_seconds != float('inf') else 999,
            distance_traveled_m=distance_traveled / 50.0,  # Piksel -> metre (yaklaşık)
            distance_remaining_m=track.distance_remaining_m,
            is_crossing=is_crossing,
            is_stationary=is_stationary,
            priority_level=self.CATEGORY_PRIORITIES.get(track.category, 1),
            bbox=track.bbox,
            color=self.CATEGORY_COLORS.get(track.category, "#3b82f6")
        )
    
    def calculate_crosswalk_metrics(
        self,
        tracks: List[PedestrianTrack]
    ) -> CrosswalkMetrics:
        """Tüm geçit için toplu metrikler hesapla."""
        
        if not tracks:
            return CrosswalkMetrics()
        
        # Kategorilere ayır
        by_category: Dict[str, int] = {}
        crossing_count = 0
        waiting_count = 0
        speeds: List[float] = []
        
        for track in tracks:
            cat = track.category
            by_category[cat] = by_category.get(cat, 0) + 1
            speeds.append(track.speed_mps)
            
            if track.position_percent >= self.crossing_threshold:
                crossing_count += 1
            else:
                waiting_count += 1
        
        # Kritik yayayı bul (en yüksek ETA + öncelik)
        critical = self._find_critical_pedestrian(tracks)
        critical_id = critical.track_id if critical else None
        
        # Gerekli yeşil ışık süresini hesapla
        required_time = self._calculate_required_green_time(tracks)
        extension_time = max(0, required_time - self.min_green_time)
        
        # Risk seviyesi
        risk_level = self._calculate_risk_level(tracks)
        
        return CrosswalkMetrics(
            total_pedestrians=len(tracks),
            pedestrians_crossing=crossing_count,
            pedestrians_waiting=waiting_count,
            avg_speed=round(np.mean(speeds), 2) if speeds else 0,
            avg_crossing_time=round(np.mean(self._crossing_times), 1) if self._crossing_times else 0,
            critical_pedestrian_id=critical_id,
            required_green_time=round(required_time, 1),
            extension_time=round(extension_time, 1),
            by_category=by_category,
            risk_level=risk_level
        )
    
    def _find_critical_pedestrian(
        self, 
        tracks: List[PedestrianTrack]
    ) -> Optional[PedestrianTrack]:
        """En kritik yayayı bul - en yüksek ETA ve öncelik kombinasyonu."""
        if not tracks:
            return None
        
        def criticality_score(track: PedestrianTrack) -> float:
            # Yüksek ETA + yüksek öncelik = daha kritik
            eta = track.eta_seconds if track.eta_seconds != float('inf') else 100
            priority = self.CATEGORY_PRIORITIES.get(track.category, 1)
            # Geçitte olanları önceliklendir
            crossing_bonus = 10 if track.position_percent >= self.crossing_threshold else 0
            return eta * priority + crossing_bonus
        
        return max(tracks, key=criticality_score)
    
    def _calculate_required_green_time(
        self,
        tracks: List[PedestrianTrack]
    ) -> float:
        """Tüm yayaların geçmesi için gereken minimum yeşil ışık süresi."""
        if not tracks:
            return self.min_green_time
        
        max_time_needed = 0.0
        
        for track in tracks:
            # Temel geçiş süresi
            base_time = track.eta_seconds if track.eta_seconds != float('inf') else 30
            
            # Kategori ek süresi
            extra_time = self.CATEGORY_EXTRA_TIME.get(track.category, 0)
            
            # Toplam
            total = base_time + extra_time
            max_time_needed = max(max_time_needed, total)
        
        return max(self.min_green_time, max_time_needed)
    
    def _calculate_risk_level(
        self, 
        tracks: List[PedestrianTrack]
    ) -> str:
        """Geçit risk seviyesini hesapla."""
        if not tracks:
            return "low"
        
        # Risk faktörleri
        has_disabled = any(t.category == "disabled" for t in tracks)
        has_elderly = any(t.category == "elderly" for t in tracks)
        has_child = any(t.category == "child" for t in tracks)
        has_stationary = any(t.speed_mps < 0.2 for t in tracks)
        high_eta = any(t.eta_seconds > 20 for t in tracks if t.eta_seconds != float('inf'))
        
        # Skor hesapla
        score = 0
        if has_disabled: score += 3
        if has_elderly: score += 2
        if has_child: score += 2
        if has_stationary: score += 2
        if high_eta: score += 1
        if len(tracks) > 5: score += 1
        
        if score >= 6:
            return "critical"
        elif score >= 4:
            return "high"
        elif score >= 2:
            return "medium"
        return "low"
    
    def format_for_display(
        self,
        tracks: List[PedestrianTrack]
    ) -> Dict:
        """Frontend için formatlı veri hazırla."""
        
        crosswalk = self.calculate_crosswalk_metrics(tracks)
        
        pedestrians = []
        for track in tracks:
            metrics = self.calculate_pedestrian_metrics(track)
            pedestrians.append({
                "id": metrics.track_id,
                "category": metrics.category,
                "categoryDisplay": {
                    "child": "Çocuk",
                    "elderly": "Yaşlı",
                    "disabled": "Engelli",
                    "adult": "Yetişkin"
                }.get(metrics.category, metrics.category),
                "emoji": {
                    "child": "👶",
                    "elderly": "👴",
                    "disabled": "♿",
                    "adult": "🚶"
                }.get(metrics.category, "🚶"),
                "bbox": metrics.bbox,
                "position": {
                    "x": round(metrics.position_x),
                    "y": round(metrics.position_y),
                    "percent": round(metrics.position_percent * 100, 1)
                },
                "speed": {
                    "mps": round(metrics.speed_mps, 2),
                    "kmh": round(metrics.speed_kmh, 1)
                },
                "direction": metrics.direction,
                "eta": round(metrics.eta_seconds, 1) if metrics.eta_seconds < 999 else None,
                "distanceRemaining": round(metrics.distance_remaining_m, 1),
                "timeInFrame": round(metrics.time_in_frame, 1),
                "status": "crossing" if metrics.is_crossing else ("waiting" if not metrics.is_stationary else "stationary"),
                "priority": metrics.priority_level,
                "color": metrics.color
            })
        
        return {
            "pedestrians": pedestrians,
            "summary": {
                "total": crosswalk.total_pedestrians,
                "crossing": crosswalk.pedestrians_crossing,
                "waiting": crosswalk.pedestrians_waiting,
                "avgSpeed": crosswalk.avg_speed,
                "byCategory": crosswalk.by_category,
                "riskLevel": crosswalk.risk_level
            },
            "traffic": {
                "criticalPedestrianId": crosswalk.critical_pedestrian_id,
                "requiredGreenTime": crosswalk.required_green_time,
                "extensionTime": crosswalk.extension_time
            }
        }
    
    def record_crossing_complete(self, crossing_time: float) -> None:
        """Geçiş tamamlandığında süreyi kaydet."""
        self._crossing_times.append(crossing_time)
        if len(self._crossing_times) > 100:
            self._crossing_times = self._crossing_times[-100:]
    
    def reset(self) -> None:
        """İstatistikleri sıfırla."""
        self._crossing_times.clear()
        self._speed_samples.clear()

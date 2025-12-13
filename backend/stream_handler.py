"""
MOBESE Canlı Yayın Stream Handler
Bursa Büyükşehir Belediyesi ve diğer HLS/RTSP kaynaklarından video akışı yönetimi.
"""
from __future__ import annotations

import base64
import threading
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Callable
from queue import Queue, Empty
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None


@dataclass
class StreamSource:
    """Tek bir video kaynağı tanımı."""
    name: str
    url: str
    source_type: str = "hls"  # hls, rtsp, webcam, video
    enabled: bool = True
    last_frame: Optional[np.ndarray] = field(default=None, repr=False)
    last_update: float = 0.0
    fps: float = 0.0
    width: int = 0
    height: int = 0
    is_connected: bool = False
    error_message: str = ""


class StreamHandler:
    """
    Çoklu video akışı yöneticisi.
    Her stream için ayrı thread açar ve frame'leri Queue'ya koyar.
    """
    
    # Bursa MOBESE preset'leri
    BURSA_PRESETS: Dict[str, dict] = {
        "polis_okulu": {
            "name": "Polis Okulu Kavşağı",
            "api_id": "21559",
            "stream_key": "polisokulu"
        },
        "esentepe": {
            "name": "Esentepe Kavşağı", 
            "api_id": "13790",
            "stream_key": "esentepe"
        },
        "fsm_bulvari": {
            "name": "FSM Bulvarı",
            "api_id": "13235",
            "stream_key": "fsmbulvari"
        },
        "heykel": {
            "name": "Heykel Atatürk Caddesi",
            "api_id": "12234",
            "stream_key": "heykel"
        },
        "kent_meydani": {
            "name": "Kent Meydanı",
            "api_id": "12232",
            "stream_key": "kentmeydani"
        },
        "izmir_yolu": {
            "name": "İzmir Yolu Ataevler",
            "api_id": "12237",
            "stream_key": "izmiryolu"
        }
    }
    
    def __init__(self) -> None:
        self.sources: Dict[str, StreamSource] = {}
        self.active_source_id: Optional[str] = None
        self._threads: Dict[str, threading.Thread] = {}
        self._stop_events: Dict[str, threading.Event] = {}
        self._frame_queues: Dict[str, Queue] = {}
        self._running = False
        self._frame_callbacks: List[Callable] = []
        
    def add_source(self, source_id: str, name: str, url: str, 
                   source_type: str = "hls") -> StreamSource:
        """Yeni video kaynağı ekle."""
        source = StreamSource(
            name=name,
            url=url,
            source_type=source_type
        )
        self.sources[source_id] = source
        self._frame_queues[source_id] = Queue(maxsize=5)
        return source
    
    def add_bursa_preset(self, preset_key: str, stream_url: str) -> Optional[StreamSource]:
        """Bursa MOBESE preset'i ekle."""
        if preset_key not in self.BURSA_PRESETS:
            return None
        
        preset = self.BURSA_PRESETS[preset_key]
        return self.add_source(
            source_id=f"bursa_{preset_key}",
            name=preset["name"],
            url=stream_url,
            source_type="hls"
        )
    
    def add_webcam(self, device_id: int = 0, name: str = "Webcam") -> StreamSource:
        """Webcam ekle."""
        return self.add_source(
            source_id=f"webcam_{device_id}",
            name=name,
            url=str(device_id),
            source_type="webcam"
        )
    
    def add_video_file(self, file_path: str, name: str = "Video") -> StreamSource:
        """Video dosyası ekle."""
        source_id = f"video_{hash(file_path) % 10000}"
        return self.add_source(
            source_id=source_id,
            name=name,
            url=file_path,
            source_type="video"
        )
    
    def start_source(self, source_id: str) -> bool:
        """Belirli bir kaynağı başlat."""
        if source_id not in self.sources:
            return False
        
        if source_id in self._threads and self._threads[source_id].is_alive():
            return True  # Zaten çalışıyor
        
        stop_event = threading.Event()
        self._stop_events[source_id] = stop_event
        
        thread = threading.Thread(
            target=self._capture_loop,
            args=(source_id, stop_event),
            daemon=True
        )
        self._threads[source_id] = thread
        thread.start()
        
        self.active_source_id = source_id
        self._running = True
        return True
    
    def stop_source(self, source_id: str) -> None:
        """Belirli bir kaynağı durdur."""
        if source_id in self._stop_events:
            self._stop_events[source_id].set()
            
        if source_id in self._threads:
            self._threads[source_id].join(timeout=2.0)
            del self._threads[source_id]
            
        if source_id in self.sources:
            self.sources[source_id].is_connected = False
    
    def stop_all(self) -> None:
        """Tüm kaynakları durdur."""
        self._running = False
        for source_id in list(self._threads.keys()):
            self.stop_source(source_id)
    
    def _capture_loop(self, source_id: str, stop_event: threading.Event) -> None:
        """Frame yakalama döngüsü (ayrı thread'de çalışır)."""
        if cv2 is None:
            return
        
        source = self.sources.get(source_id)
        if not source:
            return
        
        # Capture oluştur
        if source.source_type == "webcam":
            cap = cv2.VideoCapture(int(source.url))
        else:
            cap = cv2.VideoCapture(source.url)
        
        if not cap.isOpened():
            source.is_connected = False
            source.error_message = "Bağlantı kurulamadı"
            return
        
        source.is_connected = True
        source.error_message = ""
        source.width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        source.height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        source.fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        
        frame_count = 0
        start_time = time.monotonic()
        
        while not stop_event.is_set():
            ret, frame = cap.read()
            
            if not ret:
                # Video bittiyse başa sar (sadece video dosyaları için)
                if source.source_type == "video":
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    # Stream kesildi, yeniden bağlanmayı dene
                    time.sleep(1.0)
                    cap.release()
                    cap = cv2.VideoCapture(source.url)
                    continue
            
            source.last_frame = frame
            source.last_update = time.monotonic()
            frame_count += 1
            
            # FPS hesapla
            elapsed = time.monotonic() - start_time
            if elapsed > 1.0:
                source.fps = frame_count / elapsed
                frame_count = 0
                start_time = time.monotonic()
            
            # Queue'ya ekle (dolu ise eskiyi at)
            queue = self._frame_queues.get(source_id)
            if queue:
                try:
                    queue.put_nowait(frame)
                except:
                    try:
                        queue.get_nowait()
                        queue.put_nowait(frame)
                    except:
                        pass
            
            # Callback'leri çağır
            for callback in self._frame_callbacks:
                try:
                    callback(source_id, frame)
                except Exception:
                    pass
            
            # Frame rate kontrol
            time.sleep(0.02)  # ~50 FPS max
        
        cap.release()
        source.is_connected = False
    
    def get_frame(self, source_id: Optional[str] = None) -> Optional[np.ndarray]:
        """Belirli kaynaktan veya aktif kaynaktan frame al."""
        sid = source_id or self.active_source_id
        if not sid or sid not in self.sources:
            return None
        
        source = self.sources[sid]
        return source.last_frame
    
    def get_frame_base64(self, source_id: Optional[str] = None) -> Optional[str]:
        """Frame'i base64 olarak döndür."""
        frame = self.get_frame(source_id)
        if frame is None or cv2 is None:
            return None
        
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return base64.b64encode(buffer).decode('ascii')
    
    def get_source_status(self, source_id: str) -> Dict:
        """Kaynak durumunu döndür."""
        source = self.sources.get(source_id)
        if not source:
            return {"error": "Source not found"}
        
        return {
            "id": source_id,
            "name": source.name,
            "url": source.url,
            "type": source.source_type,
            "connected": source.is_connected,
            "width": source.width,
            "height": source.height,
            "fps": round(source.fps, 1),
            "last_update": source.last_update,
            "error": source.error_message
        }
    
    def get_all_sources_status(self) -> List[Dict]:
        """Tüm kaynakların durumunu döndür."""
        return [self.get_source_status(sid) for sid in self.sources]
    
    def register_frame_callback(self, callback: Callable) -> None:
        """Frame geldiğinde çağrılacak callback ekle."""
        self._frame_callbacks.append(callback)
    
    @property
    def is_running(self) -> bool:
        return self._running
    
    @property 
    def frame_shape(self) -> tuple:
        """Aktif kaynağın frame boyutları."""
        source = self.sources.get(self.active_source_id)
        if source and source.last_frame is not None:
            return source.last_frame.shape
        return (480, 640, 3)

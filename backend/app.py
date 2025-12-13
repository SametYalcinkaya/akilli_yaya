"""
Akıllı Yaya Güvenliği Sistemi - Ana Backend
MOBESE ve diğer video kaynaklarından canlı yaya analizi.
"""
from __future__ import annotations

import asyncio
import os
import re
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Yerel modüller
from stream_handler import StreamHandler, StreamSource
from pedestrian_detector import PedestrianDetector
from pedestrian_tracker import PedestrianTracker
from metrics_calculator import MetricsCalculator

# ==================== FastAPI App ====================
app = FastAPI(
    title="Akıllı Yaya Güvenliği Sistemi",
    description="MOBESE ve video kaynaklarından canlı yaya tespiti ve analizi",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Global Instances ====================
stream_handler = StreamHandler()
detector = PedestrianDetector(confidence_threshold=0.3)
tracker = PedestrianTracker(max_age=30, min_hits=3, road_length_m=10.0)
metrics_calc = MetricsCalculator(road_length_m=10.0)

# WebSocket bağlantıları
active_connections: List[WebSocket] = []


# ==================== Pydantic Models ====================
class StreamConfig(BaseModel):
    """Video kaynağı ekleme konfigürasyonu."""
    source_id: str
    name: str
    url: str
    source_type: str = "hls"  # hls, rtsp, webcam, video


class BursaPresetConfig(BaseModel):
    """Bursa MOBESE preset konfigürasyonu."""
    preset_key: str  # polis_okulu, esentepe, fsm_bulvari, vb.
    stream_url: str  # HLS URL (tokenli)


class CalibrationConfig(BaseModel):
    """Yaya geçidi kalibrasyon ayarları."""
    start_point: List[float] = Field(..., description="Geçit başlangıç noktası [x, y]")
    end_point: List[float] = Field(..., description="Geçit bitiş noktası [x, y]")
    road_length_m: float = Field(10.0, description="Gerçek yol uzunluğu (metre)")


class DetectorConfig(BaseModel):
    """Tespit motoru ayarları."""
    confidence_threshold: float = 0.3
    iou_threshold: float = 0.45


class BursaKavsakConfig(BaseModel):
    """Bursa kavşak kamerası için player URL."""
    player_url: str  # örn: https://player.bursa.bel.tr/?stream=yunusemrekavsagi_720p
    name: str = "Bursa Kavşak"


# ==================== Helper Functions ====================
async def extract_hls_url_from_bursa_player(player_url: str) -> Optional[str]:
    """
    Bursa Belediyesi player sayfasından gerçek HLS stream URL'sini çıkarır.
    Player sayfası JavaScript ile HLS URL'sini içerir.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(player_url)
            if response.status_code != 200:
                return None
            
            html_content = response.text
            
            # HLS URL'sini regex ile bul
            # Format: source: 'https://canliyayin.bursa.bel.tr/cdnlive/xxx.stream/playlist.m3u8?t=xxx&e=xxx'
            pattern = r"source:\s*['\"]([^'\"]+\.m3u8[^'\"]*)['\"]"
            match = re.search(pattern, html_content)
            
            if match:
                print(f"Extracted HLS URL: {match.group(1)}")
                return match.group(1)
            
            return None
    except Exception as e:
        print(f"HLS URL çıkarma hatası: {e}")
        return None


# ==================== Stream Endpoints ====================
@app.post("/api/stream/add", tags=["Stream"])
async def add_stream_source(config: StreamConfig) -> Dict[str, Any]:
    """Yeni video kaynağı ekle."""
    source = stream_handler.add_source(
        source_id=config.source_id,
        name=config.name,
        url=config.url,
        source_type=config.source_type
    )
    return {"status": "ok", "source": stream_handler.get_source_status(config.source_id)}


@app.post("/api/stream/add-bursa-kavsak", tags=["Stream"])
async def add_bursa_kavsak(config: BursaKavsakConfig) -> Dict[str, Any]:
    """
    Bursa kavşak kamerasını player URL'sinden ekle.
    Player sayfasından HLS URL'sini otomatik çıkarır.
    """
    hls_url = await extract_hls_url_from_bursa_player(config.player_url)
    
    if not hls_url:
        raise HTTPException(400, "HLS stream URL'si bulunamadı. Kamera aktif olmayabilir.")
    
    # Stream key'i URL'den çıkar (örn: yunusemrekavsagi_720p)
    stream_key_match = re.search(r'stream=([^&]+)', config.player_url)
    stream_key = stream_key_match.group(1) if stream_key_match else f"kavsak_{int(time.time())}"
    
    source = stream_handler.add_source(
        source_id=f"bursa_{stream_key}",
        name=config.name,
        url=hls_url,
        source_type="hls"
    )
    
    return {
        "status": "ok",
        "source_id": f"bursa_{stream_key}",
        "name": config.name,
        "hls_url": hls_url
    }


@app.post("/api/stream/add-bursa-preset", tags=["Stream"])
async def add_bursa_preset(config: BursaPresetConfig) -> Dict[str, Any]:
    """Bursa MOBESE preset'i ekle."""
    source = stream_handler.add_bursa_preset(config.preset_key, config.stream_url)
    if not source:
        raise HTTPException(400, f"Geçersiz preset: {config.preset_key}")
    return {
        "status": "ok",
        "source_id": f"bursa_{config.preset_key}",
        "name": source.name
    }


@app.post("/api/stream/add-webcam", tags=["Stream"])
async def add_webcam(device_id: int = 0, name: str = "Webcam") -> Dict[str, Any]:
    """Webcam ekle."""
    source = stream_handler.add_webcam(device_id, name)
    return {"status": "ok", "source_id": f"webcam_{device_id}"}


@app.post("/api/stream/add-video", tags=["Stream"])
async def add_video_file(file_path: str, name: str = "Video") -> Dict[str, Any]:
    """Video dosyası ekle."""
    if not os.path.exists(file_path):
        raise HTTPException(404, "Dosya bulunamadı")
    source = stream_handler.add_video_file(file_path, name)
    return {"status": "ok", "source_id": f"video_{hash(file_path) % 10000}"}


@app.post("/api/upload-video", tags=["Stream"])
async def upload_video(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Video dosyası yükle ve kaynak olarak ekle."""
    # uploads klasörünü oluştur
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Dosyayı kaydet
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Stream olarak ekle
    source_id = f"video_{int(time.time())}"
    source = stream_handler.add_source(
        source_id=source_id,
        name=file.filename,
        url=file_path,
        source_type="video"
    )
    
    return {
        "status": "ok",
        "source_id": source_id,
        "name": file.filename,
        "file_path": file_path
    }


@app.post("/api/stream/start/{source_id}", tags=["Stream"])
async def start_stream(source_id: str) -> Dict[str, str]:
    """Video kaynağını başlat."""
    if stream_handler.start_source(source_id):
        return {"status": "started", "source_id": source_id}
    raise HTTPException(404, "Kaynak bulunamadı")


@app.post("/api/stream/stop/{source_id}", tags=["Stream"])
async def stop_stream(source_id: str) -> Dict[str, str]:
    """Video kaynağını durdur."""
    stream_handler.stop_source(source_id)
    return {"status": "stopped", "source_id": source_id}


@app.post("/api/stream/stop-all", tags=["Stream"])
async def stop_all_streams() -> Dict[str, str]:
    """Tüm kaynakları durdur."""
    stream_handler.stop_all()
    return {"status": "all_stopped"}


@app.get("/api/stream/sources", tags=["Stream"])
async def list_sources() -> List[Dict]:
    """Tüm kaynakların durumunu listele."""
    return stream_handler.get_all_sources_status()


@app.get("/api/stream/presets", tags=["Stream"])
async def list_bursa_presets() -> Dict[str, Any]:
    """Bursa MOBESE preset listesi."""
    return {"presets": stream_handler.BURSA_PRESETS}


# ==================== Calibration Endpoints ====================
@app.post("/api/calibrate", tags=["Calibration"])
async def calibrate_crosswalk(config: CalibrationConfig) -> Dict[str, str]:
    """Yaya geçidi kalibrasyonu."""
    tracker.set_crosswalk_calibration(
        start_point=tuple(config.start_point),
        end_point=tuple(config.end_point),
        road_length_m=config.road_length_m
    )
    metrics_calc.road_length_m = config.road_length_m
    return {"status": "calibrated"}


# ==================== Detection Endpoints ====================
@app.post("/api/detector/config", tags=["Detection"])
async def configure_detector(config: DetectorConfig) -> Dict[str, Any]:
    """Tespit motoru ayarlarını güncelle."""
    detector.confidence_threshold = config.confidence_threshold
    detector.iou_threshold = config.iou_threshold
    return {"status": "ok", "config": config.dict()}


@app.get("/api/detector/info", tags=["Detection"])
async def detector_info() -> Dict[str, Any]:
    """Model bilgilerini getir."""
    return detector.model_info


@app.get("/api/detector/stats", tags=["Detection"])
async def detector_stats() -> Dict[str, Any]:
    """Tespit istatistiklerini getir."""
    return detector.get_statistics()


# ==================== Tracking Endpoints ====================
@app.get("/api/tracker/stats", tags=["Tracking"])
async def tracker_stats() -> Dict[str, Any]:
    """Takip istatistiklerini getir."""
    return tracker.get_statistics()


@app.post("/api/tracker/reset", tags=["Tracking"])
async def reset_tracker() -> Dict[str, str]:
    """Track'leri sıfırla."""
    tracker.reset()
    return {"status": "reset"}


# ==================== System Endpoints ====================
@app.get("/api/status", tags=["System"])
async def system_status() -> Dict[str, Any]:
    """Sistem durumu."""
    return {
        "stream_running": stream_handler.is_running,
        "active_source": stream_handler.active_source_id,
        "detector_loaded": detector.is_loaded,
        "active_tracks": len(tracker.tracks),
        "sources": len(stream_handler.sources)
    }


@app.post("/api/reset-all", tags=["System"])
async def reset_all() -> Dict[str, str]:
    """Tüm sistemi sıfırla."""
    stream_handler.stop_all()
    tracker.reset()
    detector.reset_statistics()
    metrics_calc.reset()
    return {"status": "all_reset"}


# ==================== WebSocket - Ana Video Stream ====================
@app.websocket("/ws/video-stream")
async def websocket_video_stream(websocket: WebSocket):
    """
    Ana video stream WebSocket'i.
    Her frame için: video, tespitler, tracking, metrikler gönderir.
    """
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # Frame al
            frame = stream_handler.get_frame()
            
            if frame is not None:
                frame_shape = frame.shape[:2]  # (height, width)
                
                # Tespit yap
                detections, annotated_frame = detector.detect(frame, return_annotated=True)
                
                # Tracking güncelle
                tracks = tracker.update(detections, frame_shape)
                
                # Metrikleri hesapla
                display_data = metrics_calc.format_for_display(tracks)
                
                # Frame'i base64'e çevir
                frame_b64 = stream_handler.get_frame_base64()
                
                # WebSocket ile gönder
                await websocket.send_json({
                    "type": "frame",
                    "frame": frame_b64,
                    "frame_shape": list(frame_shape),
                    "detections": detections,
                    "tracking": tracker.to_dict_list(),
                    "metrics": display_data,
                    "source": stream_handler.get_source_status(stream_handler.active_source_id) if stream_handler.active_source_id else None,
                    "timestamp": time.time()
                })
            else:
                # Frame yok, durum gönder
                await websocket.send_json({
                    "type": "status",
                    "status": "no_frame",
                    "sources": stream_handler.get_all_sources_status()
                })
            
            await asyncio.sleep(0.04)  # ~25 FPS
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)


@app.websocket("/ws/metrics")
async def websocket_metrics_only(websocket: WebSocket):
    """
    Sadece metrik güncellemeleri (frame olmadan).
    Hafif bağlantı için kullanılabilir.
    """
    await websocket.accept()
    
    try:
        while True:
            tracks = tracker.get_all_tracks()
            display_data = metrics_calc.format_for_display(tracks)
            
            await websocket.send_json({
                "type": "metrics",
                "metrics": display_data,
                "tracker_stats": tracker.get_statistics(),
                "detector_stats": detector.get_statistics(),
                "timestamp": time.time()
            })
            
            await asyncio.sleep(0.5)  # 2 FPS yeterli metrikler için
            
    except WebSocketDisconnect:
        pass


# ==================== Startup ====================
@app.on_event("startup")
async def startup_event():
    """Uygulama başlangıcında model yükle."""
    print("🚀 Akıllı Yaya Güvenliği Sistemi başlatılıyor...")
    
    # Model yükle
    if detector.load_model():
        print("✅ Tespit modeli yüklendi")
    else:
        print("⚠️ Model yüklenemedi - varsayılan COCO modeli kullanılacak")
    
    print("✅ Sistem hazır!")


@app.on_event("shutdown")
async def shutdown_event():
    """Uygulama kapanırken kaynakları temizle."""
    stream_handler.stop_all()
    print("👋 Sistem kapatıldı")


# ==================== Main ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)

import asyncio
import os
import shutil
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .camera_handler import CameraHandler
from .decision_algorithm import DecisionAlgorithm
from .detection_engine import DetectionEngine
from .traffic_controller import TrafficController
from .tracking_system import TrackingSystem

app = FastAPI(title="Akilli Yaya Guvenligi MVP", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Video upload klasörü
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class CalibratePayload(BaseModel):
    start_line: List[float] = Field(..., description="[x, y] start pixel")
    end_line: List[float] = Field(..., description="[x, y] end pixel")
    road_length_m: float = Field(8.0, description="Gerçek yol uzunluğu (metre)")


class StatusResponse(BaseModel):
    running: bool
    message: str


camera = CameraHandler()
detection = DetectionEngine()
tracking = TrackingSystem()
decision = DecisionAlgorithm()
traffic = TrafficController()
last_tick = asyncio.Lock()
last_ts: float = 0.0


@app.post("/api/calibrate")
async def calibrate(payload: CalibratePayload) -> Dict[str, str]:
    camera.set_calibration_lines(payload.start_line, payload.end_line)
    tracking.set_calibration_lines(payload.start_line, payload.end_line)
    tracking.road_length_m = payload.road_length_m
    return {"status": "ok"}


@app.post("/api/start")
async def start() -> Dict[str, str]:
    camera.start()
    return {"status": "started"}


@app.post("/api/start-camera")
async def start_camera(device_id: int = 0) -> Dict[str, str]:
    """Webcam'i başlat"""
    camera.video_path = None  # Video modunu kapat
    camera.start(device_id)
    return {"status": "camera started", "device_id": device_id}


@app.post("/api/upload-video")
async def upload_video(file: UploadFile = File(...)) -> Dict[str, str]:
    """Video dosyası yükle ve oynat"""
    # Dosyayı kaydet
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Videoyu başlat
    camera.load_video(file_path)
    return {"status": "video uploaded and started", "path": file_path, "filename": file.filename}


@app.post("/api/start-video")
async def start_video(video_path: str) -> Dict[str, str]:
    camera.load_video(video_path)
    return {"status": "video started", "path": video_path}


@app.post("/api/stop")
async def stop() -> Dict[str, str]:
    camera.stop()
    return {"status": "stopped"}


@app.post("/api/reset")
async def reset() -> Dict[str, str]:
    tracking.reset()
    traffic.reset()
    return {"status": "reset"}


@app.get("/api/status", response_model=StatusResponse)
async def status() -> StatusResponse:
    message = "running" if camera.is_running else "idle"
    return StatusResponse(running=camera.is_running, message=message)


@app.get("/api/stream/sources")
async def get_stream_sources() -> List[Dict[str, Any]]:
    """Mevcut stream kaynaklarını döndür"""
    sources = []
    if camera.is_running:
        sources.append({
            "id": "main",
            "name": "Ana Kamera",
            "type": "camera" if camera.video_path is None else "video",
            "connected": True,
            "fps": 30
        })
    return sources


@app.websocket("/ws/video-stream")
async def ws_video_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            frame = camera.get_frame()
            frame_b64 = camera.get_frame_base64(frame)

            detections = detection.detect_persons(frame) if frame is not None else []
            frame_height = frame.shape[0] if hasattr(frame, "shape") else 360
            frame_width = frame.shape[1] if hasattr(frame, "shape") else 640
            tracked = tracking.update_tracks(detections, frame_height=frame_height)
            metrics = decision.calculate_required_time(tracked)
            traffic.apply_extension(metrics.get("extension_time", 0.0))

            await websocket.send_json(
                {
                    "frame": frame_b64,
                    "frame_shape": [frame_height, frame_width],
                    "detections": detections,
                    "tracking": tracked,
                    "metrics": metrics,
                    "calibration_lines": camera.calibration_lines,
                    "road_length_m": tracking.road_length_m,
                }
            )
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        return


@app.websocket("/ws/traffic-state")
async def ws_traffic_state(websocket: WebSocket) -> None:
    await websocket.accept()
    global last_ts
    last_ts = asyncio.get_event_loop().time()
    try:
        while True:
            now = asyncio.get_event_loop().time()
            dt = now - last_ts
            last_ts = now
            traffic.tick(dt)
            state: Dict[str, Any] = traffic.get_current_state()
            await websocket.send_json(
                {
                    "state": state,
                    "cycle_duration": traffic.base_green,
                    "active_direction": traffic.directions[traffic.active_index],
                }
            )
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        return


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

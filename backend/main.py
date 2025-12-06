import asyncio
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from camera_handler import CameraHandler
from decision_algorithm import DecisionAlgorithm
from detection_engine import DetectionEngine
from traffic_controller import TrafficController
from tracking_system import TrackingSystem

app = FastAPI(title="Akilli Yaya Guvenligi MVP", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CalibratePayload(BaseModel):
    start_line: List[float] = Field(..., description="[x, y] start pixel")
    end_line: List[float] = Field(..., description="[x, y] end pixel")


class StatusResponse(BaseModel):
    running: bool
    message: str


camera = CameraHandler()
detection = DetectionEngine()
tracking = TrackingSystem()
decision = DecisionAlgorithm()
traffic = TrafficController()


@app.post("/api/calibrate")
async def calibrate(payload: CalibratePayload) -> Dict[str, str]:
    camera.set_calibration_lines(payload.start_line, payload.end_line)
    return {"status": "ok"}


@app.post("/api/start")
async def start() -> Dict[str, str]:
    camera.start()
    return {"status": "started"}


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


@app.websocket("/ws/video-stream")
async def ws_video_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            frame = camera.get_frame()
            detections = detection.detect_persons(frame) if frame is not None else []
            tracked = tracking.update_tracks(detections)
            metrics = decision.calculate_required_time(tracked)

            await websocket.send_json(
                {
                    "frame": None,  # TODO: encode frame to base64 when available
                    "detections": detections,
                    "tracking": tracked,
                    "metrics": metrics,
                }
            )
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        return


@app.websocket("/ws/traffic-state")
async def ws_traffic_state(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            state: Dict[str, Any] = traffic.get_current_state()
            await websocket.send_json(state)
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        return

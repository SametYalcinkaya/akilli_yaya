import base64
import io
import time
from typing import List, Optional, Tuple

import numpy as np

try:
    import cv2
except ImportError:  # pragma: no cover - opencv is optional for the stub
    cv2 = None


class CameraHandler:
    """Kamera/video yöneticisi.

    - OpenCV varsa webcam veya video dosyası okur.
    - OpenCV yoksa veya akış kapalıysa stub kare üretir.
    """

    def __init__(self) -> None:
        self.is_running: bool = False
        self.device_id: Optional[int] = None
        self.video_path: Optional[str] = None
        self.calibration_lines: Optional[Tuple[List[float], List[float]]] = None
        self.cap = None
        self.last_frame_shape: Tuple[int, int, int] = (360, 640, 3)

    # ---- Lifecycle ----
    def start(self, device_id: int = 0) -> None:
        self.device_id = device_id
        self._open_capture()
        self.is_running = True

    def stop(self) -> None:
        self.is_running = False
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

    def open_webcam(self, device_id: int = 0) -> None:
        self.start(device_id)

    def load_video(self, file_path: str) -> None:
        self.video_path = file_path
        self._open_capture()
        self.is_running = True

    # ---- Frame handling ----
    def _open_capture(self) -> None:
        if cv2 is None:
            return
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
        source = self.video_path if self.video_path else self.device_id or 0
        self.cap = cv2.VideoCapture(source)

    def get_frame(self) -> Optional[np.ndarray]:
        """OpenCV kare döndürür; yoksa stub PIL kareyi np array'e çevirir."""
        if not self.is_running:
            return None

        if cv2 is not None and self.cap is not None and self.cap.isOpened():
            ok, frame = self.cap.read()
            if ok and frame is not None:
                self.last_frame_shape = frame.shape
                return frame

        # Stub fallback: generate simple RGB image as numpy array
        width, height = 640, 360
        import PIL.Image as Image  # local import to avoid hard dep when cv2 present
        from PIL import ImageDraw

        img = Image.new("RGB", (width, height), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)
        timestamp = time.strftime("%H:%M:%S")
        text = f"Demo Frame {timestamp}"
        draw.text((20, 20), text, fill=(14, 162, 113))
        draw.rectangle([(60, 120), (200, 300)], outline=(14, 162, 113), width=2)
        arr = np.array(img)[:, :, ::-1].copy()  # convert to BGR
        self.last_frame_shape = arr.shape
        return arr

    def get_frame_base64(self, frame: Optional[np.ndarray] = None) -> Optional[str]:
        frame_to_encode = frame if frame is not None else self.get_frame()
        if frame_to_encode is None:
            return None
        # Ensure BGR numpy array
        if cv2 is not None:
            ok, buffer = cv2.imencode(".jpg", frame_to_encode)
            if not ok:
                return None
            encoded = base64.b64encode(buffer).decode("ascii")
            return encoded

        # Fallback using Pillow if cv2 not present
        from PIL import Image

        img = Image.fromarray(frame_to_encode[:, :, ::-1])
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        return base64.b64encode(buf.getvalue()).decode("ascii")

    # ---- Calibration ----
    def set_calibration_lines(self, start_line: List[float], end_line: List[float]) -> None:
        self.calibration_lines = (start_line, end_line)

    def calculate_real_distance(self, pixel_distance: float, scale: float = 1.0) -> float:
        return pixel_distance * scale

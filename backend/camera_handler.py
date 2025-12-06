import base64
import io
import time
from typing import List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont


class CameraHandler:
    """Stub kamera yöneticisi.

    Gerçek kamera entegrasyonu henüz yok; demo için her çağrıda
    basit bir görüntü oluşturup base64 döndürüyoruz.
    """

    def __init__(self) -> None:
        self.is_running: bool = False
        self.device_id: Optional[int] = None
        self.video_path: Optional[str] = None
        self.calibration_lines: Optional[Tuple[List[float], List[float]]] = None

    def start(self, device_id: int = 0) -> None:
        self.device_id = device_id
        self.is_running = True

    def stop(self) -> None:
        self.is_running = False

    def open_webcam(self, device_id: int = 0) -> None:
        self.start(device_id)

    def load_video(self, file_path: str) -> None:
        self.video_path = file_path
        self.is_running = True

    def get_frame(self) -> Optional[Image.Image]:
        """Demo amaçlı basit bir kare üretir."""
        if not self.is_running:
            return None

        width, height = 640, 360
        img = Image.new("RGB", (width, height), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)
        timestamp = time.strftime("%H:%M:%S")
        text = f"Demo Frame {timestamp}"
        draw.text((20, 20), text, fill=(14, 162, 113))
        draw.rectangle([(60, 120), (200, 300)], outline=(14, 162, 113), width=2)
        return img

    def get_frame_base64(self, frame: Optional[Image.Image] = None) -> Optional[str]:
        frame_to_encode = frame if frame is not None else self.get_frame()
        if frame_to_encode is None:
            return None
        buffer = io.BytesIO()
        frame_to_encode.save(buffer, format="JPEG", quality=80)
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return encoded

    def set_calibration_lines(self, start_line: List[float], end_line: List[float]) -> None:
        self.calibration_lines = (start_line, end_line)

    def calculate_real_distance(self, pixel_distance: float, scale: float = 1.0) -> float:
        return pixel_distance * scale

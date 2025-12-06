from typing import List, Optional, Tuple


class CameraHandler:
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

    def get_frame(self) -> Optional[object]:
        return None

    def set_calibration_lines(self, start_line: List[float], end_line: List[float]) -> None:
        self.calibration_lines = (start_line, end_line)

    def calculate_real_distance(self, pixel_distance: float, scale: float = 1.0) -> float:
        return pixel_distance * scale

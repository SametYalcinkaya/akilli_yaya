"""Helper script to download YOLOv8n model into backend/models."""
import os
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "models"
TARGET = MODELS_DIR / "yolov8n.pt"


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading YOLOv8n to {TARGET} ...")
    model = YOLO("yolov8n.pt")
    if TARGET.exists():
        print("Model already present. Skipping write.")
        return
    ckpt_path = getattr(model, "ckpt_path", None)
    if ckpt_path and os.path.exists(ckpt_path):
        os.replace(ckpt_path, TARGET)
        print("Saved model.")
    else:
        print("Download complete (cached). If file missing, re-run.")


if __name__ == "__main__":
    main()

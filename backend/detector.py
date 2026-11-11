
from collections import Counter
from pathlib import Path
import os
import threading

import cv2
import torch
from ultralytics import YOLO


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = os.getenv("YOLO_MODEL", "yolo11n.pt")

# COCO class IDs supported by this project.
TARGET_CLASSES = [0, 2, 3, 5, 7]

CLASS_NAMES = {
    0: "person",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}

PERSON_CLASSES = {0}
VEHICLE_CLASSES = {2, 3, 5, 7}

# Prevent concurrent inference from using the model simultaneously.
_model_lock = threading.Lock()


def select_device():
    """Prefer NVIDIA CUDA when available; otherwise use CPU."""
    if torch.cuda.is_available():
        return 0
    return "cpu"


DEVICE = select_device()
_model = None


def get_model():
    """Load the YOLO model lazily, once per process."""
    global _model

    if _model is None:
        model_path = Path(MODEL_PATH)
        if not model_path.is_absolute():
            model_path = BASE_DIR / model_path

        _model = YOLO(str(model_path))

    return _model


def detect_frame(frame, confidence=0.35):
    """
    Detect people and vehicles in a BGR OpenCV image.

    Returns:
        annotated: Image with bounding boxes.
        stats: Counts, class breakdown, detections, and device.
    """
    if frame is None or not hasattr(frame, "size") or frame.size == 0:
        raise ValueError("The supplied image frame is empty or invalid.")

    if len(frame.shape) != 3 or frame.shape[2] != 3:
        raise ValueError("Expected a three-channel BGR image.")

    if not 0.05 <= confidence <= 0.95:
        raise ValueError("Confidence must be between 0.05 and 0.95.")

    with _model_lock:
        model = get_model()
        results = model.predict(
            source=frame,
            conf=confidence,
            classes=TARGET_CLASSES,
            device=DEVICE,
            verbose=False,
        )

    result = results[0]
    annotated = frame.copy()
    detections = []
    class_counts = Counter()

    people_count = 0
    vehicle_count = 0

    if result.boxes is not None:
        for box in result.boxes:
            class_id = int(box.cls.item())
            score = float(box.conf.item())

            coords = box.xyxy[0].tolist()
            x1, y1, x2, y2 = map(int, coords)

            label = CLASS_NAMES.get(class_id, "unknown")
            class_counts[label] += 1

            is_person = class_id in PERSON_CLASSES
            is_vehicle = class_id in VEHICLE_CLASSES

            if is_person:
                people_count += 1
            elif is_vehicle:
                vehicle_count += 1

            # Green for people; orange for vehicles.
            color = (0, 210, 120) if is_person else (255, 170, 40)

            cv2.rectangle(
                annotated,
                (x1, y1),
                (x2, y2),
                color,
                2,
            )

            caption = f"{label} {score:.0%}"
            text_y = max(y1 - 8, 18)

            cv2.putText(
                annotated,
                caption,
                (x1, text_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                color,
                2,
                cv2.LINE_AA,
            )

            detections.append({
                "class_id": class_id,
                "label": label,
                "confidence": round(score, 4),
                "box": [x1, y1, x2, y2],
            })

    stats = {
        "people": people_count,
        "vehicles": vehicle_count,
        "total": len(detections),
        "class_counts": dict(class_counts),
        "detections": detections,
        "device": (
            "NVIDIA CUDA" if DEVICE != "cpu" else "CPU"
        ),
    }

    return annotated, stats


def device_info():
    """Return runtime information for the health endpoint."""
    cuda_available = torch.cuda.is_available()

    info = {
        "device": "NVIDIA CUDA" if DEVICE != "cpu" else "CPU",
        "cuda_available": cuda_available,
        "cuda_build": torch.version.cuda,
        "gpu_name": None,
        "gpu_memory_total_mb": None,
        "gpu_memory_free_mb": None,
        "model": MODEL_PATH,
    }

    if cuda_available:
        info["gpu_name"] = torch.cuda.get_device_name(0)

        try:
            free_bytes, total_bytes = torch.cuda.mem_get_info(0)
            info["gpu_memory_total_mb"] = round(
                total_bytes / (1024 ** 2)
            )
            info["gpu_memory_free_mb"] = round(
                free_bytes / (1024 ** 2)
            )
        except RuntimeError:
            # Diagnostics should not break the health endpoint.
            pass

    return info
    
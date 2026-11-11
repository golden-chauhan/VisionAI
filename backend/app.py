
from pathlib import Path
from uuid import uuid4
import time

import cv2
import numpy as np
from flask import (
    Flask, Response, jsonify, request,
    send_from_directory, url_for
)
from flask_cors import CORS
from werkzeug.utils import secure_filename

from detector import detect_frame, device_info
from camera_manager import CameraManager


app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}

camera_manager = CameraManager(detect_frame)


def parse_confidence(value, default=0.35):
    try:
        confidence = float(
            default if value is None else value
        )
    except (ValueError, TypeError):
        raise ValueError(
            "Confidence must be between 0.05 and 0.95."
        )

    if not 0.05 <= confidence <= 0.95:
        raise ValueError(
            "Confidence must be between 0.05 and 0.95."
        )

    return confidence


def decode_uploaded_image():
    file = request.files.get("file")

    if file is None:
        raise ValueError("Upload an image using the file field.")

    raw = np.frombuffer(file.read(), dtype=np.uint8)

    if raw.size == 0:
        raise ValueError("The uploaded image is empty.")

    frame = cv2.imdecode(raw, cv2.IMREAD_COLOR)

    if frame is None:
        raise ValueError("Could not decode this image.")

    return frame


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        **device_info()
    })


@app.get("/api/outputs/<path:filename>")
def get_output(filename):
    return send_from_directory(OUTPUT_DIR, filename)


# ============================================================
# IMAGE DETECTION
# ============================================================

@app.post("/api/detect/image")
def detect_image():
    file = request.files.get("file")

    if file is None:
        return jsonify({
            "error": "Upload an image using the file field."
        }), 400

    filename = secure_filename(file.filename or "")

    if Path(filename).suffix.lower() not in IMAGE_EXTENSIONS:
        return jsonify({
            "error": "Unsupported image format."
        }), 400

    try:
        confidence = parse_confidence(
            request.form.get("confidence")
        )
        frame = decode_uploaded_image()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    start = time.perf_counter()
    annotated, stats = detect_frame(frame, confidence)
    elapsed = (time.perf_counter() - start) * 1000

    output_name = f"{uuid4().hex}.jpg"
    success, encoded = cv2.imencode(".jpg", annotated)

    if not success:
        return jsonify({
            "error": "Failed to encode output image."
        }), 500

    (OUTPUT_DIR / output_name).write_bytes(
        encoded.tobytes()
    )

    return jsonify({
        **stats,
        "inference_ms": round(elapsed, 1),
        "output_url": url_for(
            "get_output",
            filename=output_name,
            _external=False
        ),
        "filename": filename,
    })


# ============================================================
# OPTIMIZED WEBCAM DETECTION
# ============================================================

@app.post("/api/detect/frame")
def detect_webcam_frame():
    """
    Return only detection metadata.

    Unlike /api/detect/image, this endpoint does not
    save an annotated JPEG to the outputs directory.
    React draws the boxes on its own transparent canvas.
    """
    try:
        confidence = parse_confidence(
            request.form.get("confidence")
        )
        frame = decode_uploaded_image()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    height, width = frame.shape[:2]

    if width > 640:
        new_height = max(1, round(height * 640 / width))
        frame = cv2.resize(
            frame,
            (640, new_height),
            interpolation=cv2.INTER_AREA
        )

    start = time.perf_counter()

    _, stats = detect_frame(frame, confidence)

    elapsed = (time.perf_counter() - start) * 1000

    return jsonify({
        **stats,
        "inference_ms": round(elapsed, 1),
        "frame_width": frame.shape[1],
        "frame_height": frame.shape[0],
    })


# ============================================================
# VIDEO DETECTION
# ============================================================

@app.post("/api/detect/video")
def detect_video():
    file = request.files.get("file")

    if file is None:
        return jsonify({
            "error": "Upload a video using the file field."
        }), 400

    filename = secure_filename(file.filename or "")

    if Path(filename).suffix.lower() not in VIDEO_EXTENSIONS:
        return jsonify({
            "error": "Unsupported video format."
        }), 400

    try:
        confidence = parse_confidence(
            request.form.get("confidence")
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    input_path = (
        UPLOAD_DIR
        / f"{uuid4().hex}{Path(filename).suffix.lower()}"
    )

    output_name = f"{uuid4().hex}.mp4"
    output_path = OUTPUT_DIR / output_name

    file.save(input_path)

    cap = cv2.VideoCapture(str(input_path))

    if not cap.isOpened():
        input_path.unlink(missing_ok=True)
        return jsonify({
            "error": "Could not open this video."
        }), 400

    fps = cap.get(cv2.CAP_PROP_FPS)

    if not np.isfinite(fps) or fps <= 0 or fps > 240:
        fps = 25.0

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if (
        width <= 0
        or height <= 0
        or width * height > 20_000_000
    ):
        cap.release()
        input_path.unlink(missing_ok=True)
        return jsonify({
            "error": "Invalid or excessively large video dimensions."
        }), 400

    writer = cv2.VideoWriter(
        str(output_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )

    if not writer.isOpened():
        cap.release()
        input_path.unlink(missing_ok=True)
        return jsonify({
            "error": "Could not create output video."
        }), 500

    total_frames = 0
    frames_with_people = 0
    frames_with_vehicles = 0
    peak_people = 0
    peak_vehicles = 0
    people_frame_sum = 0
    vehicle_frame_sum = 0

    start = time.perf_counter()

    try:
        while True:
            ok, frame = cap.read()

            if not ok:
                break

            annotated, stats = detect_frame(
                frame, confidence
            )

            writer.write(annotated)
            total_frames += 1

            people = stats["people"]
            vehicles = stats["vehicles"]

            people_frame_sum += people
            vehicle_frame_sum += vehicles

            peak_people = max(peak_people, people)
            peak_vehicles = max(peak_vehicles, vehicles)

            if people:
                frames_with_people += 1

            if vehicles:
                frames_with_vehicles += 1

    except Exception:
        output_path.unlink(missing_ok=True)
        raise

    finally:
        cap.release()
        writer.release()
        input_path.unlink(missing_ok=True)

    if (
        total_frames == 0
        or not output_path.exists()
        or output_path.stat().st_size == 0
    ):
        output_path.unlink(missing_ok=True)
        return jsonify({
            "error": "No readable frames were found."
        }), 400

    elapsed = time.perf_counter() - start

    return jsonify({
        "filename": filename,
        "frames_processed": total_frames,
        "duration_seconds": round(total_frames / fps, 2),
        "processing_seconds": round(elapsed, 2),
        "processing_fps": (
            round(total_frames / elapsed, 2)
            if elapsed else 0
        ),
        "peak_people_in_frame": peak_people,
        "peak_vehicles_in_frame": peak_vehicles,
        "average_people_per_frame": round(
            people_frame_sum / total_frames, 2
        ),
        "average_vehicles_per_frame": round(
            vehicle_frame_sum / total_frames, 2
        ),
        "frames_with_people": frames_with_people,
        "frames_with_vehicles": frames_with_vehicles,
        "device": device_info()["device"],
        "output_url": url_for(
            "get_output",
            filename=output_name,
            _external=False
        ),
    })


# ============================================================
# CCTV DETECTION
# ============================================================

@app.post("/api/cctv/connect")
def cctv_connect():
    data = request.get_json(silent=True) or {}
    stream_url = str(
        data.get("stream_url", "")
    ).strip()

    if not stream_url:
        return jsonify({
            "error": "Enter an RTSP stream URL."
        }), 400

    try:
        confidence = parse_confidence(
            data.get("confidence")
        )

        result = camera_manager.start(
            stream_url,
            confidence
        )

        return jsonify(result), 202

    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 409


@app.get("/api/cctv/status")
def cctv_status():
    return jsonify(camera_manager.status())


@app.post("/api/cctv/disconnect")
def cctv_disconnect():
    camera_manager.stop()

    return jsonify({
        "status": "stopped",
        "message": "CCTV stream stopped."
    })


@app.post("/api/cctv/confidence")
def cctv_confidence():
    data = request.get_json(silent=True) or {}

    try:
        confidence = parse_confidence(
            data.get("confidence")
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    camera_manager.set_confidence(confidence)

    return jsonify({
        "confidence": confidence
    })


def generate_cctv_stream():
    last_frame_id = -1

    while True:
        frame_id, jpeg, running = (
            camera_manager.latest_frame()
        )

        if jpeg is not None and frame_id != last_frame_id:
            last_frame_id = frame_id

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Cache-Control: no-cache\r\n\r\n"
                + jpeg
                + b"\r\n"
            )

        elif not running:
            break

        time.sleep(0.03)


@app.get("/api/cctv/stream.mjpg")
def cctv_stream():
    return Response(
        generate_cctv_stream(),
        mimetype=(
            "multipart/x-mixed-replace; boundary=frame"
        ),
        headers={
            "Cache-Control": "no-store, no-cache"
        },
    )


@app.errorhandler(413)
def too_large(_error):
    return jsonify({
        "error": "File exceeds the 200 MB upload limit."
    }), 413


if __name__ == "__main__":
    try:
        app.run(
            host="127.0.0.1",
            port=5000,
            debug=False,
            threaded=True
        )
    finally:
        camera_manager.stop()

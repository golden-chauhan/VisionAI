
"""
Single-IP-camera RTSP manager for VisionAI.

The RTSP URL is kept in memory only. It is never returned by the
status API or written to logs/files.
"""

from __future__ import annotations

import threading
import time
from urllib.parse import urlsplit

import cv2


class CameraManager:
    def __init__(self, detector, frame_width=1280):
        self.detector = detector
        self.frame_width = frame_width

        self._lock = threading.RLock()
        self._stop_event = threading.Event()
        self._thread = None
        self._capture = None

        self._jpeg = None
        self._frame_id = 0
        self._stats = None

        self._state = "stopped"
        self._message = "No CCTV camera connected."
        self._confidence = 0.35
        self._fps = 0.0
        self._latency_ms = None
        self._last_frame_at = None

    @staticmethod
    def _validate_url(stream_url):
        try:
            parsed = urlsplit(stream_url)
            valid = (
                parsed.scheme.lower() == "rtsp"
                and bool(parsed.hostname)
            )
        except Exception:
            valid = False

        if not valid:
            raise ValueError(
                "Invalid stream URL. Use an RTSP URL such as "
                "rtsp://192.168.1.100:554/stream1."
            )

        if len(stream_url) > 2048:
            raise ValueError("The RTSP URL is too long.")

    def start(self, stream_url, confidence=0.35):
        self._validate_url(stream_url)

        with self._lock:
            if self._state in {"connecting", "connected"}:
                raise RuntimeError(
                    "A CCTV connection is already active. "
                    "Disconnect it first."
                )

            self._stop_event.clear()
            self._jpeg = None
            self._stats = None
            self._frame_id = 0
            self._fps = 0.0
            self._latency_ms = None
            self._last_frame_at = None
            self._confidence = confidence
            self._state = "connecting"
            self._message = "Opening RTSP stream..."

            self._thread = threading.Thread(
                target=self._capture_loop,
                args=(stream_url,),
                name="VisionAI-RTSP-Camera",
                daemon=True,
            )
            self._thread.start()

        return {
            "status": "connecting",
            "message": "Camera connection is starting."
        }

    def _open_capture(self, stream_url):
        # These timeout properties require a compatible OpenCV FFmpeg build.
        params = []

        if hasattr(cv2, "CAP_PROP_OPEN_TIMEOUT_MSEC"):
            params.extend([
                cv2.CAP_PROP_OPEN_TIMEOUT_MSEC,
                10000
            ])

        if hasattr(cv2, "CAP_PROP_READ_TIMEOUT_MSEC"):
            params.extend([
                cv2.CAP_PROP_READ_TIMEOUT_MSEC,
                5000
            ])

        try:
            if params:
                return cv2.VideoCapture(
                    stream_url,
                    cv2.CAP_FFMPEG,
                    params
                )
        except (TypeError, cv2.error):
            pass

        return cv2.VideoCapture(stream_url)

    def _capture_loop(self, stream_url):
        cap = None
        frame_times = []

        try:
            cap = self._open_capture(stream_url)

            with self._lock:
                self._capture = cap

            if not cap.isOpened():
                raise RuntimeError(
                    "Could not open the RTSP stream. Check the URL, "
                    "credentials, camera network access and RTSP settings."
                )

            with self._lock:
                self._state = "connected"
                self._message = "CCTV camera connected."

            while not self._stop_event.is_set():
                ok, frame = cap.read()

                if not ok or frame is None:
                    raise RuntimeError(
                        "The CCTV stream stopped delivering frames. "
                        "Check the camera or network."
                    )

                height, width = frame.shape[:2]

                if width > self.frame_width:
                    new_height = max(
                        1,
                        int(height * self.frame_width / width)
                    )
                    frame = cv2.resize(
                        frame,
                        (self.frame_width, new_height)
                    )

                with self._lock:
                    confidence = self._confidence

                inference_started = time.perf_counter()

                annotated, stats = self.detector(
                    frame,
                    confidence
                )

                inference_ms = (
                    time.perf_counter() - inference_started
                ) * 1000

                ok, encoded = cv2.imencode(
                    ".jpg",
                    annotated,
                    [int(cv2.IMWRITE_JPEG_QUALITY), 82]
                )

                if not ok:
                    continue

                now = time.perf_counter()
                frame_times.append(now)
                frame_times = frame_times[-30:]

                fps = 0.0
                if len(frame_times) > 1:
                    elapsed = frame_times[-1] - frame_times[0]
                    if elapsed > 0:
                        fps = (len(frame_times) - 1) / elapsed

                stats = {
                    **stats,
                    "inference_ms": round(inference_ms, 1),
                    "stream_fps": round(fps, 1),
                }

                with self._lock:
                    self._jpeg = encoded.tobytes()
                    self._stats = stats
                    self._frame_id += 1
                    self._fps = round(fps, 1)
                    self._latency_ms = round(inference_ms, 1)
                    self._last_frame_at = time.time()

        except Exception as exc:
            with self._lock:
                if not self._stop_event.is_set():
                    self._state = "error"
                    # Never expose the RTSP URL or embedded credentials.
                    self._message = str(exc)[:350]

        finally:
            if cap is not None:
                cap.release()

            with self._lock:
                self._capture = None

                if self._stop_event.is_set():
                    self._state = "stopped"
                    self._message = "CCTV stream stopped."

                elif self._state != "error":
                    self._state = "disconnected"
                    self._message = "CCTV stream ended."

    def set_confidence(self, confidence):
        with self._lock:
            self._confidence = confidence

    def latest_frame(self):
        with self._lock:
            running = self._state in {
                "connecting",
                "connected"
            }

            return self._frame_id, self._jpeg, running

    def status(self):
        with self._lock:
            stats = self._stats or {}

            return {
                "status": self._state,
                "message": self._message,
                "people": stats.get("people", 0),
                "vehicles": stats.get("vehicles", 0),
                "total": stats.get("total", 0),
                "class_counts": stats.get("class_counts", {}),
                "inference_ms": self._latency_ms,
                "stream_fps": self._fps,
                "device": stats.get("device"),
                "confidence": self._confidence,
                "last_frame_at": self._last_frame_at,
            }

    def stop(self):
        self._stop_event.set()

        with self._lock:
            cap = self._capture
            thread = self._thread

        # Releasing the capture can unblock a waiting read() call.
        if cap is not None:
            cap.release()

        if (
            thread
            and thread.is_alive()
            and thread is not threading.current_thread()
        ):
            thread.join(timeout=2.0)

        with self._lock:
            self._capture = None
            self._thread = None
            self._jpeg = None
            self._stats = None
            self._state = "stopped"
            self._message = "CCTV stream stopped."

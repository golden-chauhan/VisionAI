
# VisionAI — AI-Based People and Vehicle Detection System

VisionAI is an AI-powered computer vision application that detects and classifies people and vehicles in images, videos, and live camera feeds using the YOLO11 object detection model.

## Features

- Image Detection: Upload images and detect objects with bounding boxes.
- Video Analytics: Process recorded videos and generate annotated output.
- Live Camera: Perform real-time detection using a browser webcam.
- IP CCTV Monitoring: Interface for connecting to RTSP camera streams.

## Supported Detection Classes

- Person
- Car
- Motorcycle
- Bus
- Truck

## Technology Stack

### AI and Backend
- Python
- Flask
- PyTorch
- Ultralytics YOLO11
- OpenCV
- NumPy

### Frontend
- React
- Vite
- JavaScript
- CSS

## Project Structure

```text
VisionAI/
├── backend/
│   ├── app.py
│   ├── detector.py
│   ├── camera_manager.py
│   ├── requirements.txt
│   └── yolo11n.pt
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   └── vercel.json
│
├── .gitignore
└── README.md
```

## Local Installation

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd people-vehicle-detection
```

### 2. Backend setup

```bash
cd backend

python -m venv .venv
```

Activate the environment on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
python app.py
```

Backend address:

```text
http://127.0.0.1:5000
```

### 3. Frontend setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend address:

```text
http://localhost:5173
```

## Model

VisionAI uses the pretrained YOLO11 model (`yolo11n.pt`) for object detection.

## Deployment Status

The application has been tested locally for image detection, video processing, and browser webcam detection.

Public deployment and secure multi-user RTSP camera functionality are still under development.

## Future Improvements

- User authentication and authorization.
- Secure individual RTSP camera sessions.
- Multi-user CCTV monitoring.
- Production deployment and performance optimization.

# VisionAI – AI-Based People and Vehicle Detection System

## Project Overview
VisionAI is a computer vision application that detects and classifies people and vehicles in images, uploaded videos, and live webcam feeds using a pretrained YOLO11 model.

## Technology Stack
- Python
- YOLO11
- PyTorch
- CUDA
- OpenCV
- Flask
- React
- Vite
- NVIDIA RTX 3050 GPU

## Project Structure

```text
people-vehicle-detection/
├── backend/
│   ├── venv/
│   ├── app.py
│   ├── detector.py
│   ├── test_gpu.py
│   ├── requirements.txt
│   ├── yolo11n.pt
│   ├── uploads/
│   └── outputs/
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── index.html
│
└── README.md
```

## How to Run

### 1. Backend

Open PowerShell Terminal 1:

```powershell
cd "C:\Users\DELL\Documents\ai-based object detection\people-vehicle-detection\backend"

.\venv\Scripts\python.exe app.py
```

Backend URL: http://127.0.0.1:5000

Health check: http://127.0.0.1:5000/api/health

### 2. Frontend

Open PowerShell Terminal 2:

```powershell
cd "C:\Users\DELL\Documents\ai-based object detection\people-vehicle-detection\frontend"

npm run dev
```

Frontend URL: http://localhost:5173

## GPU Verification

```powershell
nvidia-smi
```

```powershell
.\venv\Scripts\python.exe -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

## Supported Detection Classes

- Person
- Car
- Motorcycle
- Bus
- Truck

## Input Modes

1. Image upload
2. Video upload
3. Live webcam

## Important Notes

- Start the backend before using the frontend.
- Keep both terminals running.
- Use the backend virtual environment to run Flask.
- The pretrained YOLO model weights must be available in the backend directory.
- CUDA acceleration requires compatible NVIDIA drivers and CUDA-enabled PyTorch.
- The local application runs on your computer and is not publicly deployed yet.

## Project Status

Local implementation completed. Cloud deployment pending.
import { Camera, Cctv, FileImage, FileVideo, House } from 'lucide-react'

export const NAV_ITEMS = [
  {
    path: '/',
    label: 'Home',
    title: 'Home',
    subtitle: 'Intelligent People & Vehicle Detection System',
    icon: House,
  },
  {
    path: '/image',
    label: 'Image Detection',
    title: 'Image Detection',
    subtitle: 'Find people and vehicles in a single image',
    icon: FileImage,
  },
  {
    path: '/video',
    label: 'Video Analytics',
    title: 'Video Analytics',
    subtitle: 'Process a recording and review the results',
    icon: FileVideo,
  },
  {
    path: '/camera',
    label: 'Live Camera',
    title: 'Live Camera Detection',
    subtitle: 'Real-time detection from this computer’s webcam',
    icon: Camera,
  },
  {
    path: '/cctv',
    label: 'CCTV Monitoring',
    title: 'CCTV Live Monitoring',
    subtitle: 'Continuous detection on an IP camera stream',
    icon: Cctv,
  },
]

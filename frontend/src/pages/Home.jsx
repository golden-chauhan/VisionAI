import { Link } from 'react-router-dom'
import { ArrowRight, Camera, Cctv, FileImage, FileVideo } from 'lucide-react'
import { BrandMark } from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import { CameraArt, CctvArt, HeroArt, ImageArt, VideoArt } from '../components/Illustrations'
import { CLASS_META } from '../constants'

const FEATURES = [
  {
    to: '/image',
    cls: 'f-image',
    icon: FileImage,
    title: 'Image Detection',
    text: 'Upload images and identify people and vehicles.',
    cta: 'Open Image Detection',
    Art: ImageArt,
  },
  {
    to: '/video',
    cls: 'f-video',
    icon: FileVideo,
    title: 'Video Analytics',
    text: 'Analyze recorded videos and generate detection statistics.',
    cta: 'Open Video Analytics',
    Art: VideoArt,
  },
  {
    to: '/camera',
    cls: 'f-camera',
    icon: Camera,
    title: 'Live Camera',
    text: 'Perform real-time object detection using your computer webcam.',
    cta: 'Open Live Camera',
    Art: CameraArt,
  },
  {
    to: '/cctv',
    cls: 'f-cctv',
    icon: Cctv,
    title: 'CCTV Live Detection',
    text: 'Connect IP cameras using RTSP streams for continuous surveillance and object detection.',
    cta: 'Open CCTV Monitoring',
    Art: CctvArt,
  },
]

export default function Home({ health }) {
  const online = health.state === 'online'
  const checking = health.state === 'checking'

  const deviceValue = !online
    ? 'Unknown'
    : health.cuda
      ? 'NVIDIA CUDA'
      : 'CPU'
  const deviceDetail = online ? health.gpuName || health.device : 'Waiting for backend'

  return (
    <div className="page-root home">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-brand">
            <BrandMark size={44} />
            <span>VisionAI</span>
          </div>
          <h2>Intelligent People &amp; Vehicle Detection System</h2>
          <p>
            Detect people, cars, motorcycles, buses and trucks in images, recorded video, your
            webcam or an IP camera, all processed by YOLO11 on your own machine.
          </p>
          <div className="hero-status">
            <StatusBadge
              tone={online ? 'ok' : checking ? 'idle' : 'bad'}
              pulse={online}
              label={online ? 'Backend online' : checking ? 'Checking backend…' : 'Backend offline'}
            />
            <StatusBadge
              tone={!online ? 'idle' : health.cuda ? 'violet' : 'warn'}
              label={
                !online
                  ? 'GPU status unknown'
                  : health.cuda
                    ? 'CUDA GPU available'
                    : 'No CUDA GPU – running on CPU'
              }
            />
          </div>
          {health.state === 'offline' && (
            <p className="hero-hint">
              The detection pages need the Flask backend. Start it on port 5000 and this page
              will update on its own.
            </p>
          )}
        </div>
        <div className="hero-art">
          <HeroArt />
        </div>
      </section>

      <section aria-labelledby="modes-title">
        <h3 id="modes-title" className="section-title">Choose a detection workspace</h3>
        <div className="feature-grid">
          {FEATURES.map(({ to, cls, icon: Icon, title, text, cta, Art }) => (
            <Link key={to} to={to} className={`feature-card ${cls}`}>
              <div className="feature-art">
                <Art />
              </div>
              <div className="feature-body">
                <span className="feature-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <h4>{title}</h4>
                <p>{text}</p>
                <span className="feature-cta">
                  {cta}
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="overview-title">
        <h3 id="overview-title" className="section-title">System overview</h3>
        <dl className="overview">
          <div>
            <dt>Detection engine</dt>
            <dd>YOLO11</dd>
            <span>Runs locally through PyTorch</span>
          </div>
          <div>
            <dt>Supported classes</dt>
            <dd className="class-chips">
              {CLASS_META.map((item) => (
                <span key={item.key}>
                  <i style={{ background: item.color }} />
                  {item.singular}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt>Processing device</dt>
            <dd>{deviceValue}</dd>
            <span>{deviceDetail}</span>
          </div>
          <div>
            <dt>Backend status</dt>
            <dd className={online ? 'is-ok' : checking ? '' : 'is-bad'}>
              {online ? 'Online' : checking ? 'Checking…' : 'Offline'}
            </dd>
            <span>{online ? 'Responding on /api/health' : 'No response from /api/health'}</span>
          </div>
        </dl>
      </section>
    </div>
  )
}

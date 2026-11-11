import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  Camera,
  CameraOff,
  CarFront,
  Gauge,
  LoaderCircle,
  Play,
  Square,
  Timer,
  Users,
} from 'lucide-react'
import ConfidenceSlider from '../components/ConfidenceSlider'
import ClassBreakdown from '../components/ClassBreakdown'
import Notice from '../components/Notice'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { DEFAULT_CONFIDENCE } from '../constants'
import { detectImage, isAbort, outputUrl } from '../services/api'
import { valueOrDash } from '../utils/format'

const FRAME_GAP_MS = 150
const ERROR_BACKOFF_MS = 1000

const PERMISSION_UI = {
  granted: { tone: 'ok', label: 'Camera access allowed' },
  denied: { tone: 'bad', label: 'Camera access blocked' },
  prompt: { tone: 'idle', label: 'Browser will ask for access' },
  unsupported: { tone: 'bad', label: 'Camera not available here' },
  unknown: { tone: 'idle', label: 'Permission not requested yet' },
}

function describeCameraError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow the camera for this site in your browser settings, then start again.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this computer.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The camera is in use by another application. Close it and try again.'
    case 'OverconstrainedError':
      return 'The camera does not support the requested resolution.'
    default:
      return `Camera could not start: ${error?.message || 'unknown error'}`
  }
}

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

export default function LiveCamera({ health }) {
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE)
  const [cameraOn, setCameraOn] = useState(false)
  const [starting, setStarting] = useState(false)
  const [permission, setPermission] = useState('unknown')
  const [error, setError] = useState('')
  const [liveImage, setLiveImage] = useState('')
  const [stats, setStats] = useState(null)
  const [latency, setLatency] = useState(null)
  const [rate, setRate] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const loopRef = useRef(false)
  const startingRef = useRef(false)
  const sessionRef = useRef(0)
  const controllerRef = useRef(null)
  const confidenceRef = useRef(DEFAULT_CONFIDENCE)
  const stampsRef = useRef([])

  function changeConfidence(value) {
    confidenceRef.current = value
    setConfidence(value)
  }

  // Reflect the browser's camera permission when it can be queried.
  useEffect(() => {
    let cancelled = false
    let status = null
    if (!navigator.mediaDevices?.getUserMedia) {
      Promise.resolve().then(() => !cancelled && setPermission('unsupported'))
    } else if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' })
        .then((result) => {
          if (cancelled) return
          status = result
          setPermission(result.state)
          result.onchange = () => setPermission(result.state)
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
      if (status) status.onchange = null
    }
  }, [])

  const stopCamera = useCallback(() => {
    sessionRef.current += 1
    loopRef.current = false
    startingRef.current = false
    controllerRef.current?.abort()
    controllerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    stampsRef.current = []
    setStarting(false)
    setCameraOn(false)
    setLiveImage('')
    setStats(null)
    setLatency(null)
    setRate(null)
  }, [])

  // Release the webcam whenever the user leaves this page.
  useEffect(() => stopCamera, [stopCamera])

  async function runLoop(session) {
    const active = () => loopRef.current && session === sessionRef.current

    while (active()) {
      let failed = false
      const video = videoRef.current
      const canvas = canvasRef.current

      if (video?.videoWidth && canvas) {
        const started = performance.now()
        const controller = new AbortController()
        controllerRef.current = controller
        try {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          canvas.getContext('2d').drawImage(video, 0, 0)
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))

          if (blob && active()) {
            const data = await detectImage(blob, confidenceRef.current, {
              signal: controller.signal,
              filename: 'webcam.jpg',
            })
            if (active()) {
              setLiveImage(outputUrl(data.output_url, { bust: true }))
              setStats(data)
              setLatency(Math.round(performance.now() - started))
              setError('')

              const now = performance.now()
              const stamps = [...stampsRef.current, now].slice(-8)
              stampsRef.current = stamps
              if (stamps.length > 1) {
                setRate(((stamps.length - 1) / ((now - stamps[0]) / 1000)).toFixed(1))
              }
            }
          }
        } catch (e) {
          if (!isAbort(e) && active()) {
            failed = true
            setError(e.message || 'Camera inference failed.')
          }
        }
      }

      if (active()) await sleep(failed ? ERROR_BACKOFF_MS : FRAME_GAP_MS)
    }
  }

  async function startCamera() {
    if (startingRef.current || loopRef.current) return
    setError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission('unsupported')
      setError('Camera access is not available in this browser or context. Use HTTPS or localhost.')
      return
    }

    startingRef.current = true
    setStarting(true)
    const session = ++sessionRef.current

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })

      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (!video) throw new Error('Camera preview is not ready.')
      video.srcObject = stream
      await video.play()
      if (session !== sessionRef.current) return

      setPermission('granted')
      setCameraOn(true)
      loopRef.current = true
      runLoop(session)
    } catch (e) {
      if (session === sessionRef.current) {
        if (e?.name === 'NotAllowedError') setPermission('denied')
        setError(describeCameraError(e))
        stopCamera()
      }
    } finally {
      if (session === sessionRef.current) {
        startingRef.current = false
        setStarting(false)
      }
    }
  }

  const perm = PERMISSION_UI[permission] ?? PERMISSION_UI.unknown
  const waitingForFirstFrame = cameraOn && !liveImage

  return (
    <div className="page-root ws-camera">
      <div className="camera-layout">
        {/* ---------- Stage ---------- */}
        <section className="cam-main">
          <div className={`cam-stage ${cameraOn ? 'live' : ''}`}>
            <video ref={videoRef} muted playsInline className={liveImage ? 'under' : ''} />
            {liveImage && cameraOn && <img src={liveImage} alt="Live detection output" />}
            <canvas ref={canvasRef} hidden />

            <div className="hud hud-top">
              <span className={`hud-chip ${cameraOn ? 'on' : ''}`}>
                <i className="rec" aria-hidden="true" />
                {cameraOn ? 'Live' : starting ? 'Starting…' : 'Camera off'}
              </span>
              {cameraOn && latency !== null && (
                <span className="hud-chip">
                  <Timer size={13} aria-hidden="true" />
                  {latency} ms round trip
                </span>
              )}
            </div>

            {cameraOn && stats && (
              <div className="hud hud-bottom">
                <span className="hud-chip big">
                  <Users size={15} aria-hidden="true" />
                  {valueOrDash(stats.people)} people
                </span>
                <span className="hud-chip big">
                  <CarFront size={15} aria-hidden="true" />
                  {valueOrDash(stats.vehicles)} vehicles
                </span>
              </div>
            )}

            {!cameraOn && (
              <div className="cam-idle">
                {starting ? (
                  <LoaderCircle size={34} className="spin" aria-hidden="true" />
                ) : permission === 'denied' ? (
                  <CameraOff size={34} aria-hidden="true" />
                ) : (
                  <Camera size={34} aria-hidden="true" />
                )}
                <strong>{starting ? 'Waiting for camera…' : 'Your webcam is off'}</strong>
                <p>
                  {starting
                    ? 'Approve the browser prompt if it appears.'
                    : 'Start the camera to stream frames to YOLO11 and see boxes in real time.'}
                </p>
              </div>
            )}

            {waitingForFirstFrame && (
              <div className="cam-waiting">
                <LoaderCircle size={15} className="spin" aria-hidden="true" />
                Waiting for the first detection…
              </div>
            )}
          </div>

          <div className="cam-controls">
            {!cameraOn ? (
              <button className="btn primary" onClick={startCamera} disabled={starting}>
                {starting ? (
                  <LoaderCircle size={17} className="spin" aria-hidden="true" />
                ) : (
                  <Play size={17} aria-hidden="true" />
                )}
                {starting ? 'Starting…' : 'Start Camera'}
              </button>
            ) : (
              <button className="btn danger" onClick={stopCamera}>
                <Square size={16} aria-hidden="true" />
                Stop Camera
              </button>
            )}
            <div className="cam-slider">
              <ConfidenceSlider value={confidence} onChange={changeConfidence} />
            </div>
          </div>

          {error && (
            <Notice tone="error" title="Camera problem">
              {error}
            </Notice>
          )}
          {!error && health.state === 'offline' && (
            <Notice tone="warn" title="Backend offline">
              Frames are analysed by the Flask server on port 5000. Start it before turning the
              camera on.
            </Notice>
          )}
        </section>

        {/* ---------- Telemetry ---------- */}
        <aside className="telemetry">
          <div className="telemetry-status">
            <StatusBadge tone={perm.tone} label={perm.label} />
            <StatusBadge
              tone={cameraOn ? 'ok' : 'idle'}
              pulse={cameraOn}
              label={cameraOn ? 'Camera running' : 'Camera stopped'}
            />
          </div>

          <div className="telemetry-grid">
            <StatCard
              icon={Users}
              size="lg"
              label="People"
              value={cameraOn ? valueOrDash(stats?.people) : '—'}
            />
            <StatCard
              icon={CarFront}
              size="lg"
              label="Vehicles"
              value={cameraOn ? valueOrDash(stats?.vehicles) : '—'}
            />
          </div>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h3>By class</h3>
                <p>Current frame</p>
              </div>
              <span className="mini-total">
                {cameraOn && stats ? `${valueOrDash(stats.total)} total` : '—'}
              </span>
            </header>
            <ClassBreakdown counts={stats?.class_counts} empty={!cameraOn || !stats} />
          </section>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h3>Performance</h3>
                <p>Measured while running</p>
              </div>
            </header>
            <dl className="summary-list">
              <div>
                <dt>
                  <Activity size={14} aria-hidden="true" /> Inference latency
                </dt>
                <dd>{cameraOn && stats ? valueOrDash(stats.inference_ms, ' ms') : '—'}</dd>
              </div>
              <div>
                <dt>
                  <Timer size={14} aria-hidden="true" /> Round trip
                </dt>
                <dd>{cameraOn && latency !== null ? `${latency} ms` : '—'}</dd>
              </div>
              <div>
                <dt>
                  <Gauge size={14} aria-hidden="true" /> Detection rate
                </dt>
                <dd>{cameraOn && rate ? `${rate} fps` : '—'}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}

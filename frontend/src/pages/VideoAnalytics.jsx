import { useEffect, useRef, useState } from 'react'
import {
  Clapperboard,
  Download,
  FileVideo,
  Film,
  LoaderCircle,
  Play,
  RotateCcw,
  Timer,
} from 'lucide-react'
import UploadZone from '../components/UploadZone'
import ConfidenceSlider from '../components/ConfidenceSlider'
import ClassBreakdown from '../components/ClassBreakdown'
import EmptyState from '../components/EmptyState'
import Notice from '../components/Notice'
import { DEFAULT_CONFIDENCE } from '../constants'
import { detectVideo, downloadFile, isAbort, outputUrl } from '../services/api'
import { formatBytes, formatDuration, valueOrDash } from '../utils/format'

const EXTENSIONS = ['mp4', 'avi', 'mov', 'mkv']
const ACCEPT = 'video/mp4,video/x-msvideo,video/quicktime,video/x-matroska,.mp4,.avi,.mov,.mkv'

export default function VideoAnalytics({ health }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [result, setResult] = useState(null)
  const [tab, setTab] = useState('original')
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [playbackError, setPlaybackError] = useState('')
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE)

  const controllerRef = useRef(null)
  const busyRef = useRef(false)
  const previewRef = useRef('')

  useEffect(
    () => () => {
      controllerRef.current?.abort()
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )

  // Real elapsed time while the backend is working (no fake progress percentage).
  useEffect(() => {
    if (!busy) return undefined
    const started = Date.now()
    const timer = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 500)
    return () => window.clearInterval(timer)
  }, [busy])

  function selectFile(nextFile) {
    if (busyRef.current) return
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const url = URL.createObjectURL(nextFile)
    previewRef.current = url
    setPreviewUrl(url)
    setFile(nextFile)
    setResult(null)
    setTab('original')
    setError('')
    setPlaybackError('')
  }

  function reset() {
    controllerRef.current?.abort()
    busyRef.current = false
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = ''
    setPreviewUrl('')
    setFile(null)
    setResult(null)
    setTab('original')
    setBusy(false)
    setError('')
    setPlaybackError('')
  }

  async function process() {
    if (!file || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setElapsed(0)
    setError('')
    setPlaybackError('')
    setResult(null)
    setTab('original')

    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const data = await detectVideo(file, confidence, { signal: controller.signal })
      setResult(data)
      setTab('annotated')
    } catch (e) {
      if (!isAbort(e)) setError(e.message || 'Video processing failed.')
    } finally {
      if (controllerRef.current === controller) {
        busyRef.current = false
        setBusy(false)
      }
    }
  }

  async function download() {
    if (!result?.output_url || downloading) return
    const url = outputUrl(result.output_url)
    const ext = (result.output_url.split('?')[0].split('.').pop() || 'mp4').toLowerCase()
    const base = (file?.name || 'video').replace(/\.[^.]+$/, '')
    setDownloading(true)
    try {
      await downloadFile(url, `${base}-annotated.${ext}`)
    } catch {
      window.open(url, '_blank', 'noopener')
    } finally {
      setDownloading(false)
    }
  }

  const annotatedUrl = result?.output_url ? outputUrl(result.output_url) : ''
  const showAnnotated = tab === 'annotated' && annotatedUrl

  // Derived only from values the backend returned.
  const duration = Number(result?.duration_seconds)
  const processing = Number(result?.processing_seconds)
  const hasTiming = Number.isFinite(duration) && Number.isFinite(processing) && processing > 0
  const realtime = hasTiming && duration > 0 ? duration / processing : null
  const timeMax = hasTiming ? Math.max(duration, processing) : 1
  const peakPeople = Number(result?.peak_people_in_frame ?? 0)
  const peakVehicles = Number(result?.peak_vehicles_in_frame ?? 0)
  const peakMax = Math.max(1, peakPeople, peakVehicles)

  return (
    <div className="page-root ws-video">
      <div className="video-layout">
        {/* ---------- Stage ---------- */}
        <section className="panel stage-panel">
          <header className="panel-head">
            <div className="segmented" role="tablist" aria-label="Video view">
              <button
                role="tab"
                aria-selected={tab === 'original'}
                className={tab === 'original' ? 'on' : ''}
                onClick={() => setTab('original')}
              >
                Original
              </button>
              <button
                role="tab"
                aria-selected={tab === 'annotated'}
                className={tab === 'annotated' ? 'on' : ''}
                onClick={() => setTab('annotated')}
                disabled={!annotatedUrl}
              >
                Annotated
              </button>
            </div>
            {annotatedUrl && (
              <button className="btn secondary small" onClick={download} disabled={downloading}>
                {downloading ? (
                  <LoaderCircle size={15} className="spin" aria-hidden="true" />
                ) : (
                  <Download size={15} aria-hidden="true" />
                )}
                Download processed video
              </button>
            )}
          </header>

          {!file ? (
            <UploadZone
              variant="wide"
              extensions={EXTENSIONS}
              accept={ACCEPT}
              title="Drop a video to analyze"
              formatsLabel="MP4 · AVI · MOV · MKV"
              onFile={selectFile}
              onReject={setError}
              icon={Clapperboard}
            />
          ) : (
            <div className="player">
              {showAnnotated ? (
                <video
                  key={annotatedUrl}
                  src={annotatedUrl}
                  controls
                  playsInline
                  onError={() =>
                    setPlaybackError(
                      'This browser could not play the processed video. Download it and open it in a desktop player.',
                    )
                  }
                />
              ) : (
                <video
                  key={previewUrl}
                  src={previewUrl}
                  controls
                  playsInline
                  onError={() =>
                    setPlaybackError(
                      'This format cannot be previewed in the browser. You can still process it.',
                    )
                  }
                />
              )}
              {busy && (
                <div className="player-busy">
                  <LoaderCircle size={22} className="spin" aria-hidden="true" />
                  <strong>Processing video</strong>
                  <span>{elapsed.toFixed(0)} s elapsed · detection runs on every frame</span>
                  <div className="indeterminate" />
                </div>
              )}
            </div>
          )}

          {playbackError && <Notice tone="warn">{playbackError}</Notice>}

          {/* ---------- Timeline-style analytics ---------- */}
          <div className="timeline">
            <div className="timeline-head">
              <h4>
                <Timer size={16} aria-hidden="true" />
                Analysis timeline
              </h4>
              {realtime !== null && (
                <span className="rt-chip">
                  {realtime >= 1
                    ? `${realtime.toFixed(1)}× faster than real time`
                    : `${(1 / realtime).toFixed(1)}× slower than real time`}
                </span>
              )}
            </div>

            {result ? (
              <>
                <div className="track-row">
                  <span>Video length</span>
                  <div className="track">
                    <i
                      className="fill video"
                      style={{ width: `${(Number.isFinite(duration) ? duration / timeMax : 0) * 100}%` }}
                    />
                  </div>
                  <strong>{formatDuration(duration)}</strong>
                </div>
                <div className="track-row">
                  <span>Processing time</span>
                  <div className="track">
                    <i
                      className="fill proc"
                      style={{ width: `${(Number.isFinite(processing) ? processing / timeMax : 0) * 100}%` }}
                    />
                  </div>
                  <strong>{formatDuration(processing)}</strong>
                </div>
                <div className="track-row">
                  <span>Peak people</span>
                  <div className="track">
                    <i
                      className="fill person"
                      style={{ width: `${(peakPeople / peakMax) * 100}%` }}
                    />
                  </div>
                  <strong>{valueOrDash(result.peak_people_in_frame)}</strong>
                </div>
                <div className="track-row">
                  <span>Peak vehicles</span>
                  <div className="track">
                    <i
                      className="fill vehicle"
                      style={{ width: `${(peakVehicles / peakMax) * 100}%` }}
                    />
                  </div>
                  <strong>{valueOrDash(result.peak_vehicles_in_frame)}</strong>
                </div>
              </>
            ) : (
              <EmptyState icon={Film} title="No analysis yet">
                Process a video to compare its length with processing time and see the busiest
                frame.
              </EmptyState>
            )}
          </div>
        </section>

        {/* ---------- Control rail ---------- */}
        <aside className="rail">
          <section className="panel">
            <header className="panel-head">
              <div>
                <h3>Job settings</h3>
                <p>MP4, AVI, MOV or MKV</p>
              </div>
            </header>

            {file ? (
              <div className="file-card">
                <span className="file-card-icon" aria-hidden="true">
                  <FileVideo size={20} />
                </span>
                <div>
                  <strong title={file.name}>{file.name}</strong>
                  <span>{formatBytes(file.size)}</span>
                </div>
              </div>
            ) : (
              <p className="rail-hint">Add a video on the left to enable processing.</p>
            )}

            <ConfidenceSlider value={confidence} onChange={setConfidence} disabled={busy} />

            <div className="button-stack">
              <button className="btn primary" onClick={process} disabled={!file || busy}>
                {busy ? (
                  <LoaderCircle size={17} className="spin" aria-hidden="true" />
                ) : (
                  <Play size={17} aria-hidden="true" />
                )}
                {busy ? 'Processing…' : 'Process Video'}
              </button>
              <button className="btn ghost" onClick={reset} disabled={!file && !error}>
                <RotateCcw size={16} aria-hidden="true" />
                {busy ? 'Cancel' : 'Clear'}
              </button>
            </div>

            {error && (
              <Notice tone="error" title="Video could not be processed">
                {error}
              </Notice>
            )}
            {!error && health.state === 'offline' && (
              <Notice tone="warn" title="Backend offline">
                Start the Flask server on port 5000 before processing.
              </Notice>
            )}
          </section>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h3>Summary</h3>
                <p>{result ? valueOrDash(result.device) : 'Appears after processing'}</p>
              </div>
            </header>
            <dl className="summary-list">
              <div>
                <dt>Frames processed</dt>
                <dd>{result ? valueOrDash(result.frames_processed) : '—'}</dd>
              </div>
              <div>
                <dt>Video duration</dt>
                <dd>{result ? formatDuration(duration) : '—'}</dd>
              </div>
              <div>
                <dt>Processing time</dt>
                <dd>{result ? formatDuration(processing) : '—'}</dd>
              </div>
              <div>
                <dt>Processing FPS</dt>
                <dd>{result ? valueOrDash(result.processing_fps) : '—'}</dd>
              </div>
              <div>
                <dt>Peak people in a frame</dt>
                <dd>{result ? valueOrDash(result.peak_people_in_frame) : '—'}</dd>
              </div>
              <div>
                <dt>Peak vehicles in a frame</dt>
                <dd>{result ? valueOrDash(result.peak_vehicles_in_frame) : '—'}</dd>
              </div>
            </dl>
            {result?.class_counts && (
              <div className="rail-breakdown">
                <h4>Detections by class</h4>
                <ClassBreakdown counts={result.class_counts} />
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

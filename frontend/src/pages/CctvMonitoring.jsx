import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  CarFront,
  Cctv,
  Eye,
  EyeOff,
  Gauge,
  KeyRound,
  LoaderCircle,
  Plug,
  RefreshCw,
  Timer,
  Unplug,
  Users,
  VideoOff,
} from 'lucide-react'
import ConfidenceSlider from '../components/ConfidenceSlider'
import ClassBreakdown from '../components/ClassBreakdown'
import Notice from '../components/Notice'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { DEFAULT_CONFIDENCE } from '../constants'
import {
  cctvConnect,
  cctvDisconnect,
  cctvSetConfidence,
  cctvStatus,
  cctvStreamUrl,
  isAbort,
} from '../services/api'
import { valueOrDash } from '../utils/format'

const STATE_UI = {
  disconnected: { tone: 'idle', label: 'Disconnected' },
  connecting: { tone: 'warn', label: 'Connecting' },
  connected: { tone: 'ok', label: 'Connected' },
  error: { tone: 'bad', label: 'Error' },
}

function normalizeState(raw) {
  const value = String(raw ?? '').toLowerCase()
  if (value === 'connected') return 'connected'
  if (['connecting', 'reconnecting', 'starting'].includes(value)) return 'connecting'
  if (['error', 'failed', 'failure'].includes(value)) return 'error'
  return 'disconnected'
}

function hintFor(message = '') {
  if (/auth|401|403|credential|password|unauthor/i.test(message)) {
    return 'Check the username and password in the URL. Special characters in a password must be percent-encoded.'
  }
  if (/timed? ?out|timeout|unreachable|refused|route|network/i.test(message)) {
    return 'Check the camera’s IP address and port, and that the computer running Flask can reach it.'
  }
  return ''
}

function describeSource(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return {
      protocol: parsed.protocol.replace(':', '').toUpperCase(),
      host: parsed.hostname || '—',
      port: parsed.port || '',
      path: `${parsed.pathname}${parsed.search ? '?…' : ''}` || '/',
      credentials: Boolean(parsed.username || parsed.password),
    }
  } catch {
    return null
  }
}

export default function CctvMonitoring({ health }) {
  const [rtspUrl, setRtspUrl] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE)
  const [status, setStatus] = useState(null)
  const [backendError, setBackendError] = useState('')
  const [working, setWorking] = useState('') // '', 'connect', 'disconnect', 'reconnect'
  const [error, setError] = useState('')
  const [streamKey, setStreamKey] = useState(() => Date.now())
  const [failedKey, setFailedKey] = useState(null)

  const lockRef = useRef(false)
  const confidenceRef = useRef(DEFAULT_CONFIDENCE)
  const stateRef = useRef('disconnected')

  const state = normalizeState(status?.status)
  const connected = state === 'connected'
  const connecting = state === 'connecting' || working === 'connect' || working === 'reconnect'

  useEffect(() => {
    stateRef.current = state
  }, [state])

  function changeConfidence(value) {
    confidenceRef.current = value
    setConfidence(value)
  }

  // Poll the backend for the real connection state and live numbers.
  useEffect(() => {
    let cancelled = false
    let timer = null
    const controller = new AbortController()

    async function poll() {
      try {
        const data = await cctvStatus(controller.signal)
        if (!cancelled) {
          setStatus(data)
          setBackendError('')
        }
      } catch (e) {
        if (!cancelled && !isAbort(e)) setBackendError(e.message)
      }
      if (!cancelled) timer = window.setTimeout(poll, 1000)
    }

    poll()
    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [])

  // Leaving the page releases the camera on the backend.
  useEffect(
    () => () => {
      if (stateRef.current === 'connected' || stateRef.current === 'connecting') {
        cctvDisconnect({ keepalive: true }).catch(() => {})
      }
    },
    [],
  )

  // Push confidence changes to the running stream (debounced).
  useEffect(() => {
    if (!connected) return undefined
    const timer = window.setTimeout(() => {
      cctvSetConfidence(confidence).catch(() => {})
    }, 250)
    return () => window.clearTimeout(timer)
  }, [confidence, connected])

  async function startConnection(url) {
    const data = await cctvConnect(url, confidenceRef.current)
    setStatus((previous) => ({ ...previous, status: data.status, message: data.message }))
    setStreamKey(Date.now())
  }

  async function connect() {
    const url = rtspUrl.trim()
    if (!url || lockRef.current) return
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
      setError('Enter the full stream address, starting with rtsp://')
      return
    }
    lockRef.current = true
    setWorking('connect')
    setError('')
    try {
      await startConnection(url)
    } catch (e) {
      setError(e.message || 'CCTV connection failed.')
    } finally {
      lockRef.current = false
      setWorking('')
    }
  }

  async function disconnect() {
    if (lockRef.current) return
    lockRef.current = true
    setWorking('disconnect')
    setError('')
    try {
      await cctvDisconnect()
      setStatus({ status: 'disconnected', message: 'Camera disconnected.' })
    } catch (e) {
      setError(e.message || 'Could not disconnect the camera.')
    } finally {
      lockRef.current = false
      setWorking('')
    }
  }

  async function reconnect() {
    const url = rtspUrl.trim()
    if (!url || lockRef.current) return
    lockRef.current = true
    setWorking('reconnect')
    setError('')
    try {
      await cctvDisconnect().catch(() => {})
      await startConnection(url)
    } catch (e) {
      setError(e.message || 'Reconnect failed.')
    } finally {
      lockRef.current = false
      setWorking('')
    }
  }

  const ui = STATE_UI[connecting && state !== 'connected' ? 'connecting' : state]
  const source = describeSource(rtspUrl.trim())
  const feedFailed = failedKey === streamKey
  const statusMessage = status?.message
  const resolution =
    status?.resolution ||
    (status?.width && status?.height ? `${status.width} × ${status.height}` : '')
  const live = connected ? status : null
  const urlLocked = connected || connecting
  const canReconnect = Boolean(rtspUrl.trim()) && !connecting && (connected || state === 'error')

  return (
    <div className="page-root ws-cctv">
      {/* ---------- Connection bar ---------- */}
      <section className="panel connect-bar">
        <div className="connect-field">
          <label htmlFor="rtsp-url">RTSP stream URL</label>
          <div className="input-wrap">
            <KeyRound size={16} aria-hidden="true" />
            <input
              id="rtsp-url"
              type={showUrl ? 'text' : 'password'}
              autoComplete="off"
              spellCheck="false"
              placeholder="rtsp://username:password@192.168.1.64:554/stream1"
              value={rtspUrl}
              disabled={urlLocked}
              onChange={(event) => setRtspUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !urlLocked) connect()
              }}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowUrl((value) => !value)}
              aria-label={showUrl ? 'Hide URL' : 'Show URL'}
            >
              {showUrl ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="connect-actions">
          <StatusBadge tone={ui.tone} pulse={connected} label={ui.label} />
          {connected || state === 'connecting' ? (
            <button className="btn danger" onClick={disconnect} disabled={working !== ''}>
              {working === 'disconnect' ? (
                <LoaderCircle size={16} className="spin" aria-hidden="true" />
              ) : (
                <Unplug size={16} aria-hidden="true" />
              )}
              Disconnect Camera
            </button>
          ) : (
            <button
              className="btn primary"
              onClick={connect}
              disabled={!rtspUrl.trim() || working !== ''}
            >
              {working === 'connect' ? (
                <LoaderCircle size={16} className="spin" aria-hidden="true" />
              ) : (
                <Plug size={16} aria-hidden="true" />
              )}
              {working === 'connect' ? 'Connecting…' : 'Connect Camera'}
            </button>
          )}
          <button className="btn ghost" onClick={reconnect} disabled={!canReconnect || working !== ''}>
            <RefreshCw
              size={16}
              className={working === 'reconnect' ? 'spin' : ''}
              aria-hidden="true"
            />
            Reconnect
          </button>
        </div>
      </section>

      {error && (
        <Notice tone="error" title="Connection problem">
          {error} {hintFor(error)}
        </Notice>
      )}
      {!error && state === 'error' && (
        <Notice tone="error" title="The camera reported an error">
          {statusMessage || 'The stream could not be read.'} {hintFor(statusMessage)}
        </Notice>
      )}
      {backendError && (
        <Notice tone="warn" title="Backend not reachable">
          {backendError}
        </Notice>
      )}
      {!backendError && health.state === 'offline' && (
        <Notice tone="warn" title="Backend offline">
          Start the Flask server on port 5000.
        </Notice>
      )}

      <div className="cctv-layout">
        {/* ---------- Feed ---------- */}
        <section className="feed-panel">
          <header className="feed-head">
            <span className="feed-title">
              <Cctv size={16} aria-hidden="true" />
              Channel 1
            </span>
            <span className="feed-meta">
              {connected ? `${valueOrDash(live?.stream_fps)} fps stream` : ui.label}
            </span>
          </header>

          <div className={`feed ${connected && !feedFailed ? 'has-stream' : ''}`}>
            {connected && !feedFailed ? (
              <img
                key={streamKey}
                src={cctvStreamUrl(streamKey)}
                alt="Live CCTV feed with detection boxes"
                onError={() => setFailedKey(streamKey)}
              />
            ) : connected && feedFailed ? (
              <div className="feed-empty">
                <VideoOff size={34} aria-hidden="true" />
                <strong>The video feed was interrupted</strong>
                <p>The backend still reports a connection. Try Reconnect to restart the stream.</p>
              </div>
            ) : connecting ? (
              <div className="feed-empty">
                <LoaderCircle size={34} className="spin" aria-hidden="true" />
                <strong>Connecting to the camera…</strong>
                <p>{statusMessage || 'Opening the RTSP stream. This can take a few seconds.'}</p>
              </div>
            ) : (
              <div className="feed-empty guide">
                <Cctv size={36} aria-hidden="true" />
                <strong>No camera connected</strong>
                <p>
                  Enter the RTSP address of an IP camera or NVR above. Nothing is shown here until a
                  real stream is connected.
                </p>
                <ul className="guide-list">
                  <li>
                    <b>Format</b>
                    <code>rtsp://username:password@camera-ip:554/stream-path</code>
                  </li>
                  <li>
                    <b>Credentials</b>
                    <span>
                      Put them in the URL. Encode special characters in the password (for example @
                      becomes %40).
                    </span>
                  </li>
                  <li>
                    <b>Network</b>
                    <span>
                      The camera must be reachable from the computer running Flask, not just from
                      this browser.
                    </span>
                  </li>
                  <li>
                    <b>Stream path</b>
                    <span>Ask the camera or NVR administrator; it differs between manufacturers.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ---------- Side column ---------- */}
        <aside className="cctv-side">
          <div className="telemetry-grid">
            <StatCard
              icon={Users}
              size="lg"
              label="People"
              value={connected ? valueOrDash(live?.people) : '—'}
            />
            <StatCard
              icon={CarFront}
              size="lg"
              label="Vehicles"
              value={connected ? valueOrDash(live?.vehicles) : '—'}
            />
          </div>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h3>By class</h3>
                <p>Live from the stream</p>
              </div>
              <span className="mini-total">{connected ? `${valueOrDash(live?.total)} total` : '—'}</span>
            </header>
            <ClassBreakdown counts={live?.class_counts} empty={!connected} />
          </section>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h3>Stream health</h3>
                <p>Reported by the backend</p>
              </div>
            </header>
            <dl className="summary-list">
              <div>
                <dt>
                  <Gauge size={14} aria-hidden="true" /> Stream FPS
                </dt>
                <dd>{connected ? valueOrDash(live?.stream_fps) : '—'}</dd>
              </div>
              <div>
                <dt>
                  <Timer size={14} aria-hidden="true" /> Inference latency
                </dt>
                <dd>{connected ? valueOrDash(live?.inference_ms, ' ms') : '—'}</dd>
              </div>
              <div>
                <dt>
                  <Activity size={14} aria-hidden="true" /> Total detections
                </dt>
                <dd>{connected ? valueOrDash(live?.total) : '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <ConfidenceSlider
              value={confidence}
              onChange={changeConfidence}
              note={connected ? 'Applied to the running stream.' : 'Applied when you connect.'}
            />
          </section>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h3>Camera information</h3>
                <p>Only what is known about this session</p>
              </div>
            </header>
            <dl className="summary-list">
              <div>
                <dt>Status</dt>
                <dd>{ui.label}</dd>
              </div>
              <div>
                <dt>Protocol</dt>
                <dd>{source?.protocol ?? '—'}</dd>
              </div>
              <div>
                <dt>Host</dt>
                <dd>{source ? `${source.host}${source.port ? `:${source.port}` : ''}` : '—'}</dd>
              </div>
              <div>
                <dt>Stream path</dt>
                <dd>{source?.path ?? '—'}</dd>
              </div>
              <div>
                <dt>Credentials</dt>
                <dd>{source ? (source.credentials ? 'Included in URL' : 'None in URL') : '—'}</dd>
              </div>
              {resolution && (
                <div>
                  <dt>Resolution</dt>
                  <dd>{resolution}</dd>
                </div>
              )}
            </dl>
            {statusMessage && <p className="info-message">{statusMessage}</p>}
          </section>
        </aside>
      </div>
    </div>
  )
}

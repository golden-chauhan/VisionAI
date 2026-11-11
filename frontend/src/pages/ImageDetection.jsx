import { useEffect, useRef, useState } from 'react'
import {
  Download,
  FileImage,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  ScanSearch,
} from 'lucide-react'
import UploadZone from '../components/UploadZone'
import ConfidenceSlider from '../components/ConfidenceSlider'
import ClassBreakdown from '../components/ClassBreakdown'
import EmptyState from '../components/EmptyState'
import Notice from '../components/Notice'
import { DEFAULT_CONFIDENCE } from '../constants'
import { detectImage, downloadFile, isAbort, outputUrl } from '../services/api'
import { formatBytes, valueOrDash } from '../utils/format'

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

export default function ImageDetection({ health }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE)

  const controllerRef = useRef(null)
  const busyRef = useRef(false)
  const previewRef = useRef('')
  const replaceInputRef = useRef(null)

  useEffect(
    () => () => {
      controllerRef.current?.abort()
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )

  function selectFile(nextFile) {
    if (busyRef.current) return
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const url = URL.createObjectURL(nextFile)
    previewRef.current = url
    setPreviewUrl(url)
    setFile(nextFile)
    setResult(null)
    setError('')
  }

  function reset() {
    controllerRef.current?.abort()
    busyRef.current = false
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = ''
    setPreviewUrl('')
    setFile(null)
    setResult(null)
    setBusy(false)
    setError('')
  }

  async function detect() {
    if (!file || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    setResult(null)

    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const data = await detectImage(file, confidence, { signal: controller.signal })
      setResult(data)
    } catch (e) {
      if (!isAbort(e)) setError(e.message || 'Detection failed.')
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
    const ext = (result.output_url.split('?')[0].split('.').pop() || 'jpg').toLowerCase()
    const base = (file?.name || 'image').replace(/\.[^.]+$/, '')
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
  const counts = result?.class_counts

  return (
    <div className="page-root ws-image">
      <div className="image-layout">
        {/* ---------- Input ---------- */}
        <section className="panel">
          <header className="panel-head">
            <div>
              <h3>Source image</h3>
              <p>JPG, JPEG, PNG or WEBP</p>
            </div>
            {file && (
              <span className="file-chip" title={file.name}>
                <FileImage size={14} aria-hidden="true" />
                <span>{file.name}</span>
                <em>{formatBytes(file.size)}</em>
              </span>
            )}
          </header>

          {!file ? (
            <UploadZone
              extensions={EXTENSIONS}
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              title="Drop an image to analyze"
              formatsLabel="JPG · JPEG · PNG · WEBP"
              onFile={selectFile}
              onReject={setError}
              icon={ImagePlus}
              disabled={busy}
            />
          ) : (
            <div className="viewfinder">
              <img src={previewUrl} alt="Selected source" />
              <span className="vf-corner tl" />
              <span className="vf-corner tr" />
              <span className="vf-corner bl" />
              <span className="vf-corner br" />
            </div>
          )}

          <ConfidenceSlider value={confidence} onChange={setConfidence} disabled={busy} />

          <div className="button-row">
            <button className="btn primary" onClick={detect} disabled={!file || busy}>
              {busy ? (
                <LoaderCircle size={17} className="spin" aria-hidden="true" />
              ) : (
                <ScanSearch size={17} aria-hidden="true" />
              )}
              {busy ? 'Detecting…' : 'Detect Objects'}
            </button>
            {file && (
              <button
                className="btn ghost"
                onClick={() => replaceInputRef.current?.click()}
                disabled={busy}
              >
                <ImagePlus size={16} aria-hidden="true" />
                Replace
              </button>
            )}
            <button className="btn ghost" onClick={reset} disabled={!file && !error}>
              <RotateCcw size={16} aria-hidden="true" />
              Reset
            </button>
            <input
              ref={replaceInputRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={(event) => {
                const next = event.target.files?.[0]
                event.target.value = ''
                if (!next) return
                const ext = next.name.split('.').pop().toLowerCase()
                if (EXTENSIONS.includes(ext)) selectFile(next)
                else setError(`“${next.name}” is not supported. Use JPG, JPEG, PNG or WEBP.`)
              }}
            />
          </div>

          {error && (
            <Notice tone="error" title="Detection could not finish">
              {error}
            </Notice>
          )}
          {!error && health.state === 'offline' && (
            <Notice tone="warn" title="Backend offline">
              Start the Flask server on port 5000 before detecting.
            </Notice>
          )}
        </section>

        {/* ---------- Output ---------- */}
        <section className="panel">
          <header className="panel-head">
            <div>
              <h3>Detection output</h3>
              <p>
                {result
                  ? `${valueOrDash(result.inference_ms, ' ms')} inference`
                  : 'Annotated with bounding boxes'}
              </p>
            </div>
            {annotatedUrl && (
              <button className="btn secondary small" onClick={download} disabled={downloading}>
                {downloading ? (
                  <LoaderCircle size={15} className="spin" aria-hidden="true" />
                ) : (
                  <Download size={15} aria-hidden="true" />
                )}
                Download image
              </button>
            )}
          </header>

          <div className="viewfinder output">
            {annotatedUrl ? (
              <img src={annotatedUrl} alt="Image with detected people and vehicles outlined" />
            ) : busy ? (
              <div className="scanning">
                {previewUrl && <img src={previewUrl} alt="" className="dimmed" />}
                <span className="scan-line" />
                <div className="scan-label">
                  <LoaderCircle size={18} className="spin" aria-hidden="true" />
                  Running YOLO11 on your image…
                </div>
              </div>
            ) : (
              <EmptyState icon={ScanSearch} title="No detection yet">
                {file
                  ? 'Press Detect Objects to see the annotated image here.'
                  : 'Add an image on the left to get started.'}
              </EmptyState>
            )}
            <span className="vf-corner tl" />
            <span className="vf-corner tr" />
            <span className="vf-corner bl" />
            <span className="vf-corner br" />
          </div>

          <div className="image-stats">
            <div className="total-cell">
              <span>Total detections</span>
              <strong>{result ? valueOrDash(result.total) : '—'}</strong>
            </div>
            <ClassBreakdown variant="tiles" counts={counts} empty={!result} />
          </div>
        </section>
      </div>
    </div>
  )
}

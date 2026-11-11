// All calls to the existing Flask backend live here.
// Routes and payloads are unchanged from the original frontend.

export const API_BASE = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
).replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, { status = 0, network = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.network = network
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, options)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError(
      `Cannot reach the VisionAI backend at ${API_BASE}. Start the Flask server and try again.`,
      { network: true },
    )
  }

  let data
  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || `The backend returned an error (${response.status}).`,
      { status: response.status },
    )
  }
  return data
}

export function isAbort(error) {
  return error?.name === 'AbortError'
}

export function outputUrl(path, { bust = false } = {}) {
  if (!path) return ''
  const full = /^https?:/i.test(path) ? path : `${API_BASE}${path}`
  return bust ? `${full}${full.includes('?') ? '&' : '?'}t=${Date.now()}` : full
}

/* ---------- Health ---------- */
export function getHealth(signal) {
  return request('/api/health', { signal })
}

/* ---------- Image / video / webcam frames ---------- */
function uploadForm(file, confidence, filename) {
  const form = new FormData()
  if (filename) form.append('file', file, filename)
  else form.append('file', file)
  form.append('confidence', String(confidence))
  return form
}

export function detectImage(file, confidence, { signal, filename } = {}) {
  return request('/api/detect/image', {
    method: 'POST',
    body: uploadForm(file, confidence, filename),
    signal,
  })
}

export function detectVideo(file, confidence, { signal } = {}) {
  return request('/api/detect/video', {
    method: 'POST',
    body: uploadForm(file, confidence),
    signal,
  })
}

/* ---------- CCTV ---------- */
export function cctvConnect(streamUrl, confidence) {
  return request('/api/cctv/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stream_url: streamUrl, confidence }),
  })
}

export function cctvStatus(signal) {
  return request('/api/cctv/status', { signal })
}

export function cctvDisconnect({ keepalive = false } = {}) {
  return request('/api/cctv/disconnect', { method: 'POST', keepalive })
}

export function cctvSetConfidence(confidence) {
  return request('/api/cctv/confidence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confidence }),
  })
}

export function cctvStreamUrl(key) {
  return `${API_BASE}/api/cctv/stream.mjpg?key=${key}`
}

/* ---------- Downloads ---------- */
// Cross-origin links ignore the `download` attribute, so fetch the file as a blob first.
export async function downloadFile(url, filename) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('The output file could not be downloaded.')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
}

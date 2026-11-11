import { useEffect, useState } from 'react'
import { getHealth } from '../services/api'

const POLL_MS = 10000

// Reads /api/health. Nothing is assumed: CUDA is only reported when the
// backend says so (explicit flag, or a CUDA/GPU device string).
export function useHealth() {
  const [health, setHealth] = useState({
    state: 'checking',
    data: null,
    device: '',
    gpuName: '',
    cuda: null,
  })

  useEffect(() => {
    let cancelled = false
    let controller = null

    async function check() {
      controller?.abort()
      controller = new AbortController()
      try {
        const data = await getHealth(controller.signal)
        if (cancelled) return
        const device = String(data.device ?? '')
        const gpuName = String(data.gpu_name ?? '')
        const cuda =
          typeof data.cuda_available === 'boolean'
            ? data.cuda_available
            : /cuda|gpu/i.test(device) || Boolean(gpuName)
        setHealth({ state: 'online', data, device, gpuName, cuda })
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return
        setHealth({ state: 'offline', data: null, device: '', gpuName: '', cuda: null })
      }
    }

    check()
    const timer = window.setInterval(check, POLL_MS)
    return () => {
      cancelled = true
      controller?.abort()
      window.clearInterval(timer)
    }
  }, [])

  return health
}

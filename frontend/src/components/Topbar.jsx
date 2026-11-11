import { Link, useLocation } from 'react-router-dom'
import { Cpu, House, Server } from 'lucide-react'
import { NAV_ITEMS } from '../navigation'
import StatusBadge from './StatusBadge'

export default function Topbar({ health }) {
  const { pathname } = useLocation()
  const current = NAV_ITEMS.find((item) => item.path === pathname) ?? NAV_ITEMS[0]
  const online = health.state === 'online'
  const checking = health.state === 'checking'

  const gpuLabel = !online
    ? 'GPU unknown'
    : health.cuda
      ? 'CUDA GPU'
      : 'CPU mode'

  return (
    <header className="topbar">
      <div className="topbar-title">
        {pathname !== '/' && (
          <Link to="/" className="home-link" aria-label="Back to Home">
            <House size={16} aria-hidden="true" />
            <span>Home</span>
          </Link>
        )}
        <div>
          <h1>{current.title}</h1>
          <p>{current.subtitle}</p>
        </div>
      </div>

      <div className="topbar-status">
        <StatusBadge
          icon={Server}
          tone={online ? 'ok' : checking ? 'idle' : 'bad'}
          label={online ? 'Backend online' : checking ? 'Checking…' : 'Backend offline'}
        />
        <StatusBadge
          icon={Cpu}
          tone={!online ? 'idle' : health.cuda ? 'violet' : 'warn'}
          label={gpuLabel}
          title={health.gpuName || health.device || undefined}
        />
      </div>
    </header>
  )
}

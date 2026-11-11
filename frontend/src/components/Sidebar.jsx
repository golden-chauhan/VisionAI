import { NavLink } from 'react-router-dom'
import { ScanEye } from 'lucide-react'
import { NAV_ITEMS } from '../navigation'
import StatusBadge from './StatusBadge'

export function BrandMark({ size = 36 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <ScanEye size={size * 0.58} />
    </span>
  )
}

export default function Sidebar({ health }) {
  const online = health.state === 'online'
  const checking = health.state === 'checking'

  return (
    <aside className="sidebar">
      <NavLink to="/" className="brand" aria-label="VisionAI home">
        <BrandMark />
        <span className="brand-text">
          <strong>VisionAI</strong>
          <small>People &amp; vehicle detection</small>
        </span>
      </NavLink>

      <nav className="side-nav" aria-label="Main">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="side-status">
        <StatusBadge
          tone={online ? 'ok' : checking ? 'idle' : 'bad'}
          pulse={online}
          label={online ? 'Backend online' : checking ? 'Checking backend' : 'Backend offline'}
        />
        <p className="side-device">
          {online
            ? health.gpuName || health.device || 'Device not reported'
            : 'Start Flask on port 5000'}
        </p>
      </div>
    </aside>
  )
}

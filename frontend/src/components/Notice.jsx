import { CircleCheck, Info, TriangleAlert } from 'lucide-react'

const ICONS = { error: TriangleAlert, info: Info, success: CircleCheck, warn: TriangleAlert }

export default function Notice({ tone = 'info', title, children, action }) {
  const Icon = ICONS[tone] ?? Info
  return (
    <div className={`notice tone-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" />
      <div className="notice-body">
        {title && <strong>{title}</strong>}
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  )
}

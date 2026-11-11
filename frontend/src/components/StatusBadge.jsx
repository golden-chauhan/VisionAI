export default function StatusBadge({ tone = 'idle', label, pulse = false, icon: Icon, title }) {
  return (
    <span className={`status-badge tone-${tone}`} title={title}>
      {Icon ? <Icon size={14} aria-hidden="true" /> : (
        <span className={`dot ${pulse ? 'pulse' : ''}`} aria-hidden="true" />
      )}
      {label}
    </span>
  )
}

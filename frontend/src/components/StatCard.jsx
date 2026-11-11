export default function StatCard({ icon: Icon, label, value, hint, tone, size = 'md' }) {
  return (
    <div className={`stat-card size-${size} ${tone ? `tone-${tone}` : ''}`}>
      {Icon && (
        <span className="stat-icon" aria-hidden="true">
          <Icon size={size === 'lg' ? 20 : 17} />
        </span>
      )}
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  )
}

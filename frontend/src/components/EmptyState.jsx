export default function EmptyState({ icon: Icon, title, children, actions }) {
  return (
    <div className="empty-state">
      {Icon && (
        <span className="empty-icon" aria-hidden="true">
          <Icon size={28} />
        </span>
      )}
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  )
}

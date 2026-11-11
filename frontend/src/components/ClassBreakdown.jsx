import { CLASS_META } from '../constants'

// variant "bars": one row per class with a proportional bar (side panels)
// variant "tiles": compact ribbon of counts
export default function ClassBreakdown({ counts, variant = 'bars', empty = false }) {
  const hasData = counts && typeof counts === 'object' && !empty
  const values = CLASS_META.map((item) => Number(counts?.[item.key] ?? 0))
  const max = Math.max(1, ...values)

  if (variant === 'tiles') {
    return (
      <ul className="class-tiles">
        {CLASS_META.map((item, index) => (
          <li key={item.key}>
            <span className="swatch" style={{ background: item.color }} />
            <span className="class-name">{item.label}</span>
            <strong>{hasData ? values[index] : '—'}</strong>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="class-bars">
      {CLASS_META.map((item, index) => (
        <li key={item.key}>
          <div className="class-row-head">
            <span className="class-name">
              <span className="swatch" style={{ background: item.color }} />
              {item.label}
            </span>
            <strong>{hasData ? values[index] : '—'}</strong>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: hasData ? `${(values[index] / max) * 100}%` : '0%',
                background: item.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

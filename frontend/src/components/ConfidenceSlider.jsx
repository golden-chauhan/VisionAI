import { useId } from 'react'

export default function ConfidenceSlider({ value, onChange, disabled = false, note }) {
  const id = useId()
  const percent = Math.round(value * 100)
  return (
    <div className="confidence">
      <div className="confidence-head">
        <label htmlFor={id}>Confidence threshold</label>
        <strong>{percent}%</strong>
      </div>
      <input
        id={id}
        type="range"
        min="5"
        max="95"
        step="1"
        value={percent}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        style={{ '--fill': `${((percent - 5) / 90) * 100}%` }}
      />
      <div className="confidence-scale">
        <span>More detections</span>
        <span>Higher certainty</span>
      </div>
      {note && <p className="confidence-note">{note}</p>}
    </div>
  )
}

import { useId, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { fileExtension } from '../utils/format'

// Drag-and-drop + click-to-browse. Validates the extension before handing the file up.
export default function UploadZone({
  extensions,
  accept,
  title,
  formatsLabel,
  onFile,
  onReject,
  disabled = false,
  icon: Icon = Upload,
  variant = 'default',
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handle(file) {
    if (!file) return
    if (!extensions.includes(fileExtension(file.name))) {
      onReject?.(`“${file.name}” is not supported. Use ${formatsLabel}.`)
      return
    }
    onFile(file)
  }

  return (
    <label
      htmlFor={inputId}
      className={`upload-zone variant-${variant} ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) handle(event.dataTransfer.files?.[0])
      }}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          handle(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <span className="upload-icon" aria-hidden="true">
        <Icon size={24} />
      </span>
      <strong>{title}</strong>
      <span className="upload-sub">Drag and drop here, or click to browse</span>
      <span className="upload-formats">{formatsLabel}</span>
    </label>
  )
}

import { useState } from 'react'
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="nx-btn nx-btn--ghost nx-btn--icon"
      aria-label={done ? `${label} copied` : `Copy ${label}`}
      onClick={() => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }, () => {})}
    >
      {done ? '✓' : '⧉'}
    </button>
  )
}

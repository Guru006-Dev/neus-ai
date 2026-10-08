// Roving tabindex; arrow keys move focus and select
import { useRef, type KeyboardEvent } from 'react'

export interface TabItem { id: string; label: string }

export function Tabs({ label, items, value, onChange }: { label: string; items: TabItem[]; value: string; onChange: (id: string) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = (i + d + items.length) % items.length
    refs.current[next]?.focus()
    onChange(items[next].id)
  }
  // When no tab is selected, the first one stays in the tab order so the list remains reachable
  const focusable = items.some((t) => t.id === value) ? value : items[0]?.id
  return (
    <div className="nx-tabs" role="tablist" aria-label={label}>
      {items.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[i] = el }}
          role="tab"
          id={`tab-${t.id}`}
          aria-controls={`panel-${t.id}`}
          aria-selected={t.id === value}
          tabIndex={t.id === focusable ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

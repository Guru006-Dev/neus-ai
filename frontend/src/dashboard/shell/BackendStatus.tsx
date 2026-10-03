export type BackendState = 'connected' | 'connecting' | 'unreachable'

const VIEW: Record<BackendState, { glyph: string; label: string }> = {
  connected: { glyph: '●', label: 'Connected' },
  connecting: { glyph: '○', label: 'Connecting…' },
  unreachable: { glyph: '✕', label: 'Backend unreachable' },
}

export function BackendStatus({ status, compact = false }: { status: BackendState; compact?: boolean }) {
  const v = VIEW[status]
  return (
    <p className="nx-backend" data-status={status} role="status">
      <span className="nx-glyph" aria-hidden="true">{v.glyph}</span>
      <span className={compact ? 'sr-only' : undefined}>{v.label}</span>
    </p>
  )
}

export function parseBackendTime(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  const m = /^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d:\d\d(?:\.\d+)?)(Z|[+-]\d\d:?\d\d)?$/.exec(s.trim())
  if (!m) return null
  const d = new Date(`${m[1]}T${m[2]}${m[3] ?? 'Z'}`)
  return Number.isNaN(d.getTime()) ? null : d
}
export function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return '—'
  const s = Math.round(ms / 1000)
  return s < 60 ? `0:${String(s).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

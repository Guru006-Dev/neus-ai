import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../data/client'
import type { LocalRunEntry } from '../data/localRuns'
import { getRun } from '../data/workflows'
import type { RunStatus } from '../ui/status'
import { STATUS_UI } from '../ui/status'
import { StatusGlyph } from '../ui/StatusGlyph'

type Lookup = { kind: 'loading' } | { kind: 'found'; status: RunStatus } | { kind: 'missing' } | { kind: 'unknown' }

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

function relativeTime(iso: string, now = Date.now()): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const diff = t - now
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit)
  }
  return rtf.format(0, 'minute')
}

export function RecentRunRow({ entry }: { entry: LocalRunEntry }) {
  const [lookup, setLookup] = useState<Lookup>({ kind: 'loading' })
  useEffect(() => {
    const c = new AbortController()
    getRun(entry.id, c.signal).then(
      (run) => setLookup({ kind: 'found', status: run.status }),
      (e) => {
        if (c.signal.aborted) return
        setLookup(e instanceof ApiError && e.kind === 'not-found' ? { kind: 'missing' } : { kind: 'unknown' })
      },
    )
    return () => c.abort()
  }, [entry.id])

  const when = relativeTime(entry.submittedAt)
  return (
    <li className="nx-recent">
      <Link to={`/dashboard/runs/${entry.id}`} className="nx-recent__link">
        <span className="nx-recent__status">
          {lookup.kind === 'found' && <><StatusGlyph state={lookup.status} /> {STATUS_UI[lookup.status].label}</>}
          {lookup.kind === 'loading' && <span className="nx-muted">Checking…</span>}
          {lookup.kind === 'missing' && <span className="nx-muted">Not on backend</span>}
          {lookup.kind === 'unknown' && <span className="nx-muted">Status unavailable</span>}
        </span>
        <span className="nx-recent__goal">{entry.goal}</span>
        <span className="nx-recent__meta">
          <code>{entry.id.slice(0, 8)}</code> · Started from this browser{when && ` · ${when}`}
        </span>
      </Link>
    </li>
  )
}

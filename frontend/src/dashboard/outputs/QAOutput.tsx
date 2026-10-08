import type { AgentOutput } from '../data/types'
import { DataRows } from '../ui/DataRows'
import { RawOutput } from './RawOutput'

export function QAOutput({ output }: { output: Extract<AgentOutput, { agent: 'qa' }>; runId: string }) {
  const r = output.reported
  const parts: string[] = []
  if (r.passed !== undefined && r.total !== undefined) parts.push(`${r.passed}/${r.total} passed`)
  else if (r.passed !== undefined) parts.push(`${r.passed} passed`)
  else if (r.total !== undefined) parts.push(`${r.total} total`)
  if (r.failed !== undefined) parts.push(`${r.failed} failed`)
  if (r.passRate) parts.push(r.passRate)
  const tests = Array.isArray(output.tests) ? output.tests : []
  return (
    <div className="nx-out">
      {parts.length > 0 && <p className="nx-muted">Reported by agent: {parts.join(' · ')}</p>}
      {tests.length > 0 && (
        <DataRows
          caption="QA checks"
          rows={tests}
          rowKey={(t) => t.name}
          columns={[
            { key: 'name', header: 'Check', primary: true, cell: (t) => t.name },
            { key: 'result', header: 'Result', cell: (t) => t.result },
            { key: 'score', header: 'Score', cell: (t) => t.score ?? '' },
            { key: 'detail', header: 'Detail', cell: (t) => t.detail ?? '' },
          ]}
        />
      )}
      <RawOutput raw={output.raw} />
    </div>
  )
}

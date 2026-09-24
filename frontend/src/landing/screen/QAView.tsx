import { QA, RUN_ID } from '../nexus-story'
import { ScreenBar } from './ScreenBar'
import { GLYPH, clamp01, visibleCount, type RowState, type ViewProps } from './util'

function rowMeta(state: RowState, flaky: boolean): string {
  if (state === 'fail') return 'failed · retrying'
  if (state === 'done') return flaky ? 'passed on retry' : 'passed'
  return state === 'active' ? 'running' : ''
}

export function QAView({ progress }: ViewProps) {
  const passed = visibleCount(progress, QA.checks.length)
  const total = Math.round(QA.total * clamp01(progress / 0.9))
  return (
    <>
      <ScreenBar title="QA" meta={`${RUN_ID} · ${total}/${QA.total} passed`} />
      <ul className="rows">
        {QA.checks.map((check, i) => {
          const flaky = i === QA.flakyIndex
          const state: RowState = i < passed ? 'done' : i === passed ? (flaky ? 'fail' : 'active') : 'idle'
          return (
            <li key={check} data-state={state}>
              <span className="glyph">{GLYPH[state]}</span>
              <span className="rows__main">{check}</span>
              <span className="rows__meta">{rowMeta(state, flaky)}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

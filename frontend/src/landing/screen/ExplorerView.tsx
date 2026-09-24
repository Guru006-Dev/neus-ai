import { EXPLORER_SOURCES, RUN_ID } from '../nexus-story'
import { ScreenBar } from './ScreenBar'
import { GLYPH, pct, visibleCount, type RowState, type ViewProps } from './util'

export function ExplorerView({ progress }: ViewProps) {
  const resolved = visibleCount(progress, EXPLORER_SOURCES.length)
  return (
    <>
      <ScreenBar title="Explorer" meta={`${RUN_ID} · discovering`} />
      <div className="scan" style={{ top: pct(0.15 + 0.75 * progress) }} aria-hidden="true" />
      <ul className="rows">
        {EXPLORER_SOURCES.map((source, i) => {
          const state: RowState = i < resolved ? 'done' : i === resolved ? 'active' : 'idle'
          const meta = state === 'done' ? source.meta : state === 'active' ? 'fetching' : ''
          return (
            <li key={source.url} data-state={state}>
              <span className="glyph">{GLYPH[state]}</span>
              <span className="rows__main">{source.url}</span>
              <span className="rows__meta">{meta}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

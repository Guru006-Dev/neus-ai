import { DEMO, RUN_ID } from '../nexus-story'
import { ScreenBar } from './ScreenBar'
import { clamp01, pct, visibleCount, type ViewProps } from './util'

/** The Demo agent's output: a compact comparison of the three apps, built row by row. */
export function DemoView({ progress }: ViewProps) {
  const rows = visibleCount(clamp01(progress / 0.8), DEMO.metrics.length)
  const ready = progress >= 1
  return (
    <>
      <ScreenBar title="Demo" meta={`${RUN_ID} · ${ready ? 'ready' : 'rendering'}`} />
      <div className="compare">
        <div className="compare__row compare__head">
          <span />
          {DEMO.apps.map((app) => (
            <span key={app}>{app}</span>
          ))}
        </div>
        {DEMO.metrics.map((metric, r) => {
          const shown = r < rows
          const best = Math.min(...metric.values)
          const max = Math.max(...metric.values)
          return (
            <div key={metric.label} className="compare__row" data-shown={shown}>
              <span className="compare__label">{metric.label}</span>
              {metric.values.map((value, a) => (
                <span key={DEMO.apps[a]} className="compare__cell" data-winner={shown && value === best}>
                  <span className="compare__bar">
                    <span className="compare__fill" style={{ width: shown ? pct(value / max) : '0%' }} />
                  </span>
                  <span className="compare__value">{shown ? value : ''}</span>
                </span>
              ))}
            </div>
          )
        })}
      </div>
      <div className="preview__foot">
        <div className="artifact__row">
          <span>{DEMO.title}</span>
          <span className="muted">{ready ? DEMO.done : DEMO.pending}</span>
        </div>
        <div className="bar">
          <div className="bar__fill" style={{ width: pct(progress) }} />
        </div>
      </div>
    </>
  )
}

import { RELEASE, RUN_ID } from '../nexus-story'
import { ScreenBar } from './ScreenBar'
import { GLYPH, clamp01, pct, visibleCount, type ViewProps } from './util'

export function ReleaseView({ progress }: ViewProps) {
  const listed = visibleCount(clamp01(progress / 0.5), RELEASE.files.length)
  const fold = clamp01((progress - 0.5) / 0.3)
  const pack = clamp01((progress - 0.5) / 0.45)
  const ready = progress >= 1
  return (
    <>
      <ScreenBar title="Release" meta={`${RUN_ID} · ${ready ? RELEASE.version : 'packaging'}`} />
      {fold < 1 && (
        <ul className="rows" style={{ opacity: (1 - fold).toFixed(3) }}>
          {RELEASE.files.slice(0, listed).map((file) => (
            <li key={file} data-state="done">
              <span className="glyph">{GLYPH.done}</span>
              <span className="rows__main">{file}</span>
            </li>
          ))}
        </ul>
      )}
      {progress >= 0.5 && (
        <div className="artifact" data-ready={ready}>
          <div className="artifact__row">
            <span>{RELEASE.artifact}</span>
            <span className="muted">{ready ? `${RELEASE.version} · ${RELEASE.size}` : `${Math.round(pack * 100)}%`}</span>
          </div>
          <div className="bar">
            <div className="bar__fill" style={{ width: pct(pack) }} />
          </div>
        </div>
      )}
    </>
  )
}

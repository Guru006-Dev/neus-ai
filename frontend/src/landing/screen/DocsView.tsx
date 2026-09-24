import { DOC, RUN_ID } from '../nexus-story'
import { ScreenBar } from './ScreenBar'
import { visibleCount, type ViewProps } from './util'

export function DocsView({ progress }: ViewProps) {
  const written = visibleCount(progress, DOC.sections.length)
  return (
    <>
      <ScreenBar title="Documentation" meta={`${RUN_ID} · writing`} />
      <article className="doc">
        <h3 className="doc__title">{DOC.title}</h3>
        {DOC.sections.slice(0, written).map((section, i) => (
          <div key={section} className="doc__section">
            <h4 className="doc__h">{`${i + 1}. ${section}`}</h4>
            <span className="doc__line" />
          </div>
        ))}
        {written < DOC.sections.length && <span className="caret" aria-hidden="true" />}
      </article>
    </>
  )
}

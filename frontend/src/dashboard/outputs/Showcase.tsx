import { Link } from 'react-router'
import { SHOWCASE_SANDBOX, showcasePath, showcaseSrc, type ShowcaseKind } from './showcaseUrls'

export function Showcase({ runId, kind, title }: { runId: string; kind: ShowcaseKind; title: string }) {
  return (
    <div className="nx-showcase">
      <iframe title={title} sandbox={SHOWCASE_SANDBOX} loading="lazy" src={showcaseSrc(runId, kind)} />
      <Link to={showcasePath(runId, kind)}>Open full screen</Link>
    </div>
  )
}

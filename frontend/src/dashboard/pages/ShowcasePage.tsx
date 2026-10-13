import { Link, useParams } from 'react-router'
import { SHOWCASE_SANDBOX, showcaseSrc, type ShowcaseKind } from '../outputs/showcaseUrls'

const KINDS: Record<string, { kind: ShowcaseKind; agent: string; title: string }> = {
  explorer: { kind: 'explorer_html', agent: 'explorer', title: 'Explorer showcase' },
  demo: { kind: 'demo_html', agent: 'demo', title: 'Demo showcase' },
}

/** Full-viewport showcase, framed with exactly the inline preview's sandbox. */
export default function ShowcasePage() {
  const { runId = '', kind = '' } = useParams()
  const k = kind === 'explorer' || kind === 'demo' ? KINDS[kind] : null
  const back = `/dashboard/runs/${encodeURIComponent(runId)}${k ? `#${k.agent}` : ''}`
  return (
    <div className="nx-app nx-fullshowcase">
      <nav className="nx-fullshowcase__bar">
        <Link to={back}>← Back to run</Link>
      </nav>
      {k ? (
        <main className="nx-fullshowcase__main">
          <h1 className="sr-only">{k.title}</h1>
          <iframe title={k.title} sandbox={SHOWCASE_SANDBOX} src={showcaseSrc(runId, k.kind)} />
        </main>
      ) : (
        <main className="nx-fullshowcase__missing"><p>No showcase called “{kind}”.</p></main>
      )}
    </div>
  )
}

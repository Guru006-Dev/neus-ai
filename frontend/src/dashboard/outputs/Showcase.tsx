import { API_BASE } from '../data/client'

export function Showcase({ runId, kind, title }: { runId: string; kind: 'explorer_html' | 'demo_html'; title: string }) {
  const src = `${API_BASE}/workflows/${encodeURIComponent(runId)}/${kind}`
  return (
    <div className="nx-showcase">
      <iframe title={title} sandbox="allow-scripts" loading="lazy" src={src} />
      <a href={src} target="_blank" rel="noopener">Open full screen</a>
    </div>
  )
}

import { API_BASE } from '../data/client'

export type ShowcaseKind = 'explorer_html' | 'demo_html'

/** Agent-generated HTML: only ever loaded inside an iframe with this sandbox (scripts, no same-origin). */
export const SHOWCASE_SANDBOX = 'allow-scripts'
export const showcaseSrc = (runId: string, kind: ShowcaseKind) => `${API_BASE}/workflows/${encodeURIComponent(runId)}/${kind}`
/** The dashboard's full-screen route; never the backend HTML itself, which would run top-level on the API origin. */
export const showcasePath = (runId: string, kind: ShowcaseKind) => `/dashboard/runs/${encodeURIComponent(runId)}/showcase/${kind === 'demo_html' ? 'demo' : 'explorer'}`

export class ApiError extends Error {
  kind: 'unreachable' | 'not-found' | 'server' | 'bad-response' | 'aborted'
  status?: number
  constructor(kind: ApiError['kind'], message: string, status?: number) {
    super(message)
    this.kind = kind
    this.status = status
  }
}
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
export async function apiFetch<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 10_000)
  init.signal?.addEventListener('abort', () => ctrl.abort(), { once: true })
  let res: Response
  try { res = await fetch(API_BASE + path, { ...init, signal: ctrl.signal, headers: { accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers } }) }
  catch { throw new ApiError(init.signal?.aborted ? 'aborted' : 'unreachable', `Can't reach NEXUS backend${API_BASE ? ` at ${API_BASE}` : ''}.`) }
  finally { clearTimeout(timer) }
  if (res.status === 404) throw new ApiError('not-found', 'Not found', 404)
  if (!res.ok) throw new ApiError('server', `Backend error ${res.status}`, res.status)
  try { return (await res.json()) as T } catch { throw new ApiError('bad-response', 'Unexpected response from backend', res.status) }
}

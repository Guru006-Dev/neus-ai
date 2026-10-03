import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './client'
import { getSystemStatus } from './system'
import { createRun, getRun } from './workflows'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const kind = (p: Promise<unknown>) => p.then(() => null, (e: ApiError) => e.kind)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
  vi.resetModules()
})

const abortingFetch = () =>
  vi.fn((_u: string, init: RequestInit) => new Promise((_r, rej) => init.signal!.addEventListener('abort', () => rej(new DOMException('a', 'AbortError')))))

describe('apiFetch', () => {
  it('maps a rejected fetch to unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('x')))
    expect(await kind(apiFetch('/a'))).toBe('unreachable')
  })
  it('maps 404 to not-found and 500 to server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'nope' }, 404)))
    expect(await kind(apiFetch('/a'))).toBe('not-found')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 500)))
    expect(await kind(apiFetch('/a'))).toBe('server')
  })
  it('maps invalid JSON to bad-response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })))
    expect(await kind(apiFetch('/a'))).toBe('bad-response')
  })
  it('maps a caller abort to aborted', async () => {
    vi.stubGlobal('fetch', abortingFetch())
    const c = new AbortController()
    const p = kind(apiFetch('/a', { signal: c.signal }))
    c.abort()
    expect(await p).toBe('aborted')
  })
  it('aborts after the default 10 s timeout', async () => {
    vi.useFakeTimers()
    const f = abortingFetch()
    vi.stubGlobal('fetch', f)
    const p = kind(apiFetch('/a'))
    await vi.advanceTimersByTimeAsync(9_999)
    expect((f.mock.calls[0][1] as RequestInit).signal!.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect((f.mock.calls[0][1] as RequestInit).signal!.aborted).toBe(true)
    expect(await p).toBe('unreachable')
  })
  it('prefixes VITE_API_BASE when set', async () => {
    vi.stubEnv('VITE_API_BASE', 'http://x:9/')
    vi.resetModules()
    const f = vi.fn().mockResolvedValue(json({}))
    vi.stubGlobal('fetch', f)
    const m = await import('./client')
    await m.apiFetch('/a')
    expect(f.mock.calls[0][0]).toBe('http://x:9/a')
  })
})

describe('workflows', () => {
  it('createRun posts the goal and rejects a blank one without fetching', async () => {
    const f = vi.fn().mockResolvedValue(json({ workflow_id: 'wf-1', status: 'SUBMITTED' }))
    vi.stubGlobal('fetch', f)
    await expect(createRun('  ')).rejects.toBeInstanceOf(ApiError)
    expect(f).not.toHaveBeenCalled()
    expect(await createRun('g')).toEqual({ id: 'wf-1' })
    expect(f.mock.calls[0][0]).toBe('/workflows')
    expect(f.mock.calls[0][1].method).toBe('POST')
    expect(f.mock.calls[0][1].body).toBe('{"goal":"g","user_id":"dashboard"}')
  })
  it('no function requests /status/{id}', async () => {
    const f = vi.fn().mockImplementation(async (u: string) =>
      json(u === '/workflows' ? { workflow_id: 'wf-1', status: 'SUBMITTED' } : u === '/system/status' ? {} : { workflow_id: 'wf-1', status: 'RUNNING', goal: 'g', context: {} }),
    )
    vi.stubGlobal('fetch', f)
    await createRun('g')
    await getRun('wf-1')
    await getSystemStatus()
    expect(f.mock.calls.length).toBe(3)
    for (const c of f.mock.calls) expect(String(c[0])).not.toContain('/status/')
  })
})

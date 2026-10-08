// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../data/client'
import { localRuns } from '../data/localRuns'
import { createRun } from '../data/workflows'
import { useCreateRun } from './useCreateRun'

vi.mock('../data/workflows', () => ({ createRun: vi.fn() }))
const navigate = vi.fn()
vi.mock('react-router', () => ({ useNavigate: () => navigate }))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let latest: ReturnType<typeof useCreateRun>
let root: Root
function Probe() {
  latest = useCreateRun()
  return null
}

beforeEach(async () => {
  vi.mocked(createRun).mockReset()
  navigate.mockReset()
  localRuns.remove('r1')
  root = createRoot(document.createElement('div'))
  await act(async () => { root.render(<Probe />) })
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  localRuns.remove('r1')
})

describe('useCreateRun', () => {
  it('stores the run locally and navigates on success', async () => {
    vi.mocked(createRun).mockResolvedValue({ id: 'r1' })
    await act(async () => { await latest.submit('  do it ') })
    expect(localRuns.list()[0]).toMatchObject({ id: 'r1', goal: 'do it' })
    expect(navigate).toHaveBeenCalledWith('/dashboard/runs/r1')
    expect(latest.error).toBeNull()
  })
  it('is pending during the request', async () => {
    let done!: (v: { id: string }) => void
    vi.mocked(createRun).mockImplementation(() => new Promise((r) => { done = r }))
    let p!: Promise<void>
    await act(async () => { p = latest.submit('x') })
    expect(latest.pending).toBe(true)
    await act(async () => { done({ id: 'r1' }); await p })
    expect(latest.pending).toBe(false)
  })
  it('explains an unreachable backend and does not navigate or store', async () => {
    vi.mocked(createRun).mockRejectedValue(new ApiError('unreachable', 'x'))
    await act(async () => { await latest.submit('x') })
    expect(latest.error).toContain("couldn't reach the backend")
    expect(latest.pending).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
    expect(localRuns.list().find((r) => r.id === 'r1')).toBeUndefined()
  })
  it('explains a backend error differently', async () => {
    vi.mocked(createRun).mockRejectedValue(new ApiError('server', 'x', 500))
    await act(async () => { await latest.submit('x') })
    expect(latest.error).toMatch(/backend/i)
    expect(latest.error).not.toContain("couldn't reach")
  })
  it('ignores a second submit while pending', async () => {
    vi.mocked(createRun).mockImplementation(() => new Promise(() => {}))
    await act(async () => { void latest.submit('x') })
    await act(async () => { void latest.submit('x') })
    expect(createRun).toHaveBeenCalledTimes(1)
  })
})

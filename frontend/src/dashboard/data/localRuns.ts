export const KEY = 'nexus.runs.v1'
const CAP = 50
export interface LocalRunEntry { id: string; goal: string; submittedAt: string }

const valid = (r: unknown): r is LocalRunEntry => !!r && typeof (r as LocalRunEntry).id === 'string' && typeof (r as LocalRunEntry).goal === 'string' && typeof (r as LocalRunEntry).submittedAt === 'string'

const warnDev = (msg: string) => { if (import.meta.env?.DEV) console.warn(`[nexus] ${msg}`) }

export function createLocalRuns(storage: Storage | null) {
  let memory: LocalRunEntry[] | null = null
  const listeners = new Set<() => void>()
  let cache: LocalRunEntry[] | null = null
  const read = (): LocalRunEntry[] => {
    if (memory) return memory
    try {
      const raw = storage?.getItem(KEY)
      if (raw == null) return []
      const parsed = JSON.parse(raw)
      if (parsed?.version === 1 && Array.isArray(parsed.runs)) return parsed.runs.filter(valid)
      warnDev('run index has an unknown version or shape; resetting')
      return []
    } catch {
      warnDev('run index could not be read; resetting')
      return []
    }
  }
  // Stable snapshot: the same array until a write or invalidate changes it.
  const list = (): LocalRunEntry[] => (cache ??= read())
  const write = (runs: LocalRunEntry[]) => {
    cache = runs
    try { storage?.setItem(KEY, JSON.stringify({ version: 1, runs })) } catch { memory = runs }
    if (memory) memory = runs
    listeners.forEach((l) => l())
  }
  return {
    list,
    add: (e: LocalRunEntry) => write([{ id: e.id, goal: e.goal, submittedAt: e.submittedAt }, ...list().filter((r) => r.id !== e.id)].slice(0, CAP)),
    remove: (id: string) => write(list().filter((r) => r.id !== id)),
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    invalidate: () => { cache = null; listeners.forEach((l) => l()) },
  }
}

const safeStorage = (): Storage | null => { try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null } }
export const localRuns = createLocalRuns(safeStorage())
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) localRuns.invalidate() })

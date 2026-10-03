import { useSyncExternalStore } from 'react'

export type NavMode = 'sidebar' | 'rail' | 'drawer'
const QUERIES = ['(min-width: 1200px)', '(min-width: 768px)'] as const

function subscribe(cb: () => void) {
  const mqls = QUERIES.map((q) => window.matchMedia(q))
  mqls.forEach((m) => m.addEventListener('change', cb))
  return () => mqls.forEach((m) => m.removeEventListener('change', cb))
}
function snapshot(): NavMode {
  if (window.matchMedia(QUERIES[0]).matches) return 'sidebar'
  if (window.matchMedia(QUERIES[1]).matches) return 'rail'
  return 'drawer'
}

export function useNavMode(): NavMode {
  return useSyncExternalStore(subscribe, snapshot, () => 'sidebar')
}

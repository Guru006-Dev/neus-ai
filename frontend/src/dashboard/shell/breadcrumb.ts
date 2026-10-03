import { createContext, useContext, useEffect, type ReactNode } from 'react'

export interface Crumb { label: string; to?: string }
export interface BreadcrumbState { items: Crumb[]; actions?: ReactNode }

export const BreadcrumbContext = createContext<{ state: BreadcrumbState; set: (s: BreadcrumbState) => void }>({
  state: { items: [] },
  set: () => {},
})

/** Pages call this to set the top bar. Memoize `actions` so the effect does not re-run every render. */
export function useBreadcrumb(items: Crumb[], actions?: ReactNode) {
  const { set } = useContext(BreadcrumbContext)
  const key = JSON.stringify(items)
  useEffect(() => {
    set({ items: JSON.parse(key) as Crumb[], actions })
    return () => set({ items: [] })
  }, [key, actions, set])
}

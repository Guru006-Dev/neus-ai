import { useCallback, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { useSystemStatus } from '../run/useSystemStatus'
import { BreadcrumbContext, type BreadcrumbState } from './breadcrumb'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useNavMode } from './useNavMode'

export default function DashboardLayout() {
  const mode = useNavMode()
  const { status } = useSystemStatus()
  const [crumbs, setCrumbs] = useState<BreadcrumbState>({ items: [] })
  const [drawerOpen, setDrawerOpen] = useState(false)
  // The drawer unmounts outside drawer mode without a close event; forget it was open
  const [drawerMode, setDrawerMode] = useState(mode)
  if (drawerMode !== mode) {
    setDrawerMode(mode)
    setDrawerOpen(false)
  }
  const triggerRef = useRef<HTMLButtonElement>(null)
  const ctx = useMemo(() => ({ state: crumbs, set: setCrumbs }), [crumbs])
  const closeDrawer = useCallback(() => {
    setDrawerOpen((open) => {
      if (open) triggerRef.current?.focus()
      return false
    })
  }, [])

  return (
    <BreadcrumbContext.Provider value={ctx}>
      <div className="nx-app nx-shell" data-nav={mode}>
        <a href="#main" className="nx-skip">Skip to content</a>
        <Sidebar mode={mode} status={status} drawerOpen={drawerOpen} onDrawerClose={closeDrawer} />
        <div className="nx-shell__main">
          <TopBar ref={triggerRef} drawer={mode === 'drawer'} onOpenNav={() => setDrawerOpen(true)} />
          <main id="main" tabIndex={-1} className="nx-content">
            <Outlet />
          </main>
        </div>
      </div>
    </BreadcrumbContext.Provider>
  )
}

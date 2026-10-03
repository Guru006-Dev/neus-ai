import { useCallback, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { BreadcrumbContext, type BreadcrumbState } from './breadcrumb'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useNavMode } from './useNavMode'

export default function DashboardLayout() {
  const mode = useNavMode()
  const [crumbs, setCrumbs] = useState<BreadcrumbState>({ items: [] })
  const [drawerOpen, setDrawerOpen] = useState(false)
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
        {/* Task 8 wires the real system status here */}
        <Sidebar mode={mode} status="connecting" drawerOpen={drawerOpen} onDrawerClose={closeDrawer} />
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

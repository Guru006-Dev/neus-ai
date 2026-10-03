import { forwardRef, useContext } from 'react'
import { Link } from 'react-router'
import { BreadcrumbContext } from './breadcrumb'

export const TopBar = forwardRef<HTMLButtonElement, { drawer: boolean; onOpenNav: () => void }>(function TopBar({ drawer, onOpenNav }, ref) {
  const { state } = useContext(BreadcrumbContext)
  const items = state.items
  return (
    <header className="nx-topbar">
      {drawer && (
        <button ref={ref} type="button" className="nx-btn nx-btn--icon" aria-label="Open navigation" onClick={onOpenNav}>
          <span aria-hidden="true">☰</span>
        </button>
      )}
      <nav aria-label="Breadcrumb" className="nx-topbar__crumbs">
        <ol>
          <li><Link to="/dashboard">NEXUS</Link></li>
          {items.map((c, i) => {
            const last = i === items.length - 1
            return (
              <li key={`${i}-${c.label}`} aria-current={last ? 'page' : undefined}>
                {c.to && !last ? <Link to={c.to}>{c.label}</Link> : c.label}
              </li>
            )
          })}
        </ol>
      </nav>
      <div className="nx-topbar__actions">{state.actions}</div>
    </header>
  )
})

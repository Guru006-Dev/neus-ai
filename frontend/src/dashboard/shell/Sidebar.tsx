import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { NexusLogo } from '../../landing/NexusLogo'
import { BackendStatus, type BackendState } from './BackendStatus'
import { NAV, SETTINGS_ITEM, type NavItem } from './nav'
import type { NavMode } from './useNavMode'

interface Props {
  mode: NavMode
  status: BackendState
  drawerOpen?: boolean
  onDrawerClose?: () => void
}

function Item({ item, compact }: { item: NavItem; compact: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      className="nx-side__item"
      aria-label={compact ? item.label : undefined}
      title={compact ? item.label : undefined}
    >
      {compact ? <span aria-hidden="true">{item.label[0]}</span> : item.label}
      {item.needsBackend && !compact && (
        <>
          <span className="nx-side__dot" title="Cross-run view needs backend support" aria-hidden="true">·</span>
          <span className="sr-only"> (needs backend support)</span>
        </>
      )}
    </NavLink>
  )
}

function NavBody({ compact, status }: { compact: boolean; status: BackendState }) {
  return (
    <nav aria-label="Dashboard" className="nx-side__nav">
      <Link to="/" className="nx-side__logo" data-compact={compact || undefined} aria-label="NEXUS home">
        <NexusLogo />
      </Link>
      <div className="nx-side__groups">
        {NAV.map((g, i) => (
          <div key={g.label ?? i} className="nx-side__group">
            {g.label && !compact && <h2 className="nx-eyebrow">{g.label}</h2>}
            {g.items.map((it) => <Item key={it.to} item={it} compact={compact} />)}
          </div>
        ))}
      </div>
      <div className="nx-side__foot">
        <Item item={SETTINGS_ITEM} compact={compact} />
        <BackendStatus status={status} compact={compact} />
      </div>
    </nav>
  )
}

export function Sidebar({ mode, status, drawerOpen = false, onDrawerClose }: Props) {
  const { pathname } = useLocation()
  const [railOpen, setRailOpen] = useState(false)
  // Leaving rail mode collapses the overlay, so it never comes back already expanded
  const [railMode, setRailMode] = useState(mode)
  if (railMode !== mode) {
    setRailMode(mode)
    setRailOpen(false)
  }
  const dialogRef = useRef<HTMLDialogElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Navigating closes the overlay and the drawer
  useEffect(() => {
    setRailOpen(false)
    onDrawerClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (drawerOpen && !d.open) d.showModal()
    if (!drawerOpen && d.open) d.close()
  }, [drawerOpen, mode])

  useEffect(() => {
    if (!railOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRailOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [railOpen])

  if (mode === 'drawer') {
    return (
      <dialog
        ref={dialogRef}
        className="nx-drawer"
        aria-label="Navigation"
        onClose={() => onDrawerClose?.()}
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close() }}
      >
        <NavBody compact={false} status={status} />
      </dialog>
    )
  }

  if (mode === 'rail') {
    return (
      <aside className="nx-side" data-open={railOpen || undefined}>
        <button
          ref={toggleRef}
          type="button"
          className="nx-btn nx-btn--icon nx-side__toggle"
          aria-label={railOpen ? 'Collapse navigation' : 'Expand navigation'}
          aria-expanded={railOpen}
          onClick={() => setRailOpen((v) => !v)}
        >
          <span aria-hidden="true">{railOpen ? '‹' : '›'}</span>
        </button>
        <NavBody compact={!railOpen} status={status} />
      </aside>
    )
  }

  return <aside className="nx-side"><NavBody compact={false} status={status} /></aside>
}

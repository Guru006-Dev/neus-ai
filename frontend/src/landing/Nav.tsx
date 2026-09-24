import { useEffect, useState } from 'react'
import { NexusLogo } from './NexusLogo'
import { CTA, NAV_LINKS } from './nexus-story'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="nav" data-scrolled={scrolled}>
      <a className="nav__logo" href="/" aria-label="NEXUS home">
        <NexusLogo />
      </a>
      <nav className="nav__menu" aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <a key={link.href} className="nav__link" href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <a className="button button--dark nav__cta" href={CTA.href}>
        {CTA.label}
      </a>
    </header>
  )
}

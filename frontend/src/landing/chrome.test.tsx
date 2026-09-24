import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Footer } from './Footer'
import { Nav } from './Nav'
import { CTA, FOOTER, NAV_LINKS } from './nexus-story'

describe('page chrome', () => {
  it('nav has the logo link, primary links and the CTA', () => {
    const html = renderToStaticMarkup(<Nav />)
    expect(html).toContain('aria-label="NEXUS home"')
    for (const link of NAV_LINKS) expect(html).toContain(`href="${link.href}"`)
    expect(html).toContain(`href="${CTA.href}"`)
    expect(html).toContain(CTA.label)
    expect(html).toContain('data-scrolled="false"')
  })

  it('footer has the heading, columns and legal line', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain(FOOTER.heading)
    for (const col of FOOTER.columns) expect(html).toContain(col.title)
    expect(html).toContain('© 2026 NEXUS')
  })
})

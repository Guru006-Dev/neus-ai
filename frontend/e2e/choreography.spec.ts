import { expect, test, type Page } from '@playwright/test'
import { goToProgress, openLanding } from './helpers'

type Net = { tagFade: string[]; rings: number[]; ringOpacity: number[]; tagScale: string[] }
type Mark = { stroke: number; thickness: number; nodes: number }

const net = (s: Record<string, unknown>) => s.network as Net
const mark = (s: Record<string, unknown>) => s.mark as Mark
const scaleOf = (t: string) => Number(/scale\(([\d.]+)\)/.exec(t)?.[1] ?? NaN)

async function visibleTagBoxes(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.agent-tag-wrap')]
      .filter((el) => Number(el.style.opacity || '0') > 0.05)
      .map((el) => {
        const r = el.firstElementChild!.getBoundingClientRect()
        return { name: el.textContent ?? '', left: r.left, right: r.right, top: r.top, bottom: r.bottom }
      }),
  )
}

test('agents stay hidden until the orchestrator assigns them', async ({ page }) => {
  await openLanding(page)
  for (const p of [0, 0.06, 0.11]) {
    expect(net(await goToProgress(page, p)).tagFade.map(Number), `p=${p}`).toEqual(Array(6).fill(0))
  }
  const mid = net(await goToProgress(page, 0.17)).tagFade.map(Number)
  expect(mid[0]).toBeGreaterThan(0)
  expect(mid[5]).toBe(0)
  expect(net(await goToProgress(page, 0.2)).tagFade.map(Number)).toEqual(Array(6).fill(1))
})

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
]) {
  test(`tags never clip at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await openLanding(page)
    for (const p of [0.14, 0.16, 0.18, 0.2, 0.25, 0.45, 0.65, 0.85, 0.88]) {
      await goToProgress(page, p)
      for (const b of await visibleTagBoxes(page)) {
        expect(b.left, `${b.name} at p=${p}`).toBeGreaterThanOrEqual(0)
        expect(b.top, `${b.name} at p=${p}`).toBeGreaterThanOrEqual(0)
        expect(b.right, `${b.name} at p=${p}`).toBeLessThanOrEqual(viewport.width)
        expect(b.bottom, `${b.name} at p=${p}`).toBeLessThanOrEqual(viewport.height)
      }
    }
  })
}

test('screen views crossfade briefly instead of cutting', async ({ page }) => {
  await openLanding(page)
  await goToProgress(page, 0.306)
  await expect(page.locator('.one-run .screen')).toHaveCount(2)
  await expect(page.locator('.one-run .screen[data-role="out"]')).toHaveAttribute('data-screen', 'explorer')
  const mix = Number(await page.locator('.screen-frame').first().evaluate((el) => el.style.getPropertyValue('--mix')))
  expect(mix).toBeGreaterThan(0)
  expect(mix).toBeLessThan(1)
  await goToProgress(page, 0.33)
  await expect(page.locator('.one-run .screen')).toHaveCount(1)
})

test('the network is built during the agents, then revealed whole', async ({ page }) => {
  await openLanding(page)
  const during = net(await goToProgress(page, 0.55))
  expect(during.rings.slice(0, 3).every((n) => n > 0)).toBe(true)
  expect(during.rings.slice(3)).toEqual([0, 0, 0])
  const reveal = net(await goToProgress(page, 0.88))
  expect(reveal.rings.every((n) => n === 25)).toBe(true)
  expect(Math.min(...reveal.ringOpacity)).toBeGreaterThan(Math.max(...during.ringOpacity.slice(0, 2)))
  expect(scaleOf(reveal.tagScale[0])).toBeLessThan(scaleOf(during.tagScale[0]))
})

test('the N forms in sequence: lines morph, then the stroke thickens, then the nodes land', async ({ page }) => {
  await openLanding(page)
  expect(mark(await goToProgress(page, 0.93))).toMatchObject({ thickness: 0, nodes: 0 })
  const thickening = mark(await goToProgress(page, 0.952))
  expect(thickening.thickness).toBeGreaterThan(0)
  expect(thickening.nodes).toBe(0)
  expect(mark(await goToProgress(page, 0.975))).toMatchObject({ thickness: 1, nodes: 1, stroke: 1 })
})

test('reverse scroll retraces crossfades and the convergence exactly', async ({ page }) => {
  await openLanding(page)
  const points = [0.296, 0.304, 0.31, 0.905, 0.92, 0.95, 0.962]
  const forward = []
  for (const p of points) forward.push(await goToProgress(page, p))
  const backward = []
  for (const p of [...points].reverse()) backward.push(await goToProgress(page, p))
  expect(backward.reverse()).toEqual(forward)
})

test('caption and rail leave before the stillness, and the footer adds no second CTA', async ({ page }) => {
  await openLanding(page)
  await goToProgress(page, 0.972)
  await expect(page.locator('.hud')).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('.finale')).toHaveCSS('visibility', 'hidden')
  await goToProgress(page, 0.99)
  await expect(page.locator('.finale')).toHaveCSS('visibility', 'visible')
  await expect(page.locator('footer').getByRole('link', { name: 'Launch NEXUS' })).toHaveCount(0)

  const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  for (let y = await page.evaluate(() => scrollY); y <= end; y += 120) {
    await page.evaluate((top) => window.scrollTo(0, top), y)
    const visibleCtas = await page.evaluate(
      () =>
        [...document.querySelectorAll('a')].filter((a) => {
          if (a.textContent?.trim() !== 'Launch NEXUS') return false
          const r = a.getBoundingClientRect()
          const style = getComputedStyle(a)
          return r.bottom > 0 && r.top < innerHeight && style.visibility !== 'hidden' && Number(style.opacity) > 0
        }).length,
    )
    expect(visibleCtas, `scrollY=${y}`).toBeLessThanOrEqual(2)
  }
})

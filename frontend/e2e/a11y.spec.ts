import { expect, test, type Page } from '@playwright/test'
import { goToProgress, openLanding } from './helpers'

async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? ''
  })
}

test('keyboard order reaches nav and hero CTA; the faded intro CTA leaves the tab order', async ({ page }) => {
  await openLanding(page)
  const names: string[] = []
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab')
    names.push(await focusedName(page))
  }
  expect(names).toEqual(['NEXUS home', 'How it works', 'API', 'Launch NEXUS', 'Launch NEXUS'])

  await goToProgress(page, 0.5)
  await expect(page.locator('.intro a')).toBeHidden()
  await page.locator('.nav__cta').focus()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('.intro'))).toBe(false)
})

test('captions stay quiet, the canvas is hidden from assistive tech, the rail marks the current step', async ({ page }) => {
  await openLanding(page)
  await goToProgress(page, 0.35)
  await expect(page.locator('.caption')).not.toHaveAttribute('aria-live', /.+/)
  await expect(page.locator('.scene')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('.rail__item[aria-current="step"]')).toContainText('Knowledge')
})

for (const viewport of [
  { width: 768, height: 1024 },
  { width: 900, height: 768 },
]) {
  test(`${viewport.width}×${viewport.height} tells the story in 2D with no overflow`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('.fallback')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
}

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 2560, height: 1440 },
]) {
  test(`fits ${viewport.width}×${viewport.height}: no overflow, caption and rail apart`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await openLanding(page)
    await goToProgress(page, 0.35)
    const layout = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)!.getBoundingClientRect()
      const c = box('.caption')
      const r = box('.rail')
      const overlap = c.left < r.right && r.left < c.right && c.top < r.bottom && r.top < c.bottom
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, overlap }
    })
    expect(layout.overflow).toBeLessThanOrEqual(0)
    expect(layout.overlap).toBe(false)
  })
}

const luminance = (rgb: string): number => {
  const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((v) => {
    const c = Number(v) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (fg: string, bg: string): number => {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

test('small grey labels meet WCAG AA contrast on the page background', async ({ page }) => {
  await openLanding(page)
  await goToProgress(page, 0.35)
  const selectors = ['.caption__label', '.rail__item[data-status="idle"]', '.footer__col-title', '.footer__legal']
  for (const selector of selectors) {
    const color = await page.locator(selector).first().evaluate((el) => getComputedStyle(el).color)
    expect(contrast(color, 'rgb(8, 8, 8)'), selector).toBeGreaterThanOrEqual(4.5)
  }
})

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
]) {
  test(`agent tags never sit on the progress rail at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await openLanding(page)
    for (const p of [0.25, 0.45, 0.55, 0.75, 0.85]) {
      await goToProgress(page, p)
      const hits = await page.evaluate(() => {
        const r = document.querySelector('.rail')!.getBoundingClientRect()
        return [...document.querySelectorAll<HTMLElement>('.agent-tag')]
          .filter((el) => Number(getComputedStyle(el).opacity) > 0.05)
          .map((el) => ({ name: el.textContent ?? '', b: el.getBoundingClientRect() }))
          .filter(({ b }) => b.left < r.right && r.left < b.right && b.top < r.bottom && r.top < b.bottom)
          .map(({ name }) => name)
      })
      expect(hits, `p=${p}`).toEqual([])
    }
  })
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the nav menu hides without animating', async ({ page }) => {
    await page.goto('/')
    const duration = await page.locator('.nav__menu').evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(duration.split(',').every((d) => parseFloat(d) === 0)).toBe(true)
  })
})

test('hover states keep text at AA contrast', async ({ page }) => {
  await openLanding(page)
  for (const selector of ['.intro .button--light', '.footer__link']) {
    const el = page.locator(selector).first()
    await el.scrollIntoViewIfNeeded()
    await el.hover()
    await page.waitForTimeout(400)
    const { fg, bg } = await el.evaluate((node) => {
      let bgColor = 'rgba(0, 0, 0, 0)'
      for (let n: Element | null = node; n && bgColor.endsWith(', 0)'); n = n.parentElement) {
        bgColor = getComputedStyle(n).backgroundColor
      }
      return { fg: getComputedStyle(node).color, bg: bgColor.endsWith(', 0)') ? 'rgb(8, 8, 8)' : bgColor }
    })
    expect(contrast(fg, bg), selector).toBeGreaterThanOrEqual(4.5)
  }
})

import { expect, test, type Page } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { fixture, mockBackend } from './mockBackend'

const polls = readdirSync(new URL('../fixtures/', import.meta.url)).filter((f) => f.startsWith('full-poll-')).sort().map(fixture)
const RUN = `/dashboard/runs/${polls[0].workflow_id}`
const FINAL = polls[polls.length - 1]
const PAGES = ['/dashboard', '/dashboard/runs', RUN, '/dashboard/agents', '/dashboard/knowledge', '/dashboard/documentation', '/dashboard/qa', '/dashboard/demos', '/dashboard/releases', '/dashboard/settings']

// Contrast helper copied from the landing a11y spec (e2e/a11y.spec.ts), extended to read `color(srgb …)` values.
const channels = (c: string): number[] => {
  const nums = (c.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
  return c.startsWith('color(') ? nums.slice(0, 3).map((v) => v * 255) : nums.slice(0, 3)
}
const luminance = (rgb: string): number => {
  const [r, g, b] = channels(rgb).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (fg: string, bg: string): number => {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

const seedRuns = (page: Page) =>
  page.addInitScript((run) => {
    localStorage.setItem('nexus.runs.v1', JSON.stringify({ version: 1, runs: [{ id: run.workflow_id, goal: run.goal, submittedAt: '2026-10-03T10:00:00.000Z' }] }))
  }, { workflow_id: FINAL.workflow_id as string, goal: FINAL.goal as string })

test('keyboard path: skip link → nav → goal → Run', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard')
  await expect(page.locator('h1')).toHaveCount(1) // the dashboard chunk is lazy; Tab before it renders goes nowhere
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await page.getByLabel('Goal').focus()
  await page.keyboard.type('g')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /Run/ })).toBeFocused()
})

test('every page has one h1 and labelled landmarks', async ({ page }) => {
  await mockBackend(page, { runSequence: polls })
  for (const p of PAGES) {
    await page.goto(p)
    await expect(page.locator('h1'), p).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Dashboard' }), p).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }), p).toHaveCount(1)
    await expect(page.getByRole('main'), p).toHaveCount(1)
    // Every aria-labelledby / aria-controls reference resolves to an element
    const dangling = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-labelledby], [aria-describedby]')].flatMap((el) =>
        ['aria-labelledby', 'aria-describedby'].flatMap((a) => (el.getAttribute(a) ?? '').split(/\s+/).filter((id) => id && !document.getElementById(id)))))
    expect(dangling, p).toEqual([])
  }
})

test('every interactive control has an accessible name and a visible focus ring', async ({ page }) => {
  await mockBackend(page, { runSequence: [FINAL] })
  await seedRuns(page)
  for (const p of PAGES) {
    await page.goto(p)
    await expect(page.locator('h1')).toHaveCount(1)
    const controls = page.locator('.nx-app a[href], .nx-app button, .nx-app input, .nx-app textarea, .nx-app summary, .nx-app iframe, .nx-app [tabindex="0"]')
    const n = await controls.count()
    for (let i = 0; i < n; i++) {
      const c = controls.nth(i)
      if (!(await c.isVisible())) continue
      const tag = await c.evaluate((el) => el.tagName.toLowerCase())
      if (tag === 'iframe') {
        expect(await c.getAttribute('title'), `${p} iframe title`).toBeTruthy()
        continue
      }
      const name = await c.evaluate((el) => {
        const label = el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby')?.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
        const forLabel = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : ''
        return (label || forLabel || (el as HTMLElement).innerText || el.getAttribute('title') || '').trim()
      })
      expect(name, `${p} control ${i} (${tag}) has a name`).not.toBe('')
      if (tag === 'summary' || (await c.isDisabled())) continue
      await c.focus()
      const ring = await c.evaluate((el) => {
        const s = getComputedStyle(el)
        return el.matches(':focus-visible') ? `${s.outlineStyle} ${s.outlineWidth}` : 'not-focus-visible'
      })
      expect(ring, `${p} control ${i} (${tag}) focus ring`).toBe('solid 2px')
    }
  }
})

test('output tabs are keyboard operable', async ({ page }) => {
  await mockBackend(page, { runSequence: [FINAL] })
  await page.goto(RUN)
  const tabs = page.getByRole('tab')
  await expect(tabs.first()).toBeVisible()
  test.skip((await tabs.count()) < 2, 'recorded run has fewer than two outputs')
  await tabs.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.nth(1)).toBeFocused()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', (await tabs.nth(1).getAttribute('id'))!)
})

test('poll ticks are not announced: one polite live region on Run Detail, no implicit ones', async ({ page }) => {
  await mockBackend(page, { runSequence: polls })
  await page.goto(RUN)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('[aria-live]')).toHaveCount(1)
  // role=status/log/alert are implicit live regions; background polling (backend status) must not be one
  await expect(page.locator('[role="status"], [role="log"], [role="alert"]')).toHaveCount(0)
})

test('the live region is cleared when the run id changes', async ({ page }) => {
  await mockBackend(page, { runSequence: polls })
  await page.goto(RUN)
  const live = page.locator('[aria-live="polite"]')
  await expect(live).not.toHaveText('', { timeout: 30_000 })
  // Same route, new id: client-side navigation keeps the page component mounted
  await page.evaluate(() => {
    history.pushState({}, '', '/dashboard/runs/wf-0ther1')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByText('wf-0ther1').first()).toBeVisible()
  await expect(live).toHaveText('')
})

test('"needs backend support" cue reaches assistive technology', async ({ page }) => {
  await mockBackend(page, {})
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/dashboard')
  const nav = page.getByRole('navigation', { name: 'Dashboard' })
  for (const label of ['Knowledge', 'Documentation', 'QA', 'Demos', 'Releases']) {
    await expect(nav.getByRole('link', { name: `${label} (needs backend support)`, exact: true })).toHaveCount(1)
  }
  await expect(nav.getByRole('link', { name: 'Runs', exact: true })).toHaveCount(1)
})

test('drawer traps focus, closes with Esc and does not reopen after a resize', async ({ page }) => {
  await mockBackend(page, {})
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard')
  const trigger = page.getByRole('button', { name: 'Open navigation' })
  const drawer = page.getByRole('dialog', { name: 'Navigation' })
  await trigger.click()
  await expect(drawer).toBeVisible()
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab')
    const outside = await page.evaluate(() => {
      const a = document.activeElement
      return !!a && a !== document.body && !a.closest('dialog')
    })
    expect(outside, `Tab ${i + 1} left the drawer`).toBe(false)
  }
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()

  // Open, widen to tablet (drawer unmounts), narrow again: the drawer stays closed
  await trigger.click()
  await expect(drawer).toBeVisible()
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(page.locator('.nx-shell')).toHaveAttribute('data-nav', 'rail')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.nx-shell')).toHaveAttribute('data-nav', 'drawer')
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
  await expect(drawer).toBeHidden()
})

test('status colours meet 4.5:1 on the page and panel surfaces', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard')
  const tokens = await page.locator('.nx-app').evaluate((el) => {
    const s = getComputedStyle(el)
    const rgb = (v: string) => {
      const probe = document.createElement('span')
      probe.style.color = v
      el.appendChild(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      return c
    }
    return Object.fromEntries(['--nx-err', '--nx-warn', '--nx-ok', '--nx-bg', '--nx-surface-1', '--nx-surface-2', '--nx-grey-400'].map((t) => [t, rgb(s.getPropertyValue(t).trim())]))
  })
  for (const fg of ['--nx-err', '--nx-warn', '--nx-ok', '--nx-grey-400']) {
    for (const bg of ['--nx-bg', '--nx-surface-1', '--nx-surface-2']) {
      expect(contrast(tokens[fg], tokens[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  }
})

test('all visible text meets 4.5:1 on its surface', async ({ page }) => {
  await mockBackend(page, { runSequence: [FINAL] })
  await seedRuns(page)
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 900 })
    for (const p of PAGES) {
      await page.goto(p)
      await expect(page.locator('h1')).toHaveCount(1)
      const samples = await page.evaluate(() => {
        const bgOf = (el: Element | null): string => {
          for (let e = el; e; e = e.parentElement) {
            const b = getComputedStyle(e).backgroundColor
            if (b && b !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(b)) return b
          }
          return 'rgb(8, 8, 8)'
        }
        const out: { where: string; fg: string; bg: string }[] = []
        const label = (el: Element) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent ?? '').trim().slice(0, 30)}"`
        for (const el of document.querySelectorAll('.nx-app *')) {
          if (el.closest('svg, [aria-hidden="true"], .sr-only, :disabled, iframe')) continue
          const r = el.getBoundingClientRect()
          const s = getComputedStyle(el)
          if (r.width === 0 || s.visibility === 'hidden' || s.display === 'none') continue
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
          if (own) out.push({ where: label(el), fg: s.color, bg: bgOf(el) })
          const before = getComputedStyle(el, '::before')
          if (before.content && before.content !== 'none' && before.content !== 'normal' && /[A-Za-z]/.test(before.content)) out.push({ where: `${label(el)}::before`, fg: before.color, bg: bgOf(el) })
        }
        return out
      })
      expect(samples.length, p).toBeGreaterThan(0)
      const failing = samples.filter((s) => contrast(s.fg, s.bg) < 4.5).map((s) => `${s.where} ${s.fg} on ${s.bg} = ${contrast(s.fg, s.bg).toFixed(2)}`)
      expect([...new Set(failing)], `${p} at ${w}px`).toEqual([])
    }
  }
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('no transitions and no pulse', async ({ page }) => {
    await mockBackend(page, { runSequence: polls })
    await page.goto(RUN)
    await expect(page.locator('.nx-runmap')).toBeVisible()
    const moving = await page.evaluate(() => [...document.querySelectorAll('.nx-app, .nx-app *')]
      .filter((el) => { const s = getComputedStyle(el); return s.animationName !== 'none' || s.transitionDuration.split(',').some((d) => parseFloat(d) > 0) })
      .map((el) => el.className.toString()))
    expect(moving).toEqual([])
  })
  test('rail overlay opens without motion', async ({ page }) => {
    await mockBackend(page, {})
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Expand navigation' }).click()
    const nav = page.locator('.nx-side__nav')
    expect(await nav.evaluate((el) => { const s = getComputedStyle(el); return [s.animationName, s.transitionDuration] })).toEqual(['none', '0s'])
  })
})

import { expect, test } from '@playwright/test'
import { fixture, mockBackend } from './mockBackend'
import { readdirSync } from 'node:fs'

const seq = (prefix: string) => readdirSync(new URL('../fixtures/', import.meta.url)).filter((f) => f.startsWith(`${prefix}-poll-`)).sort().map(fixture)
const id = (b: { workflow_id: string }) => b.workflow_id

test('watches a real recorded run from start to finish', async ({ page }) => {
  const polls = seq('full')
  await mockBackend(page, { runSequence: polls })
  await page.goto(`/dashboard/runs/${id(polls[0])}`)
  const agents = page.getByRole('list', { name: 'Agents' })
  await expect(agents.getByRole('listitem')).toHaveCount(6)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(polls[0].goal)
  await expect(page.locator('.nx-pill').first()).toContainText(/Complete|Failed/, { timeout: 30_000 })
  await expect(page.locator('body')).not.toContainText(/\b\d+\s*(of|\/)\s*6\b/)
})

test('agents without a task read "Not in this run" once the run ends', async ({ page }) => {
  const polls = seq('qa')
  await mockBackend(page, { runSequence: [polls[polls.length - 1]] })
  await page.goto(`/dashboard/runs/${id(polls[0])}`)
  await expect(page.getByRole('list', { name: 'Agents' })).toContainText('Not in this run')
})

test('backend restart mid-run', async ({ page }) => {
  const polls = seq('full')
  await mockBackend(page, { runSequence: [polls[0], null] })
  await page.goto(`/dashboard/runs/${id(polls[0])}`)
  await expect(page.getByText("This run isn't on the backend.")).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Last known state')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(polls[0].goal)
})

test('stored detail after restart is shown as degraded', async ({ page }) => {
  const stored = fixture('stored-after-restart.json')
  test.skip(!stored.workflow_id, 'restart produced a 404, covered by the test above')
  await mockBackend(page, { runSequence: [stored] })
  await page.goto(`/dashboard/runs/${stored.workflow_id}`)
  await expect(page.getByText('Showing saved results.')).toBeVisible()
})

test('unknown run and unreachable backend', async ({ page }) => {
  await mockBackend(page, { runSequence: [] })
  await page.goto('/dashboard/runs/wf-00000000')
  await expect(page.getByText("This run isn't on the backend.")).toBeVisible()
  await mockBackend(page, { unreachable: true })
  await page.goto('/dashboard/runs/wf-00000001')
  await expect(page.getByText("Can't reach the NEXUS backend.")).toBeVisible()
})

test('never calls /status/{id}', async ({ page }) => {
  const polls = seq('full')
  const calls = await mockBackend(page, { runSequence: polls })
  await page.goto(`/dashboard/runs/${id(polls[0])}`)
  await page.waitForTimeout(4000)
  expect(calls.status).toBe(0)
})

test('a failed run names the failed agent and keeps completed outputs', async ({ page }) => {
  const failed = fixture('derived-failed.json')
  await mockBackend(page, { runSequence: [failed] })
  await page.goto(`/dashboard/runs/${failed.workflow_id}`)
  await expect(page.locator('.nx-pill').first()).toContainText('Failed')
  await expect(page.getByText('Failed at QA')).toBeVisible()
  const qa = page.getByRole('list', { name: 'Agents' }).locator('li[data-state="failed"]')
  await expect(qa).toContainText('Derived failure message')
  await qa.getByText('Details').click()
  await expect(qa.locator('pre')).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Outputs' }).getByRole('tab', { name: 'Explorer' })).toBeVisible()
})

test('selecting an agent row selects its output tab and keeps it in the hash', async ({ page }) => {
  const done = fixture('full-poll-07.json')
  await mockBackend(page, { runSequence: [done] })
  await page.goto(`/dashboard/runs/${done.workflow_id}`)
  await page.getByRole('list', { name: 'Agents' }).getByRole('button', { name: /Knowledge/ }).click()
  await expect(page).toHaveURL(/#knowledge$/)
  await expect(page.getByRole('tab', { name: 'Knowledge' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#panel-knowledge')).toBeVisible()
})

test('run map lists every agent and turns vertical on narrow screens', async ({ page }) => {
  const done = fixture('qa-poll-04.json')
  await mockBackend(page, { runSequence: [done] })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/dashboard/runs/${done.workflow_id}`)
  const map = page.getByRole('img', { name: /^Run map:/ })
  await expect(map).toHaveAttribute('aria-label', /Explorer complete.*Demo not in this run/)
  await expect(page.locator('[data-orientation="vertical"]')).toHaveCount(1)
  expect(await page.locator('[aria-live="polite"]').count()).toBe(1)
})

test('a malformed location hash does not break the page', async ({ page }) => {
  const polls = seq('full')
  await mockBackend(page, { runSequence: [polls[polls.length - 1]] })
  await page.goto(`/dashboard/runs/${id(polls[0])}#%`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('"Open full screen" stays on the dashboard in an equally sandboxed iframe', async ({ page }) => {
  const done = fixture('full-poll-07.json')
  await mockBackend(page, { runSequence: [done] })
  await page.goto(`/dashboard/runs/${done.workflow_id}#explorer`)
  await page.getByRole('link', { name: /Open full screen/ }).click()
  await expect(page).toHaveURL(new RegExp(`/dashboard/runs/${done.workflow_id}/showcase/explorer$`))
  const frame = page.locator('iframe')
  await expect(frame).toHaveCount(1)
  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts')
  await expect(frame).toHaveAttribute('src', new RegExp(`/workflows/${done.workflow_id}/explorer_html$`))
  await expect(page.getByRole('link', { name: /Back to run/ })).toHaveAttribute('href', `/dashboard/runs/${done.workflow_id}#explorer`)
})

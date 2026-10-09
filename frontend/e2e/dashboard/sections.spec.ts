import { expect, test } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { fixture, mockBackend } from './mockBackend'

const seed = (page: import('@playwright/test').Page, runs: { id: string; goal: string }[]) =>
  page.addInitScript((r) => localStorage.setItem('nexus.runs.v1', JSON.stringify({ version: 1, runs: r.map((x) => ({ ...x, submittedAt: '2026-10-03T10:00:00.000Z' })) })), runs)

test('runs lists only runs started from this browser, with live status', async ({ page }) => {
  const done = fixture('full-poll-' + '00.json')
  await seed(page, [{ id: done.workflow_id, goal: done.goal }])
  await mockBackend(page, { runSequence: [done] })
  await page.goto('/dashboard/runs')
  await expect(page.getByText('Started from this browser.')).toBeVisible()
  await expect(page.getByRole('link', { name: done.goal })).toHaveAttribute('href', `/dashboard/runs/${done.workflow_id}`)
})

for (const [path, label] of [['knowledge', 'Knowledge'], ['documentation', 'Documentation'], ['qa', 'QA'], ['demos', 'Demos'], ['releases', 'Releases']]) {
  test(`${label} shows backend support needed and no sample records`, async ({ page }) => {
    await mockBackend(page, {})
    await page.goto(`/dashboard/${path}`)
    await expect(page.getByText('Backend support needed')).toBeVisible()
    await expect(page.locator('table, [role="row"]')).toHaveCount(0)
  })
}

test('output sections link to the latest real run with that output', async ({ page }) => {
  const files = readdirSync(new URL('../fixtures/', import.meta.url)).filter((f) => f.startsWith('full-poll-')).sort()
  const last = fixture(files[files.length - 1])
  test.skip(!last.context?.knowledge_graph_output, 'recorded run produced no knowledge output')
  await seed(page, [{ id: last.workflow_id, goal: last.goal }])
  await mockBackend(page, { runSequence: [last] })
  await page.goto('/dashboard/knowledge')
  await expect(page.getByRole('link', { name: 'Open latest Knowledge' })).toHaveAttribute('href', `/dashboard/runs/${last.workflow_id}#knowledge`)
})

test('with no local runs, output sections offer to start one', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard/knowledge')
  await expect(page.getByRole('link', { name: 'Start a run' })).toHaveAttribute('href', '/dashboard')
})

test('agents page shows the live worker pool and no resource telemetry', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard/agents')
  await expect(page.getByText(/Live worker pool/).first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/cpu|memory|MB\b/i)
})

test('open a run by ID rejects invalid ids without navigating', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard/runs')
  await page.getByLabel('Run ID').fill('../x')
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/dashboard\/runs$/)
  await page.getByLabel('Run ID').fill('wf-abc123')
  await page.getByRole('button', { name: 'Open' }).click()
  await expect(page).toHaveURL(/\/dashboard\/runs\/wf-abc123$/)
})

test('settings saves the key, clears the input and never stores it', async ({ page }) => {
  let body: unknown
  await mockBackend(page, {})
  await page.route(/\/api-key$/, (r) => { body = r.request().postDataJSON(); return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) })
  await page.goto('/dashboard/settings')
  const input = page.getByLabel('Gemini API key')
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  await input.fill('secret-key-123')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toHaveText('Saved. The backend will use this key for new runs.')
  await expect(input).toHaveValue('')
  expect(body).toMatchObject({ api_key: 'secret-key-123' })
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('secret-key-123')
  await expect(page.getByText("The backend can't report whether a key is already set.")).toBeVisible()
})

test('settings shows an alert when saving fails', async ({ page }) => {
  await mockBackend(page, {})
  await page.route(/\/api-key$/, (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"nope"}' }))
  await page.goto('/dashboard/settings')
  await page.getByLabel('Gemini API key').fill('k')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
})

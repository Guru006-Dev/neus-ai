import { expect, test } from '@playwright/test'
import { fixture, mockBackend } from './mockBackend'

test('a goal creates a real run and opens its detail', async ({ page }) => {
  const calls = await mockBackend(page, { runSequence: [fixture('full-poll-00.json')] })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What should NEXUS work on?')
  const run = page.getByRole('button', { name: /Run/ })
  await expect(run).toBeDisabled()
  await page.getByLabel('Goal').fill('Explore the product and create onboarding documentation')
  await run.click()
  const id = fixture('full-create.json').workflow_id
  await expect(page).toHaveURL(new RegExp(`/dashboard/runs/${id}$`))
  expect(calls.create).toEqual([{ goal: 'Explore the product and create onboarding documentation', user_id: 'dashboard' }])
  expect(calls.status).toBe(0)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('nexus.runs.v1')!))
  expect(stored.runs[0]).toMatchObject({ id, goal: 'Explore the product and create onboarding documentation' })
})

test('run creation failure keeps the goal and explains', async ({ page }) => {
  await mockBackend(page, { unreachable: true })
  await page.goto('/dashboard')
  await page.getByLabel('Goal').fill('anything')
  await page.getByRole('button', { name: /Run/ }).click()
  await expect(page.getByRole('alert')).toContainText("couldn't reach the backend")
  await expect(page.getByLabel('Goal')).toHaveValue('anything')
  await expect(page.getByRole('button', { name: /Run/ })).toBeEnabled()
})

test('no runs yet', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard')
  await expect(page.getByText('No runs from this browser yet.')).toBeVisible()
})

test('long and blank goals', async ({ page }) => {
  await mockBackend(page, {})
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard')
  await page.getByLabel('Goal').fill('   \n  ')
  await expect(page.getByRole('button', { name: /Run/ })).toBeDisabled()
  await page.getByLabel('Goal').fill('x'.repeat(5000))
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})

test('the system line never shows CPU or memory', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard')
  await expect(page.getByText(/since backend start/)).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/cpu|memory|MB\b/i)
})

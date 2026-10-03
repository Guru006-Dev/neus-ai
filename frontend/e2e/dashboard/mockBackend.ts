import type { Page } from '@playwright/test'

// Minimal stand-in; Task 4 replaces it with the recorded-fixture backend.
export async function mockBackend(page: Page, _opts: Record<string, unknown> = {}) {
  await page.route('**/system/status', (route) => route.fulfill({ status: 503, body: '' }))
  return { create: [] as unknown[], status: 0 }
}

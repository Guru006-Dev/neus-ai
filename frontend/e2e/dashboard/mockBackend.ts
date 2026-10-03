import type { Page, Route } from '@playwright/test'
import { readFileSync } from 'node:fs'

export const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'))

export interface MockOptions {
  /** Responses served in order for GET /workflows/:id; the last one repeats. */
  runSequence?: unknown[]
  runStatus?: number
  create?: { status: number; body: unknown }
  system?: 'ok' | 'down'
  unreachable?: boolean
}

export async function mockBackend(page: Page, o: MockOptions) {
  const calls = { create: [] as unknown[], status: 0 }
  let i = 0
  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route(/\/status\//, (r) => { calls.status++; return r.abort() })
  await page.route(/\/workflows(\/[^/]+)?$/, async (route) => {
    if (o.unreachable) return route.abort('connectionrefused')
    if (route.request().method() === 'POST') {
      calls.create.push(route.request().postDataJSON())
      return json(route, o.create?.status ?? 200, o.create?.body ?? fixture('full-create.json'))
    }
    const seq = o.runSequence ?? []
    const body = seq[Math.min(i++, seq.length - 1)]
    return json(route, o.runStatus ?? (body ? 200 : 404), body ?? { detail: 'Workflow not found' })
  })
  await page.route(/\/workflows\/[^/]+\/(demo|explorer)_html$/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>showcase</body></html>' }))
  await page.route(/\/system\/status$/, (r) => (o.system === 'down' || o.unreachable ? r.abort('connectionrefused') : json(r, 200, fixture('system-status.json'))))
  return calls
}

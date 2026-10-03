import { describe, expect, it } from 'vitest'
import { routes } from './router'

describe('routes', () => {
  it('serves the landing page eagerly and the dashboard lazily', () => {
    const root = routes.find((r) => r.path === '/')!
    const dash = routes.find((r) => r.path === '/dashboard/*')!
    expect(root.element).toBeTruthy()
    expect(root.lazy).toBeUndefined()
    expect(typeof dash.lazy).toBe('function')
  })
})

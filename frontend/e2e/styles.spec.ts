import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { compareStyles, type ComputedStyles, type StyleAssertion } from './compare-styles'
import { openLanding } from './helpers'

const assertions = JSON.parse(readFileSync(new URL('./style-assertions.json', import.meta.url), 'utf8')) as StyleAssertion[]

test('computed styles match the NEXUS tokens', async ({ page }, info) => {
  await openLanding(page)
  await page.waitForSelector('.agent-tag', { state: 'attached' })

  const actual = await page.evaluate((list) => {
    const out: Record<string, Record<string, string | null>> = {}
    for (const a of list) {
      const el = document.querySelector(a.selector)
      const style = el ? (getComputedStyle(el) as unknown as Record<string, string>) : null
      out[a.selector] ??= {}
      out[a.selector][a.prop] = style ? style[a.prop] : null
    }
    return out
  }, assertions)

  const result = compareStyles(assertions, actual as ComputedStyles)
  await writeFile(info.outputPath('style-metrics.json'), JSON.stringify(result, null, 2))
  expect(result.failures).toEqual([])
})

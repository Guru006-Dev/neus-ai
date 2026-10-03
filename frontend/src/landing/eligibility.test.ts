import { describe, expect, it } from 'vitest'
import { is3DEligible } from './eligibility'

describe('is3DEligible', () => {
  const base = { viewportWidth: 1280, viewportHeight: 800, webgl: true, reducedMotion: false }

  it.each([
    ['desktop with WebGL', base, true],
    ['767px wide', { ...base, viewportWidth: 767 }, false],
    ['768px portrait tablet', { ...base, viewportWidth: 768, viewportHeight: 1024 }, false],
    ['1023px wide', { ...base, viewportWidth: 1023, viewportHeight: 700 }, false],
    ['1024×768 landscape', { ...base, viewportWidth: 1024, viewportHeight: 768 }, true],
    ['1024px portrait', { ...base, viewportWidth: 1024, viewportHeight: 1366 }, false],
    ['no WebGL', { ...base, webgl: false }, false],
    ['reduced motion', { ...base, reducedMotion: true }, false],
  ])('%s', (_, caps, expected) => {
    expect(is3DEligible(caps)).toBe(expected)
  })
})

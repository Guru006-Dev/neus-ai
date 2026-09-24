import { describe, expect, it } from 'vitest'
import { is3DEligible } from './eligibility'

describe('is3DEligible', () => {
  const base = { viewportWidth: 1280, webgl: true, reducedMotion: false }

  it.each([
    ['desktop with WebGL', base, true],
    ['767px wide', { ...base, viewportWidth: 767 }, false],
    ['exactly 768px wide', { ...base, viewportWidth: 768 }, true],
    ['no WebGL', { ...base, webgl: false }, false],
    ['reduced motion', { ...base, reducedMotion: true }, false],
  ])('%s', (_, caps, expected) => {
    expect(is3DEligible(caps)).toBe(expected)
  })
})

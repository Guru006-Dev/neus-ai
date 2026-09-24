import { describe, expect, it } from 'vitest'
import { roundDeep } from './debug'

describe('roundDeep', () => {
  it('rounds numbers to 1e-5, recursively', () => {
    expect(roundDeep({ a: [1.123456789], b: { c: 2.0000001 }, s: 'x' })).toEqual({ a: [1.12346], b: { c: 2 }, s: 'x' })
  })
})

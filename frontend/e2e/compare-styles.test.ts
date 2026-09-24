import { describe, expect, it } from 'vitest'
import { compareStyles, valueMatches } from './compare-styles'

describe('valueMatches', () => {
  it('allows ±1px on px values', () => {
    expect(valueMatches('52px', '52.4px')).toBe(true)
    expect(valueMatches('52px', '54px')).toBe(false)
  })

  it('allows ±0.01 on em values', () => {
    expect(valueMatches('-0.003em', '-0.004em')).toBe(true)
  })

  it('compares non-numeric values as normalized strings', () => {
    expect(valueMatches('rgb(8, 8, 8)', 'rgb(8,  8, 8)')).toBe(true)
    expect(valueMatches('rgb(8, 8, 8)', 'rgb(8,8,8)')).toBe(false)
    expect(valueMatches('uppercase', 'UPPERCASE')).toBe(true)
  })

  it('fails when the value is missing', () => {
    expect(valueMatches('14px', null)).toBe(false)
  })
})

describe('compareStyles', () => {
  it('reports each failure with expected and actual', () => {
    const result = compareStyles(
      [
        { selector: '.a', prop: 'fontSize', expected: '14px' },
        { selector: '.a', prop: 'color', expected: 'rgb(8, 8, 8)' },
      ],
      { '.a': { fontSize: '14px', color: 'rgb(9, 9, 9)' } },
    )
    expect(result).toMatchObject({ total: 2, passed: 1, failed: 1 })
    expect(result.failures).toEqual([{ selector: '.a', prop: 'color', expected: 'rgb(8, 8, 8)', actual: 'rgb(9, 9, 9)' }])
  })
})

// Computed-style gate: compares values read with getComputedStyle against the NEXUS design tokens.

export interface StyleAssertion {
  selector: string
  prop: string
  expected: string
}

export interface StyleFailure extends StyleAssertion {
  actual: string | null
}

export interface StyleResult {
  total: number
  passed: number
  failed: number
  failures: StyleFailure[]
}

export type ComputedStyles = Record<string, Record<string, string | null>>

const NUMERIC = /^-?\d*\.?\d+(px|em|rem|%)?$/
const normalize = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase()

/** Purely numeric expectations pass within ±1px (±0.01 for em); everything else is a normalized string match. */
export function valueMatches(expected: string, actual: string | null | undefined): boolean {
  if (actual === null || actual === undefined) return false
  if (NUMERIC.test(expected.trim())) {
    const e = parseFloat(expected)
    const a = parseFloat(actual)
    if (Number.isNaN(a)) return false
    return Math.abs(e - a) <= (expected.includes('em') ? 0.01 : 1)
  }
  return normalize(expected) === normalize(actual)
}

export function compareStyles(assertions: readonly StyleAssertion[], actual: ComputedStyles): StyleResult {
  const failures: StyleFailure[] = []
  for (const a of assertions) {
    const value = actual[a.selector]?.[a.prop] ?? null
    if (!valueMatches(a.expected, value)) failures.push({ ...a, actual: value })
  }
  return { total: assertions.length, passed: assertions.length - failures.length, failed: failures.length, failures }
}

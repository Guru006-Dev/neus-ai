import { clamp01 } from '../timeline'

export interface ViewProps {
  progress: number
}

/** Items revealed so far when `total` items appear across 5%–90% of a view's progress. */
export function visibleCount(progress: number, total: number): number {
  return Math.min(total, Math.floor(clamp01((progress - 0.05) / 0.85) * total + 1e-9))
}

export const pct = (t: number): string => `${(clamp01(t) * 100).toFixed(2)}%`

export const GLYPH = { done: '✓', active: '●', idle: '○', fail: '✕' } as const
export type RowState = keyof typeof GLYPH

export { clamp01 }

import { captionAt, labelAt } from './nexus-story'
import type { ScreenFrame } from './timeline'

/** Plain-language caption for the current step. Deliberately not a live region: it changes as the visitor scrolls. */
export function Caption({ frame }: { frame: Pick<ScreenFrame, 'phase' | 'agent'> }) {
  const text = captionAt(frame.phase, frame.agent)
  if (!text) return null
  return (
    <p className="caption" data-phase={frame.phase}>
      <span className="caption__label">{labelAt(frame.phase, frame.agent)}</span>
      <span className="caption__text">{text}</span>
    </p>
  )
}

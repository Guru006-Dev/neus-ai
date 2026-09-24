import { GOAL } from '../nexus-story'
import { ScreenBar } from './ScreenBar'
import { clamp01, type ViewProps } from './util'

export function PromptView({ progress }: ViewProps) {
  const chars = Math.round(GOAL.length * clamp01(progress / 0.85))
  const pressed = progress >= 0.9
  return (
    <>
      <ScreenBar title="Prompt" meta="New run" />
      <div className="prompt">
        <p className="prompt__text">
          {GOAL.slice(0, chars)}
          <span className="caret" aria-hidden="true" />
        </p>
        <span className={pressed ? 'prompt__run is-pressed' : 'prompt__run'}>Run →</span>
      </div>
    </>
  )
}

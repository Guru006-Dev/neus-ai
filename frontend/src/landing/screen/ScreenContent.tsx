import type { ComponentType } from 'react'
import './screen.css'
import type { ScreenView } from '../timeline'
import { DemoView } from './DemoView'
import { DocsView } from './DocsView'
import { ExplorerView } from './ExplorerView'
import { KnowledgeView } from './KnowledgeView'
import { OrchestratorView } from './OrchestratorView'
import { PromptView } from './PromptView'
import { QAView } from './QAView'
import { ReleaseView } from './ReleaseView'
import type { ViewProps } from './util'

const VIEWS: Record<ScreenView, ComponentType<ViewProps>> = {
  prompt: PromptView,
  orchestrator: OrchestratorView,
  explorer: ExplorerView,
  knowledge: KnowledgeView,
  documentation: DocsView,
  qa: QAView,
  demo: DemoView,
  release: ReleaseView,
}

/**
 * Renders the active view. During a crossfade the outgoing view (in its finished state) is mounted
 * behind it; the mix itself is a CSS variable set from scroll progress, not React state.
 */
export function ScreenContent({
  view,
  progress,
  outgoing = null,
}: {
  view: ScreenView
  progress: number
  outgoing?: ScreenView | null
}) {
  const View = VIEWS[view]
  const Out = outgoing ? VIEWS[outgoing] : null
  return (
    <>
      {Out && (
        <div className="screen" data-screen={outgoing} data-role="out">
          <Out progress={1} />
        </div>
      )}
      <div className="screen" data-screen={view} data-role={Out ? 'in' : undefined}>
        <View progress={progress} />
      </div>
    </>
  )
}

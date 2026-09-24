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

/** Renders the single active view; nothing else is mounted. */
export function ScreenContent({ view, progress }: { view: ScreenView; progress: number }) {
  const View = VIEWS[view]
  return (
    <div className="screen" data-screen={view}>
      <View progress={progress} />
    </div>
  )
}

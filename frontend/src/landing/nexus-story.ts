// WHAT happens. All copy and screen content for the One Run story. No timing lives here.
import { clamp01, type AgentId, type PhaseId, type ScreenView } from './timeline'

export const GOAL = 'Analyze the onboarding flows of three leading note-taking apps and compare them'
export const RUN_ID = 'wf_0142'

export type AgentMetric =
  | { kind: 'count'; to: number; format: (n: number) => string }
  | { kind: 'label'; pending: string; done: string }

export interface AgentStory {
  id: AgentId
  name: string
  verb: string
  caption: string
  metric: AgentMetric
}

export const AGENTS: readonly AgentStory[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    verb: 'discovers',
    caption: 'Explorer discovers sources across the web.',
    metric: { kind: 'count', to: 14, format: (n) => `${n} sources` },
  },
  {
    id: 'knowledge',
    name: 'Knowledge',
    verb: 'maps',
    caption: 'Knowledge maps what was found into a connected graph.',
    metric: { kind: 'count', to: 38, format: (n) => `${n} entities` },
  },
  {
    id: 'documentation',
    name: 'Documentation',
    verb: 'writes',
    caption: 'Documentation writes the findings up as a structured report.',
    metric: { kind: 'count', to: 6, format: (n) => `${n} sections` },
  },
  {
    id: 'qa',
    name: 'QA',
    verb: 'tests',
    caption: 'QA tests every claim before it ships.',
    metric: { kind: 'count', to: 24, format: (n) => `${n}/24 passed` },
  },
  {
    id: 'demo',
    name: 'Demo',
    verb: 'demonstrates',
    caption: 'Demo turns the result into an interactive preview.',
    metric: { kind: 'label', pending: 'rendering', done: 'preview ready' },
  },
  {
    id: 'release',
    name: 'Release',
    verb: 'prepares',
    caption: 'Release packages everything into one deliverable.',
    metric: { kind: 'label', pending: 'packaging', done: 'v1.0 packaged' },
  },
]

export function agentStory(id: AgentId): AgentStory {
  const found = AGENTS.find((a) => a.id === id)
  if (!found) throw new Error(`unknown agent ${id}`)
  return found
}

/** Tag counter text for an agent that is `progress` of the way through its range. */
export function metricText(agent: AgentStory, progress: number): string {
  const t = clamp01(progress)
  if (t <= 0) return ''
  if (agent.metric.kind === 'count') return agent.metric.format(Math.round(agent.metric.to * t))
  return t >= 1 ? agent.metric.done : agent.metric.pending
}

export const PHASE_LABELS: Record<PhaseId, string> = {
  open: 'Start',
  goal: 'Goal',
  orchestrate: 'Orchestrator',
  agents: '',
  network: 'Network',
  converge: 'NEXUS',
  still: '',
}

export const PHASE_CAPTIONS: Record<PhaseId, string> = {
  open: 'It starts with a single goal.',
  goal: 'Describe the outcome you want, in plain language.',
  orchestrate: 'The orchestrator plans the run and assigns six agents.',
  agents: '',
  network: 'Six agents, one connected network.',
  converge: 'Every thread converges into one result.',
  still: '',
}

export function captionAt(phase: PhaseId, agent: AgentId | null): string {
  if (phase === 'agents' && agent) return agentStory(agent).caption
  return PHASE_CAPTIONS[phase]
}

export function labelAt(phase: PhaseId, agent: AgentId | null): string {
  if (phase === 'agents' && agent) return agentStory(agent).name
  return PHASE_LABELS[phase]
}

export const INTRO = {
  titleLines: ['One goal.', 'Six agents at work.'],
  lede: 'NEXUS turns a single goal into research, a knowledge graph, documentation, tested findings, a live demo and a release-ready package.',
} as const

export const FINALE = { title: 'One goal. Six agents. One answer.' } as const

export const CTA = { label: 'Launch NEXUS', href: '/dashboard' } as const

export interface NavLink {
  label: string
  href: string
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: 'How it works', href: '#one-run' },
  { label: 'API', href: '/docs' },
]

export const FOOTER = {
  heading: 'Start with a single goal',
  columns: [
    {
      title: 'Platform',
      links: [
        { label: 'How it works', href: '#one-run' },
        { label: 'Dashboard', href: '/dashboard' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'API reference', href: '/docs' },
        { label: 'OpenAPI schema', href: '/openapi.json' },
      ],
    },
  ],
  legal: '© 2026 NEXUS',
} as const

// ── Screen content ───────────────────────────────────────────────

export const EXPLORER_SOURCES: readonly { url: string; meta: string }[] = [
  { url: 'inkwell.app/onboarding', meta: '200 · 18 kB' },
  { url: 'inkwell.app/help/getting-started', meta: '200 · 42 kB' },
  { url: 'noteloom.io/welcome', meta: '200 · 12 kB' },
  { url: 'noteloom.io/docs/first-steps', meta: '200 · 37 kB' },
  { url: 'quillbase.com/start', meta: '200 · 21 kB' },
  { url: 'quillbase.com/templates', meta: '200 · 29 kB' },
  { url: 'app store reviews · 3 apps', meta: '1,240 reviews' },
]

export const KNOWLEDGE_GRAPH: {
  nodes: readonly { id: string; label: string; x: number; y: number }[]
  edges: readonly (readonly [number, number])[]
} = {
  nodes: [
    { id: 'inkwell', label: 'Inkwell', x: 40, y: 34 },
    { id: 'noteloom', label: 'Noteloom', x: 40, y: 108 },
    { id: 'quillbase', label: 'Quillbase', x: 236, y: 70 },
    { id: 'signup', label: 'Signup', x: 118, y: 22 },
    { id: 'templates', label: 'Templates', x: 140, y: 70 },
    { id: 'tutorial', label: 'Tutorial', x: 112, y: 120 },
    { id: 'import', label: 'Import', x: 196, y: 28 },
    { id: 'sync', label: 'Sync', x: 192, y: 114 },
    { id: 'pricing', label: 'Pricing', x: 250, y: 124 },
  ],
  edges: [
    [0, 3], [0, 4], [1, 4], [1, 5], [2, 4], [2, 6],
    [2, 7], [3, 6], [5, 7], [2, 8], [1, 7], [0, 6],
  ],
}

export const DOC = {
  title: 'Onboarding teardown: Inkwell, Noteloom, Quillbase',
  sections: ['Summary', 'Signup friction', 'First-run experience', 'Templates and import', 'Retention hooks', 'Recommendations'],
} as const

export const QA = {
  total: 24,
  flakyIndex: 2,
  checks: [
    'Every claim cites a source',
    'Pricing matches the source',
    'Screens match the current UI',
    'Step counts verified',
    'No broken links',
    'Comparison table complete',
    'Recommendations traceable',
    'Report renders on mobile',
  ],
} as const

export const DEMO = {
  title: 'Onboarding comparison',
  pending: 'Rendering interactive preview',
  done: 'Preview ready',
} as const

export const RELEASE = {
  files: ['report.md', 'comparison.csv', 'knowledge-graph.json', 'sources.json', 'qa-report.json', 'preview.html'],
  artifact: 'nexus-run-0142.zip',
  version: 'v1.0',
  size: '2.4 MB',
} as const

export interface StoryStep {
  view: ScreenView
  label: string
  caption: string
}

/** The story in order, used by the 2D fallback. */
export const STORY_STEPS: readonly StoryStep[] = [
  { view: 'prompt', label: 'Goal', caption: PHASE_CAPTIONS.goal },
  { view: 'orchestrator', label: 'Orchestrator', caption: PHASE_CAPTIONS.orchestrate },
  ...AGENTS.map((a) => ({ view: a.id, label: a.name, caption: a.caption })),
]

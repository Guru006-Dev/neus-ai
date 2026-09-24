// WHEN things happen. Pure functions of scroll progress p ∈ [0, 1]. No React, no DOM.

export type PhaseId = 'open' | 'goal' | 'orchestrate' | 'agents' | 'network' | 'converge' | 'still'
export type AgentStatus = 'idle' | 'active' | 'done'
export type Vec3 = readonly [number, number, number]

export interface Range {
  start: number
  end: number
}

export interface Phase extends Range {
  id: PhaseId
}

export const PHASES: readonly Phase[] = [
  { id: 'open', start: 0, end: 0.05 },
  { id: 'goal', start: 0.05, end: 0.12 },
  { id: 'orchestrate', start: 0.12, end: 0.2 },
  { id: 'agents', start: 0.2, end: 0.8 },
  { id: 'network', start: 0.8, end: 0.9 },
  { id: 'converge', start: 0.9, end: 0.97 },
  { id: 'still', start: 0.97, end: 1 },
]

export const AGENT_IDS = ['explorer', 'knowledge', 'documentation', 'qa', 'demo', 'release'] as const
export type AgentId = (typeof AGENT_IDS)[number]

export const AGENT_RANGES: readonly (Range & { id: AgentId })[] = [
  { id: 'explorer', start: 0.2, end: 0.3 },
  { id: 'knowledge', start: 0.3, end: 0.4 },
  { id: 'documentation', start: 0.4, end: 0.5 },
  { id: 'qa', start: 0.5, end: 0.6 },
  { id: 'demo', start: 0.6, end: 0.7 },
  { id: 'release', start: 0.7, end: 0.8 },
]

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

export const smoothstep = (t: number): number => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

export const localProgress = (p: number, r: Range): number => clamp01((p - r.start) / (r.end - r.start))

const phaseRange = (id: PhaseId): Phase => PHASES.find((ph) => ph.id === id) as Phase

export function phaseAt(p: number): PhaseId {
  const x = clamp01(p)
  for (const ph of PHASES) if (x < ph.end) return ph.id
  return 'still'
}

export function agentIndexAt(p: number): number {
  const x = clamp01(p)
  return AGENT_RANGES.findIndex((r) => x >= r.start && x < r.end)
}

export function agentAt(p: number): AgentId | null {
  const i = agentIndexAt(p)
  return i === -1 ? null : AGENT_RANGES[i].id
}

/** One active agent at a time; earlier agents are done, later agents idle. */
export function agentStatus(p: number, index: number): AgentStatus {
  const r = AGENT_RANGES[index]
  const x = clamp01(p)
  if (x < r.start) return 'idle'
  if (x >= r.end) return 'done'
  return 'active'
}

export const agentStatuses = (p: number): AgentStatus[] => AGENT_RANGES.map((_, i) => agentStatus(p, i))

/** How far through its own range an agent is (drives its tag counter). */
export const agentProgress = (p: number, index: number): number => localProgress(p, AGENT_RANGES[index])

/** The connection line draws over the first 40% of its agent's range. */
export const connectionProgress = (p: number, index: number): number => clamp01(agentProgress(p, index) / 0.4)

const openProgress = (p: number): number => localProgress(p, phaseRange('open'))

export const lidOpen = (p: number): number => clamp01(openProgress(p) / 0.7)
export const screenOn = (p: number): number => clamp01((openProgress(p) - 0.6) / 0.4)
export const introVisibility = (p: number): number => 1 - clamp01(openProgress(p) / 0.5)
export const networkIntensity = (p: number): number => localProgress(p, phaseRange('network'))
export const convergeProgress = (p: number): number => localProgress(p, phaseRange('converge'))

/** Stillness first; the CTA fades in over the last 60% of the still phase. */
export const ctaReveal = (p: number): number => clamp01((localProgress(p, phaseRange('still')) - 0.4) / 0.6)

export interface CameraPose {
  position: Vec3
  target: Vec3
}

export const REFERENCE_ASPECT = 16 / 9

export const CAMERA_KEYS: readonly { p: number; pose: CameraPose }[] = [
  { p: 0, pose: { position: [0, 1.6, 7.5], target: [0, 0.4, 0] } },
  { p: 0.05, pose: { position: [0, 1.25, 5.2], target: [0, 0.7, 0] } },
  { p: 0.12, pose: { position: [0, 0.95, 2.7], target: [0, 0.72, -0.3] } },
  { p: 0.2, pose: { position: [0, 1.1, 4.4], target: [0, 0.75, 0] } },
  { p: 0.5, pose: { position: [0.25, 1.15, 4.5], target: [0, 0.75, 0] } },
  { p: 0.8, pose: { position: [0, 1.1, 4.6], target: [0, 0.75, 0] } },
  { p: 0.9, pose: { position: [0, 1.9, 8.6], target: [0, 0.9, 0] } },
  { p: 0.97, pose: { position: [0, 1.8, 8], target: [0, 1, 0] } },
  { p: 1, pose: { position: [0, 1.8, 8], target: [0, 1, 0] } },
]

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

/** Camera pose at p. Narrower viewports pull the camera back along its view line so the agents stay in frame. */
export function cameraAt(p: number, aspect: number = REFERENCE_ASPECT): CameraPose {
  const x = clamp01(p)
  let pose = CAMERA_KEYS[CAMERA_KEYS.length - 1].pose
  for (let i = 1; i < CAMERA_KEYS.length; i++) {
    const a = CAMERA_KEYS[i - 1]
    const b = CAMERA_KEYS[i]
    if (x <= b.p) {
      const t = smoothstep((x - a.p) / (b.p - a.p))
      pose = { position: lerp3(a.pose.position, b.pose.position, t), target: lerp3(a.pose.target, b.pose.target, t) }
      break
    }
  }
  const k = Math.max(1, REFERENCE_ASPECT / aspect)
  return { position: lerp3(pose.target, pose.position, k), target: pose.target }
}

export type ScreenView = 'prompt' | 'orchestrator' | AgentId

export const SCREEN_STEPS = 60

export interface ScreenFrame {
  phase: PhaseId
  agent: AgentId | null
  view: ScreenView
  /** View progress, quantized to 1/SCREEN_STEPS so React re-renders only on discrete steps. */
  progress: number
  statuses: AgentStatus[]
}

export function frameAt(p: number): ScreenFrame {
  const x = clamp01(p)
  const phase = phaseAt(x)
  const i = agentIndexAt(x)
  let view: ScreenView
  let raw: number
  if (phase === 'open' || phase === 'goal') {
    view = 'prompt'
    raw = localProgress(x, phaseRange('goal'))
  } else if (phase === 'orchestrate') {
    view = 'orchestrator'
    raw = localProgress(x, phaseRange('orchestrate'))
  } else if (i !== -1) {
    view = AGENT_RANGES[i].id
    raw = agentProgress(x, i)
  } else {
    view = 'release'
    raw = 1
  }
  return {
    phase,
    agent: i === -1 ? null : AGENT_RANGES[i].id,
    view,
    progress: Math.floor(raw * SCREEN_STEPS) / SCREEN_STEPS,
    statuses: agentStatuses(x),
  }
}

export const frameKey = (f: ScreenFrame): string => `${f.phase}|${f.view}|${f.progress}|${f.statuses.join(',')}`

export interface SceneState {
  p: number
  phase: PhaseId
  lidOpen: number
  screenOn: number
  camera: CameraPose
  statuses: AgentStatus[]
  connections: number[]
  network: number
  converge: number
  cta: number
  intro: number
}

export function sceneStateAt(p: number, aspect: number = REFERENCE_ASPECT): SceneState {
  const x = clamp01(p)
  return {
    p: x,
    phase: phaseAt(x),
    lidOpen: lidOpen(x),
    screenOn: screenOn(x),
    camera: cameraAt(x, aspect),
    statuses: agentStatuses(x),
    connections: AGENT_RANGES.map((_, i) => connectionProgress(x, i)),
    network: networkIntensity(x),
    converge: convergeProgress(x),
    cta: ctaReveal(x),
    intro: introVisibility(x),
  }
}

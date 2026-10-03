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

/** The headline leaves first (0–0.015), then the lid opens (0.015–0.04), then the screen lights (0.035–0.05). */
export const introVisibility = (p: number): number => 1 - clamp01(openProgress(p) / 0.3)
export const lidOpen = (p: number): number => clamp01((openProgress(p) - 0.3) / 0.5)
export const screenOn = (p: number): number => clamp01((openProgress(p) - 0.7) / 0.3)
export const networkIntensity = (p: number): number => localProgress(p, phaseRange('network'))
export const convergeProgress = (p: number): number => localProgress(p, phaseRange('converge'))

/** Orchestrator view progress at which it starts assigning agents (it plans first). */
export const ASSIGN_START = 0.3

/** Agents the orchestrator has assigned at a given orchestrator-view progress. */
export function assignedCount(viewProgress: number): number {
  const q = clamp01((viewProgress - ASSIGN_START) / (1 - ASSIGN_START))
  return Math.min(AGENT_IDS.length, Math.floor(clamp01((q - 0.05) / 0.85) * AGENT_IDS.length + 1e-9))
}

const TAG_FADE = 0.05

/** First quantized orchestrator step at which agent i is assigned, so a tag never precedes its row. */
function assignStep(i: number): number {
  const q = 0.05 + (0.85 * (i + 1)) / AGENT_IDS.length
  const raw = ASSIGN_START + (1 - ASSIGN_START) * q
  return Math.ceil(raw * SCREEN_STEPS - 1e-9) / SCREEN_STEPS
}

/** Agent tag i fades in as the orchestrator assigns it; hidden before orchestration. */
export const tagReveal = (p: number, i: number): number =>
  clamp01((localProgress(p, phaseRange('orchestrate')) - assignStep(i)) / TAG_FADE)

/** The convergence, as a sequence: tags out, lines morph, strokes thicken, nodes land. */
export interface ConvergeStages {
  /** 0 → 1 as the tags fade out. */
  tags: number
  /** Screen brightness multiplier (1 → 0.15). */
  screen: number
  /** Laptop light multiplier (1 → 0.35). */
  laptop: number
  morph: number
  thicken: number
  nodes: number
  /** Connection line opacity multiplier: holds while morphing, gone once the stroke is solid. */
  lines: number
}

const span = (p: number, start: number, end: number): number => localProgress(p, { start, end })

export function convergeStages(p: number): ConvergeStages {
  const tags = span(p, 0.9, 0.915)
  return {
    tags,
    screen: 1 - 0.85 * smoothstep(tags),
    laptop: 1 - 0.65 * smoothstep(span(p, 0.9, 0.95)),
    morph: smoothstep(span(p, 0.915, 0.95)),
    thicken: smoothstep(span(p, 0.945, 0.96)),
    nodes: smoothstep(span(p, 0.955, 0.97)),
    lines: 1 - smoothstep(span(p, 0.952, 0.962)),
  }
}

export interface RingState {
  /** Fraction of the edge drawn. */
  draw: number
  opacity: number
}

const RING_PEAK = 0.55
const RING_SETTLED = 0.2
const RING_NETWORK = 0.45

/**
 * Edge k joins tag k to tag k+1. Edges 0–4 are the hand-offs, drawn as agent k+1 starts: bright while
 * drawing, then quiet. Edge 5 closes the ring in the network reveal, where every edge brightens.
 */
export function ringState(p: number, k: number): RingState {
  const net = networkIntensity(p)
  const boost = smoothstep(clamp01(net / 0.5))
  const out = 1 - smoothstep(convergeStages(p).tags)
  if (k >= AGENT_RANGES.length - 1) {
    const draw = clamp01(net / 0.4)
    return { draw, opacity: draw > 0 ? RING_NETWORK * boost * out : 0 }
  }
  const local = localProgress(p, AGENT_RANGES[k + 1])
  if (local <= 0) return { draw: 0, opacity: 0 }
  const draw = clamp01(local / 0.15)
  const base = RING_PEAK - (RING_PEAK - RING_SETTLED) * smoothstep((local - 0.15) / 0.25)
  return { draw, opacity: (base + (RING_NETWORK - base) * boost) * out }
}

/** Caption and progress rail leave as the nodes land, before the stillness and the CTA. */
export const hudFade = (p: number): number => 1 - smoothstep(span(p, 0.955, 0.97))

/** Stillness first; the CTA fades in over the last 60% of the still phase. */
export const ctaReveal = (p: number): number => clamp01((localProgress(p, phaseRange('still')) - 0.2) / 0.4)

export interface CameraPose {
  position: Vec3
  target: Vec3
}

export const REFERENCE_ASPECT = 16 / 9

/** Keys with `rest` hold still there (zero velocity); everything else flows through without stopping. */
export const CAMERA_KEYS: readonly { p: number; pose: CameraPose; rest?: boolean }[] = [
  { p: 0, pose: { position: [0, 0.95, 7.2], target: [0, 0.85, 0] }, rest: true },
  { p: 0.05, pose: { position: [0, 1.2, 5], target: [0, 0.7, 0] } },
  { p: 0.115, pose: { position: [0, 1.04, 2.9], target: [0, 0.98, -0.3] }, rest: true },
  { p: 0.155, pose: { position: [0, 1.1, 4.2], target: [0, 0.75, 0] } },
  { p: 0.2, pose: { position: [0, 1.1, 4.4], target: [0, 0.75, 0] } },
  { p: 0.5, pose: { position: [0, 1.12, 4.5], target: [0, 0.75, 0] } },
  { p: 0.8, pose: { position: [0, 1.1, 4.6], target: [0, 0.75, 0] } },
  { p: 0.87, pose: { position: [0, 1.9, 8.6], target: [0, 0.9, 0] }, rest: true },
  { p: 0.9, pose: { position: [0, 1.9, 8.6], target: [0, 0.9, 0] }, rest: true },
  { p: 0.97, pose: { position: [0, 1.8, 8], target: [0, 1, 0] }, rest: true },
  { p: 1, pose: { position: [0, 1.8, 8], target: [0, 1, 0] }, rest: true },
]

type Channel = (pose: CameraPose) => number

const CHANNELS: readonly Channel[] = [0, 1, 2].flatMap((axis) => [
  (pose: CameraPose) => pose.position[axis],
  (pose: CameraPose) => pose.target[axis],
])

/** Monotone (Fritsch–Carlson) tangents: smooth through keys, no overshoot, zero at rests. */
const TANGENTS: readonly number[][] = CAMERA_KEYS.map((key, i) =>
  CHANNELS.map((ch) => {
    if (key.rest || i === 0 || i === CAMERA_KEYS.length - 1) return 0
    const a = CAMERA_KEYS[i - 1]
    const b = CAMERA_KEYS[i + 1]
    const d0 = (ch(key.pose) - ch(a.pose)) / (key.p - a.p)
    const d1 = (ch(b.pose) - ch(key.pose)) / (b.p - key.p)
    if (d0 === 0 || d1 === 0 || Math.sign(d0) !== Math.sign(d1)) return 0
    const m = (d0 + d1) / 2
    return Math.sign(m) * Math.min(Math.abs(m), 3 * Math.abs(d0), 3 * Math.abs(d1))
  }),
)

function hermite(y0: number, y1: number, m0: number, m1: number, h: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m1
}

const BIAS_X = 0.28
const BIAS_RAMP = 0.03
const AGENT_SIDE = [-1, -1, -1, 1, 1, 1]

/** Lateral lean toward the active agent's side: left agents pull left, right agents pull right. */
function lateralBias(p: number): number {
  let sum = 0
  AGENT_RANGES.forEach((r, i) => {
    const rise = smoothstep((p - (r.start - BIAS_RAMP)) / (2 * BIAS_RAMP))
    const fall = 1 - smoothstep((p - (r.end - BIAS_RAMP)) / (2 * BIAS_RAMP))
    sum += AGENT_SIDE[i] * Math.min(rise, fall)
  })
  return BIAS_X * sum
}

/** Camera pose at p. Narrower viewports pull the camera back along its view line so the agents stay in frame. */
export function cameraAt(p: number, aspect: number = REFERENCE_ASPECT): CameraPose {
  const x = clamp01(p)
  let i = 1
  while (i < CAMERA_KEYS.length - 1 && x > CAMERA_KEYS[i].p) i++
  const a = CAMERA_KEYS[i - 1]
  const b = CAMERA_KEYS[i]
  const h = b.p - a.p
  const t = clamp01((x - a.p) / h)
  const v = CHANNELS.map((ch, c) => hermite(ch(a.pose), ch(b.pose), TANGENTS[i - 1][c], TANGENTS[i][c], h, t))
  const bias = lateralBias(x)
  const pose: CameraPose = {
    position: [v[0] + bias, v[2], v[4]],
    target: [v[1] + 0.35 * bias, v[3], v[5]],
  }
  const k = Math.max(1, REFERENCE_ASPECT / aspect)
  return { position: lerp3(pose.target, pose.position, k), target: pose.target }
}

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

/** Distance at which tags are drawn at full size (the agent-phase framing). */
const TAG_REF_DISTANCE = 4.41

/** HTML tags shrink as the camera pulls back (and on narrower screens), gently, so they stay legible. */
export function tagScale(p: number, aspect: number = REFERENCE_ASPECT): number {
  const { position, target } = cameraAt(p, aspect)
  const d = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2])
  return Math.min(1, Math.max(0.6, Math.sqrt(TAG_REF_DISTANCE / d)))
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
  /** The previous view, mounted only during the short crossfade after a view change. */
  outgoing: ScreenView | null
}

/** Scroll length of the crossfade that follows each view change. */
export const CROSSFADE = 0.012

const VIEW_CHANGES: readonly { at: number; from: ScreenView }[] = [
  { at: 0.12, from: 'prompt' },
  { at: 0.2, from: 'orchestrator' },
  ...AGENT_RANGES.slice(1).map((r, i) => ({ at: r.start, from: AGENT_RANGES[i].id })),
]

const viewChangeAt = (x: number) => VIEW_CHANGES.find((c) => x >= c.at && x < c.at + CROSSFADE) ?? null

/** Incoming view's share of the crossfade: 0 at a view change, 1 once the window has passed. */
export function screenMix(p: number): number {
  const x = clamp01(p)
  const change = viewChangeAt(x)
  return change ? smoothstep((x - change.at) / CROSSFADE) : 1
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
    outgoing: viewChangeAt(x)?.from ?? null,
  }
}

export const frameKey = (f: ScreenFrame): string =>
  `${f.phase}|${f.view}|${f.progress}|${f.statuses.join(',')}|${f.outgoing ?? ''}`

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
  tags: number[]
  rings: RingState[]
  stages: ConvergeStages
  mix: number
  hud: number
  tagScale: number
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
    tags: AGENT_RANGES.map((_, i) => tagReveal(x, i)),
    rings: AGENT_RANGES.map((_, k) => ringState(x, k)),
    stages: convergeStages(x),
    mix: screenMix(x),
    hud: hudFade(x),
    tagScale: tagScale(x, aspect),
  }
}

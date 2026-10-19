# NEXUS "One Run" Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NEXUS landing page: a fixed nav, a pinned scroll-driven 3D "One Run" section (laptop → orchestrator → six agents → network → N), and a footer. It includes a 2D fallback.

**Architecture:** GSAP ScrollTrigger writes a smoothed progress `p ∈ [0,1]` into a ref. Pure functions in `timeline.ts` derive every visual state from `p`. The R3F canvas (`frameloop="demand"`) reads the ref in `useFrame`. React state changes only when the quantized `frameKey(p)` changes. Copy lives in `nexus-story.ts`. The section pins with CSS `position: sticky`.

**Tech Stack:** React 19.3, Vite 8, TypeScript 6, Tailwind 4 (already scaffolded in `frontend/`). New: three 0.186, @react-three/fiber 9.8, @react-three/drei 10.7, gsap 3.15, @gsap/react 2.1, vitest 5, @playwright/test 1.63, @types/three, @fontsource-variable/geist-mono.

**Spec:** `docs/superpowers/specs/2026-09-24-nexus-one-run-hero-design.md`

## Global Constraints

- All work is in `frontend/`. Don't upgrade React: R3F 9.8 requires React `>=19 <19.4`.
- TS flags in force: `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no enums or parameter properties), `noUnusedLocals`/`noUnusedParameters`.
- Tokens: bg `#080808`, text `#E1E5E5`, greys `#C0C4C6 / #838A8F / #666F76 / #20272C / #1C2227`, divider `#1C1E20`, legal `#3A3E40`, glass `rgba(18,25,28,.52)` + `blur(5px)`, pill radius `999px`, Geist 500, tracking −0.003em (display −0.008em uppercase), sizes 52/32/18/16/14/12px.
- Everything visible is a pure function of `p`. No `Math.random`, `Date`, or accumulated state in render or `useFrame` paths.
- React state never updates per scroll frame. Only a `frameKey` change triggers `setState`.
- 3D only when `innerWidth ≥ 768 && WebGL && !prefers-reduced-motion`. Otherwise use `FallbackSequence`.
- The CTA links to `/dashboard`. No dashboard, popup, or backend work.
- Banned: particle systems, heavy gradients, floating decoration, neon, cursor effects, camera spins, sound.
- No copy, imagery, logo, or globe from the analysed reference site.
- The caption has no `aria-live`. The canvas wrapper has `aria-hidden="true"`.
- Git: the branch has unrelated uncommitted user changes. **Stage exact paths only, never `git add -A`.** End each commit message with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Tooling in this repo

- **shadcn MCP** (`.mcp.json`, enabled in `frontend/.claude/settings.local.json`). Not needed; every component here is custom.
- **Skills for Task 10 review:** `ui-craft:design-reviewer` and `ui-craft:a11y-auditor` agents, `web-interface-guidelines`.
- **Browsers:** Playwright uses `PW_CHROMIUM_PATH` if set (an existing Chromium is at `%LOCALAPPDATA%/ms-playwright/chromium-1234/chrome-win64/chrome.exe`). Otherwise run `npx playwright install chromium`.

## Review Focus

1. The 3D chunk fails to load or WebGL throws. The page falls back to `FallbackSequence` and stays usable. (Task 7)
2. The 3D chunk arrives after the visitor has scrolled mid-way. The scene shows the state for the current `p` at once. (Task 9)
3. The viewport crosses 768px mid-session. The page switches cleanly between 3D and fallback. (Task 10)
4. A keyboard user tabs through the page. The faded intro CTA is not focusable once hidden. (Task 10)
5. At 1366×768 and 2560×1440 there's no horizontal overflow, and the caption and rail don't overlap. (Task 10)

---

### Task 1: Test tooling + `timeline.ts` (WHEN)

**Files:** Modify `frontend/package.json`, `frontend/vite.config.ts`. Create `frontend/src/landing/timeline.ts`, `frontend/src/landing/timeline.test.ts`.

**Produces:** `PhaseId`, `AgentId`, `AgentStatus`, `Vec3`, `CameraPose`, `ScreenView`, `ScreenFrame`, `SceneState`, `PHASES`, `AGENT_IDS`, `AGENT_RANGES`, `SCREEN_STEPS=60`, `clamp01`, `smoothstep`, `localProgress`, `phaseAt`, `agentIndexAt`, `agentAt`, `agentStatus`, `agentStatuses`, `agentProgress`, `connectionProgress`, `lidOpen`, `screenOn`, `introVisibility`, `networkIntensity`, `convergeProgress`, `ctaReveal`, `cameraAt(p, aspect=16/9)`, `frameAt`, `frameKey`, `sceneStateAt`.

- [ ] **Step 1:** `cd frontend && npm i -D vitest@^5.0.1`. Add the scripts `"test": "vitest run"` and `"test:e2e": "playwright test"`. In `vite.config.ts`, add `/// <reference types="vitest/config" />` at the top and `test: { include: ['src/**/*.test.{ts,tsx}', 'e2e/**/*.test.ts'], environment: 'node' }`.
- [ ] **Step 2: Write the failing tests** in `timeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { AGENT_RANGES, PHASES, SCREEN_STEPS, agentAt, agentStatuses, cameraAt, connectionProgress, frameAt, localProgress, phaseAt, sceneStateAt } from './timeline'

describe('timeline', () => {
  it('phases and agent ranges are contiguous and match the spec', () => {
    PHASES.forEach((ph, i) => expect(ph.start).toBe(i === 0 ? 0 : PHASES[i - 1].end))
    expect(PHASES.at(-1)!.end).toBe(1)
    expect(AGENT_RANGES.map((r) => [r.id, r.start, r.end])).toEqual([
      ['explorer', 0.2, 0.3], ['knowledge', 0.3, 0.4], ['documentation', 0.4, 0.5],
      ['qa', 0.5, 0.6], ['demo', 0.6, 0.7], ['release', 0.7, 0.8]])
  })
  it('phaseAt boundaries', () => {
    const cases: [number, string][] = [[-1, 'open'], [0, 'open'], [0.05, 'goal'], [0.12, 'orchestrate'], [0.2, 'agents'],
      [0.8, 'network'], [0.9, 'converge'], [0.97, 'still'], [1, 'still'], [2, 'still']]
    for (const [p, id] of cases) expect(phaseAt(p)).toBe(id)
  })
  it('active-agent rule', () => {
    expect(agentStatuses(0.35)).toEqual(['done', 'active', 'idle', 'idle', 'idle', 'idle'])
    expect(agentStatuses(0.1).every((s) => s === 'idle')).toBe(true)
    expect(agentStatuses(0.8).every((s) => s === 'done')).toBe(true)
    for (let p = 0.2; p < 0.8; p += 0.013) expect(agentStatuses(p).filter((s) => s === 'active')).toHaveLength(1)
    expect([agentAt(0.19), agentAt(0.2), agentAt(0.79), agentAt(0.8)]).toEqual([null, 'explorer', 'release', null])
  })
  it('progress helpers stay in [0,1] and are monotonic', () => {
    let prev = -1
    for (let p = 0; p <= 1; p += 0.001) { const v = localProgress(p, AGENT_RANGES[2]); expect(v).toBeGreaterThanOrEqual(prev); expect(v).toBeLessThanOrEqual(1); prev = v }
    expect([connectionProgress(0.1, 0), connectionProgress(0.22, 0), connectionProgress(0.35, 0)]).toEqual([0, expect.closeTo(0.5, 6), 1])
  })
  it('camera: continuous, and narrower aspect pulls back', () => {
    for (let p = 0; p < 1; p += 0.01) {
      const a = cameraAt(p).position, b = cameraAt(p + 1e-4).position
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.01)
    }
    expect(cameraAt(0.5, 1).position[2]).toBeGreaterThan(cameraAt(0.5).position[2])
  })
  it('frames are quantized', () => {
    const f = frameAt(0.25)
    expect(f.view).toBe('explorer')
    expect(Number.isInteger(f.progress * SCREEN_STEPS)).toBe(true)
    expect(frameAt(0.85)).toMatchObject({ view: 'release', progress: 1 })
    expect(frameAt(0.02).view).toBe('prompt')
  })
  it('Test A (pure): jumping 0.2 → 0.7 → 0.2 equals a direct visit', () => {
    const direct = [sceneStateAt(0.2), frameAt(0.2)]
    sceneStateAt(0.7); frameAt(0.7)
    expect([sceneStateAt(0.2), frameAt(0.2)]).toEqual(direct)
  })
  it('Test B (pure): reverse sweep mirrors forward sweep', () => {
    const pts = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 0.93, 0.985]
    const fwd = pts.map((p) => sceneStateAt(p))
    const back = [...pts].reverse().map((p) => sceneStateAt(p)).reverse()
    expect(back).toEqual(fwd)
  })
})
```

- [ ] **Step 3:** Run `npm test`. It should fail because `./timeline` doesn't exist.
- [ ] **Step 4: Implement `timeline.ts`:**

```ts
// WHEN things happen. Pure functions of scroll progress p ∈ [0, 1]. No React, no DOM.
export type PhaseId = 'open' | 'goal' | 'orchestrate' | 'agents' | 'network' | 'converge' | 'still'
export type AgentStatus = 'idle' | 'active' | 'done'
export type Vec3 = readonly [number, number, number]
export interface Range { start: number; end: number }
export interface Phase extends Range { id: PhaseId }

export const PHASES: readonly Phase[] = [
  { id: 'open', start: 0, end: 0.05 }, { id: 'goal', start: 0.05, end: 0.12 },
  { id: 'orchestrate', start: 0.12, end: 0.2 }, { id: 'agents', start: 0.2, end: 0.8 },
  { id: 'network', start: 0.8, end: 0.9 }, { id: 'converge', start: 0.9, end: 0.97 },
  { id: 'still', start: 0.97, end: 1 },
]
export const AGENT_IDS = ['explorer', 'knowledge', 'documentation', 'qa', 'demo', 'release'] as const
export type AgentId = (typeof AGENT_IDS)[number]
export const AGENT_RANGES: readonly (Range & { id: AgentId })[] = [
  { id: 'explorer', start: 0.2, end: 0.3 }, { id: 'knowledge', start: 0.3, end: 0.4 },
  { id: 'documentation', start: 0.4, end: 0.5 }, { id: 'qa', start: 0.5, end: 0.6 },
  { id: 'demo', start: 0.6, end: 0.7 }, { id: 'release', start: 0.7, end: 0.8 },
]

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))
export const smoothstep = (t: number): number => { const x = clamp01(t); return x * x * (3 - 2 * x) }
export const localProgress = (p: number, r: Range): number => clamp01((p - r.start) / (r.end - r.start))
const phaseRange = (id: PhaseId): Phase => PHASES.find((ph) => ph.id === id) as Phase

export function phaseAt(p: number): PhaseId {
  const x = clamp01(p)
  for (const ph of PHASES) if (x < ph.end) return ph.id
  return 'still'
}
export const agentIndexAt = (p: number): number => { const x = clamp01(p); return AGENT_RANGES.findIndex((r) => x >= r.start && x < r.end) }
export const agentAt = (p: number): AgentId | null => { const i = agentIndexAt(p); return i === -1 ? null : AGENT_RANGES[i].id }
/** One active agent at a time; earlier agents done, later agents idle. */
export function agentStatus(p: number, index: number): AgentStatus {
  const r = AGENT_RANGES[index], x = clamp01(p)
  return x < r.start ? 'idle' : x >= r.end ? 'done' : 'active'
}
export const agentStatuses = (p: number): AgentStatus[] => AGENT_RANGES.map((_, i) => agentStatus(p, i))
export const agentProgress = (p: number, i: number): number => localProgress(p, AGENT_RANGES[i])
/** The connection line draws over the first 40% of its agent's range. */
export const connectionProgress = (p: number, i: number): number => clamp01(agentProgress(p, i) / 0.4)

const open = (p: number) => localProgress(p, phaseRange('open'))
export const lidOpen = (p: number): number => clamp01(open(p) / 0.7)
export const screenOn = (p: number): number => clamp01((open(p) - 0.6) / 0.4)
export const introVisibility = (p: number): number => 1 - clamp01(open(p) / 0.5)
export const networkIntensity = (p: number): number => localProgress(p, phaseRange('network'))
export const convergeProgress = (p: number): number => localProgress(p, phaseRange('converge'))
/** Stillness first; the CTA fades in over the last 60% of the still phase. */
export const ctaReveal = (p: number): number => clamp01((localProgress(p, phaseRange('still')) - 0.4) / 0.6)

export interface CameraPose { position: Vec3; target: Vec3 }
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
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
/** Narrower viewports pull the camera back along its view line so the agents stay in frame. */
export function cameraAt(p: number, aspect: number = REFERENCE_ASPECT): CameraPose {
  const x = clamp01(p)
  let pose = CAMERA_KEYS[CAMERA_KEYS.length - 1].pose
  for (let i = 1; i < CAMERA_KEYS.length; i++) {
    const a = CAMERA_KEYS[i - 1], b = CAMERA_KEYS[i]
    if (x <= b.p) { const t = smoothstep((x - a.p) / (b.p - a.p)); pose = { position: lerp3(a.pose.position, b.pose.position, t), target: lerp3(a.pose.target, b.pose.target, t) }; break }
  }
  const k = Math.max(1, REFERENCE_ASPECT / aspect)
  return { position: lerp3(pose.target, pose.position, k), target: pose.target }
}

export type ScreenView = 'prompt' | 'orchestrator' | AgentId
export const SCREEN_STEPS = 60
export interface ScreenFrame { phase: PhaseId; agent: AgentId | null; view: ScreenView; progress: number; statuses: AgentStatus[] }
export function frameAt(p: number): ScreenFrame {
  const x = clamp01(p), phase = phaseAt(x), i = agentIndexAt(x)
  let view: ScreenView, raw: number
  if (phase === 'open' || phase === 'goal') { view = 'prompt'; raw = localProgress(x, phaseRange('goal')) }
  else if (phase === 'orchestrate') { view = 'orchestrator'; raw = localProgress(x, phaseRange('orchestrate')) }
  else if (i !== -1) { view = AGENT_RANGES[i].id; raw = agentProgress(x, i) }
  else { view = 'release'; raw = 1 }
  return { phase, agent: i === -1 ? null : AGENT_RANGES[i].id, view, progress: Math.floor(raw * SCREEN_STEPS) / SCREEN_STEPS, statuses: agentStatuses(x) }
}
export const frameKey = (f: ScreenFrame): string => `${f.phase}|${f.view}|${f.progress}|${f.statuses.join(',')}`

export interface SceneState { p: number; phase: PhaseId; lidOpen: number; screenOn: number; camera: CameraPose; statuses: AgentStatus[]; connections: number[]; network: number; converge: number; cta: number; intro: number }
export function sceneStateAt(p: number, aspect: number = REFERENCE_ASPECT): SceneState {
  const x = clamp01(p)
  return { p: x, phase: phaseAt(x), lidOpen: lidOpen(x), screenOn: screenOn(x), camera: cameraAt(x, aspect), statuses: agentStatuses(x),
    connections: AGENT_RANGES.map((_, i) => connectionProgress(x, i)), network: networkIntensity(x), converge: convergeProgress(x), cta: ctaReveal(x), intro: introVisibility(x) }
}
```

- [ ] **Step 5:** Run `npm test` and confirm all pass. Then run `npm run build` and confirm it exits 0.
- [ ] **Step 6: Commit:** `git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/landing/timeline.ts frontend/src/landing/timeline.test.ts && git commit -m "feat(landing): scroll timeline (WHEN)"`

### Task 2: `nexus-story.ts` (WHAT)

**Files:** Create `frontend/src/landing/nexus-story.ts`, `frontend/src/landing/nexus-story.test.ts`.

**Consumes:** `AgentId`, `PhaseId`, `ScreenView`, `AGENT_IDS`, `clamp01` from `timeline`.

**Produces:**
- **Text:** `GOAL` = "Analyze the onboarding flows of three leading note-taking apps and compare them", `RUN_ID = 'wf_0142'`.
- **Agents:** `AgentStory { id; name; verb; caption; metric }`, where `metric` is either `{kind:'count'; to; format(n)}` or `{kind:'label'; pending; done}`. `AGENTS` follows `AGENT_IDS` order:
  - Explorer: 14 sources
  - Knowledge: 38 entities
  - Documentation: 6 sections
  - QA: `n/24 passed`
  - Demo: `rendering` → `preview ready`
  - Release: `packaging` → `v1.0 packaged`
- **Helpers:** `agentStory(id)` and `metricText(agent, progress)`. `metricText` returns `''` at progress ≤ 0 and the final value at 1.
- **Phase text:** `PHASE_LABELS` and `PHASE_CAPTIONS`, both `Record<PhaseId, string>`. The `still` caption and the `agents` entry are `''`. `captionAt(phase, agent)` and `labelAt(phase, agent)` return the agent's caption/name during `agents`.
- **Page copy:** `INTRO { titleLines: ['One goal.', 'Six agents at work.'], lede }`, `FINALE { title: 'One goal. Six agents. One answer.' }`, `CTA { label: 'Launch NEXUS', href: '/dashboard' }`.
- **Links:** `NAV_LINKS` = How it works → `#one-run`, API → `/docs`. `FOOTER { heading: 'Start with a single goal', columns: Platform[How it works, Dashboard], Resources[API reference /docs, OpenAPI schema /openapi.json], legal: '© 2026 NEXUS' }`.
- **Screen content:**
  - `EXPLORER_SOURCES` (7 × `{url, meta}` on invented domains: inkwell.app, noteloom.io, quillbase.com)
  - `KNOWLEDGE_GRAPH` (9 nodes `{id,label,x,y}` in a 280×140 box, 12 edges `[a,b]`)
  - `DOC {title, sections[6]}`
  - `QA {total: 24, flakyIndex: 2, checks[8]}`
  - `DEMO {title, pending, done}`
  - `RELEASE {files[6], artifact: 'nexus-run-0142.zip', version: 'v1.0', size: '2.4 MB'}`
- **Fallback order:** `STORY_STEPS: {view: ScreenView; label; caption}[]` = prompt, orchestrator, then the six agents (8 steps).

- [ ] **Step 1: Failing tests:**
  - `AGENTS.map(a=>a.id)` equals `AGENT_IDS`.
  - `metricText` returns `''` at 0, `'14 sources'` for explorer at 1, and `'rendering'`/`'preview ready'` for demo at 0.5/1.
  - `captionAt('agents','qa')` equals the QA caption, and every non-agents, non-still phase caption is non-empty.
  - `DOC.sections.length === 6` (it matches the metric).
  - `STORY_STEPS.length === 8`.
  - Every edge index in `KNOWLEDGE_GRAPH` is less than the node count.
- [ ] **Step 2:** Run `npm test` and confirm the new tests fail. **Step 3:** Implement. **Step 4:** Run `npm test` and confirm they pass.
- [ ] **Step 5: Commit** `nexus-story.ts` and its test: "feat(landing): story content (WHAT)".

### Task 3: 3D eligibility

**Files:** Create `frontend/src/landing/eligibility.ts`, `eligibility.test.ts`.

**Produces:**
- `Capabilities {viewportWidth, webgl, reducedMotion}`, `MIN_3D_WIDTH = 768`.
- `is3DEligible(c)` returns `width >= 768 && webgl && !reducedMotion`.
- `hasWebGL()` is cached. It tries `webgl2`, then `webgl`, then releases the probe context via `WEBGL_lose_context`.
- `readCapabilities()`.
- `use3DEligible(): boolean`: `useState(() => is3DEligible(readCapabilities()))`, recomputed on `change` of the `(prefers-reduced-motion: reduce)` and `(min-width: 768px)` media queries.

- [ ] **Step 1: Failing tests:** a table for `is3DEligible`, covering 767 → false, 768 → true, webgl false → false, and reduced motion → false.
- [ ] **Step 2:** Confirm they fail. **Step 3:** Implement. **Step 4:** Confirm they pass. **Step 5:** Commit: "feat(landing): 3D eligibility rule".

### Task 4: Tokens, logo, Nav, Footer, page shell

**Files:**
- **Modify:** `frontend/index.html` (`<html lang="en" class="dark">`, title `NEXUS: One goal. Six agents.`, meta description), `frontend/src/index.css`, `frontend/src/App.tsx`, `frontend/public/favicon.svg` (copy of `brand/nexus/nexus-app-icon.svg`).
- **Delete:** `frontend/src/App.css`, `frontend/src/assets/{hero.png,react.svg,vite.svg}`, `frontend/public/icons.svg`.
- **Create:** `frontend/src/landing/{brand.ts,NexusLogo.tsx,Nav.tsx,Footer.tsx,LandingPage.tsx,landing.css,chrome.test.tsx}`.

**Produces:**
- **`brand.ts`:** `N_POINTS = [[8,34],[8,6],[32,34],[32,6]]`, `N_NODES = [[8,6],[32,34]]`, `NODE_RADIUS = 5`, `NODE_HOLE_RADIUS = 2`, `MARK_STROKE = 4` (in the 40×40 box, y down, same as `brand/nexus`).
- **`NexusLogo`:** `NexusLogo({className})` (160×40, mark plus wordmark paths from `brand/nexus/nexus-logo-dark.svg`, `currentColor`) and `NexusMarkIcon({className})`.
- **`Nav`:** a `header.nav` with `data-scrolled` (a boolean state set only when `scrollY > 40` flips). It holds `a.nav__logo[aria-label="NEXUS home"]`, `nav.nav__menu[aria-label="Primary"] > a.nav__link`, and `a.button.button--dark.nav__cta`.
- **`Footer`:** `footer.footer > .footer__top(.footer__lead(h2.footer__heading, a.button--light), .footer__cols(.footer__col(p.footer__col-title, ul a.footer__link)))`, followed by `.footer__bottom(NexusLogo.footer__logo, p.footer__legal)`.
- **`LandingPage`:** `<Nav/><main id="main" /><Footer/>` for now.

- [ ] **Step 1:** Run `npm i @fontsource-variable/geist-mono@^5.3.0`.
- [ ] **Step 2: Failing test** `chrome.test.tsx`, using `renderToStaticMarkup`:
  - Nav contains `aria-label="NEXUS home"`, both `NAV_LINKS` hrefs, and `href="/dashboard"` with the text `Launch NEXUS`.
  - Footer contains the heading, both column titles, and `© 2026 NEXUS`.
- [ ] **Step 3: `index.css`:**
  - Keep the four `@import`s, adding `@import '@fontsource-variable/geist-mono';`.
  - Keep `@custom-variant dark` and the whole `@theme inline` block.
  - Replace `:root` with the `--nx-*` tokens from Global Constraints (`--nx-font-sans: 'Geist Variable', Arial, sans-serif`, `--nx-font-mono: 'Geist Mono Variable', ui-monospace, monospace`) plus the shadcn variables with the values from the current `.dark` block.
  - Delete the starter `:root` text block, the `prefers-color-scheme` block, `#root`, `h1/h2/p/code/.counter` rules, and `.dark`.
  - Keep `@layer base`.
  - Add unlayered `html { color-scheme: dark; background: var(--nx-bg) }` and `body { margin:0; background: var(--nx-bg); color: var(--nx-text); font: 500 16px/1.3 var(--nx-font-sans); letter-spacing: -0.003em; -webkit-font-smoothing: antialiased }`.
- [ ] **Step 4: `landing.css`:** exact values:
  - **`.button`:** inline-flex, pill radius, 16px/16px, weight 500, padding 18px 24px, `transition: color .2s, background-color .2s`, `:focus-visible` 2px outline with 3px offset.
    - `--light`: bg text / color bg, hover bg `#DFE3E3` color grey-500.
    - `--dark`: bg `#1C2227`, padding 16px 32px, 14px/16px, hover bg `#12191C` color grey-300.
  - **`.nav`:** fixed top, z 50, height 64px, border-box, padding 16px 32px 0, grid `1fr auto 1fr`.
    - Logo svg 116×29.
    - `.nav__menu`: flex, gap 24px, transitions opacity .3s and transform .5s. It's hidden when `data-scrolled=true` (opacity 0, translateY(-8px), visibility hidden, pointer-events none).
    - `.nav__link`: 14px/18.2px, opacity .55 → 1 on hover, padding 8px 0.
    - `.nav__cta`: justify-self end.
  - **Shared type:** `.display` is 52px/52px uppercase, −0.008em, weight 500, margin 0. `.display--small` is 32px/35.2px. `.lede` is 18px/23.4px grey-300, max-width 650px.
  - **`.footer`:** relative, z 1, bg, padding 186px 32px 24px.
    - `.footer__top`: flex, space-between, wrap.
    - `.footer__heading`: the display values, max-width 500px, margin-bottom 64px.
    - `.footer__cols`: grid `repeat(2, 214.5px)`, gap 20px.
    - `.footer__col-title`: 14px uppercase grey-500, margin 0 0 8px.
    - `.footer__link`: block, 14px/18.2px grey-300, padding 8px 0, hover grey-500.
    - `.footer__bottom`: margin-top 280px, border-top 1px `#1C1E20`, padding-top 16px, flex space-between.
    - `.footer__logo`: 80×20 grey-500.
    - `.footer__legal`: 12px/15.6px `#3A3E40`.
  - **`@media (max-width: 767px)`:** hide `.nav__menu`, `.display` 36px/36px, `.footer` padding 120px 20px 24px, `.footer__cols` `1fr 1fr`, `.footer__bottom` margin-top 120px.
- [ ] **Step 5:** Implement the components. Point `App.tsx` at `<LandingPage/>`, which imports `./landing.css`. Delete the starter files.
- [ ] **Step 6:** Run `npm test` and `npm run build` (both should pass). Then run `npm run dev` and check the nav and footer at 1920px against `clone-workspace/apip-partnership/01-recon/screenshots/interaction-states/partnership--scroll-2063.png` for rhythm only (not identity).
- [ ] **Step 7: Commit** the listed paths, including the deletions: "feat(landing): tokens, NEXUS logo, nav and footer".

### Task 5: Screen views

**Files:** Create `frontend/src/landing/screen/{util.ts,ScreenBar.tsx,PromptView.tsx,OrchestratorView.tsx,ExplorerView.tsx,KnowledgeView.tsx,DocsView.tsx,QAView.tsx,DemoView.tsx,ReleaseView.tsx,ScreenContent.tsx,screen.css,views.test.tsx}`.

**Produces:**
- **`util.ts`:**
  - `ViewProps { progress: number }`.
  - `visibleCount(progress, total)` = `Math.min(total, Math.floor(clamp01((progress - 0.05) / 0.85) * total + 1e-9))`.
  - `pct(t)` returns `"xx.xx%"`.
  - `GLYPH = {done:'✓', active:'●', idle:'○', fail:'✕'}` and `RowState`.
- **`ScreenContent({view, progress})`:** renders `<div className="screen" data-screen={view}>` with the one active view, via a `Record<ScreenView, ComponentType<ViewProps>>` lookup.

Views: every value is derived from `progress`. There are no timers and no CSS animations (the caret is static).

| View | Renders |
|---|---|
| Prompt | Bar "Prompt · New run". `GOAL.slice(0, round(len · clamp01(progress/0.85)))` plus a caret. `Run →` pill gets `.is-pressed` at progress ≥ 0.9 |
| Orchestrator | Bar `${RUN_ID} · planning/scheduled`. A `pre.code` with `orchestrator.submit_workflow({"goal": "<first 36 chars>…"}, user_id="landing")`. "Planning task…" or "Plan ready. Six agents assigned." Six rows: ✓ assigned for `i < visibleCount`, otherwise ○ |
| Explorer | A `.scan` 1px line at `top: pct(0.15 + 0.75·progress)`. Seven source rows: done shows meta, active shows "fetching", idle shows blank |
| Knowledge | SVG `viewBox 0 0 280 140`. Nodes appear by `visibleCount`. Edges appear by `visibleCount(clamp01((progress-0.2)/0.8))` and only when both endpoints are visible |
| Docs | Title, then written sections as `h4 "n. Section"` plus a `.doc__line` bar, then a caret while writing |
| QA | Eight rows. At `i === passed === flakyIndex` the row shows ✕ "failed · retrying". Once past, it shows "passed on retry". The bar shows `${round(24·clamp01(progress/0.9))}/24 passed` |
| Demo | A wireframe cube in SVG `0 0 200 120`, rotated `progress·1.5π`, tilt 0.45, perspective `s = 110/(4+depth)`, coordinates `toFixed(2)`. A title row with pending/done text and a `.bar` at `pct(progress)` |
| Release | File rows appear over the first half (`visibleCount(clamp01(progress/0.5))`) and fade with `1 - clamp01((progress-0.5)/0.3)`. From 0.5 on, an `.artifact[data-ready]` shows name, %, and then `v1.0 · 2.4 MB`, with a bar at `pct(clamp01((progress-0.5)/0.45))` |

**`screen.css`:** em-based, so one design serves both 3D and fallback.
- **Frame:** `.screen-frame { --screen-cols: 40; container-type: inline-size; position: relative; width: 100%; aspect-ratio: 16/10; background: #0B0D0F }`.
- **Screen:** `.screen { position:absolute; inset:0; box-sizing:border-box; overflow:hidden; padding:1.2em 1.5em; display:flex; flex-direction:column; gap:.9em; font: 500 calc(100cqw / var(--screen-cols))/1.5 var(--nx-font-mono); color: var(--nx-text); text-align:left }`.
- **Details:**
  - The bar is .7em uppercase grey-500 with a 1px `#1C2227` bottom border.
  - Rows use `.rows__main` with an ellipsis.
  - The prompt text is 1.35em sans.
  - `.graph` circles use `currentColor` and lines grey-500 at .6.
  - The wire stroke is text colour at 1.2.
  - `.bar` is .3em pill `#1C2227` with a text-coloured fill.
  - Fail glyph `#C9A27A` is the only warm tone.

- [ ] **Step 1: Failing tests** `views.test.tsx`, using `renderToStaticMarkup`:
  - (a) For every view and every step `s/60`, rendering twice gives identical markup and doesn't throw.
  - (b) Prompt at 0 has no goal text; at 1 it has the full `GOAL` and `is-pressed`.
  - (c) Explorer at 1 has 7 `✓`.
  - (d) QA at the progress where `visibleCount === flakyIndex` contains `failed · retrying`.
  - (e) Release at 1 has `data-ready="true"` and `nexus-run-0142.zip`.
  - (f) `ScreenContent` sets `data-screen` for each view.
- [ ] **Step 2:** Confirm they fail. **Step 3:** Implement. **Step 4:** Confirm they pass, then run `npm run build`.
- [ ] **Step 5:** Commit: "feat(landing): NEXUS workspace screen views".

### Task 6: Caption, ProgressRail, FallbackSequence

**Files:** Create `frontend/src/landing/{Caption.tsx,ProgressRail.tsx,FallbackSequence.tsx,overlays.test.tsx}`. Modify `LandingPage.tsx`, `landing.css`.

**Produces:**
- **`Caption({frame: Pick<ScreenFrame,'phase'|'agent'>})`:** returns `null` when the caption is empty. Otherwise it renders `p.caption[data-phase] > span.caption__label + span.caption__text`, with **no aria-live**.
- **`ProgressRail({statuses})`:** `nav.rail[aria-label="Pipeline progress"] > ol > li.rail__item[data-status]`, with `aria-current="step"` on the active item, a dot, a name, and `sr-only` text ", queued/working/done".
- **`FallbackSequence()`:**
  - `div.fallback#one-run` starts with an intro section (`h1.display` with `INTRO` lines, `p.lede`, CTA).
  - Then `ol` with one `li.fallback__step[data-visible="false"]` per `STORY_STEPS`. Each has a copy block and an `aria-hidden` `.flat-laptop` holding `.screen-frame > ScreenContent progress={1}`.
  - Then `li.fallback__step.fallback__finale` with `NexusMarkIcon`, `FINALE.title`, and the CTA.
  - An `IntersectionObserver` (threshold .2) sets `data-visible="true"` once per step.
- **`LandingPage`:** renders `<FallbackSequence/>` in `main` for now.

**CSS:**
- **Caption:** absolute, left 32px, bottom 40px, z 20, max-width 420px. The label is 12px uppercase .04em grey-500. The text is 18px/23.4px grey-300.
- **Rail:** absolute, right 32px, vertically centred, z 20. Items are 12px, `row-reverse`, gap 10px. The dot is 6px grey-700. Active: text colour with a 4px ring `rgba(225,229,229,.12)`. Done: grey-300.
- **Fallback:**
  - Padding 140px 32px 80px, gap 120px.
  - Each step is a grid `minmax(0,360px) minmax(0,720px)`, gap 64px, centred.
  - The laptop lid is `#15181B` with a 1px `#20272C` border, radius 14px, padding 12px. The base is 12px `#2B3036` with a −6% side margin and bottom radius 14px.
  - `@media (max-width:767px)`: steps stack to 1 column, and `.fallback .screen-frame { aspect-ratio: 3/4; --screen-cols: 26 }`.
  - `@media (prefers-reduced-motion: no-preference)`: `[data-visible=false]` has opacity 0 and translateY(16px), with an opacity/transform transition of .6s.

- [ ] **Step 1: Failing tests:**
  - The caption has no `aria-live` and shows "Explorer" for the explorer frame.
  - The caption is `null` for `still`.
  - The rail marks only the active item with `aria-current="step"`.
  - The fallback markup has 9 `fallback__step` and 8 `data-screen`.
- [ ] **Step 2:** Confirm they fail. **Step 3:** Implement. **Step 4:** Confirm they pass. Run `npm run build`, then check `npm run dev` at 1440px and 375px.
- [ ] **Step 5:** Commit: "feat(landing): captions, progress rail and 2D fallback".

### Task 7: E2E harness + OneRunSection + lazy Scene3D shell

**Files:**
- **Create:** `frontend/playwright.config.ts`, `frontend/e2e/{helpers.ts,loading.spec.ts}`, `frontend/src/landing/{OneRunSection.tsx,SceneBoundary.tsx,debug.ts,debug.test.ts}`, `frontend/src/landing/scene/{Scene3D.tsx,CameraRig.tsx,constants.ts}`.
- **Modify:** `LandingPage.tsx`, `landing.css`.

**Produces:**
- **`debug.ts`:**
  - `roundDeep(v)` rounds numbers to 1e-5, recursively.
  - `registerReporter(name, fn): () => void` is a no-op unless the URL has `?nexus-debug`.
  - `installDebugHook({section, progress})` sets `window.__nexus = { scrollToProgress(p), snapshot() }`. `scrollToProgress` scrolls to `round(sectionTop + p·(offsetHeight − innerHeight))`. `snapshot` returns `roundDeep({p, ...reporters})`.
- **`SceneBoundary`:** a class error boundary with an `onError` prop. It renders `null` after an error.
- **`OneRunSection({onSceneError})`:**
  - Renders `section#one-run.one-run` (height 1000vh) containing a sticky `.one-run__stage` (100svh, overflow hidden).
  - The stage holds `SceneBoundary > Suspense(fallback=null) > lazy Scene3D`, then `div.intro` (`h1#one-run-title.display`, `.lede`, CTA), `Caption`, `ProgressRail`, and `div.finale` (`p.display.display--small`, CTA).
  - `useGSAP` makes a `gsap.to(proxy, {p:1, ease:'none', scrollTrigger:{trigger, start:'top top', end:'bottom bottom', scrub:0.6}, onUpdate})`. `apply(p)`:
    1. sets `progressRef.current = p`;
    2. writes `opacity` and `visibility` for the intro (`introVisibility`) and finale (`ctaReveal`), where 0 means hidden so the link leaves the tab order;
    3. calls `setFrame` **only** when `frameKey` changes;
    4. calls `invalidateRef.current()`.
  - Registers the `dom` reporter: `{phase, key, caption text, rail statuses, screen: .screen outerHTML, intro, finale}`.
- **`Scene3D` (default export, props `{progressRef, invalidateRef, frame}`):** `div.scene[aria-hidden=true]` wrapping `<Canvas frameloop="demand" flat dpr={[1,1.75]} gl={{antialias:true, alpha:true}} camera={{fov:40, near:0.1, far:60, position:[0,1.6,7.5]}}>`. Inside:
  - `InvalidateBridge`: puts `useThree(s=>s.invalidate)` into `invalidateRef` and invalidates on mount.
  - `CameraRig`: in `useFrame`, `cameraAt(p, size.width/size.height)`, then `position.set`, `lookAt`, `updateMatrixWorld`. It registers a `camera` reporter.
  - Lights: ambient 0.35, key directional `[3,5,4]` 1.1, rim directional `[-2,3,-5]` 1.6 `#C9D4DC`.
- **`constants.ts`:** mutable `[number,number,number]` tuples for R3F props:
  - `LID_ORIGIN = [0,0.1,-1]`, `LID_CLOSED = π/2`, `LID_OPEN = -0.2`
  - `SCREEN_W = 2.6`, `SCREEN_H = 1.625`, `SCREEN_CENTER_Y = 1.02`, `SCREEN_PX_W = 1280`, `SCREEN_PX_H = 800`
  - `SCREEN_DISTANCE_FACTOR = SCREEN_W·400/SCREEN_PX_W` (drei `<Html transform>` maps 1 CSS px to `distanceFactor/400` world units)
  - `TAG_POSITIONS`: `[-2.2,1.7,-0.3]`, `[-2.6,0.8,0.2]`, `[-2,-0.1,0.7]`, `[2,-0.1,0.7]`, `[2.6,0.8,0.2]`, `[2.2,1.7,-0.3]`
  - `LINE_STARTS` (lid-local `[x,y]`): `[-1.2,1.6]`, `[-1.3,1.02]`, `[-1.2,0.45]`, `[1.2,0.45]`, `[1.3,1.02]`, `[1.2,1.6]`
  - `MARK_CENTER = [0,1,0.45]`, `MARK_SCALE = 0.06`
  - `screenPoint(x,y)` is the world point on the open screen: `(x,y,0.02)` rotated by `LID_OPEN` about X, plus `LID_ORIGIN`.
  - `markPoint(bx,by)` is `MARK_CENTER + ((bx−20)·s, −(by−20)·s, 0)`.
- **`LandingPage`:** `const eligible = use3DEligible(); const [failed, setFailed] = useState(false)`, then renders `eligible && !failed ? <OneRunSection onSceneError={() => setFailed(true)} /> : <FallbackSequence/>`.
- **CSS:**
  - `.scene`: absolute, inset 0, z 0.
  - `.intro`: absolute, inset 0, flex column centred, padding-top 151px, z 20, pointer-events none (links auto). The lede has margin 21.6px 0 43.2px.
  - `.finale`: absolute, left/right 0, bottom 12vh, flex column centred, gap 32px, z 20, initially opacity 0 and hidden.

- [ ] **Step 1:** Run `npm i gsap@^3.15.0 @gsap/react@^2.1.2 three@^0.186.0 @react-three/fiber@^9.8.0 @react-three/drei@^10.7.8 && npm i -D @types/three@^0.186.0 @playwright/test@^1.63.0`.
- [ ] **Step 2: `playwright.config.ts`:**
  - `testDir './e2e'`, `testMatch '**/*.spec.ts'`, workers 1, timeout 60s.
  - `use: { baseURL 'http://localhost:4173', viewport 1920×1080, launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] } }`.
  - `webServer: { command: 'npm run build && npm run preview -- --port 4173 --strictPort', url, reuseExistingServer: true, timeout: 180000 }`.
- [ ] **Step 3: `e2e/helpers.ts`:**
  - `openLanding(page)`: go to `/?nexus-debug` and wait until `window.__nexus` exists and `'camera' in snapshot()`.
  - `settle(page)`: poll `snapshot()` every 150ms until two consecutive JSON strings match. Throw after 60 polls.
  - `goToProgress(page, p)`: `scrollToProgress`, then `settle`.
- [ ] **Step 4: Failing tests:**
  - **`debug.test.ts`:** `roundDeep({a:[1.123456789], b:{c:2.0000001}})` gives `{a:[1.12346], b:{c:2}}`.
  - **`loading.spec.ts` (Review Focus 1 and the loading acceptance criterion):**
    - (a) Hold `/Scene3D-.*\.js$/` behind a promise. Then the h1, `.nav`, and the first "Launch NEXUS" link are visible and focusable while `canvas` count is 0. Release the chunk and the canvas count becomes 1.
    - (b) `route.abort()` on the chunk shows `.fallback` with a visible h1.
- [ ] **Step 5:** Confirm they fail. **Step 6:** Implement. Run `npm run build`, then `ls dist/assets` to confirm a `Scene3D-*.js` chunk exists (adjust the regex if Vite names it differently).
- [ ] **Step 7:** Run `npm test` and `npm run test:e2e -- loading.spec.ts` and confirm they pass.
- [ ] **Step 8:** Commit: "feat(landing): pinned One Run section, scrubbed progress, lazy 3D shell".

### Task 8: Laptop + screen in 3D

**Files:** Create `frontend/src/landing/scene/Laptop.tsx`, `frontend/e2e/one-run.spec.ts`. Modify `Scene3D.tsx` (render `<Laptop progressRef frame />`).

**Produces:** `Laptop({progressRef, frame})`:
- **Materials** (memoized, disposed on unmount):
  - body `MeshStandard #2B3036`, metalness .55, roughness .42
  - keys `#15181B`, .2 / .75
  - pad `#23272C`, .4 / .5
  - screen `MeshBasic`, colour lerped `#050607` → `#0B0D0F`
- **Base:** `RoundedBox [3,0.1,2.1]`, radius .045, smoothness 4, at y .05.
- **Keyboard:** an `instancedMesh` of 70 keys (14×5, pitch .19, box .165×.012×.165, y .106, z from −.72), with matrices set once in `useLayoutEffect`.
- **Trackpad:** box `[.95,.004,.55]` at `[0,.101,.6]`.
- **Hinge:** cylinder r .04 × 2.7 at `LID_ORIGIN`, rotated z π/2.
- **Lid group** at `LID_ORIGIN`:
  - `RoundedBox [3,2,.06]` at `[0,1,-.03]`
  - screen plane `[SCREEN_W, SCREEN_H]` at `[0,SCREEN_CENTER_Y,.002]`
  - `pointLight` at `[0,SCREEN_CENTER_Y,.9]`, distance 4, `#DFE6EA`
  - `<Html transform distanceFactor={SCREEN_DISTANCE_FACTOR} position={[0,SCREEN_CENTER_Y,.004]} zIndexRange={[10,0]} style={{width:1280,height:800,pointerEvents:'none'}}>` wrapping `div.screen-frame` (1280×800, initial opacity 0) with `ScreenContent view={frame.view} progress={frame.progress}`
- **`useFrame`:**
  - `lid.rotation.x = lerp(LID_CLOSED, LID_OPEN, smoothstep(lidOpen(p)))`
  - `on = screenOn(p)·(1 − 0.7·convergeProgress(p))`, then light intensity `1.4·on`, screen colour lerp, and the wrapper `style.opacity = on.toFixed(3)` written only when changed
  - If the Html wrapper ref isn't mounted yet, call `state.invalidate()` for another frame.
- **Reporter:** `laptop {lid, glow, screen}`.

- [ ] **Step 1: Failing test** in `one-run.spec.ts`:
  - For `p` in `[0, .03, .08, .16, .25, .35, .45, .55, .65, .75, .85, .93, .985]`: `goToProgress`, assert `snap.dom.phase === phaseAt(snap.p)` (import from `../src/landing/timeline`), and save `info.outputPath('phase-<p>.png')` as a visual reference only.
  - At 0.08 the snapshot `laptop.lid` equals `LID_OPEN` (±1e-4) and `dom.screen` contains `data-screen="prompt"`.
- [ ] **Step 2:** Confirm it fails. **Step 3:** Implement. **Step 4:** Confirm it passes. Look at the phase-0.08 and 0.16 screenshots: the screen text must be crisp and the laptop simple and graphite.
- [ ] **Step 5:** Commit: "feat(landing): custom laptop with live NEXUS screen".

### Task 9: Agent network + NEXUS mark + Tests A/B

**Files:** Create `frontend/src/landing/scene/{AgentNetwork.tsx,NexusMark.tsx}`. Modify `Scene3D.tsx` (render both), `landing.css`, `e2e/one-run.spec.ts`.

**Produces:**
- **`AgentNetwork({progressRef})`:**
  - **Connection lines (six):** a `QuadraticBezierCurve3` from `screenPoint(LINE_STARTS[i])` to `TAG_POSITIONS[i]`, with control point = midpoint + `(0,.35,.3)`, 48 segments, `LineDashedMaterial #E1E5E5` (dash .06, gap .05, transparent, `depthWrite` false), `computeLineDistances`, base distances kept.
  - **Morph target:** line i maps onto half of N stroke `floor(i/2)` (half `i%2`) via `markPoint`.
  - **Per frame, from `p` only:**
    - Positions lerp curve → N by `smoothstep(convergeProgress)`, recomputed only when that value changes.
    - `setDrawRange(0, drawn ≥ 1 ? 49 : round(drawn·49))`, where `drawn = connectionProgress`.
    - Active: dashed, distances = base − `agentProgress·2` (the flow), opacity .75.
    - Otherwise: solid (dash 1000, gap 0), opacity `(.35 + .5·networkIntensity)·(1 − clamp01((c−.7)/.3))`.
  - **Network ring:** six ring lines tag i → i+1 (25 points, `LineBasic`), drawRange `round(networkIntensity·25)`, opacity `.18·(1 − smoothstep(clamp01(c/.5)))`.
  - **Tags:** `<Html position={TAG_POSITIONS[i]} center zIndexRange={[12,11]}>` holding `div.agent-tag-wrap > div.agent-tag[data-status] > span.agent-tag__icon + span.agent-tag__name + span.agent-tag__metric`. In `useFrame`, write `data-status`, the metric text (`metricText(agent, agentProgress)`), and wrapper opacity `1 − smoothstep(clamp01(c/.6))`, **only when changed**. Call `state.invalidate()` while any tag ref is missing.
  - **Reporter:** `network {statuses, metrics, draws, lineOpacity, rings, tagFade}`.
- **`NexusMark({progressRef})`:**
  - A drei `<Line points={N_POINTS→markPoint} lineWidth={MARK_STROKE·MARK_SCALE} worldUnits color="#E1E5E5" transparent opacity={0}>`, with opacity `smoothstep(clamp01((c−.5)/.5))`.
  - Two node rings (`ringGeometry` hole/outer = `NODE_HOLE_RADIUS`/`NODE_RADIUS` × `MARK_SCALE`, 48 segments), each **scaled in its own group** by `smoothstep(clamp01((c−.6)/.4))`.
  - **Reporter:** `mark {stroke, nodes}`.
- **CSS:**
  - `.agent-tag`: inline-flex, gap 8px, padding 14px 22px, pill, glass bg + `backdrop-filter: blur(5px)` (and `-webkit-`), 14px/18.2px, nowrap, 1px transparent border, transition opacity/box-shadow/border-color .4s.
  - States: `[data-status=idle]` opacity .4. `active` has a border `rgba(225,229,229,.16)` and shadow `0 0 28px rgba(225,229,229,.10)`.
  - Icon `::before` content: ○ idle, ● active, ✓ done.
  - `.agent-tag__metric`: grey-400, tabular numbers, `:empty` hidden.

- [ ] **Step 1: Failing tests** added to `one-run.spec.ts`:
  - **Test A:** page 1 goes directly to 0.2 → A. Page 2 (`context.newPage()`) goes to 0.7, then 0.2 → B. Expect `B` toEqual `A`. Also page 2 at 0.7 equals a fresh page 3 at 0.7.
  - **Test B:** for `[.2,.3,.4,.5,.6,.7]` and then `[.84,.93,.985]`, collect snapshots forward and backward, and expect `backward.reverse()` toEqual `forward`. The snapshots cover screen content (`dom.screen`), agent states, connection draws, camera, and the mark.
  - **Late load (Review Focus 2):** delay the chunk 2.5s, `scrollToProgress(.55)` before it arrives, wait for `'network' in snapshot()`, `settle`. It must equal a fresh page's `goToProgress(.55)`.
  - **Active-agent rule:** at .35, `network.statuses` equals `['done','active','idle','idle','idle','idle']` and the rail's `aria-current` item text is Knowledge.
- [ ] **Step 2:** Confirm they fail. **Step 3:** Implement. **Step 4:** Confirm all e2e tests pass. Check the .45, .85, .93, and .985 screenshots: agents clearly working, the network ring visible, the N formed, and a still frame with the CTA.
- [ ] **Step 5:** Commit: "feat(landing): agent network and convergence into the NEXUS mark".

### Task 10: Style gate, fallback, a11y, layout, final review

**Files:** Create `frontend/e2e/{compare-styles.ts,compare-styles.test.ts,style-assertions.json,styles.spec.ts,fallback.spec.ts,a11y.spec.ts}`.

**Produces:**
- **`compare-styles.ts`** (own implementation; the methodology repo has no license, so its script isn't copied):
  - `StyleAssertion {selector, prop, expected}`.
  - `valueMatches(expected, actual)`: if `expected` is purely numeric with a px/em/rem/% unit, it passes within ±1 (±0.01 for em). Otherwise it's a whitespace-normalized, case-insensitive string match. Missing actual fails.
  - `compareStyles(assertions, actual) → {total, passed, failed, failures}`.

- [ ] **Step 1: Failing tests:**
  - **`compare-styles.test.ts`:** `'52px'` vs `'52.4px'` passes and vs `'54px'` fails. `'-0.003em'` vs `'-0.004em'` passes. `'rgb(8, 8, 8)'` vs `'RGB(8,8,8)'` fails (the space normalizes but the comma spacing differs), so write expected values exactly as Chrome serializes them. `null` actual fails.
  - **`style-assertions.json`:** the tokens as Chrome serializes them:

| Selector | Assertions |
|---|---|
| `body` | bg `rgb(8, 8, 8)`, color `rgb(225, 229, 229)` |
| `.nav` | height 64px, position fixed |
| `.nav__link` | fontSize 14px |
| `.nav__cta` | bg `rgb(28, 34, 39)`, borderTopLeftRadius 999px, paddingTop 16px, paddingLeft 32px, height 48px |
| `.intro .display` | fontSize 52px, lineHeight 52px, letterSpacing −0.416px, textTransform uppercase, fontWeight 500 |
| `.intro .lede` | 18px, lineHeight 23.4px, color `rgb(192, 196, 198)` |
| `.intro .button--light` | bg `rgb(225, 229, 229)`, color `rgb(8, 8, 8)`, paddingTop 18px, paddingLeft 24px, height 52px |
| `.agent-tag` | bg `rgba(18, 25, 28, 0.52)`, backdropFilter `blur(5px)`, paddingTop 14px, paddingLeft 22px, fontSize 14px |
| `.caption__text` | 18px, `rgb(192, 196, 198)` |
| `.footer__heading` | 52px |
| `.footer__col-title` | color `rgb(102, 111, 118)`, uppercase |
| `.footer__link` | color `rgb(192, 196, 198)`, paddingTop 8px |
| `.footer__bottom` | borderTopColor `rgb(28, 30, 32)` |
| `.footer__legal` | 12px, color `rgb(58, 62, 64)` |

  - **`styles.spec.ts`:** `openLanding`, wait for `.agent-tag`, read `getComputedStyle` for each assertion, then run `compareStyles`. Write `info.outputPath('style-metrics.json')` and expect `failures` toEqual `[]`.
  - **`fallback.spec.ts`:**
    - (a) With `reducedMotion: 'reduce'`: `.fallback` is visible, there's no canvas, 9 `.fallback__step`, 8 `.fallback [data-screen]`, and the finale CTA href is `/dashboard`.
    - (b) At 375×667: the fallback shows and `scrollWidth <= clientWidth`.
    - (c) Review Focus 3: 1280 → 700 → 1280 goes canvas → fallback → canvas.
  - **`a11y.spec.ts`:**
    - (a) Review Focus 4: Tab order from the top reaches "NEXUS home", "How it works", "API", then "Launch NEXUS" twice. After `goToProgress(.5)`, `.intro a` is hidden and not reachable by Tab.
    - (b) `.caption` has no `aria-live`, `.scene` has `aria-hidden="true"`, and at .35 `aria-current="step"` sits on Knowledge.
    - (c) Review Focus 5: at 1366×768 and 2560×1440, at p .35, there's no horizontal overflow and the `.caption` and `.rail` bounding boxes don't intersect.
- [ ] **Step 2:** Confirm they fail where the code needs changes. **Step 3:** Fix CSS or code until they pass. **Step 4:** Run `npm test && npm run test:e2e && npm run build && npm run lint`, all green.
- [ ] **Step 5: Review.** Run `ui-craft:design-reviewer` and `ui-craft:a11y-auditor` on `frontend/src/landing/` and apply the material findings. Then run the `web-interface-guidelines` skill. Re-run the full test command.
- [ ] **Step 6:** Commit: "test(landing): style gate, fallback, a11y and layout checks".

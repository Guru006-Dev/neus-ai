# NEXUS Landing — "One Run" Scroll Experience

Date: 2026-09-24 · Status: approved · Scope: landing page only

```
NEXUS
├── Nav
├── ONE RUN
│   ├── Laptop opens → Goal entered → Orchestrator plans
│   ├── Explorer → Knowledge → Documentation → QA → Demo → Release
│   └── Network revealed → Network → N → Stillness → CTA
└── Footer
```

## 1. Intent

The NEXUS landing page tells the story of one real NEXUS run as the visitor scrolls: a goal goes in, the orchestrator plans, six agents do visible work, and the network they form converges into the NEXUS mark. The visitor should come away feeling "NEXUS is actually working," not "six labels float around a laptop."

The sequence **Laptop → Orchestrator → Agents → Network → N** is the brand's signature and should be treated as such.

**Success criteria**
- The six-agent section (60% of the scroll) is the clear centre of the experience.
- Screen content reads as a believable NEXUS workspace, not a generic fake dashboard.
- Motion is sophisticated but the interface stays minimal.
- Any scroll position renders the same state no matter how the visitor got there.
- Mobile, portrait-tablet, reduced-motion and no-WebGL visitors get a fallback that tells the same story and is designed with the same care.

**Out of scope:** the start-a-run popup, the dashboard, backend changes. The CTA links to `/dashboard`.

## 2. Page structure

1. **Nav**: fixed, 64px tall, 32px side padding. NEXUS logo left, links centre (fade out on scroll), dark pill "Launch NEXUS" right.
2. **One Run section**: pinned for about 1000vh of scroll. Holds the 3D scene, screen content, captions and progress rail.
3. **Footer**: closing headline and link columns, with no CTA of its own: the One Run finale's "Launch NEXUS" is the page's single closing CTA. Link columns (Platform, Resources; Contact and Socials are added once real links exist), bottom row with a 1px divider.

## 3. Scroll timeline (`timeline.ts`)

One progress value `p ∈ [0,1]` is written by GSAP ScrollTrigger (`scrub`) into a ref. Everything visible is a pure function of `p`.

| Range | Phase | What happens |
|---|---|---|
| 0.00–0.05 | `open` | Laptop closed → lid opens → screen lights up |
| 0.05–0.12 | `goal` | The user's goal is typed into the prompt; RUN activates |
| 0.12–0.20 | `orchestrate` | Orchestrator plans; the agent checklist and logs appear |
| 0.20–0.80 | `agents` | Six agents, 0.10 each: Explorer, Knowledge, Documentation, QA, Demo, Release |
| 0.80–0.90 | `network` | Camera pulls back; the full agent network is visible; connections intensify |
| 0.90–0.97 | `converge` | The network converges into the NEXUS "N" |
| 0.97–1.00 | `still` | Stillness, then the headline and "Launch NEXUS" CTA fade in |

**Agent ranges** (inside `agents`)

| Range | Agent |
|---|---|
| 0.20–0.30 | Explorer |
| 0.30–0.40 | Knowledge |
| 0.40–0.50 | Documentation |
| 0.50–0.60 | QA |
| 0.60–0.70 | Demo |
| 0.70–0.80 | Release |

**Active-agent rule:** during the agent phase, only one agent is the primary active agent at a time. Completed agents remain visible in the done state, while upcoming agents remain idle. For example, at p = 0.35:

```
Explorer       ✓
Knowledge      ●
Documentation  ○
QA             ○
Demo           ○
Release        ○
```

Before 0.20 all agents are idle; from 0.80 on all are done.

Helpers: `phaseAt(p)`, `localProgress(p, phase)`, `agentAt(p)`, `agentStatus(p, agentIndex)` (`idle | active | done`), `cameraAt(p)` (interpolated keyframes). No React, no side effects.

## 4. The six agents (the centrepiece)

Each agent has three coordinated layers: its **tag** (minimal), its **connection line**, and the **laptop screen**. The tag stays restrained; the activity lives in the line, the screen and small data elements.

**Tag states**
- **idle**: 40% opacity, no line.
- **active**: full opacity, a soft glow, the line draws from the laptop to the tag with a flowing dash, and a small counter ticks up.
- **done**: a ✓, the line becomes solid and dim, and the counter freezes.

| Agent | Verb | Screen visual language | Tag data element |
|---|---|---|---|
| Explorer | discovers | Source list: URLs resolve one by one, a thin scan line passes over | `14 sources` |
| Knowledge | maps | Nodes appear and edges draw between them into a graph | `38 entities` |
| Documentation | writes | A document composes itself: heading, sections, a caret | `6 sections` |
| QA | tests | A test list; checks tick green, one flags and is fixed | `24/24 passed` |
| Demo | demonstrates | A small wireframe object rotates inside a preview frame | `preview ready` |
| Release | prepares | A file tree collapses into one artifact, with a progress bar | `v1.0 packaged` |

## 5. Screen content

The screens should look like a real NEXUS workspace: monospace labels, thin rules, restrained status glyphs (`✓ ○ ●`), no chart clutter. Example states:

```
PROMPT
────────────────────────────
Analyze the onboarding flows of three
leading note-taking apps and compare them█
                                    RUN →
```

```
ORCHESTRATOR
────────────────────────────
Planning task…
✓ Explorer
✓ Knowledge Graph
○ Documentation
○ QA
○ Demo
○ Release
```

Views live in `landing/screen/`: `PromptView`, `OrchestratorView`, `ExplorerView`, `KnowledgeView`, `DocsView`, `QAView`, `DemoView`, `ReleaseView`. Each takes `(localProgress: number)` and renders deterministically from it (typing = first N characters, etc.). They render as sharp HTML placed on the lid with drei `<Html transform>`.

**`<Html transform>` constraint:** screen HTML must remain sharp at the target camera distances while keeping the DOM lightweight. Screen views avoid unnecessary nested elements and continuous DOM animation. Only the active view is mounted.

## 6. Data model: WHEN / WHAT / HOW

- **`timeline.ts` (WHEN)**: phase ranges, camera keyframes, progress helpers, step lookup.
- **`nexus-story.ts` (WHAT)**: the goal, the six agents (name, verb, data element), log lines, captions, and the text each screen shows.
- **Components (HOW)**: render WHAT at WHEN.

Changing copy never touches timing, and changing timing never touches copy.

## 7. Components (`frontend/src/landing/`)

| File | Responsibility |
|---|---|
| `LandingPage.tsx` | Composes Nav, OneRunSection, Footer; picks the 3D or fallback path |
| `Nav.tsx`, `Footer.tsx` | Static chrome built on the design tokens |
| `OneRunSection.tsx` | Pins the section, owns the progress ref, lazy-loads the 3D chunk |
| `Scene3D.tsx` | R3F canvas and lighting, `frameloop="demand"` (see rendering architecture below) |
| `Laptop.tsx` | Simple custom laptop: graphite body, rounded geometry, subtle bevel, keyboard grid, hinge, emissive screen, soft rim light. It is the stage, not the product |
| `CameraRig.tsx` | Interpolates camera keyframes from `cameraAt(p)`. No spins |
| `AgentNetwork.tsx` | Six tags, connection lines, idle/active/done states, the network and intensify phases |
| `NexusMark.tsx` | The converge animation into the N (same geometry as `brand/nexus` mark) |
| `ScreenContent.tsx` | Picks the active screen view and passes local progress |
| `Caption.tsx`, `ProgressRail.tsx` | Plain-language captions and six progress dots, as accessible HTML |
| `FallbackSequence.tsx` | The same story in 2D (see §9) |

**Rendering architecture:** the Canvas uses `frameloop="demand"`. Scroll updates a shared progress ref and invalidates the R3F scene. Scene state, camera position, agent states and screen progress are derived deterministically from that value. React state must not update on every scroll frame. The only React state changes allowed are discrete transitions, such as the active screen view or caption changing when `p` crosses a phase or agent boundary.

## 8. Visual language

- **Tokens** (measured from the analysed reference): background `#080808`, text `#E1E5E5`, greys `#C0C4C6 / #838A8F / #666F76 / #20272C / #1C2227`, pill radius 999px, glass tags `rgba(18,25,28,.52)` + `backdrop-filter: blur(5px)`, padding 14/22. Type 52/18/14/12px, Geist weight 500, tracking −0.003em, headings −0.008em uppercase.
- **Allowed**: graphite laptop, glass tags, subtle glow, rounded buttons, calm camera easing.
- **Not allowed**: large particle systems, heavy gradients, random floating objects, neon, cursor effects, camera spins, sound, piles of micro-animations.
- **Originality**: the reference informs spacing, type rhythm, proportions, interaction quality and glass treatment only. None of its copy, imagery, logo or globe is reused.

## 9. Fallback

- **Eligibility:** 3D is enabled only on a landscape viewport (width ≥ height) at least 1024px wide, when WebGL is available and `prefers-reduced-motion` is not `reduce`. Portrait tablets and anything narrower than 1024px use `FallbackSequence`, as do visitors without WebGL or with reduced motion.
- **Behaviour:** a vertical sequence of the same screen views inside a flat 2D laptop frame, each with its caption: Goal → Orchestrator → Explorer → Knowledge → Documentation → QA → Demo → Release → NEXUS mark.
- **Motion:** light fade-ins, none under reduced motion. It is designed as its own experience, not a stripped-down emergency version.

## 10. Performance and accessibility

- **Performance:** the 3D chunk is `React.lazy`-loaded after the hero headline paints, DPR is capped at `[1, 1.75]`, frames render on demand, and nothing re-renders React per frame.
- **Acceptance criterion:** the landing-page headline, navigation and primary content must remain usable while the 3D chunk loads. Loading the 3D experience must not block initial page rendering.
- **Accessibility:** captions are real HTML and expose the current phase accessibly without continuously announcing every scroll-frame update (no `aria-live` on the caption). The progress rail is an accessible list with the current step marked `aria-current="step"`. The canvas is `aria-hidden="true"`. Nav and CTA are keyboard reachable with visible focus.

## 11. Testing

- **Unit (Vitest):** `phaseAt` boundaries, `localProgress` range and monotonicity, reversibility.
- **Test A: scroll determinism.** Jumping 0.2 → 0.7 → 0.2 renders the same state at 0.2 as arriving there directly. Checked in unit tests (pure state functions) and in Playwright (DOM snapshot of screen and tag states compared across paths).
- **Test B: reverse-scroll consistency.** For representative progress points, render the experience forward and backward (0.2 → 0.7 → 0.2) and verify that the screen content, agent states, connection progress, camera position and NEXUS mark return to exactly the same deterministic states.
- **Loading:** Playwright confirms the nav, headline and CTA are visible and interactive before the 3D chunk finishes loading (chunk request delayed via route interception).
- **Playwright:** screenshots at each phase boundary (visual reference only); computed-style assertions for nav, buttons, tags, captions against the tokens via `assert-styles.mjs`; the reduced-motion run shows `FallbackSequence`.
- **Build:** `npm run build` exits 0.

## 12. New dependencies

`three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `@gsap/react`, `vitest` (dev).

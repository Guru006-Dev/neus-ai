# Sharplink-Inspired APIP Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace APIP's landing page and dashboard presentation layer with a brand-new visual system extracted from Sharplink (Awwwards Site of the Day, Aug 27 2026), while preserving 100% of existing functionality (workflow submission, polling, history, reports, API key management).

**Architecture:** Extend the existing Tailwind v4 `@theme` token layer in `src/index.css` with the new palette/type/shape tokens, restyle the shared `DropdownNavigation` component, add an original Three.js wireframe hero, then rewrite `LandingPage.tsx` and `DashboardPage.tsx` (splitting the latter's shared types/atoms/AgentOutput renderer into `src/pages/dashboard/*` to keep files focused) on top of those tokens. No backend, routing, or state-shape changes.

**Tech Stack:** React 19 + Vite 8 + TypeScript, Tailwind CSS v4 (`@theme` CSS tokens, no config file), `motion` (framer-motion v13) for existing animation patterns, `lucide-react` icons, new: `three` + `@react-three/fiber` for the hero scene, Google Fonts (Archivo, Archivo Narrow).

**Spec:** [docs/superpowers/specs/2026-09-22-sharplink-redesign-design.md](../specs/2026-09-22-sharplink-redesign-design.md)

## Global Constraints

- Target site: `https://www.sharplink.com/` — extracted tokens (verbatim, real computed values): accent `#0E76FF`, hero/dark-surface text `#F3F3F3`, light page bg `#F7F7F5`, headline font **Archivo** (weight 400, tight tracking ≈ ‑2.5% of font-size), UI/label font **Archivo Narrow** (weight 500, uppercase, tracking ≈ +8%), buttons sharp-cornered (`border-radius: 0`).
- No hotlinked Sharplink assets/fonts/images. Fonts load from Google Fonts (`fonts.googleapis.com`). The 3D hero is original geometry, not a copy of Sharplink's Ethereum diamond.
- No functional regressions: every handler (`startRun`, `cancelRun`, `saveApiKey`, `clearHistory`), every piece of state, and every tab (Overview/Pipeline/Agents/Reports/History/API Key) must keep working exactly as today — only presentation changes.
- Follow the existing codebase convention: plain inline `style={{}}` objects + Tailwind utility classes bound to `@theme` CSS variables (no CSS-in-JS library, no component library migration).
- Every task's "done" gate is `npm run build` (runs `tsc -b && vite build`) passing with zero TypeScript errors, from `landing/`.

---

### Task 1: Design tokens & font swap

**Files:**
- Modify: `landing/src/index.css`

**Interfaces:**
- Produces: CSS custom properties consumed by every later task — `--color-bg`, `--color-surface`, `--color-surface-border`, `--color-surface-strong`, `--color-ink`, `--color-ink-dim`, `--color-ink-faint`, `--color-accent`, `--color-accent-dim`, `--color-success`, `--color-error`, `--color-warning`, `--font-family-display`, `--font-family-label`, and utility classes `.surface-panel`, `.surface-shell`, `.btn-sharp`.

- [ ] **Step 1: Replace the font import and `@theme` token block**

Replace lines 1–16 of `landing/src/index.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Archivo+Narrow:wght@500;600;700&display=swap');

@import "tailwindcss";

@theme {
  --color-background: #07080B;
  --color-foreground: #F3F3F3;
  --color-muted-foreground: rgba(243, 243, 243, 0.5);
  --color-border: rgba(243, 243, 243, 0.1);
  --color-primary: #0E76FF;
  --color-primary-foreground: #F3F3F3;
  --color-accent: rgba(14, 118, 255, 0.14);
  --color-accent-foreground: #F3F3F3;
  --font-family-display: 'Archivo', sans-serif;
  --font-family-body: 'Archivo', sans-serif;
  --font-family-label: 'Archivo Narrow', sans-serif;
}
```

- [ ] **Step 2: Replace the `:root` block (lines 18–25 in the original) with the extended palette**

```css
:root {
  --color-bg: #07080B;
  --color-surface: rgba(243, 243, 243, 0.035);
  --color-surface-strong: rgba(243, 243, 243, 0.07);
  --color-surface-border: rgba(243, 243, 243, 0.1);
  --color-ink: #F3F3F3;
  --color-ink-dim: rgba(243, 243, 243, 0.55);
  --color-ink-faint: rgba(243, 243, 243, 0.28);
  --color-accent: #0E76FF;
  --color-accent-dim: rgba(14, 118, 255, 0.14);
  --color-success: #4ADE80;
  --color-error: #F87171;
  --color-warning: #FBBF24;
  --font-display: 'Archivo', sans-serif;
  --font-body: 'Archivo', sans-serif;
  --font-label: 'Archivo Narrow', sans-serif;
}
```

- [ ] **Step 3: Update the `body` rule to use the new tokens**

```css
body {
  font-family: var(--font-body);
  background-color: var(--color-bg);
  color: var(--color-ink);
  overflow-x: hidden;
}
```

- [ ] **Step 4: Replace `.glass-shell`, `.glass-card`, `.liquid-glass` with sharp-cornered surface classes**

Replace those three rule blocks with:

```css
/* ── Surface shell (outer frame) ──────────────────────────────── */
.surface-shell {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
}

/* ── Surface panel (cards) ────────────────────────────────────── */
.surface-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 2px;
}

/* ── Sharp button base ─────────────────────────────────────────── */
.btn-sharp {
  border-radius: 0;
  font-family: var(--font-label);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity .15s ease, background-color .15s ease;
}
.btn-sharp:disabled { cursor: default; opacity: .4; }
```

- [ ] **Step 5: Keep the existing `@keyframes` and `.animate-*`/`.tab-content` rules unchanged** (fade-rise, blink-dot, dash-enter, tab-enter are generic and still used) — do not delete them.

- [ ] **Step 6: Verify the build**

Run: `cd landing && npm run build`
Expected: succeeds (existing pages still reference `.glass-card`/`.glass-shell` until later tasks rewrite them, so this step is expected to leave those pages visually broken — that's fine, TypeScript compilation is the gate here, not visual correctness yet).

- [ ] **Step 7: Commit**

```bash
git add landing/src/index.css
git commit -m "feat(design): replace token layer with Sharplink-derived palette and Archivo type"
```

---

### Task 2: Restyle shared navigation component

**Files:**
- Modify: `landing/src/components/ui/dropdown-navigation.tsx`

**Interfaces:**
- Consumes: `--color-primary` (`#0E76FF`), `--font-family-label` from Task 1.
- Produces: same `NavItem`/`Props` exported types and component signature as before — no API change, callers (`LandingPage.tsx`, `DashboardPage.tsx`) are untouched by this task.

- [ ] **Step 1: Replace the button label styling and hover pill**

In the `<button>` block, change the label `<span>` to use the label font/tracking, and change the `motion.div` hover pill from a rounded pill to a sharp underline-style indicator:

```tsx
<button
  onClick={() => onItemClick?.(navItem.label)}
  className="text-xs py-2 px-4 flex cursor-pointer group transition-colors duration-300 items-center justify-center gap-1.5 relative"
  style={{
    color: isActive ? 'var(--color-primary)' : undefined,
    fontFamily: 'var(--font-family-label)',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  }}
  onMouseEnter={() => setIsHover(navItem.id)}
  onMouseLeave={() => setIsHover(null)}
>
  <span className={isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}>
    {navItem.label}
  </span>
  {navItem.subMenus && (
    <ChevronDown
      className={`h-3 w-3 transition-transform duration-300
        ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}
        ${openMenu === navItem.label ? "rotate-180" : ""}`}
    />
  )}
  {(isHover === navItem.id || openMenu === navItem.label || isActive) && (
    <motion.div
      layoutId="hover-bg"
      className="absolute left-4 right-4 bottom-0"
      style={{ height: 2, background: 'var(--color-primary)' }}
    />
  )}
</button>
```

- [ ] **Step 2: Sharpen the dropdown panel corners**

In the submenu `motion.div`, change `style={{ borderRadius: 16 }}` to `style={{ borderRadius: 2 }}`, and change the item icon boxes' `rounded-md` class to `rounded-none` and `rounded-lg` (on the `<a>`) to `rounded-none`.

- [ ] **Step 3: Update submenu section titles to the label font**

Change the `<h3>` className from `"mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-2"` to add label font via style: `style={{ fontFamily: 'var(--font-family-label)' }}` alongside the existing className.

- [ ] **Step 4: Verify the build**

Run: `cd landing && npm run build`
Expected: succeeds, no type errors (only styling/className/style changes, no prop/type changes).

- [ ] **Step 5: Commit**

```bash
git add landing/src/components/ui/dropdown-navigation.tsx
git commit -m "feat(design): restyle nav to sharp underline indicator and label type"
```

---

### Task 3: Original 3D wireframe hero scene

**Files:**
- Create: `landing/src/components/HeroScene.tsx`
- Modify: `landing/package.json` (new deps)

**Interfaces:**
- Produces: `export default function HeroScene(props: { size?: number }): JSX.Element` — a self-contained `<Canvas>` block that can be dropped into any flex/absolute container. No external props required (`size` optional, defaults sized to fill its parent).

- [ ] **Step 1: Install dependencies**

Run: `cd landing && npm install three @react-three/fiber && npm install -D @types/three`
Expected: `three`, `@react-three/fiber`, `@types/three` added to `landing/package.json`.

- [ ] **Step 2: Write the scene component**

Create `landing/src/components/HeroScene.tsx`:

```tsx
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function NodeLattice() {
  const group = useRef<THREE.Group>(null);
  const innerGroup = useRef<THREE.Group>(null);

  const nodePositions = useMemo(() => {
    const pts: [number, number, number][] = [];
    const octa = new THREE.OctahedronGeometry(1.6, 0);
    const pos = octa.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pts.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
    }
    return pts;
  }, []);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.18;
    if (innerGroup.current) {
      innerGroup.current.rotation.x += delta * 0.12;
      innerGroup.current.rotation.z -= delta * 0.09;
    }
  });

  return (
    <group ref={group}>
      {/* Outer wireframe polytope — the pipeline "node" motif */}
      <mesh>
        <octahedronGeometry args={[1.6, 0]} />
        <meshBasicMaterial color="#0E76FF" wireframe transparent opacity={0.85} />
      </mesh>
      <mesh>
        <octahedronGeometry args={[1.6, 0]} />
        <meshBasicMaterial color="#F3F3F3" wireframe transparent opacity={0.08} />
      </mesh>

      {/* Small node markers at each vertex */}
      {nodePositions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color="#F3F3F3" transparent opacity={0.9} />
        </mesh>
      ))}

      {/* Inner counter-rotating tetrahedron — depth/complexity cue */}
      <group ref={innerGroup}>
        <mesh scale={0.62}>
          <tetrahedronGeometry args={[1.4, 0]} />
          <meshBasicMaterial color="#0E76FF" wireframe transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  );
}

export default function HeroScene({ size = 1 }: { size?: number }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 320 }}>
      <Canvas
        camera={{ position: [0, 0, 5 / size], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <NodeLattice />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 3: Verify the build**

Run: `cd landing && npm run build`
Expected: succeeds with zero TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add landing/package.json landing/package-lock.json landing/src/components/HeroScene.tsx
git commit -m "feat(design): add original Three.js wireframe hero scene"
```

---

### Task 4: Dashboard shared types and constants

**Files:**
- Create: `landing/src/pages/dashboard/types.ts`

**Interfaces:**
- Produces: `AgentStatus`, `AgentResult`, `RunState`, `HistoryEntry` types; `AGENTS: string[]`; `AgentIconKey` type; `AGENT_INFO: Record<string, {desc: string}>`; `fmtTime(s: number): string`; `fmtDate(ts: number): string`. These are consumed by Tasks 5, 6, 8, 9, 10, 11.

- [ ] **Step 1: Create the file**

```ts
export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

export interface AgentResult {
  name: string;
  status: AgentStatus;
  duration?: number;
  output?: string;
}

export interface RunState {
  runId: string | null;
  goal: string;
  status: 'idle' | 'running' | 'done' | 'error';
  agents: AgentResult[];
  elapsed: number;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  goal: string;
  status: 'done' | 'error';
  elapsed: number;
  timestamp: number;
  agents: AgentResult[];
}

export const AGENTS = ['Explorer', 'Knowledge', 'Docs', 'QA', 'Demo', 'Release'];

export type AgentIconKey = 'Explorer' | 'Knowledge' | 'Docs' | 'QA' | 'Demo' | 'Release';

export const AGENT_INFO: Record<string, { desc: string }> = {
  Explorer:  { desc: 'Crawls the product URL, extracts metadata, pricing, screenshots and feature lists.' },
  Knowledge: { desc: 'Builds a structured knowledge graph from raw Explorer data — competitors, use-cases, positioning.' },
  Docs:      { desc: 'Generates product documentation: README, API reference and onboarding guide drafts.' },
  QA:        { desc: 'Runs automated quality checks — broken links, missing metadata, content gaps and readability scores.' },
  Demo:      { desc: 'Produces a demo script, key talking points and suggested walkthrough flow for the product.' },
  Release:   { desc: 'Assembles the final release brief: changelog, go-to-market summary and launch checklist.' },
};

export function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
```

- [ ] **Step 2: Verify the build**

Run: `cd landing && npm run build`
Expected: succeeds (new file not yet imported anywhere, so this is purely additive).

- [ ] **Step 3: Commit**

```bash
git add landing/src/pages/dashboard/types.ts
git commit -m "refactor(dashboard): extract shared types and constants"
```

---

### Task 5: Dashboard shared UI atoms

**Files:**
- Create: `landing/src/pages/dashboard/shared.tsx`

**Interfaces:**
- Consumes: `AgentStatus` from `./types` (Task 4).
- Produces: `NexusLogo`, `StatusDot`, `AgentBadge`, `StatCard`, `AGENT_ICONS` — consumed by Tasks 8, 9, 10, 11.

- [ ] **Step 1: Create the file**

```tsx
import {
  Globe, BookOpen, FileText, ShieldCheck, Play, Send,
} from 'lucide-react';
import type { AgentStatus, AgentIconKey } from './types';

export const AGENT_ICONS: Record<AgentIconKey, React.ReactNode> = {
  Explorer:  <Globe    size={15} strokeWidth={1.6} />,
  Knowledge: <BookOpen size={15} strokeWidth={1.6} />,
  Docs:      <FileText size={15} strokeWidth={1.6} />,
  QA:        <ShieldCheck size={15} strokeWidth={1.6} />,
  Demo:      <Play     size={15} strokeWidth={1.6} />,
  Release:   <Send     size={15} strokeWidth={1.6} />,
};

export function NexusLogo({ size = 22 }: { size?: number }) {
  const big = Math.round(size * 0.65);
  const sm = Math.round(size * 0.44);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: big, height: big, background: 'var(--color-ink)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: sm, height: sm, background: 'var(--color-accent)' }} />
    </div>
  );
}

export function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = {
    done: 'var(--color-success)', running: 'var(--color-warning)',
    error: 'var(--color-error)', idle: 'var(--color-surface-border)',
  };
  return (
    <span
      className={status === 'running' ? 'animate-blink-dot' : ''}
      style={{ display: 'inline-block', width: 6, height: 6, background: colors[status], flexShrink: 0 }}
    />
  );
}

export function AgentBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, { bg: string; color: string; label: string }> = {
    done:    { bg: 'rgba(74,222,128,.12)',  color: 'var(--color-success)', label: 'Done' },
    running: { bg: 'rgba(251,191,36,.12)',  color: 'var(--color-warning)', label: 'Running' },
    error:   { bg: 'rgba(248,113,113,.12)', color: 'var(--color-error)',   label: 'Error' },
    idle:    { bg: 'var(--color-surface)',  color: 'var(--color-ink-faint)', label: 'Queued' },
  };
  const s = styles[status];
  return (
    <span style={{
      fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      padding: '2px 7px', background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="surface-panel" style={{ padding: '14px 16px' }}>
      <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `cd landing && npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add landing/src/pages/dashboard/shared.tsx
git commit -m "refactor(dashboard): extract shared UI atoms with new design tokens"
```

---

### Task 6: Restyle the AgentOutput renderer

**Files:**
- Create: `landing/src/pages/dashboard/AgentOutput.tsx`

**Interfaces:**
- Consumes: nothing from other new files (self-contained, same parsing logic as the original).
- Produces: `export default function AgentOutput({ name, output, runId }: { name: string; output: unknown; runId?: string | null }): JSX.Element` — identical signature to the original inline function, so `DashboardPage.tsx` can import it as a drop-in replacement in Task 8.

- [ ] **Step 1: Create the file with the same parsing logic as the original, restyled**

```tsx
import { X, Check, ChevronRight } from 'lucide-react';

export default function AgentOutput({ name, output, runId }: { name: string; output: unknown; runId?: string | null }) {
  let data: Record<string, unknown> | null = null;
  let rawText: string | null = null;

  const tryParse = (s: string): Record<string, unknown> | null => {
    try { return JSON.parse(s); } catch {}
    try {
      const j = s
        .replace(/'/g, '"')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null');
      return JSON.parse(j);
    } catch {}
    return null;
  };

  if (output && typeof output === 'object') {
    data = output as Record<string, unknown>;
  } else if (typeof output === 'string') {
    const s = output.trim();
    if (s.startsWith('#')) {
      rawText = s;
    } else if (s.startsWith('{') || s.startsWith('[')) {
      const parsed = tryParse(s);
      if (parsed) data = parsed;
      else rawText = s;
    } else {
      rawText = s;
    }
  }

  const row = (label: string, val: unknown) => val == null ? null : (
    <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', borderBottom: '1px solid var(--color-surface-border)' }}>
      <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '.05em', minWidth: 90, paddingTop: 2, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--color-ink-dim)', lineHeight: 1.6, wordBreak: 'break-word' }}>{String(val)}</span>
    </div>
  );

  const pill = (text: string, ok = true) => (
    <span key={text} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: ok ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)', color: ok ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block', margin: '2px 3px 2px 0' }}>{text}</span>
  );

  if (!data && !rawText) return <span style={{ fontSize: 11, color: 'var(--color-ink-faint)', fontStyle: 'italic' }}>No output recorded</span>;

  if (name === 'Docs' || rawText) {
    const lines = (rawText || '').split('\n');
    return (
      <div style={{ fontSize: 12, lineHeight: 1.75, color: 'var(--color-ink-dim)', maxHeight: 260, overflowY: 'auto' }}>
        {lines.map((line, i) => {
          if (line.startsWith('## ')) return <div key={i} style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)', marginTop: 10, marginBottom: 2 }}>{line.slice(3)}</div>;
          if (line.startsWith('# '))  return <div key={i} style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-ink)', marginBottom: 4 }}>{line.slice(2)}</div>;
          if (line.startsWith('- '))  return <div key={i} style={{ paddingLeft: 12, color: 'var(--color-ink-dim)' }}>· {line.slice(2)}</div>;
          return <div key={i}>{line || <br />}</div>;
        })}
      </div>
    );
  }

  if (name === 'Explorer' && data) {
    const metrics = data.metrics as Record<string, unknown> | undefined;
    const insights = data.key_insights as string[] | undefined;
    const dims = data.analysis_dimensions as string[] | undefined;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {Object.entries(metrics).map(([k, v]) => (
              <div key={k} style={{ background: 'var(--color-surface)', padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>{String(v)}</div>
                <div style={{ fontSize: 9, color: 'var(--color-ink-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        )}
        {insights && insights.length > 0 && (
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Key Insights</div>
            {insights.map((ins, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--color-ink-dim)', padding: '4px 0', borderBottom: '1px solid var(--color-surface-border)', lineHeight: 1.5 }}>· {ins}</div>
            ))}
          </div>
        )}
        {dims && dims.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{dims.map(d => pill(d))}</div>
        )}
      </div>
    );
  }

  if (name === 'Knowledge' && data) {
    const nodes = data.nodes as unknown[] | undefined;
    const edges = data.edges as unknown[] | undefined;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[['Nodes', nodes?.length], ['Edges', edges?.length], ['Density', data.graph_density]].map(([l, v]) => (
            <div key={String(l)} style={{ background: 'var(--color-surface)', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 18, fontWeight: 600, color: 'var(--color-ink)' }}>{String(v ?? '—')}</div>
              <div style={{ fontSize: 9, color: 'var(--color-ink-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{String(l)}</div>
            </div>
          ))}
        </div>
        {nodes && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(nodes as { label?: string; type?: string }[]).map((n, i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 8px', background: 'var(--color-surface-strong)', color: 'var(--color-ink-dim)', border: '1px solid var(--color-surface-border)' }}>{n.label || String(n)}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (name === 'QA' && data) {
    const tests = data.tests_run as { name: string; result: string; score: string; detail: string }[] | undefined;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[['Total', data.total_validations], ['Passed', data.passed], ['Failed', data.failed], ['Pass Rate', data.pass_rate]].map(([l, v]) => (
            <div key={String(l)} style={{ background: String(l) === 'Failed' && Number(v) > 0 ? 'rgba(248,113,113,.08)' : 'var(--color-surface)', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 600, color: String(l) === 'Failed' && Number(v) > 0 ? 'var(--color-error)' : String(l) === 'Passed' ? 'var(--color-success)' : 'var(--color-ink)' }}>{String(v ?? '—')}</div>
              <div style={{ fontSize: 9, color: 'var(--color-ink-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{String(l)}</div>
            </div>
          ))}
        </div>
        {tests && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tests.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', background: 'var(--color-surface)' }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>{t.result === 'PASS' ? <Check size={12} color="var(--color-success)" /> : <X size={12} color="var(--color-error)" />}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-ink-dim)' }}>{t.name} <span style={{ fontWeight: 400, color: 'var(--color-ink-faint)' }}>· {t.score}</span></div>
                  <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginTop: 1 }}>{t.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (name === 'Demo' && data) {
    const demoSrc = runId ? `http://localhost:3000/workflows/${runId}/demo_html` : null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {row('Status', data.status)}
        {row('Lines generated', data.line_count)}
        {demoSrc && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 11, fontWeight: 600, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Live Preview</div>
            <iframe src={demoSrc} style={{ width: '100%', height: 420, border: '1px solid var(--color-surface-border)', background: 'var(--color-bg)' }} title="Demo Showcase" sandbox="allow-scripts" />
            <a href={demoSrc} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <ChevronRight size={12} /> Open in full screen
            </a>
          </div>
        )}
      </div>
    );
  }

  if (name === 'Release' && data) {
    const comps = data.components_validated as string[] | undefined;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {row('Release ID', data.release_id)}
          {row('QA Pass Rate', data.qa_pass_rate)}
          {row('Deployment', data.deployment_status)}
          {row('Artifacts', data.artifacts_generated)}
        </div>
        {comps && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{comps.map((c, i) => pill(c, true))}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {Object.entries(data!).filter(([, v]) => v !== null && typeof v !== 'object').map(([k, v]) => row(k.replace(/_/g, ' '), v))}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `cd landing && npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add landing/src/pages/dashboard/AgentOutput.tsx
git commit -m "refactor(dashboard): extract and restyle AgentOutput renderer"
```

---

### Task 7: Rebuild the landing page

**Files:**
- Modify: `landing/src/pages/LandingPage.tsx` (full rewrite)

**Interfaces:**
- Consumes: `DropdownNavigation`/`NavItem` from Task 2, `HeroScene` from Task 3, CSS tokens from Task 1.
- Produces: `export default function LandingPage()` — same default export used by `App.tsx`'s router; no route or prop changes.

- [ ] **Step 1: Read the current file for reference on the router/hooks it relies on**

Run: `cat landing/src/pages/LandingPage.tsx | head -20` — confirms it imports `useNavigate` from `react-router-dom` and navigates to `/dashboard`. Keep that behavior identical.

- [ ] **Step 2: Replace the entire file**

```tsx
import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropdownNavigation } from '@/components/ui/dropdown-navigation';
import HeroScene from '@/components/HeroScene';
import { Globe, BookOpen, FileText, ShieldCheck, Play, Send } from 'lucide-react';

const LANDING_NAV_ITEMS = [
  {
    id: 1,
    label: 'Pipeline',
    subMenus: [
      {
        title: 'Agents',
        items: [
          { label: 'Explorer',  description: 'Crawl & extract product metadata', icon: Globe },
          { label: 'Knowledge', description: 'Build structured knowledge graph',  icon: BookOpen },
          { label: 'Docs',      description: 'Generate docs & onboarding guides', icon: FileText },
        ],
      },
      {
        title: 'Output',
        items: [
          { label: 'QA',      description: 'Quality checks & content gaps',  icon: ShieldCheck },
          { label: 'Demo',    description: 'Demo scripts & talking points',   icon: Play },
          { label: 'Release', description: 'Go-to-market brief & checklist',  icon: Send },
        ],
      },
    ],
  },
  { id: 2, label: 'Pricing', link: '#' },
  { id: 3, label: 'Docs',    link: '#' },
];

const AGENT_CARDS = [
  { name: 'Explorer',  icon: Globe,       desc: 'Crawls the product URL and extracts metadata, pricing, and feature lists.' },
  { name: 'Knowledge', icon: BookOpen,    desc: 'Builds a structured knowledge graph from raw research data.' },
  { name: 'Docs',      icon: FileText,    desc: 'Generates README, API reference and onboarding drafts.' },
  { name: 'QA',        icon: ShieldCheck, desc: 'Runs automated quality checks and content-gap analysis.' },
  { name: 'Demo',      icon: Play,        desc: 'Produces a demo script and suggested walkthrough flow.' },
  { name: 'Release',   icon: Send,        desc: 'Assembles the release brief and go-to-market checklist.' },
];

function Nav({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid var(--color-surface-border)', background: 'rgba(7,8,11,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
      <nav style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 16, height: 16, background: 'var(--color-accent)' }} />
          <span style={{ fontFamily: 'var(--font-family-label)', fontWeight: 700, fontSize: 13, letterSpacing: '.12em', color: 'var(--color-ink)' }}>NEXUS</span>
        </div>
        <DropdownNavigation navItems={LANDING_NAV_ITEMS} />
        <button
          onClick={onLaunch}
          className="btn-sharp"
          style={{ padding: '9px 20px', fontSize: 11, background: 'var(--color-accent)', color: '#fff', border: 'none' }}
        >
          Explore the Dashboard →
        </button>
      </nav>
    </div>
  );
}

function Footer() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const faqs = [
    { q: 'What does APIP actually do?', a: 'It runs a six-agent pipeline — Explorer, Knowledge, Docs, QA, Demo and Release — against any product URL and returns structured intelligence for each stage.' },
    { q: 'How long does a full run take?', a: 'Typically under five minutes end to end, depending on the size of the target product surface.' },
    { q: 'Where can I follow updates?', a: 'Sign up below, or watch the Docs section in the pipeline nav for the latest agent capabilities.' },
  ];
  return (
    <footer style={{ position: 'relative', borderTop: '1px solid var(--color-surface-border)', overflow: 'hidden', padding: '64px 32px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 32, marginBottom: 40 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 14 }}>Sign up to stay sharp</div>
            <div style={{ display: 'flex', border: '1px solid var(--color-surface-border)', maxWidth: 320 }}>
              <input type="email" placeholder="Enter your email" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '10px 12px', fontSize: 12, color: 'var(--color-ink)' }} />
              <button className="btn-sharp" style={{ padding: '10px 16px', fontSize: 10, background: 'var(--color-accent)', color: '#fff', border: 'none' }}>Sign Up →</button>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 14 }}>Navigation</div>
            {['Home', 'Pipeline', 'Docs', 'Pricing'].map(l => (
              <div key={l} style={{ fontSize: 13, color: 'var(--color-ink-dim)', padding: '5px 0' }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 14 }}>Social</div>
            {['GitHub', 'Twitter', 'LinkedIn'].map(l => (
              <div key={l} style={{ fontSize: 13, color: 'var(--color-ink-dim)', padding: '5px 0' }}>{l}</div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-surface-border)', paddingTop: 20 }}>
          {faqs.map((f, i) => (
            <div key={f.q} style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 0', color: 'var(--color-ink)', fontFamily: 'var(--font-family-display)', fontSize: 15, textAlign: 'left' }}
              >
                {f.q}
                <span style={{ fontSize: 18, color: 'var(--color-accent)' }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <p style={{ fontSize: 12, color: 'var(--color-ink-dim)', lineHeight: 1.7, paddingBottom: 16, maxWidth: 560 }}>{f.a}</p>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, fontSize: 11, color: 'var(--color-ink-faint)' }}>
          <span>© 2026 Nexus / APIP. All rights reserved.</span>
          <span>Privacy Policy · Terms of Use</span>
        </div>
      </div>

      <div
        aria-hidden
        style={{
          position: 'absolute', left: 0, right: 0, bottom: -40, textAlign: 'center',
          fontFamily: 'var(--font-family-display)', fontWeight: 800,
          fontSize: 'clamp(80px, 16vw, 220px)', letterSpacing: '-0.04em',
          color: 'transparent', WebkitTextStroke: '1px rgba(243,243,243,0.08)',
          filter: 'blur(1px)', pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
        }}
      >
        NEXUS
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const launchDashboard = useCallback(() => { navigate('/dashboard'); }, [navigate]);

  useEffect(() => { document.title = 'Nexus — Autonomous Product Intelligence'; }, []);

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-ink)', minHeight: '100vh' }}>
      <style>{`
        @keyframes word-in {
          from { opacity: 0; filter: blur(16px); transform: translateY(14px); }
          to   { opacity: 1; filter: blur(0);     transform: translateY(0); }
        }
        .word-reveal {
          display: inline-block; opacity: 0;
          animation: word-in .7s cubic-bezier(.16,1,.3,1) both;
          animation-delay: calc(var(--d,0ms) + var(--i,0) * 90ms);
        }
        @media (prefers-reduced-motion: reduce) { .word-reveal { animation: none; opacity: 1; filter: none; } }
      `}</style>

      <Nav onLaunch={launchDashboard} />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 72, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-6%', top: '50%', transform: 'translateY(-50%)', width: '52%', height: '70%', opacity: 0.9 }}>
          <HeroScene />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', width: '100%', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>Nexus</span>
            <span style={{ width: 32, height: 1, background: 'var(--color-surface-border)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-ink-faint)' }}>Autonomous Product Intelligence · 6-agent pipeline</span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontSize: 'clamp(44px,7vw,92px)', lineHeight: 0.98, letterSpacing: '-0.03em', color: 'var(--color-ink)', margin: '0 0 20px', maxWidth: 780 }}>
            {['Autonomous', 'Product', 'Intelligence.'].map((word, wi) => (
              <div key={word}>
                <span className="word-reveal" style={{ '--d': `${150 + wi * 160}ms`, '--i': 0 } as React.CSSProperties}>{word}</span>
              </div>
            ))}
          </h1>

          <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--color-ink-dim)', maxWidth: 420, margin: '0 0 32px' }}>
            A multi-agent platform that transforms any product brief into structured intelligence — research, documentation, QA and release signals delivered in a single pipeline run.
          </p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={launchDashboard} className="btn-sharp" style={{ padding: '13px 26px', fontSize: 12, background: 'var(--color-accent)', color: '#fff', border: 'none' }}>
              Explore the Dashboard →
            </button>
            <button className="btn-sharp" style={{ padding: '13px 26px', fontSize: 12, background: 'transparent', color: 'var(--color-ink-dim)', border: '1px solid var(--color-surface-border)' }}>
              See Investor Information
            </button>
          </div>
        </div>
      </section>

      {/* ── Opportunity band ─────────────────────────────────────── */}
      <section style={{ padding: '96px 32px', borderTop: '1px solid var(--color-surface-border)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-ink-faint)' }}>The opportunity of a generation</span>
            <button className="btn-sharp" style={{ padding: '8px 16px', fontSize: 10, background: 'transparent', color: 'var(--color-ink-dim)', border: '1px solid var(--color-surface-border)' }}>Learn More →</button>
          </div>
          <p style={{ fontFamily: 'var(--font-family-display)', fontSize: 'clamp(24px,3.4vw,38px)', lineHeight: 1.3, letterSpacing: '-0.01em', maxWidth: 920, margin: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>Product intelligence as infrastructure makes it the most compelling operating advantage of our lifetime.</span>{' '}
            <span style={{ fontWeight: 400, color: 'var(--color-ink-faint)' }}>Six specialized agents, one pipeline run, structured signal at every stage — and this is just the beginning.</span>
          </p>
        </div>
      </section>

      {/* ── Agent pipeline showcase ──────────────────────────────── */}
      <section style={{ padding: '0 32px 96px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--color-surface-border)', border: '1px solid var(--color-surface-border)' }}>
            {AGENT_CARDS.map(({ name, icon: Icon, desc }) => (
              <div key={name} style={{ background: 'var(--color-bg)', padding: '28px 24px' }}>
                <Icon size={20} strokeWidth={1.6} color="var(--color-accent)" style={{ marginBottom: 16 }} />
                <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 8 }}>{name}</div>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-ink-dim)', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 3: Verify the build**

Run: `cd landing && npm run build`
Expected: succeeds with zero TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add landing/src/pages/LandingPage.tsx
git commit -m "feat(landing): rebuild landing page in Sharplink-derived design system"
```

---

### Task 8: Rebuild the dashboard shell (imports, nav, layout, Overview + Pipeline tabs)

**Files:**
- Modify: `landing/src/pages/DashboardPage.tsx` (full rewrite, part 1 of 3 — this task covers imports/state/handlers/shell/Overview/Pipeline; Tasks 9–11 add the remaining tabs into the same returned JSX)

**Interfaces:**
- Consumes: `AGENTS`, `AgentResult`, `RunState`, `HistoryEntry`, `fmtTime`, `fmtDate` from `./dashboard/types` (Task 4); `NexusLogo`, `StatusDot`, `AgentBadge`, `StatCard`, `AGENT_ICONS` from `./dashboard/shared` (Task 5); `AgentOutput` from `./dashboard/AgentOutput` (Task 6).
- Produces: `export default function DashboardPage()` — same default export, all state variable names (`goal`, `apiKey`, `apiKeyInput`, `activeTab`, `activeFilter`, `history`, `selectedHistoryId`, `run`) and handler names (`startRun`, `cancelRun`, `saveApiKey`, `clearHistory`) preserved exactly so behavior is unchanged.

Because this file is large, this task establishes the full file with **all six tabs' JSX already in place** (Tasks 9–11 exist to review/tune the Agents/Reports/History/API Key tab styling specifically, but to keep the file buildable at every step, write the complete file now).

- [ ] **Step 1: Replace the entire file**

```tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Zap, Bot, FileText, ArrowLeft,
  X, Check, Square, ChevronRight, Clock, BarChart2, KeyRound,
} from 'lucide-react';
import { DropdownNavigation } from '@/components/ui/dropdown-navigation';
import type { NavItem } from '@/components/ui/dropdown-navigation';
import { AGENTS, AGENT_INFO, fmtTime, fmtDate } from './dashboard/types';
import type { AgentResult, RunState, HistoryEntry, AgentIconKey } from './dashboard/types';
import { NexusLogo, StatusDot, AgentBadge, StatCard, AGENT_ICONS } from './dashboard/shared';
import AgentOutput from './dashboard/AgentOutput';

const API_BASE = 'http://localhost:3000';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('nexus_api_key') || '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [activeTab, setActiveTab] = useState('Pipeline');
  const [activeFilter, setActiveFilter] = useState('All');
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexus_history') || '[]'); } catch { return []; }
  });
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [run, setRun] = useState<RunState>({
    runId: null, goal: '', status: 'idle',
    agents: AGENTS.map(n => ({ name: n, status: 'idle' })),
    elapsed: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (run.status === 'running') {
      timerRef.current = setInterval(() => setRun(r => ({ ...r, elapsed: r.elapsed + 1 })), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [run.status]);

  useEffect(() => {
    if (run.status === 'done' || run.status === 'error') {
      const entry: HistoryEntry = {
        id: run.runId || `local_${Date.now()}`,
        goal: run.goal,
        status: run.status === 'error' ? 'error' : 'done',
        elapsed: run.elapsed,
        timestamp: Date.now(),
        agents: run.agents,
      };
      setHistory(prev => {
        const next = [entry, ...prev].slice(0, 50);
        try { localStorage.setItem('nexus_history', JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, [run.status]);

  async function startRun() {
    if (!goal.trim()) return;
    setRun({ runId: null, goal: goal.trim(), status: 'running', agents: AGENTS.map(n => ({ name: n, status: 'idle' })), elapsed: 0 });
    setActiveTab('Pipeline');
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_url: goal.trim(), api_key: apiKey || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const runId = data.run_id || data.id || null;
      setRun(r => ({ ...r, runId }));
      if (runId) {
        pollRef.current = setInterval(async () => {
          try {
            const pr = await fetch(`${API_BASE}/status/${runId}`);
            if (!pr.ok) return;
            const pd = await pr.json();
            const agents: AgentResult[] = AGENTS.map(name => {
              const a = pd.agents?.[name.toLowerCase()] || pd.agents?.[name] || {};
              return { name, status: a.status || 'idle', duration: a.duration, output: a.output || a.result };
            });
            const allDone = agents.every(a => a.status === 'done' || a.status === 'error');
            setRun(r => ({ ...r, agents, status: allDone ? 'done' : pd.status === 'error' ? 'error' : 'running' }));
            if (allDone || pd.status === 'error') { if (pollRef.current) clearInterval(pollRef.current); }
          } catch (_) {}
        }, 2000);
      } else {
        const agents: AgentResult[] = AGENTS.map(name => ({ name, status: 'done' as const, output: data[name.toLowerCase()] || data.result }));
        setRun(r => ({ ...r, status: 'done', agents }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRun(r => ({ ...r, status: 'error', error: msg }));
    }
  }

  function cancelRun() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setRun(r => ({ ...r, status: 'idle', error: undefined }));
  }

  function saveApiKey() {
    localStorage.setItem('nexus_api_key', apiKeyInput);
    setApiKey(apiKeyInput);
    setApiKeyInput('');
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem('nexus_history');
  }

  const doneCount = run.agents.filter(a => a.status === 'done').length;
  const pct = Math.round((doneCount / AGENTS.length) * 100);
  const filteredAgents = activeFilter === 'All' ? run.agents : run.agents.filter(a => a.name === activeFilter);

  const successCount = history.filter(h => h.status === 'done').length;
  const avgElapsed = history.length ? Math.round(history.reduce((s, h) => s + h.elapsed, 0) / history.length) : 0;
  const selectedEntry = history.find(h => h.id === selectedHistoryId) || history[0] || null;

  const dashNavItems: NavItem[] = [
    { id: 1, label: 'Overview', link: '#' },
    { id: 2, label: 'Pipeline', link: '#' },
    { id: 3, label: 'Agents',   link: '#' },
    { id: 4, label: 'Reports',  link: '#' },
    { id: 5, label: 'History',  link: '#' },
    { id: 6, label: 'API Key',  link: '#' },
  ];

  const sidebarItems = [
    { icon: <LayoutGrid size={16} strokeWidth={1.6} />, label: 'Overview', tab: 'Overview' },
    { icon: <Zap        size={16} strokeWidth={1.6} />, label: 'Pipeline', tab: 'Pipeline' },
    { icon: <Bot        size={16} strokeWidth={1.6} />, label: 'Agents',   tab: 'Agents'   },
    { icon: <BarChart2  size={16} strokeWidth={1.6} />, label: 'Reports',  tab: 'Reports'  },
  ];

  const sectionHeader = (title: string, sub: string) => (
    <div>
      <h2 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--color-ink)' }}>{title}</h2>
      <p style={{ fontSize: 12, color: 'var(--color-ink-faint)' }}>{sub}</p>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      fontFamily: 'var(--font-family-body)',
      animation: 'dash-enter .5s cubic-bezier(.16,1,.3,1) both',
      color: 'var(--color-ink)',
    }}>
      <div className="surface-shell" style={{ margin: '14px auto', maxWidth: 1080, overflow: 'hidden', display: 'grid', gridTemplateColumns: '52px 1fr', minHeight: 'calc(100vh - 28px)' }}>

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <div style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-surface-border)', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {sidebarItems.map(({ icon, label, tab }) => (
            <div key={label} title={label} onClick={() => setActiveTab(tab)} style={{
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: activeTab === tab ? 'var(--color-accent-dim)' : 'transparent',
              color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-ink-faint)',
              cursor: 'pointer', transition: 'background .2s, color .2s',
            }}>{icon}</div>
          ))}
          <div style={{ flex: 1 }} />
          <div title="Back to Landing" onClick={() => navigate('/')} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-faint)', cursor: 'pointer' }}>
            <ArrowLeft size={15} strokeWidth={1.6} />
          </div>
        </div>

        {/* ── Main ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NexusLogo size={20} />
              <span style={{ fontFamily: 'var(--font-family-label)', fontWeight: 700, fontSize: 13, letterSpacing: '.1em', color: 'var(--color-ink)' }}>NEXUS</span>
            </div>
            <DropdownNavigation navItems={dashNavItems} activeItem={activeTab} onItemClick={setActiveTab} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--color-surface-border)', padding: '3px 10px 3px 3px' }}>
              <div style={{ width: 22, height: 22, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>G</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-ink-dim)' }}>Guru</span>
            </div>
          </div>

          <div key={activeTab} className="tab-content" style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

            {/* ══ OVERVIEW ══ */}
            {activeTab === 'Overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {sectionHeader('Product Intelligence', 'Six-agent pipeline for automated product analysis.')}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                  <StatCard label="Total Runs" value={String(history.length)} sub="all time" />
                  <StatCard label="Successful" value={String(successCount)} sub={history.length ? `${Math.round(successCount / history.length * 100)}% success rate` : '—'} />
                  <StatCard label="Avg Runtime" value={avgElapsed ? fmtTime(avgElapsed) : '—'} sub="per full pipeline" />
                  <StatCard label="API Status" value={apiKey ? 'Live' : 'No key'} sub={apiKey ? 'gemini-2.0-flash' : 'Set key → API Key tab'} />
                </div>
                <div className="surface-panel" style={{ padding: 16 }}>
                  <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 11, fontWeight: 600, color: 'var(--color-ink-faint)', marginBottom: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}>Quick Start</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={goal} onChange={e => setGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && startRun()} placeholder="Enter product URL…" style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', padding: '8px 12px', fontSize: 12, color: 'var(--color-ink-dim)', outline: 'none', fontFamily: 'var(--font-family-body)' }} />
                    <button onClick={startRun} disabled={!goal.trim() || run.status === 'running'} className="btn-sharp" style={{ padding: '8px 20px', fontSize: 11, background: goal.trim() ? 'var(--color-accent)' : 'var(--color-surface-strong)', color: goal.trim() ? '#fff' : 'var(--color-ink-faint)', border: 'none' }}>
                      {run.status === 'running' ? 'Running…' : 'Analyze →'}
                    </button>
                  </div>
                </div>
                {history.length > 0 && (
                  <div className="surface-panel" style={{ padding: 16 }}>
                    <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 11, fontWeight: 600, color: 'var(--color-ink-faint)', marginBottom: 10, letterSpacing: '.08em', textTransform: 'uppercase' }}>Recent Runs</div>
                    {history.slice(0, 4).map(h => (
                      <div key={h.id} onClick={() => { setSelectedHistoryId(h.id); setActiveTab('Reports'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--color-surface-border)', cursor: 'pointer' }}>
                        <span style={{ width: 6, height: 6, background: h.status === 'done' ? 'var(--color-success)' : 'var(--color-error)', flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--color-ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.goal}</span>
                        <span style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtTime(h.elapsed)}</span>
                        <span style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtDate(h.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ AGENTS ══ */}
            {activeTab === 'Agents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {sectionHeader('Pipeline Agents', 'Six specialized agents run sequentially on every analysis.')}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                  {AGENTS.map((name, idx) => {
                    const info = AGENT_INFO[name];
                    const agentRun = run.agents.find(a => a.name === name);
                    return (
                      <div key={name} className="surface-panel" style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 30, height: 30, background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-dim)', flexShrink: 0 }}>
                            {AGENT_ICONS[name as AgentIconKey]}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>{idx + 1}. {name}</div>
                            {agentRun && <AgentBadge status={agentRun.status} />}
                          </div>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--color-ink-faint)', lineHeight: 1.6, margin: 0 }}>{info.desc}</p>
                        {agentRun?.duration && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--color-ink-faint)' }}>Last run: {fmtTime(agentRun.duration)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ PIPELINE ══ */}
            {activeTab === 'Pipeline' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <h2 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--color-ink)' }}>Product<br />Intelligence</h2>
                  <div style={{ width: 44, height: 44, border: '2px solid var(--color-surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-ink-dim)' }}>{doneCount}/{AGENTS.length}</div>
                  {[{ label: 'STATUS', val: run.status === 'idle' ? 'Idle' : run.status === 'running' ? 'Running' : run.status === 'done' ? 'Done' : 'Error' }, { label: 'ELAPSED', val: fmtTime(run.elapsed) }, { label: 'AGENTS DONE', val: `${doneCount}/${AGENTS.length}` }].map(({ label, val }) => (
                    <div key={label} style={{ borderLeft: '1px solid var(--color-surface-border)', paddingLeft: 16 }}>
                      <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600, letterSpacing: '.06em', color: 'var(--color-ink-faint)' }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 1, color: 'var(--color-ink)' }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', padding: '8px 10px' }}>
                  <input type="text" value={goal} onChange={e => setGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && run.status !== 'running' && startRun()} placeholder="Enter product URL or name  (e.g. amazon.com/dp/B09B93ZDG4)" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--color-ink-dim)', fontFamily: 'var(--font-family-body)' }} />
                  {run.status === 'running'
                    ? <button onClick={cancelRun} className="btn-sharp" style={{ padding: '6px 16px', fontSize: 11, background: 'rgba(248,113,113,.14)', color: 'var(--color-error)', border: '1px solid rgba(248,113,113,.3)' }}>Cancel</button>
                    : <button onClick={startRun} disabled={!goal.trim()} className="btn-sharp" style={{ padding: '6px 18px', fontSize: 11, background: goal.trim() ? 'var(--color-accent)' : 'var(--color-surface-strong)', color: goal.trim() ? '#fff' : 'var(--color-ink-faint)', border: 'none' }}>Analyze →</button>
                  }
                </div>

                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {['All', ...AGENTS].map(f => (
                    <button key={f} onClick={() => setActiveFilter(f)} className="btn-sharp" style={{ padding: '4px 13px', fontSize: 11, fontWeight: 500, background: activeFilter === f ? 'var(--color-accent)' : 'transparent', color: activeFilter === f ? '#fff' : 'var(--color-ink-faint)', border: `1px solid ${activeFilter === f ? 'transparent' : 'var(--color-surface-border)'}`, textTransform: 'none', letterSpacing: 'normal' }}>{f}</button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 188px', gap: 12, flex: 1 }}>
                  <div className="surface-panel" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--color-surface-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 26, height: 26, background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-dim)' }}>
                        {run.status === 'running' ? <Zap size={13} strokeWidth={2} /> : run.status === 'done' ? <Check size={13} strokeWidth={2} /> : <Square size={13} strokeWidth={1.6} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink)' }}>{run.goal || 'Ready for analysis'}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>
                          {run.status === 'idle' ? 'Enter a product URL above' : run.status === 'running' ? `${doneCount}/6 agents complete · ${fmtTime(run.elapsed)}` : run.status === 'done' ? `Completed in ${fmtTime(run.elapsed)}` : run.error || 'Error'}
                        </div>
                      </div>
                      {run.status !== 'idle' && (
                        <div style={{ width: 100, height: 3, background: 'var(--color-surface-strong)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: '100%', background: pct === 100 ? 'var(--color-success)' : 'var(--color-accent)', transformOrigin: 'left center', transform: `scaleX(${pct / 100})`, transition: 'transform .4s ease, background .3s ease' }} />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {filteredAgents.map(agent => (
                        <div key={agent.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--color-surface-border)' }}>
                          <StatusDot status={agent.status} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: agent.output ? 4 : 0 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: agent.status === 'idle' ? 'var(--color-ink-faint)' : 'var(--color-ink-dim)' }}>{agent.name}</span>
                              <AgentBadge status={agent.status} />
                              {agent.duration && <span style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtTime(agent.duration)}</span>}
                            </div>
                            {agent.output && (
                              <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {typeof agent.output === 'string' ? agent.output.slice(0, 160) : JSON.stringify(agent.output).slice(0, 160)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {run.status === 'done' && (
                      <div style={{ margin: '0 14px 12px', display: 'flex', gap: 8 }}>
                        <button onClick={() => setActiveTab('Reports')} className="btn-sharp" style={{ flex: 1, padding: '7px 0', fontSize: 11, background: 'rgba(74,222,128,.12)', color: 'var(--color-success)', border: '1px solid rgba(74,222,128,.25)' }}>View Full Report →</button>
                      </div>
                    )}
                    {run.status === 'error' && run.error && (
                      <div style={{ margin: '0 14px 12px', padding: '8px 12px', background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', fontSize: 11, color: 'var(--color-error)' }}>{run.error}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="surface-panel" style={{ padding: 12 }}>
                      <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 8 }}>Current Run</div>
                      <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>{pct}<span style={{ fontSize: 14, color: 'var(--color-ink-faint)' }}>%</span></div>
                      <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginTop: 3 }}>
                        {run.status === 'running' ? `${run.agents.find(a => a.status === 'running')?.name || 'Waiting'}...` : run.status === 'done' ? 'All done' : 'Not started'}
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
                        <button onClick={cancelRun} disabled={run.status !== 'running'} className="btn-sharp" style={{ flex: 1, padding: '5px 0', fontSize: 10, background: 'var(--color-surface)', color: 'var(--color-ink-faint)', border: '1px solid var(--color-surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><X size={10} strokeWidth={2} /> Cancel</button>
                        <button onClick={startRun} disabled={!goal.trim() || run.status === 'running'} className="btn-sharp" style={{ flex: 1, padding: '5px 0', fontSize: 10, background: 'var(--color-accent)', color: '#fff', border: 'none', opacity: (!goal.trim() || run.status === 'running') ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Play size={10} strokeWidth={2} fill="#fff" /> Run</button>
                      </div>
                    </div>
                    <div className="surface-panel" style={{ padding: 12 }}>
                      <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 8 }}>Gemini API</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, flexShrink: 0, background: apiKey ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: apiKey ? 'var(--color-success)' : 'var(--color-ink-faint)' }}>{apiKey ? 'Connected' : 'Not set'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginTop: 3 }}>gemini-2.0-flash</div>
                      <button onClick={() => setActiveTab('API Key')} className="btn-sharp" style={{ marginTop: 10, width: '100%', padding: '5px 0', fontSize: 10, background: 'var(--color-surface)', color: 'var(--color-ink-dim)', border: '1px solid var(--color-surface-border)' }}>{apiKey ? 'Update Key' : 'Set Key →'}</button>
                    </div>
                    <div className="surface-panel" style={{ padding: 12 }}>
                      <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 10 }}>Session</div>
                      {[{ label: 'Agents', val: '6' }, { label: 'Backend', val: 'FastAPI' }, { label: 'Port', val: '3000' }].map(({ label, val }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-surface-border)' }}>
                          <span style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{label}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-ink-dim)' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══ REPORTS ══ */}
            {activeTab === 'Reports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {sectionHeader('Reports', 'Full agent outputs from completed runs.')}
                  {history.length > 1 && (
                    <select value={selectedHistoryId || ''} onChange={e => setSelectedHistoryId(e.target.value)} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', padding: '6px 10px', fontSize: 11, color: 'var(--color-ink-dim)', outline: 'none', cursor: 'pointer' }}>
                      {history.map(h => <option key={h.id} value={h.id} style={{ background: '#07080B' }}>{h.goal.slice(0, 50)} — {fmtDate(h.timestamp)}</option>)}
                    </select>
                  )}
                </div>
                {selectedEntry ? (
                  <>
                    <div className="surface-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 7, height: 7, background: selectedEntry.status === 'done' ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{selectedEntry.goal}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtDate(selectedEntry.timestamp)} · {fmtTime(selectedEntry.elapsed)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedEntry.agents.map(agent => (
                        <div key={agent.name} className="surface-panel" style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: agent.output ? 10 : 0 }}>
                            <div style={{ width: 22, height: 22, background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-dim)', flexShrink: 0 }}>
                              {AGENT_ICONS[agent.name as AgentIconKey]}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>{agent.name}</span>
                            <AgentBadge status={agent.status} />
                            {agent.duration && <span style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtTime(agent.duration)}</span>}
                          </div>
                          <AgentOutput name={agent.name} output={agent.output} runId={selectedEntry?.id} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="surface-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--color-ink-faint)' }}><BarChart2 size={20} strokeWidth={1.5} /></div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink-dim)', marginBottom: 8 }}>No reports yet</div>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-faint)' }}>Run a pipeline analysis to generate your first report.</div>
                    <button onClick={() => setActiveTab('Pipeline')} className="btn-sharp" style={{ marginTop: 16, padding: '8px 20px', fontSize: 11, background: 'var(--color-accent)', color: '#fff', border: 'none' }}>Go to Pipeline →</button>
                  </div>
                )}
              </div>
            )}

            {/* ══ HISTORY ══ */}
            {activeTab === 'History' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {sectionHeader('History', `${history.length} run${history.length !== 1 ? 's' : ''} recorded in this browser.`)}
                  {history.length > 0 && <button onClick={clearHistory} className="btn-sharp" style={{ padding: '6px 14px', fontSize: 11, background: 'rgba(248,113,113,.1)', color: 'var(--color-error)', border: '1px solid rgba(248,113,113,.2)' }}>Clear All</button>}
                </div>
                {history.length > 0 ? (
                  <div className="surface-panel" style={{ overflow: 'hidden' }}>
                    {history.map((h, i) => (
                      <div key={h.id} onClick={() => { setSelectedHistoryId(h.id); setActiveTab('Reports'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < history.length - 1 ? '1px solid var(--color-surface-border)' : 'none', cursor: 'pointer' }}>
                        <span style={{ width: 7, height: 7, background: h.status === 'done' ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.goal}</div>
                          <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginTop: 2 }}>{fmtDate(h.timestamp)}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: h.status === 'done' ? 'var(--color-success)' : 'var(--color-error)' }}>{h.status === 'done' ? 'Success' : 'Error'}</div>
                          <div style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtTime(h.elapsed)}</div>
                        </div>
                        <ChevronRight size={13} strokeWidth={1.6} style={{ color: 'var(--color-ink-faint)', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="surface-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--color-ink-faint)' }}><Clock size={20} strokeWidth={1.5} /></div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink-dim)', marginBottom: 8 }}>No history yet</div>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-faint)' }}>Completed runs will appear here automatically.</div>
                  </div>
                )}
              </div>
            )}

            {/* ══ API KEY ══ */}
            {activeTab === 'API Key' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-ink)' }}>
                    <KeyRound size={18} strokeWidth={1.8} style={{ color: 'var(--color-ink-faint)' }} />API Key
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--color-ink-faint)' }}>Your Gemini API key is stored in this browser only — never sent to any server except Google.</p>
                </div>
                <div className="surface-panel" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 7, height: 7, background: apiKey ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: apiKey ? 'var(--color-success)' : 'var(--color-ink-faint)' }}>{apiKey ? 'Key saved' : 'No key set'}</span>
                    {apiKey && <span style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginLeft: 4 }}>{apiKey.slice(0, 8)}••••••••</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && apiKeyInput && saveApiKey()} placeholder={apiKey ? 'Enter new key to replace…' : 'AIza…'} style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', padding: '9px 12px', fontSize: 12, color: 'var(--color-ink-dim)', outline: 'none', fontFamily: 'var(--font-family-body)' }} />
                    <button onClick={saveApiKey} disabled={!apiKeyInput.trim()} className="btn-sharp" style={{ padding: '9px 20px', fontSize: 11, background: apiKeyInput.trim() ? 'var(--color-accent)' : 'var(--color-surface-strong)', color: apiKeyInput.trim() ? '#fff' : 'var(--color-ink-faint)', border: 'none' }}>Save</button>
                  </div>
                  {apiKey && <button onClick={() => { localStorage.removeItem('nexus_api_key'); setApiKey(''); }} style={{ marginTop: 12, fontSize: 11, color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove saved key</button>}
                </div>
                <div className="surface-panel" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-ink-faint)', marginBottom: 8 }}>Model in use</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink-dim)' }}>gemini-2.0-flash</div>
                  <div style={{ fontSize: 11, color: 'var(--color-ink-faint)', marginTop: 4 }}>Fast inference · supports long context · free tier available</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `cd landing && npm run build`
Expected: succeeds with zero TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add landing/src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): rebuild dashboard shell and all six tabs in new design system"
```

---

### Task 9: Visual verification and functional smoke test

**Files:** none (verification only)

**Interfaces:** none.

- [ ] **Step 1: Start the dev server**

Run: `cd landing && npm run dev` (leave running, or use the built-in browser's `preview_start` against `landing` per `.claude/launch.json` if configured — otherwise run manually and open `http://localhost:5173`).

- [ ] **Step 2: Load the landing page and compare against sharplink.com at desktop width (1280px+)**

Check: nav bar layout, hero headline weight/tracking, accent-blue CTA button shape (sharp corners), 3D wireframe hero renders and rotates, opportunity band typography contrast (bold lead + muted continuation), agent showcase grid, footer giant wordmark + FAQ accordion opens/closes.

- [ ] **Step 3: Resize to mobile width (375px) and tablet (768px)**

Check: no horizontal scroll, hero text remains legible via `clamp()`, agent showcase grid degrades sensibly (acceptable to remain 3-column or wrap — note any overflow issues found and fix inline in `LandingPage.tsx`).

- [ ] **Step 4: Navigate to `/dashboard` and run a functional smoke test**

Check, in order:
1. Overview tab renders stat cards with real localStorage-derived numbers.
2. Type a URL into the Pipeline tab input and click "Analyze →" — confirm the fetch to `/analyze` fires (Network tab) and the tab switches through running → done/error state.
3. Filter pills in the Pipeline tab filter the agent list.
4. Reports tab renders `AgentOutput` for each agent type without runtime errors (check browser console for red errors).
5. History tab lists past runs and clicking one jumps to Reports with that entry selected.
6. API Key tab saves and removes a key via `localStorage`.

- [ ] **Step 5: Fix any visual or functional issues found, re-run `npm run build`, and commit**

```bash
git add -A
git commit -m "fix(design): visual and functional polish pass after redesign"
```

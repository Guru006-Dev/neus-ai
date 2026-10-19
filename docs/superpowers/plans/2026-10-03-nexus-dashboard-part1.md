# NEXUS Dashboard Part 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A routed `/dashboard` inside the existing Vite app where a user enters a goal, creates a real workflow, and watches and inspects it, backed only by real FastAPI data.

**Architecture:**
- `react-router` adds a lazily loaded `/dashboard` tree beside the untouched landing page.
- All backend access goes through `src/dashboard/data/`, a typed client plus normalization. Components only see domain types.
- Run state is a pure lifecycle function of the latest response, polled with a non-overlapping timeout chain.
- FastAPI gains one small module that serves `frontend/dist`.

**Tech stack:** React 19, Vite 8, TypeScript 6, `react-router` 8, Vitest 5, Playwright 1.63, FastAPI 0.140 with pytest 9 and httpx 0.28.

**Spec:** `docs/superpowers/specs/2026-10-03-nexus-dashboard-design.md`, with the user's approval message of 2026-10-03, which adds the requirements under Global Constraints.

## Global constraints

- **Landing page:** no file under `frontend/src/landing/` is modified. The dashboard imports only `landing/NexusLogo.tsx` and `landing/nexus-story.ts` (`AGENTS`), both pure modules.
- **Run state source:** `GET /workflows/{id}` is authoritative for run state. `GET /status/{id}` is never called; a test enforces this.
- **No fabricated counts:** no "n of m" or any other execution count. Agents with no task in a terminal run read **"Not in this run"**.
- **Run map:** a sequential chain (goal → Explorer → Knowledge → Documentation → QA → Demo → Release → N), never a fan-out.
- **Agent-reported values:** Explorer `metrics` and QA numbers appear only under the label **"Reported by agent"**, in muted text, never as headline figures.
- **System metrics:** CPU, memory and `resources` are never rendered.
- **No sample data:** no sample or mock records anywhere in `src/`. Test fixtures live only under `frontend/e2e/fixtures/` and are recorded from a real backend (Task 4).
- **Local run index:** localStorage key `nexus.runs.v1` stores only an index (`id`, `goal`, `submittedAt`). Status always comes from the backend. The UI labels it **"Started from this browser"**.
- **Section placeholders:** Knowledge, Documentation, QA, Demos and Releases show a designed **"Backend support needed"** state that links to the matching output of the newest local run that has it.
- **Agent names:** product names exactly `Explorer, Knowledge, Documentation, QA, Demo, Release`. Internal names `explorer, knowledge_graph, documentation, qa, demo, release` map 1:1.
- **Status vocabulary:**

  | Backend status | Glyph | Label |
  |---|---|---|
  | `QUEUED` | ○ | Queued |
  | `WAITING` | ○ | Waiting |
  | `RUNNING` | ● | Running |
  | `COMPLETED` | ✓ | Complete |
  | `FAILED` | ✕ | Failed |
  | `CANCELLED` | – | Cancelled |
  | no task | ○ | Not started |
  | terminal run, no task | – | Not in this run |

- **Visual identity:** palette `#080808 / #E1E5E5 / #C0C4C6 / #838A8F / #666F76 / #1C2227 / #20272C`, Geist and Geist Mono, 999px pills. Dashboard tokens are scoped under `.nx-app`.
- **Motion:** ≤ 200 ms transitions; the only loop is the 2 s pulse on the running ●; under `prefers-reduced-motion: reduce` there are zero transitions and no pulse.
- **Live region:** at most one `aria-live="polite"` region per run, announcing only agent-terminal and run-terminal transitions.
- **Backend scope:** only `backend/frontend_serving.py` (new) and a 2-line hook in `backend/main.py`. No other backend change.
- **Git:**
  - The branch carries uncommitted room and laptop work. Every commit stages exact paths only and never includes `frontend/src/landing/**`, `frontend/e2e/room.spec.ts`, or `frontend/src/landing/scene/**`.
  - Commit steps run only if the user's execution approval allows commits; otherwise skip them and record the skip.
- **Commands** (run from `frontend/` unless stated):
  - unit tests: `npx vitest run <path>`
  - E2E: `PW_CHROMIUM_PATH="$LOCALAPPDATA/ms-playwright/chromium-1234/chrome-win64/chrome.exe" npx playwright test <path>`
  - backend (from repo root): `python -m pytest backend/tests/test_frontend_serving.py -q`

## Review focus

The input conditions the spec implies but no feature test naturally covers, most likely first:

1. **Navigating between runs before a response arrives.** A response for the previous id must never render under the new id. Pinned in Task 7, test "ignores a response for a superseded id".
2. **Outputs that are strings, nulls or other unexpected types** where objects are expected (LLM JSON fallback paths). The renderer shows "Raw output" instead of crashing. Pinned in Task 10, test "every renderer survives malformed output".
3. **Backend restart during an active poll.** The run moves from active to not-found or degraded without losing the goal or the last data. Pinned in Task 9, E2E test "backend restart mid-run".
4. **localStorage unavailable or full** (private mode, quota). The dashboard still creates runs and navigates, and the index degrades to in-memory. Pinned in Task 6, test "survives a throwing storage".
5. **Very long or whitespace-only goals.** Run is disabled for whitespace; 5,000-character goals wrap or truncate without horizontal overflow at 390px. Pinned in Task 8, test "long and blank goals".

---

## Coverage map: the 19 required plan items

| # | Item | Where |
|---|---|---|
| 1 | Exact files | File structure section, plus each task's **Files** block |
| 2 | Route architecture | Task 1 |
| 3 | Dashboard shell | Task 3 |
| 4 | Design tokens and components | Task 2 |
| 5 | API, data and service layer | Task 5 |
| 6 | Type definitions | Task 4 (raw), Task 5 (domain) |
| 7 | localStorage run index | Task 6 |
| 8 | Polling strategy | Task 7 |
| 9 | Run lifecycle state machine | Task 7 |
| 10 | Output mapping | Task 5 (normalize), Task 10 (renderers) |
| 11 | Backend serving | Task 12 |
| 12 | Fixture capture | Task 4 |
| 13 | Unit tests | Every task's step 1 |
| 14 | Integration and E2E tests | Tasks 1, 3, 8, 9, 11, 13 |
| 15 | Responsive | Tasks 3 and 13 |
| 16 | Accessibility | Tasks 2, 3, 9 and 13 |
| 17 | Performance | Tasks 1, 7 and 13 |
| 18 | Build and deploy verification | Task 14 |
| 19 | Rollback and regression | Task 14, plus "Rollback" at the end |

## File structure

```
frontend/
  package.json                         MODIFY add react-router
  vite.config.ts                       MODIFY dev/preview proxy
  src/App.tsx                          MODIFY render <AppRouter/>
  src/router.tsx                       CREATE route table (landing eager, dashboard lazy)
  src/dashboard/
    NexusDashboard.tsx                 CREATE lazy entry: route children, layout
    dashboard.css                      CREATE tokens + primitives styles, scoped .nx-app
    ui/                                CREATE primitives
      Button.tsx  StatusGlyph.tsx  Panel.tsx  DataRows.tsx  Tabs.tsx
      EmptyState.tsx  Skeleton.tsx  CopyButton.tsx  Disclosure.tsx  status.ts
    shell/
      DashboardLayout.tsx              CREATE grid: sidebar + topbar + <Outlet/>
      Sidebar.tsx                      CREATE nav groups, rail/drawer modes
      TopBar.tsx                       CREATE breadcrumbs + page actions slot
      BackendStatus.tsx                CREATE sidebar system line
      nav.ts                           CREATE nav model
    data/
      raw.ts                           CREATE raw response types (from fixtures)
      types.ts                         CREATE domain types
      agents.ts                        CREATE agent id/name/context-key mapping
      time.ts                          CREATE SQLite UTC parsing, durations
      normalize.ts                     CREATE raw → domain
      client.ts                        CREATE fetch wrapper + ApiError
      workflows.ts                     CREATE createRun, getRun
      system.ts                        CREATE getSystemStatus (no resources)
      settings.ts                      CREATE setApiKey
      localRuns.ts                     CREATE localStorage index
    run/
      lifecycle.ts                     CREATE RunView state machine + nextPollDelay
      useRun.ts                        CREATE polling hook
      useLocalRuns.ts                  CREATE useSyncExternalStore over localRuns
      useSystemStatus.ts               CREATE 10 s poll
    pages/
      OverviewPage.tsx  RunsPage.tsx  RunDetailPage.tsx  AgentsPage.tsx
      OutputSectionPage.tsx  SettingsPage.tsx  NotFoundPage.tsx
    run-detail/
      RunHeader.tsx  OrchestratorBand.tsx  AgentList.tsx  RunMap.tsx
      OutputPanel.tsx  RunStateNotice.tsx
    outputs/
      ExplorerOutput.tsx  KnowledgeOutput.tsx  DocumentationOutput.tsx
      QAOutput.tsx  DemoOutput.tsx  ReleaseOutput.tsx  RawOutput.tsx
      markdown.tsx                     CREATE safe Markdown subset → React
      graphLayout.ts                   CREATE deterministic KG layout
  scripts/capture-fixtures.mjs         CREATE records real backend responses
  e2e/fixtures/                        CREATE recorded JSON (Task 4)
  e2e/dashboard/
    mockBackend.ts                     CREATE page.route helper over fixtures
    routing.spec.ts  overview.spec.ts  run-detail.spec.ts  sections.spec.ts
    responsive.spec.ts  a11y.spec.ts
backend/
  frontend_serving.py                  CREATE mount_frontend(app, dist)
  main.py                              MODIFY 2 lines: import + call before routes
  tests/test_frontend_serving.py       CREATE pytest
```

Unit tests sit next to their modules as `*.test.ts(x)`, matching the existing Vitest include pattern `src/**/*.test.{ts,tsx}`.

---

### Task 1: Router with a lazy dashboard tree

**Files:**
- Modify: `frontend/package.json` (dependency), `frontend/src/App.tsx`
- Create: `frontend/src/router.tsx`, `frontend/src/dashboard/NexusDashboard.tsx` (temporary stub, replaced in Task 3)
- Test: `frontend/src/router.test.tsx`, `frontend/e2e/dashboard/routing.spec.ts`

**Interfaces:**
- Produces:
  - `AppRouter(): JSX.Element`
  - `routes: RouteObject[]`, with `/` → `LandingPage` and `/dashboard/*` → lazy `NexusDashboard`
  - `NexusDashboard` is the default export, consumed in Task 3.

- [ ] **Step 1: Install the dependency.**

Run: `npm i react-router@^8`. Expected: `package.json` lists `"react-router": "^8.x"`.

- [ ] **Step 2: Write failing tests.**

```tsx
// src/router.test.tsx
import { describe, expect, it } from 'vitest'
import { routes } from './router'

describe('routes', () => {
  it('serves the landing page eagerly and the dashboard lazily', () => {
    const root = routes.find((r) => r.path === '/')!
    const dash = routes.find((r) => r.path === '/dashboard/*')!
    expect(root.element).toBeTruthy()
    expect(root.lazy).toBeUndefined()
    expect(typeof dash.lazy).toBe('function')
  })
})
```

```ts
// e2e/dashboard/routing.spec.ts
import { expect, test } from '@playwright/test'

const DASH_CHUNK = /NexusDashboard-[^/]*\.js$/

test('the landing page never downloads dashboard code', async ({ page }) => {
  const chunks: string[] = []
  page.on('request', (r) => chunks.push(r.url()))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(chunks.some((u) => DASH_CHUNK.test(u))).toBe(false)
})

test('Launch NEXUS opens the dashboard', async ({ page }) => {
  await page.goto('/')
  await page.locator('.nav__cta').click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.locator('.nx-app')).toBeVisible()
})

test('deep links resolve inside the dashboard', async ({ page }) => {
  for (const path of ['/dashboard/runs', '/dashboard/runs/wf-12345678', '/dashboard/agents', '/dashboard/settings', '/dashboard/nope']) {
    await page.goto(path)
    await expect(page.locator('.nx-app'), path).toBeVisible()
  }
})
```

- [ ] **Step 3: Run the tests to confirm they fail.**

Run: `npx vitest run src/router.test.tsx`. Expected: FAIL, "Cannot find module './router'".

- [ ] **Step 4: Implement.**

```tsx
// src/router.tsx
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router'
import { LandingPage } from './landing/LandingPage'

export const routes: RouteObject[] = [
  { path: '/', element: <LandingPage /> },
  {
    path: '/dashboard/*',
    lazy: async () => ({ Component: (await import('./dashboard/NexusDashboard')).default }),
  },
  { path: '*', element: <LandingPage /> },
]

const router = createBrowserRouter(routes)

export function AppRouter() {
  return <RouterProvider router={router} />
}
```

```tsx
// src/App.tsx
import { AppRouter } from './router'

export default function App() {
  return <AppRouter />
}
```

```tsx
// src/dashboard/NexusDashboard.tsx (temporary; replaced in Task 3)
export default function NexusDashboard() {
  return <div className="nx-app" />
}
```

- [ ] **Step 5: Run the unit tests, the routing E2E test and the full existing E2E suite.**

Expected:
- the unit test passes;
- `routing.spec.ts` passes (the "deep links" test passes because the stub renders `.nx-app`);
- the existing 37 E2E tests still pass, which is the landing regression check.

If `react-router` 8's export names differ, read `node_modules/react-router/dist/index.d.ts` and adjust only `router.tsx`.

- [ ] **Step 6: Commit.** `git add frontend/package.json frontend/package-lock.json frontend/src/App.tsx frontend/src/router.tsx frontend/src/router.test.tsx frontend/src/dashboard/NexusDashboard.tsx frontend/e2e/dashboard/routing.spec.ts`, then `git commit -m "feat(dashboard): router with lazy dashboard tree"`.

---

### Task 2: Design tokens and UI primitives

**Files:**
- Create: `src/dashboard/dashboard.css`, `src/dashboard/ui/status.ts`, `src/dashboard/ui/{Button,StatusGlyph,Panel,DataRows,Tabs,EmptyState,Skeleton,CopyButton,Disclosure}.tsx`
- Test: `src/dashboard/ui/ui.test.tsx`

**Interfaces:**
- Consumes: `AgentState` from Task 5. Until then, declare it here in `ui/status.ts`; Task 5 re-exports it from `data/types.ts`.
- Produces:
  - `STATUS_UI: Record<AgentState, { glyph: string; label: string; tone: 'idle'|'active'|'done'|'error'|'muted' }>`
  - `<StatusGlyph state/>`, `<StatusPill state/>`
  - `<Button variant='primary'|'ghost' />`
  - `<Panel title? actions?>`
  - `<DataRows columns rows onRowHref? />`
  - `<Tabs items value onChange />`
  - `<EmptyState title body action? />`
  - `<Skeleton lines />`
  - `<CopyButton value label />`
  - `<Disclosure summary>`

- [ ] **Step 1: Write failing tests.**

```tsx
// src/dashboard/ui/ui.test.tsx
import { renderToStaticMarkup as html } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { STATUS_UI } from './status'
import { StatusGlyph, StatusPill } from './StatusGlyph'
import { Tabs } from './Tabs'

describe('status vocabulary', () => {
  it('uses the NEXUS glyphs and labels for every state', () => {
    expect(STATUS_UI).toMatchObject({
      queued: { glyph: '○', label: 'Queued' },
      waiting: { glyph: '○', label: 'Waiting' },
      running: { glyph: '●', label: 'Running' },
      completed: { glyph: '✓', label: 'Complete' },
      failed: { glyph: '✕', label: 'Failed' },
      cancelled: { glyph: '–', label: 'Cancelled' },
      'not-started': { glyph: '○', label: 'Not started' },
      'not-in-run': { glyph: '–', label: 'Not in this run' },
    })
  })

  it('hides the glyph from assistive tech and always renders the text label', () => {
    const out = html(<StatusPill state="running" />)
    expect(out).toMatch(/aria-hidden="true"[^>]*>●/)
    expect(out).toContain('Running')
    expect(html(<StatusGlyph state="failed" />)).toContain('data-tone="error"')
  })

  it('tabs follow the ARIA tabs pattern', () => {
    const out = html(<Tabs label="Outputs" items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} value="b" onChange={() => {}} />)
    expect(out).toContain('role="tablist"')
    expect(out.match(/role="tab"/g)).toHaveLength(2)
    expect(out).toMatch(/aria-selected="true"[^>]*>B/)
    expect(out).toMatch(/tabindex="-1"[^>]*>A/)
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail** (`npx vitest run src/dashboard/ui`). Expected: module not found.

- [ ] **Step 3: Implement.**

```ts
// src/dashboard/ui/status.ts
export type RunStatus = 'queued' | 'waiting' | 'running' | 'completed' | 'failed' | 'cancelled'
export type AgentState = RunStatus | 'not-started' | 'not-in-run'
type Tone = 'idle' | 'active' | 'done' | 'error' | 'muted'

export const STATUS_UI: Record<AgentState, { glyph: string; label: string; tone: Tone }> = {
  queued: { glyph: '○', label: 'Queued', tone: 'idle' },
  waiting: { glyph: '○', label: 'Waiting', tone: 'idle' },
  running: { glyph: '●', label: 'Running', tone: 'active' },
  completed: { glyph: '✓', label: 'Complete', tone: 'done' },
  failed: { glyph: '✕', label: 'Failed', tone: 'error' },
  cancelled: { glyph: '–', label: 'Cancelled', tone: 'muted' },
  'not-started': { glyph: '○', label: 'Not started', tone: 'idle' },
  'not-in-run': { glyph: '–', label: 'Not in this run', tone: 'muted' },
}
```

```tsx
// src/dashboard/ui/StatusGlyph.tsx
import { STATUS_UI, type AgentState } from './status'

export function StatusGlyph({ state }: { state: AgentState }) {
  const s = STATUS_UI[state]
  return <span className="nx-glyph" data-tone={s.tone} aria-hidden="true">{s.glyph}</span>
}

export function StatusPill({ state }: { state: AgentState }) {
  return (
    <span className="nx-pill" data-tone={STATUS_UI[state].tone}>
      <StatusGlyph state={state} />
      {STATUS_UI[state].label}
    </span>
  )
}
```

```tsx
// src/dashboard/ui/Tabs.tsx: roving tabindex; arrow keys move focus and select
import { useRef, type KeyboardEvent } from 'react'

export interface TabItem { id: string; label: string }

export function Tabs({ label, items, value, onChange }: { label: string; items: TabItem[]; value: string; onChange: (id: string) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = (i + d + items.length) % items.length
    refs.current[next]?.focus()
    onChange(items[next].id)
  }
  return (
    <div className="nx-tabs" role="tablist" aria-label={label}>
      {items.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[i] = el }}
          role="tab"
          id={`tab-${t.id}`}
          aria-controls={`panel-${t.id}`}
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
```

```tsx
// src/dashboard/ui/Button.tsx
import type { ButtonHTMLAttributes } from 'react'
export function Button({ variant = 'ghost', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  return <button className={`nx-btn nx-btn--${variant} ${className}`} {...rest} />
}
```

```tsx
// src/dashboard/ui/Panel.tsx
import type { ReactNode } from 'react'
export function Panel({ title, actions, children, id }: { title?: string; actions?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="nx-panel" aria-labelledby={title ? `${id}-title` : undefined} id={id}>
      {title && (
        <header className="nx-panel__head">
          <h2 id={`${id}-title`} className="nx-eyebrow">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}
```

```tsx
// src/dashboard/ui/DataRows.tsx: a real <table> on wide screens; CSS stacks the cells under 768px
import { Link } from 'react-router'
import type { ReactNode } from 'react'

export interface Column<T> { key: string; header: string; cell: (row: T) => ReactNode; primary?: boolean }

export function DataRows<T>({ caption, columns, rows, rowKey, rowHref }: { caption: string; columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; rowHref?: (r: T) => string }) {
  return (
    <table className="nx-rows">
      <caption className="sr-only">{caption}</caption>
      <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.header}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={rowKey(r)}>
            {columns.map((c) => (
              <td key={c.key} data-label={c.header} data-primary={c.primary || undefined}>
                {c.primary && rowHref ? <Link to={rowHref(r)} className="nx-rows__link">{c.cell(r)}</Link> : c.cell(r)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

```tsx
// src/dashboard/ui/EmptyState.tsx
import type { ReactNode } from 'react'
export function EmptyState({ title, body, action, tone = 'neutral' }: { title: string; body: ReactNode; action?: ReactNode; tone?: 'neutral' | 'error' }) {
  return (
    <div className="nx-empty" data-tone={tone}>
      <p className="nx-empty__title">{title}</p>
      <div className="nx-empty__body">{body}</div>
      {action}
    </div>
  )
}
```

```tsx
// src/dashboard/ui/Skeleton.tsx
export function Skeleton({ lines = 3, label }: { lines?: number; label: string }) {
  return (
    <div className="nx-skeleton" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => <span key={i} aria-hidden="true" className="nx-skeleton__line" />)}
    </div>
  )
}
```

```tsx
// src/dashboard/ui/CopyButton.tsx
import { useState } from 'react'
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="nx-btn nx-btn--ghost nx-btn--icon"
      aria-label={done ? `${label} copied` : `Copy ${label}`}
      onClick={() => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }, () => {})}
    >
      {done ? '✓' : '⧉'}
    </button>
  )
}
```

```tsx
// src/dashboard/ui/Disclosure.tsx
import type { ReactNode } from 'react'
export function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return <details className="nx-disclosure"><summary>{summary}</summary><div className="nx-disclosure__body">{children}</div></details>
}
```

`dashboard.css`: all rules are scoped under `.nx-app`.

```css
.nx-app {
  --nx-surface-1: #0d1012;
  --nx-surface-2: #111518;
  --nx-line: rgba(225, 229, 229, 0.08);
  --nx-line-strong: rgba(225, 229, 229, 0.14);
  --nx-ok: #86a98f;
  --nx-warn: #c9a27a;
  --nx-err: #c97b74;
  --nx-radius-panel: 8px;
  min-height: 100svh;
  background: var(--nx-bg);
  color: var(--nx-text);
  font: 500 14px/1.45 var(--nx-font-sans);
}
.nx-app .nx-mono { font-family: var(--nx-font-mono); font-variant-numeric: tabular-nums; }
.nx-app .nx-eyebrow { margin: 0; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--nx-grey-400); }
.nx-app .nx-panel { border: 1px solid var(--nx-line-strong); border-radius: var(--nx-radius-panel); background: var(--nx-surface-1); }
.nx-app .nx-panel__head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--nx-line); }
.nx-app .nx-glyph { display: inline-block; width: 1.2em; text-align: center; }
.nx-app .nx-glyph[data-tone='idle'], .nx-app .nx-glyph[data-tone='muted'] { color: var(--nx-grey-500); }
.nx-app .nx-glyph[data-tone='done'] { color: var(--nx-text); }
.nx-app .nx-glyph[data-tone='error'] { color: var(--nx-err); }
.nx-app .nx-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid var(--nx-line-strong); border-radius: var(--nx-radius-pill); font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
.nx-app .nx-pill[data-tone='error'] { border-color: color-mix(in srgb, var(--nx-err) 50%, transparent); color: var(--nx-err); }
.nx-app .nx-btn { font: inherit; border-radius: var(--nx-radius-pill); padding: 10px 18px; border: 1px solid var(--nx-line-strong); background: transparent; color: var(--nx-text); cursor: pointer; }
.nx-app .nx-btn--primary { background: var(--nx-text); color: var(--nx-bg); border-color: var(--nx-text); }
.nx-app .nx-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.nx-app :focus-visible { outline: 2px solid var(--nx-text); outline-offset: 3px; border-radius: 4px; }
.nx-app .nx-rows { width: 100%; border-collapse: collapse; }
.nx-app .nx-rows th { text-align: left; font-weight: 500; font-size: 12px; color: var(--nx-grey-400); padding: 8px 12px; border-bottom: 1px solid var(--nx-line); }
.nx-app .nx-rows td { padding: 12px; border-bottom: 1px solid var(--nx-line); vertical-align: top; overflow-wrap: anywhere; }
.nx-app .nx-tabs { display: flex; gap: 4px; overflow-x: auto; border-bottom: 1px solid var(--nx-line); }
.nx-app .nx-tabs [role='tab'] { font: inherit; background: none; border: 0; padding: 10px 12px; color: var(--nx-grey-400); border-bottom: 2px solid transparent; white-space: nowrap; }
.nx-app .nx-tabs [aria-selected='true'] { color: var(--nx-text); border-bottom-color: var(--nx-text); }
@media (prefers-reduced-motion: no-preference) {
  .nx-app .nx-glyph, .nx-app .nx-pill { transition: color 150ms, border-color 150ms; }
  .nx-app [data-state='running'] .nx-glyph { animation: nx-pulse 2s ease-in-out infinite; }
}
@keyframes nx-pulse { 50% { opacity: 0.55; } }
@media (max-width: 767px) {
  .nx-app .nx-rows thead { display: none; }
  .nx-app .nx-rows tr { display: grid; padding: 10px 0; border-bottom: 1px solid var(--nx-line); }
  .nx-app .nx-rows td { border: 0; padding: 2px 0; }
  .nx-app .nx-rows td:not([data-primary])::before { content: attr(data-label) ' · '; color: var(--nx-grey-500); }
}
```

- [ ] **Step 4: Run** `npx vitest run src/dashboard/ui`. Expected: PASS.
- [ ] **Step 5: Commit** the listed files: `feat(dashboard): design tokens and UI primitives`.

---

### Task 3: Dashboard shell (layout, sidebar, top bar, routes)

**Files:**
- Create: `src/dashboard/shell/{nav.ts,DashboardLayout.tsx,Sidebar.tsx,TopBar.tsx,BackendStatus.tsx}`, `src/dashboard/pages/NotFoundPage.tsx`
- Modify: `src/dashboard/NexusDashboard.tsx` (replace the stub)
- Test: `src/dashboard/shell/shell.test.tsx`, `e2e/dashboard/responsive.spec.ts` (shell part)

**Interfaces:**
- Consumes: `NexusLogo` from `../landing/NexusLogo`, the UI primitives (Task 2), and `useSystemStatus` (Task 8). Until Task 8, `BackendStatus` takes a `status` prop; Task 8 wires it.
- Produces:
  - `NAV: NavGroup[]`
  - `<DashboardLayout/>`, which renders `<Outlet/>`
  - `useBreadcrumb(items)`, a context setter the pages call
  - `NexusDashboard`, the route table for `/dashboard/*`

Route children (relative to `/dashboard`): `index` Overview, `runs` Runs, `runs/:runId` RunDetail, `agents`, `knowledge`, `documentation`, `qa`, `demos`, `releases` (OutputSection with `kind`), `settings`, `*` NotFound. Pages not yet built render `<EmptyState title="…"/>` until their task replaces them.

- [ ] **Step 1: Write failing tests.**

```tsx
// src/dashboard/shell/shell.test.tsx
import { describe, expect, it } from 'vitest'
import { NAV } from './nav'

describe('navigation model', () => {
  it('groups sections as in the spec, with product names', () => {
    expect(NAV.map((g) => [g.label, g.items.map((i) => i.label)])).toEqual([
      [null, ['Overview', 'Runs']],
      ['Intelligence', ['Agents']],
      ['Outputs', ['Knowledge', 'Documentation', 'QA', 'Demos', 'Releases']],
    ])
    const outputs = NAV[2].items
    expect(outputs.every((i) => i.needsBackend)).toBe(true)
    expect(NAV.flatMap((g) => g.items).every((i) => i.to.startsWith('/dashboard'))).toBe(true)
  })
})
```

```ts
// e2e/dashboard/responsive.spec.ts (shell part)
import { expect, test } from '@playwright/test'
import { mockBackend } from './mockBackend'

for (const [w, mode] of [[1440, 'sidebar'], [1024, 'rail'], [390, 'drawer']] as const) {
  test(`shell at ${w}px uses ${mode}`, async ({ page }) => {
    await mockBackend(page, {})
    await page.setViewportSize({ width: w, height: 900 })
    await page.goto('/dashboard')
    await expect(page.locator('.nx-shell')).toHaveAttribute('data-nav', mode)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    if (mode === 'drawer') {
      await page.getByRole('button', { name: 'Open navigation' }).click()
      await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused()
    }
  })
}
```

`mockBackend` is created in Task 4; until then this spec imports a minimal version that routes `/system/status` to a 503. Task 4 replaces it.

- [ ] **Step 2: Run the tests to confirm they fail.**

- [ ] **Step 3: Implement.**

```ts
// src/dashboard/shell/nav.ts
export interface NavItem { label: string; to: string; needsBackend?: boolean }
export interface NavGroup { label: string | null; items: NavItem[] }

export const NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Overview', to: '/dashboard' }, { label: 'Runs', to: '/dashboard/runs' }] },
  { label: 'Intelligence', items: [{ label: 'Agents', to: '/dashboard/agents' }] },
  {
    label: 'Outputs',
    items: [
      { label: 'Knowledge', to: '/dashboard/knowledge', needsBackend: true },
      { label: 'Documentation', to: '/dashboard/documentation', needsBackend: true },
      { label: 'QA', to: '/dashboard/qa', needsBackend: true },
      { label: 'Demos', to: '/dashboard/demos', needsBackend: true },
      { label: 'Releases', to: '/dashboard/releases', needsBackend: true },
    ],
  },
]
```

`DashboardLayout.tsx`:
- **Wrapper:** a root `<div className="nx-app nx-shell" data-nav={mode}>`.
- **Mode:** comes from `useNavMode()`, which reads `matchMedia('(min-width: 1200px)')` → `sidebar`, `(min-width: 768px)` → `rail`, otherwise `drawer`, subscribed with `useSyncExternalStore`.
- **Structure:**
  - a skip link `<a href="#main" className="nx-skip">Skip to content</a>`;
  - `<Sidebar mode={mode}/>`;
  - `<div className="nx-shell__main">` containing `<TopBar/>` and `<main id="main" tabIndex={-1}><Outlet/></main>`.
- **Breadcrumbs:** a `BreadcrumbContext` holds `{ items: {label: string; to?: string}[]; actions?: ReactNode }`; `useBreadcrumb()` sets it in a `useEffect`.

`Sidebar.tsx`:
- **Common to all modes:** `<nav aria-label="Dashboard">` with `NexusLogo` linking to `/`. Groups use an `<h2 className="nx-eyebrow">` heading where the label is non-null and `NavLink` items with `aria-current="page"` when active (react-router sets it). Items with `needsBackend` show a trailing muted `·` with `title="Cross-run view needs backend support"`. At the bottom: Settings, then `<BackendStatus/>`.
- **Rail mode:** collapsed to 56px, showing the first letter of each item with an `aria-label`. A "Expand navigation" toggle opens a 232px overlay; Esc closes it.
- **Drawer mode:** the sidebar renders inside `<dialog aria-label="Navigation">` opened with `showModal()` from a TopBar button "Open navigation". The native dialog traps focus and closes on Esc, and focus returns to the trigger in the `close` handler. Navigating closes the dialog.

`TopBar.tsx`:
- an "Open navigation" button in drawer mode only;
- `<nav aria-label="Breadcrumb"><ol>` built from `BreadcrumbContext`, with the last item `aria-current="page"`;
- the actions slot on the right.

`BackendStatus.tsx`: `({ status }: { status: 'connected' | 'connecting' | 'unreachable' })` renders the glyph and label: `● Connected`, `○ Connecting…`, `✕ Backend unreachable`.

`NotFoundPage.tsx`: `EmptyState` with the title "This page doesn't exist" and a link to Overview.

Shell CSS in `dashboard.css`:
- the grid `232px 1fr` in sidebar mode and `56px 1fr` in rail mode;
- content `max-width: 1120px; padding: 32px`, with 16px padding under 768px;
- the sidebar background `var(--nx-bg)` with a right border `var(--nx-line)`;
- items 32px tall, 13px, `--nx-grey-400`; the active item `--nx-text` with a `box-shadow: inset 2px 0 0 var(--nx-text)`.

- [ ] **Step 4: Run** the unit tests and `e2e/dashboard/routing.spec.ts` + `responsive.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(dashboard): shell, navigation and responsive modes`.

---

### Task 4: Capture real backend fixtures and declare the raw types

**Files:**
- Create: `frontend/scripts/capture-fixtures.mjs`, `frontend/e2e/fixtures/*.json`, `frontend/src/dashboard/data/raw.ts`, `frontend/e2e/dashboard/mockBackend.ts`
- Test: `frontend/src/dashboard/data/raw.test.ts`

**Interfaces:**
- Produces:
  - raw types `RawStatus, RawCreateRun, RawTask, RawRunLive, RawRunStored, RawRun, RawSystemStatus`
  - the fixture files listed below
  - `mockBackend(page, opts)` for every E2E spec

- [ ] **Step 1: Start the backend.**

From the repo root: `python backend/main.py` (port 3000).
- For the Gemini path, set `GEMINI_API_KEY` first. To capture the fallback path instead, leave it unset.
- Write down which path was used; the capture script records it in `e2e/fixtures/README.md`.

- [ ] **Step 2: Write the capture script.**

```js
// scripts/capture-fixtures.mjs: records real responses; never edits them
import { mkdir, writeFile } from 'node:fs/promises'
const API = process.env.NEXUS_API ?? 'http://127.0.0.1:3000'
const OUT = new URL('../e2e/fixtures/', import.meta.url)
const save = (name, data) => writeFile(new URL(name, OUT), JSON.stringify(data, null, 2) + '\n')
const get = async (path) => { const r = await fetch(API + path); return { status: r.status, body: await r.json().catch(() => null) } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await mkdir(OUT, { recursive: true })
await save('system-status.json', (await get('/system/status')).body)

async function record(goal, prefix) {
  const created = await (await fetch(API + '/workflows', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goal, user_id: 'dashboard' }) })).json()
  await save(`${prefix}-create.json`, created)
  const seen = new Set()
  let i = 0
  for (let t = 0; t < 600; t++) {
    const { body } = await get(`/workflows/${created.workflow_id}`)
    const key = JSON.stringify([body.status, body.tasks?.map((x) => [x.agent_name, x.status])])
    if (!seen.has(key)) { seen.add(key); await save(`${prefix}-poll-${String(i++).padStart(2, '0')}.json`, body) }
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(body.status)) break
    await sleep(250)
  }
}
await record('Analyze the onboarding flows of three note-taking apps and compare them', 'full')
await record('Run QA tests on the checkout flow of an online bookstore', 'qa')
await save('not-found.json', await get('/workflows/wf-00000000'))
await writeFile(new URL('README.md', OUT), `Recorded ${new Date().toISOString()} from ${API}. GEMINI_API_KEY ${process.env.GEMINI_API_KEY ? 'set (Gemini path)' : 'unset (fallback path)'}.\n`)
```

- [ ] **Step 3: Record the restart case.**
  1. Run the script.
  2. Stop the backend, restart it, and fetch `GET /workflows/<full id>`. Save it as `stored-after-restart.json`; it is either the DB-fallback shape or a 404.
  3. Save one aborted mid-run fetch as `failed-*.json` if a failure occurred naturally.
  4. If no run failed naturally, **do not fabricate one**. The failed state is covered in unit tests by a fixture derived from a real poll, changing only `status`, the task `status` and `error_msg`. Name it `derived-failed.json` and record the derivation in `README.md`.
  5. Run: `node scripts/capture-fixtures.mjs`. Expected: `e2e/fixtures/` contains `system-status.json`, `full-create.json`, `full-poll-00…NN.json`, `qa-*.json`, `not-found.json` and `README.md`.

- [ ] **Step 4: Write the failing test that ties the raw types to the recordings.**

```ts
// src/dashboard/data/raw.test.ts
import { describe, expect, it } from 'vitest'
import { isRawRunLive, isRawRunStored, RAW_STATUSES } from './raw'

const polls = import.meta.glob('../../../e2e/fixtures/*-poll-*.json', { eager: true, import: 'default' }) as Record<string, unknown>

describe('raw response types match the recorded backend', () => {
  it('every recorded poll is a live or stored run with known statuses', () => {
    expect(Object.keys(polls).length).toBeGreaterThan(3)
    for (const [file, body] of Object.entries(polls)) {
      expect(isRawRunLive(body) || isRawRunStored(body), file).toBe(true)
      const run = body as { status: string; tasks?: { status: string; agent_name: string; created_at: string }[] }
      expect(RAW_STATUSES).toContain(run.status)
      for (const t of run.tasks ?? []) {
        expect(RAW_STATUSES).toContain(t.status)
        expect(['explorer', 'knowledge_graph', 'documentation', 'qa', 'demo', 'release']).toContain(t.agent_name)
        expect(t.created_at).toMatch(/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d/)
      }
    }
  })
})
```

- [ ] **Step 5: Run it to confirm it fails** (module missing).

- [ ] **Step 6: Implement `raw.ts`.**

Use the shapes from spec §10.3, **then correct them to whatever the recordings show**. If the recordings disagree with §10.3, the recordings win; note the difference in `e2e/fixtures/README.md`.

```ts
// src/dashboard/data/raw.ts: shapes as returned by backend/main.py; do not add fields that aren't recorded
export const RAW_STATUSES = ['QUEUED', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const
export type RawStatus = (typeof RAW_STATUSES)[number]
export type RawAgentName = 'explorer' | 'knowledge_graph' | 'documentation' | 'qa' | 'demo' | 'release'

export interface RawCreateRun { workflow_id: string; status: string }
export interface RawTask {
  task_id: string; workflow_id: string; agent_name: string; status: RawStatus; priority: number
  input_data: Record<string, unknown>; output_data: Record<string, unknown>
  error_msg: string | null; retry_count: number; created_at: string; updated_at: string
}
export interface RawRunLive { workflow_id: string; user_id: string; goal: string; status: RawStatus; priority: number; context: Record<string, unknown>; tasks: RawTask[] }
export interface RawRunStored { workflow_id: string; status: RawStatus; goal: string; context: Record<string, unknown> }
export type RawRun = RawRunLive | RawRunStored
export interface RawSystemStatus {
  jobs_summary: { workflows: Record<'running' | 'queued' | 'completed' | 'failed' | 'total', number>; tasks: Record<'running' | 'queued' | 'total', number> }
  concurrency: Record<string, { active: number; limit: number; available: number }>
  queues: Record<string, number>
  // `resources` exists in the response and is deliberately not typed: it is never read (Global Constraints).
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export const isRawRunLive = (v: unknown): v is RawRunLive => isObj(v) && typeof v.workflow_id === 'string' && Array.isArray(v.tasks)
export const isRawRunStored = (v: unknown): v is RawRunStored => isObj(v) && typeof v.workflow_id === 'string' && !('tasks' in v) && typeof v.goal === 'string'
```

- [ ] **Step 7: Implement `e2e/dashboard/mockBackend.ts`.**

```ts
import type { Page, Route } from '@playwright/test'
import { readFileSync } from 'node:fs'

export const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'))

export interface MockOptions {
  /** Responses served in order for GET /workflows/:id; the last one repeats. */
  runSequence?: unknown[]
  runStatus?: number
  create?: { status: number; body: unknown }
  system?: 'ok' | 'down'
  unreachable?: boolean
}

export async function mockBackend(page: Page, o: MockOptions) {
  const calls = { create: [] as unknown[], status: 0 }
  let i = 0
  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route(/\/status\//, (r) => { calls.status++; return r.abort() })
  await page.route(/\/workflows(\/[^/]+)?$/, async (route) => {
    if (o.unreachable) return route.abort('connectionrefused')
    if (route.request().method() === 'POST') {
      calls.create.push(route.request().postDataJSON())
      return json(route, o.create?.status ?? 200, o.create?.body ?? fixture('full-create.json'))
    }
    const seq = o.runSequence ?? []
    const body = seq[Math.min(i++, seq.length - 1)]
    return json(route, o.runStatus ?? (body ? 200 : 404), body ?? { detail: 'Workflow not found' })
  })
  await page.route(/\/workflows\/[^/]+\/(demo|explorer)_html$/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>showcase</body></html>' }))
  await page.route(/\/system\/status$/, (r) => (o.system === 'down' || o.unreachable ? r.abort('connectionrefused') : json(r, 200, fixture('system-status.json'))))
  return calls
}
```

The iframe body above is a transport stub, not product data: it only proves the frame loads the right URL. Every other payload is a recorded fixture.

- [ ] **Step 8: Run** `npx vitest run src/dashboard/data/raw.test.ts`. Expected: PASS.
- [ ] **Step 9: Commit**: `test(dashboard): recorded backend fixtures and raw types`.

---

### Task 5: Domain types, normalization and service layer

**Files:**
- Create: `src/dashboard/data/{types.ts,agents.ts,time.ts,normalize.ts,client.ts,workflows.ts,system.ts,settings.ts}`; modify `vite.config.ts` (proxy)
- Test: `src/dashboard/data/{normalize,client,agents,time}.test.ts`

**Interfaces:**
- Consumes: raw types (Task 4). Re-exports `RunStatus` and `AgentState` from `ui/status.ts`.
- Produces:

```ts
// types.ts
export type AgentId = 'explorer' | 'knowledge' | 'documentation' | 'qa' | 'demo' | 'release'
export type { RunStatus, AgentState } from '../ui/status'
export interface AgentError { summary: string; detail: string }
export interface AgentRun { id: AgentId; name: string; state: AgentState; queuedAt: Date | null; endedAt: Date | null; elapsedMs: number | null; retries: number; error: AgentError | null; summary: string | null }
export type AgentOutput =
  | { agent: 'explorer'; entity?: string; components?: string[]; dimensions?: string[]; insights?: string[]; reportedMetrics?: Record<string, string | number>; hasShowcase: boolean; raw: unknown }
  | { agent: 'knowledge'; nodes: { id: string; label: string; type: string }[]; edges: { source: string; target: string; relation: string }[]; density?: string; raw: unknown }
  | { agent: 'documentation'; markdown: string | null; raw: unknown }
  | { agent: 'qa'; reported: { total?: number; passed?: number; failed?: number; passRate?: string }; tests: { name: string; result: string; score?: string; detail?: string }[]; raw: unknown }
  | { agent: 'demo'; status?: string; generatedBy?: string; lineCount?: number; raw: unknown }
  | { agent: 'release'; releaseId?: string; deploymentStatus?: string; components?: string[]; qaPassRate?: string; summary?: string; raw: unknown }
export interface Run { id: string; goal: string; status: RunStatus; detail: 'live' | 'stored'; agents: AgentRun[]; outputs: Partial<Record<AgentId, AgentOutput>>; activeAgent: AgentId | null; elapsedMs: number | null }
export interface SystemSnapshot { workflows: { running: number; queued: number; completed: number; failed: number }; agents: { id: AgentId; active: number; limit: number; queued: number }[] }
// client.ts
export class ApiError extends Error { kind: 'unreachable' | 'not-found' | 'server' | 'bad-response' | 'aborted'; status?: number }
export function apiFetch<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T>
// workflows.ts
export function createRun(goal: string, signal?: AbortSignal): Promise<{ id: string }>
export function getRun(id: string, signal?: AbortSignal): Promise<Run>
// system.ts
export function getSystemStatus(signal?: AbortSignal): Promise<SystemSnapshot>
// settings.ts
export function setApiKey(key: string): Promise<void>
// agents.ts
export const AGENT_ORDER: AgentId[]
export const AGENT_INTERNAL: Record<AgentId, RawAgentName>
export const AGENT_CONTEXT_KEY: Record<AgentId, string>
export function agentName(id: AgentId): string   // from landing AGENTS
export function fromInternal(name: string): AgentId | null
```

- [ ] **Step 1: Write failing tests.** `normalize.test.ts` uses recorded fixtures only:

```ts
import { describe, expect, it } from 'vitest'
import { AGENTS } from '../../landing/nexus-story'
import { AGENT_ORDER, agentName, fromInternal } from './agents'
import { normalizeRun } from './normalize'
import { parseBackendTime } from './time'

const polls = Object.values(import.meta.glob('../../../e2e/fixtures/full-poll-*.json', { eager: true, import: 'default' })) as unknown[]
const last = polls[polls.length - 1]
const qaPolls = Object.values(import.meta.glob('../../../e2e/fixtures/qa-poll-*.json', { eager: true, import: 'default' })) as unknown[]
const qaLast = qaPolls[qaPolls.length - 1]

describe('agents', () => {
  it('product names match the landing page exactly, in order', () => {
    expect(AGENT_ORDER.map(agentName)).toEqual(AGENTS.map((a) => a.name))
  })
  it('maps internal names and rejects unknown ones', () => {
    expect(fromInternal('knowledge_graph')).toBe('knowledge')
    expect(fromInternal('orchestrator')).toBeNull()
  })
})

describe('normalizeRun', () => {
  it('always yields all six agents in product order', () => {
    for (const p of polls) expect(normalizeRun(p).agents.map((a) => a.id)).toEqual(AGENT_ORDER)
  })
  it('the first poll has no running agent invented', () => {
    const first = normalizeRun(polls[0])
    expect(first.agents.filter((a) => a.state === 'running').length).toBeLessThanOrEqual(1)
  })
  it('a finished QA-flow run marks agents without tasks as not in this run', () => {
    const run = normalizeRun(qaLast)
    expect(['completed', 'failed']).toContain(run.status)
    const withTask = new Set((qaLast as { tasks: { agent_name: string }[] }).tasks.map((t) => fromInternal(t.agent_name)))
    for (const a of run.agents) if (!withTask.has(a.id)) expect(a.state).toBe('not-in-run')
  })
  it('reads outputs from context by key and never from /status', () => {
    const run = normalizeRun(last)
    expect(Object.keys(run.outputs).every((k) => AGENT_ORDER.includes(k as never))).toBe(true)
  })
  it('stored (post-restart) runs infer completion from context and have no elapsed', () => {
    const stored = { workflow_id: 'wf-x', status: 'COMPLETED', goal: 'g', context: (last as { context: object }).context }
    const run = normalizeRun(stored)
    expect(run.detail).toBe('stored')
    expect(run.elapsedMs).toBeNull()
    expect(run.agents.find((a) => a.id === 'explorer')!.state).toBe('completed')
  })
  it('splits error messages into a summary and the traceback', () => {
    const t = { ...(last as { tasks: object[] }).tasks[0], status: 'FAILED', error_msg: 'Boom\nTraceback (most recent call last):\n  x' }
    const run = normalizeRun({ ...(last as object), status: 'FAILED', tasks: [t] })
    expect(run.agents[0].error).toEqual({ summary: 'Boom', detail: 'Boom\nTraceback (most recent call last):\n  x' })
  })
  it('uses the newest task when an agent was retried', () => {
    const base = (last as { tasks: Record<string, unknown>[] }).tasks[0]
    const older = { ...base, task_id: 'a', status: 'FAILED', created_at: '2026-01-01 00:00:00', updated_at: '2026-01-01 00:00:05', error_msg: 'x' }
    const newer = { ...base, task_id: 'b', status: 'COMPLETED', created_at: '2026-01-01 00:00:06', updated_at: '2026-01-01 00:00:09' }
    const run = normalizeRun({ ...(last as object), tasks: [older, newer] })
    expect(run.agents[0]).toMatchObject({ state: 'completed', retries: 1, elapsedMs: 3000 })
  })
})

describe('time', () => {
  it('parses SQLite CURRENT_TIMESTAMP as UTC', () => {
    expect(parseBackendTime('2026-10-03 14:02:07')!.toISOString()).toBe('2026-10-03T14:02:07.000Z')
    expect(parseBackendTime('nonsense')).toBeNull()
  })
})
```

`client.test.ts` stubs `fetch` with `vi.stubGlobal` and asserts:
- a rejected fetch → `ApiError{kind:'unreachable'}`;
- a 404 → `not-found`;
- a 500 → `server`;
- invalid JSON → `bad-response`;
- an aborted signal → `aborted`;
- the default timeout of 10 s aborts;
- `VITE_API_BASE` is prefixed when set;
- `createRun` posts `{"goal":"g","user_id":"dashboard"}` to `/workflows` and rejects a blank goal without calling fetch;
- no function anywhere calls a URL containing `/status/` (spy on fetch across the `workflows.ts` API).

- [ ] **Step 2: Run the tests to confirm they fail.**

- [ ] **Step 3: Implement.**

```ts
// agents.ts
import { AGENTS } from '../../landing/nexus-story'
import type { AgentId } from './types'
import type { RawAgentName } from './raw'
export const AGENT_ORDER: AgentId[] = ['explorer', 'knowledge', 'documentation', 'qa', 'demo', 'release']
export const AGENT_INTERNAL: Record<AgentId, RawAgentName> = { explorer: 'explorer', knowledge: 'knowledge_graph', documentation: 'documentation', qa: 'qa', demo: 'demo', release: 'release' }
export const AGENT_CONTEXT_KEY: Record<AgentId, string> = { explorer: 'explorer_output', knowledge: 'knowledge_graph_output', documentation: 'documentation_output', qa: 'qa_output', demo: 'demo_output', release: 'release_output' }
const BY_INTERNAL = new Map(Object.entries(AGENT_INTERNAL).map(([id, raw]) => [raw, id as AgentId]))
export const fromInternal = (name: string): AgentId | null => BY_INTERNAL.get(name.toLowerCase() as RawAgentName) ?? null
export const agentName = (id: AgentId): string => AGENTS[AGENT_ORDER.indexOf(id)].name
export const agentPurpose = (id: AgentId): string => AGENTS[AGENT_ORDER.indexOf(id)].caption
```

```ts
// time.ts
export function parseBackendTime(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  const m = /^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d:\d\d(?:\.\d+)?)(Z|[+-]\d\d:?\d\d)?$/.exec(s.trim())
  if (!m) return null
  const d = new Date(`${m[1]}T${m[2]}${m[3] ?? 'Z'}`)
  return Number.isNaN(d.getTime()) ? null : d
}
export function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return '—'
  const s = Math.round(ms / 1000)
  return s < 60 ? `0:${String(s).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
```

```ts
// normalize.ts
import { AGENT_CONTEXT_KEY, AGENT_ORDER, agentName, fromInternal } from './agents'
import { isRawRunLive, type RawRun, type RawStatus, type RawTask } from './raw'
import { parseBackendTime } from './time'
import type { AgentError, AgentId, AgentOutput, AgentRun, AgentState, Run, RunStatus } from './types'

const STATUS: Record<RawStatus, RunStatus> = { QUEUED: 'queued', WAITING: 'waiting', RUNNING: 'running', COMPLETED: 'completed', FAILED: 'failed', CANCELLED: 'cancelled' }
export const normalizeStatus = (s: unknown): RunStatus => STATUS[String(s).toUpperCase() as RawStatus] ?? 'queued'
export const isTerminal = (s: RunStatus) => s === 'completed' || s === 'failed' || s === 'cancelled'

const obj = (v: unknown): Record<string, unknown> | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const strs = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

function splitError(msg: string | null): AgentError | null {
  if (!msg) return null
  return { summary: msg.split('\n', 1)[0].trim() || 'Agent failed', detail: msg }
}

export function normalizeOutput(id: AgentId, raw: unknown): AgentOutput | null {
  if (raw === undefined || raw === null || raw === '') return null
  const o = obj(raw)
  switch (id) {
    case 'explorer': {
      const metrics = obj(o?.metrics)
      return { agent: id, entity: str(o?.entity), components: strs(o?.key_components), dimensions: strs(o?.analysis_dimensions), insights: strs(o?.key_insights), reportedMetrics: metrics ? Object.fromEntries(Object.entries(metrics).filter(([, v]) => typeof v === 'string' || typeof v === 'number')) as Record<string, string | number> : undefined, hasShowcase: typeof o?.explorer_video_file === 'string', raw }
    }
    case 'knowledge': {
      const nodes = (Array.isArray(o?.nodes) ? o!.nodes : []).map(obj).filter(Boolean).map((n) => ({ id: String(n!.id), label: str(n!.label) ?? String(n!.id), type: str(n!.type) ?? 'Node' }))
      const ids = new Set(nodes.map((n) => n.id))
      const edges = (Array.isArray(o?.edges) ? o!.edges : []).map(obj).filter(Boolean).map((e) => ({ source: String(e!.source), target: String(e!.target), relation: str(e!.relation) ?? '' })).filter((e) => ids.has(e.source) && ids.has(e.target))
      return { agent: id, nodes, edges, density: str(o?.graph_density), raw }
    }
    case 'documentation':
      return { agent: id, markdown: typeof raw === 'string' ? raw : str(o?.markdown) ?? null, raw }
    case 'qa': {
      const tests = (Array.isArray(o?.tests_run) ? o!.tests_run : []).map(obj).filter(Boolean).map((t) => ({ name: str(t!.name) ?? 'Unnamed check', result: str(t!.result) ?? '', score: str(t!.score), detail: str(t!.detail) }))
      return { agent: id, reported: { total: num(o?.total_validations), passed: num(o?.passed), failed: num(o?.failed), passRate: str(o?.pass_rate) }, tests, raw }
    }
    case 'demo':
      return { agent: id, status: str(o?.status), generatedBy: str(o?.generated_by), lineCount: num(o?.line_count), raw }
    case 'release':
      return { agent: id, releaseId: str(o?.release_id), deploymentStatus: str(o?.deployment_status), components: strs(o?.components_validated), qaPassRate: str(o?.qa_pass_rate), summary: str(o?.release_summary), raw }
  }
}

function summarize(out: AgentOutput | undefined): string | null {
  if (!out) return null
  switch (out.agent) {
    case 'explorer': return out.entity ? `${out.entity}${out.components ? ` · ${out.components.length} components` : ''}` : null
    case 'knowledge': return out.nodes.length ? `${out.nodes.length} nodes · ${out.edges.length} edges` : null
    case 'documentation': return out.markdown ? (/^#\s+(.+)$/m.exec(out.markdown)?.[1] ?? null) : null
    case 'qa': return out.reported.passRate ? `${out.reported.passRate} pass rate (reported)` : null
    case 'demo': return out.generatedBy ? (out.generatedBy === 'gemini-llm' ? 'Generated by Gemini' : 'Generated by fallback engine') : null
    case 'release': return out.releaseId ?? null
  }
}

export function normalizeRun(raw: unknown): Run {
  const r = raw as RawRun
  const status = normalizeStatus(r.status)
  const live = isRawRunLive(raw)
  const context = obj(r.context) ?? {}
  const outputs: Partial<Record<AgentId, AgentOutput>> = {}
  for (const id of AGENT_ORDER) {
    const fromCtx = normalizeOutput(id, context[AGENT_CONTEXT_KEY[id]])
    if (fromCtx) outputs[id] = fromCtx
  }
  const byAgent = new Map<AgentId, RawTask[]>()
  if (live) for (const t of (raw as { tasks: RawTask[] }).tasks) {
    const id = fromInternal(t.agent_name)
    if (!id) { if (import.meta.env.DEV) console.warn('[nexus] unknown agent', t.agent_name); continue }
    byAgent.set(id, [...(byAgent.get(id) ?? []), t])
    if (!outputs[id]) { const o = normalizeOutput(id, obj(t.output_data)?.[AGENT_CONTEXT_KEY[id]]); if (o) outputs[id] = o }
  }
  const now = Date.now()
  const agents: AgentRun[] = AGENT_ORDER.map((id) => {
    const tasks = (byAgent.get(id) ?? []).slice().sort((a, b) => (parseBackendTime(a.created_at)?.getTime() ?? 0) - (parseBackendTime(b.created_at)?.getTime() ?? 0))
    const t = tasks[tasks.length - 1]
    let state: AgentState
    if (t) state = normalizeStatus(t.status)
    else if (outputs[id]) state = 'completed'
    else state = isTerminal(status) ? 'not-in-run' : 'not-started'
    const queuedAt = t ? parseBackendTime(t.created_at) : null
    const endedAt = t && isTerminal(normalizeStatus(t.status)) ? parseBackendTime(t.updated_at) : null
    const elapsedMs = queuedAt ? (endedAt ?? (state === 'running' ? new Date(now) : null))?.getTime()! - queuedAt.getTime() : null
    return { id, name: agentName(id), state, queuedAt, endedAt, elapsedMs: Number.isFinite(elapsedMs) ? elapsedMs : null, retries: Math.max(0, tasks.length - 1), error: t && t.status === 'FAILED' ? splitError(t.error_msg) : null, summary: summarize(outputs[id]) }
  })
  const starts = agents.map((a) => a.queuedAt?.getTime()).filter((x): x is number => x !== undefined)
  const ends = agents.map((a) => a.endedAt?.getTime()).filter((x): x is number => x !== undefined)
  const elapsedMs = live && starts.length && ends.length && isTerminal(status) ? Math.max(...ends) - Math.min(...starts) : live && starts.length && !isTerminal(status) ? now - Math.min(...starts) : null
  return { id: r.workflow_id, goal: str(r.goal) ?? '', status, detail: live ? 'live' : 'stored', agents, outputs, activeAgent: agents.find((a) => a.state === 'running')?.id ?? null, elapsedMs }
}
```

```ts
// client.ts
export class ApiError extends Error {
  constructor(public kind: 'unreachable' | 'not-found' | 'server' | 'bad-response' | 'aborted', message: string, public status?: number) { super(message) }
}
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
export async function apiFetch<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 10_000)
  init.signal?.addEventListener('abort', () => ctrl.abort(), { once: true })
  let res: Response
  try { res = await fetch(API_BASE + path, { ...init, signal: ctrl.signal, headers: { accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers } }) }
  catch { throw new ApiError(init.signal?.aborted ? 'aborted' : 'unreachable', `Can't reach NEXUS backend${API_BASE ? ` at ${API_BASE}` : ''}.`) }
  finally { clearTimeout(timer) }
  if (res.status === 404) throw new ApiError('not-found', 'Not found', 404)
  if (!res.ok) throw new ApiError('server', `Backend error ${res.status}`, res.status)
  try { return (await res.json()) as T } catch { throw new ApiError('bad-response', 'Unexpected response from backend', res.status) }
}
```

```ts
// workflows.ts
import { apiFetch, ApiError } from './client'
import { normalizeRun } from './normalize'
import type { RawCreateRun } from './raw'
import type { Run } from './types'
export async function createRun(goal: string, signal?: AbortSignal): Promise<{ id: string }> {
  const g = goal.trim()
  if (!g) throw new ApiError('bad-response', 'Goal is empty')
  const res = await apiFetch<RawCreateRun>('/workflows', { method: 'POST', body: JSON.stringify({ goal: g, user_id: 'dashboard' }), signal })
  if (typeof res?.workflow_id !== 'string') throw new ApiError('bad-response', 'Backend did not return a run id')
  return { id: res.workflow_id }
}
export const getRun = async (id: string, signal?: AbortSignal): Promise<Run> => normalizeRun(await apiFetch(`/workflows/${encodeURIComponent(id)}`, { signal }))
```

```ts
// system.ts: resources are never read
import { AGENT_INTERNAL, AGENT_ORDER } from './agents'
import { apiFetch } from './client'
import type { RawSystemStatus } from './raw'
import type { SystemSnapshot } from './types'
export async function getSystemStatus(signal?: AbortSignal): Promise<SystemSnapshot> {
  const r = await apiFetch<RawSystemStatus>('/system/status', { signal })
  const w = r.jobs_summary?.workflows
  return {
    workflows: { running: w?.running ?? 0, queued: w?.queued ?? 0, completed: w?.completed ?? 0, failed: w?.failed ?? 0 },
    agents: AGENT_ORDER.map((id) => { const c = r.concurrency?.[AGENT_INTERNAL[id]]; return { id, active: c?.active ?? 0, limit: c?.limit ?? 0, queued: r.queues?.[`agent_${AGENT_INTERNAL[id]}`] ?? 0 } }),
  }
}
```

```ts
// settings.ts
import { apiFetch } from './client'
export async function setApiKey(key: string): Promise<void> { await apiFetch('/api-key', { method: 'POST', body: JSON.stringify({ api_key: key.trim() }) }) }
```

`vite.config.ts` adds the proxy below. Preview uses the same proxy, so manual checks against a running backend work. E2E intercepts with `page.route` before the proxy is reached.

```ts
server: { proxy: { '/workflows': API, '/system': API, '/api-key': API } },
preview: { proxy: { '/workflows': API, '/system': API, '/api-key': API } },
// with: const API = `http://127.0.0.1:${process.env.NEXUS_API_PORT ?? 3000}`
```

- [ ] **Step 4: Run** `npx vitest run src/dashboard/data`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(dashboard): typed data layer and normalization`.

---

### Task 6: localStorage run index

**Files:**
- Create: `src/dashboard/data/localRuns.ts`, `src/dashboard/run/useLocalRuns.ts`
- Test: `src/dashboard/data/localRuns.test.ts`

**Interfaces:**
- Produces:
  - `LocalRunEntry { id: string; goal: string; submittedAt: string /* ISO, client clock */ }`
  - `localRuns.list(): LocalRunEntry[]` (newest first)
  - `localRuns.add(entry)`, `localRuns.remove(id)`
  - `localRuns.subscribe(fn): () => void`
  - `useLocalRuns(): LocalRunEntry[]`

**Design:**
- **Storage:** key `nexus.runs.v1` holds `{ "version": 1, "runs": LocalRunEntry[] }`.
- **Writes:** de-duplicated by `id`, the newest entry wins, capped at 50 entries.
- **Corrupt data:** wrong JSON or wrong version resets to empty and warns in development.
- **Storage failures:** a throwing `localStorage` (private mode or quota) falls back to an in-memory array for the session.
- **Cross-tab:** the `storage` event notifies subscribers.
- **Scope:** the index never stores status.

- [ ] **Step 1: Write failing tests.**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalRuns, KEY } from './localRuns'

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, get length() { return m.size } } as Storage
}

describe('local run index', () => {
  let store: Storage
  beforeEach(() => { store = memoryStorage() })

  it('adds newest first, de-duplicates and caps at 50', () => {
    const runs = createLocalRuns(store)
    for (let i = 0; i < 55; i++) runs.add({ id: `wf-${i}`, goal: `g${i}`, submittedAt: new Date(i * 1000).toISOString() })
    runs.add({ id: 'wf-54', goal: 'again', submittedAt: new Date(99e6).toISOString() })
    const list = runs.list()
    expect(list).toHaveLength(50)
    expect(list[0]).toMatchObject({ id: 'wf-54', goal: 'again' })
    expect(new Set(list.map((r) => r.id)).size).toBe(50)
  })

  it('stores only id, goal and submittedAt', () => {
    createLocalRuns(store).add({ id: 'wf-1', goal: 'g', submittedAt: '2026-10-03T00:00:00.000Z' })
    expect(JSON.parse(store.getItem(KEY)!)).toEqual({ version: 1, runs: [{ id: 'wf-1', goal: 'g', submittedAt: '2026-10-03T00:00:00.000Z' }] })
  })

  it('recovers from corrupt or foreign data', () => {
    store.setItem(KEY, '{nope')
    expect(createLocalRuns(store).list()).toEqual([])
    store.setItem(KEY, JSON.stringify({ version: 9, runs: [1] }))
    expect(createLocalRuns(store).list()).toEqual([])
  })

  it('survives a throwing storage by keeping the index in memory', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } } as unknown as Storage
    const runs = createLocalRuns(broken)
    runs.add({ id: 'wf-1', goal: 'g', submittedAt: 'x' })
    expect(runs.list().map((r) => r.id)).toEqual(['wf-1'])
  })

  it('removes and notifies subscribers', () => {
    const runs = createLocalRuns(store)
    const fn = vi.fn()
    runs.subscribe(fn)
    runs.add({ id: 'wf-1', goal: 'g', submittedAt: 'x' })
    runs.remove('wf-1')
    expect(runs.list()).toEqual([])
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail.**

- [ ] **Step 3: Implement.**

```ts
// localRuns.ts
export const KEY = 'nexus.runs.v1'
const CAP = 50
export interface LocalRunEntry { id: string; goal: string; submittedAt: string }

const valid = (r: unknown): r is LocalRunEntry => !!r && typeof (r as LocalRunEntry).id === 'string' && typeof (r as LocalRunEntry).goal === 'string' && typeof (r as LocalRunEntry).submittedAt === 'string'

export function createLocalRuns(storage: Storage | null) {
  let memory: LocalRunEntry[] | null = null
  const listeners = new Set<() => void>()
  let cache: LocalRunEntry[] | null = null
  const read = (): LocalRunEntry[] => {
    if (memory) return memory
    try {
      const parsed = JSON.parse(storage?.getItem(KEY) ?? 'null')
      if (parsed?.version === 1 && Array.isArray(parsed.runs)) return parsed.runs.filter(valid)
      return []
    } catch { return [] }
  }
  const write = (runs: LocalRunEntry[]) => {
    cache = runs
    try { storage?.setItem(KEY, JSON.stringify({ version: 1, runs })) } catch { memory = runs }
    if (memory) memory = runs
    listeners.forEach((l) => l())
  }
  return {
    list: () => (cache ??= read()),
    add: (e: LocalRunEntry) => write([e, ...read().filter((r) => r.id !== e.id)].slice(0, CAP)),
    remove: (id: string) => write(read().filter((r) => r.id !== id)),
    subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn) },
    invalidate: () => { cache = null; listeners.forEach((l) => l()) },
  }
}

const safeStorage = (): Storage | null => { try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null } }
export const localRuns = createLocalRuns(safeStorage())
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === KEY) localRuns.invalidate() })
```

```ts
// run/useLocalRuns.ts
import { useSyncExternalStore } from 'react'
import { localRuns } from '../data/localRuns'
export const useLocalRuns = () => useSyncExternalStore(localRuns.subscribe, localRuns.list, () => [])
```

- [ ] **Step 4: Run the tests.** Expected: PASS. **Step 5: Commit**: `feat(dashboard): local run index`.

---

### Task 7: Run lifecycle state machine and polling

**Files:**
- Create: `src/dashboard/run/lifecycle.ts`, `src/dashboard/run/useRun.ts`
- Test: `src/dashboard/run/lifecycle.test.ts`, `src/dashboard/run/useRun.test.tsx`

**Interfaces:**
- Consumes: `getRun`, `ApiError`, `isTerminal` (Task 5).
- Produces:

```ts
export type RunView =
  | { kind: 'loading' }
  | { kind: 'active'; run: Run; reconnecting: boolean }      // queued | waiting | running, live detail
  | { kind: 'completed'; run: Run }
  | { kind: 'failed'; run: Run; failedAgent: AgentId | null }
  | { kind: 'cancelled'; run: Run }
  | { kind: 'degraded'; run: Run }                            // stored detail (post-restart DB fallback)
  | { kind: 'not-found'; lastRun: Run | null }                // 404; lastRun kept if seen this session
  | { kind: 'unreachable'; lastRun: Run | null }              // network/5xx before any success
export type RunEvent = { type: 'loaded'; run: Run } | { type: 'error'; error: ApiError }
export function reduceRunView(prev: RunView, ev: RunEvent): RunView
export function nextPollDelay(view: RunView, failures: number, hidden: boolean): number | null   // ms, or null = stop
export function useRun(id: string): { view: RunView; retry: () => void }
```

**State machine:**

| From | Event | To |
|---|---|---|
| any | loaded, `detail:'stored'` | degraded (stop polling) |
| any | loaded, status queued/waiting/running | active (`reconnecting:false`) |
| any | loaded, completed | completed (stop) |
| any | loaded, failed | failed (stop), with `failedAgent` = first agent in state `failed` |
| any | loaded, cancelled | cancelled (stop) |
| active | error not-found | not-found (`lastRun` = run): the backend restarted mid-run |
| active | error unreachable/server/bad-response | active (`reconnecting:true`), keeping the data |
| loading or unreachable | error unreachable/server | unreachable (`lastRun:null`) |
| loading | error not-found | not-found (`lastRun:null`) |
| any | error aborted | unchanged |

**Polling (`nextPollDelay`):**
- **Hidden tab:** returns `null` (paused); the hook resumes on `visibilitychange`.
- **Active:** 1500 ms when `failures === 0`, otherwise `min(15000, 3000 * 2 ** (failures - 1))`.
- **Unreachable:** the same backoff.
- **All other states:** `null`.

- [ ] **Step 1: Write failing tests.**

```ts
// lifecycle.test.ts
import { describe, expect, it } from 'vitest'
import { ApiError } from '../data/client'
import { normalizeRun } from '../data/normalize'
import { nextPollDelay, reduceRunView } from './lifecycle'

const polls = Object.values(import.meta.glob('../../../e2e/fixtures/full-poll-*.json', { eager: true, import: 'default' })) as unknown[]
const active = normalizeRun(polls[0])
const done = normalizeRun(polls[polls.length - 1])
const err = (k: ApiError['kind']) => ({ type: 'error' as const, error: new ApiError(k, k) })

describe('run lifecycle', () => {
  it('moves loading → active → completed and stops polling at the end', () => {
    let v = reduceRunView({ kind: 'loading' }, { type: 'loaded', run: active })
    expect(v.kind).toBe('active')
    expect(nextPollDelay(v, 0, false)).toBe(1500)
    v = reduceRunView(v, { type: 'loaded', run: done })
    expect(v.kind).toBe(done.status === 'failed' ? 'failed' : 'completed')
    expect(nextPollDelay(v, 0, false)).toBeNull()
  })
  it('keeps data and reconnects with backoff while active', () => {
    const v = reduceRunView({ kind: 'active', run: active, reconnecting: false }, err('unreachable'))
    expect(v).toMatchObject({ kind: 'active', reconnecting: true, run: active })
    expect([1, 2, 3, 4, 5].map((f) => nextPollDelay(v, f, false))).toEqual([3000, 6000, 12000, 15000, 15000])
  })
  it('treats a 404 mid-run as a lost run, remembering the last data', () => {
    expect(reduceRunView({ kind: 'active', run: active, reconnecting: false }, err('not-found'))).toEqual({ kind: 'not-found', lastRun: active })
    expect(reduceRunView({ kind: 'loading' }, err('not-found'))).toEqual({ kind: 'not-found', lastRun: null })
  })
  it('shows stored detail as degraded and does not poll it', () => {
    const v = reduceRunView({ kind: 'loading' }, { type: 'loaded', run: { ...done, detail: 'stored' } })
    expect(v.kind).toBe('degraded')
    expect(nextPollDelay(v, 0, false)).toBeNull()
  })
  it('names the failed agent', () => {
    const failed = { ...done, status: 'failed' as const, agents: done.agents.map((a, i) => (i === 1 ? { ...a, state: 'failed' as const } : a)) }
    expect(reduceRunView({ kind: 'loading' }, { type: 'loaded', run: failed })).toMatchObject({ kind: 'failed', failedAgent: 'knowledge' })
  })
  it('pauses while hidden and ignores aborts', () => {
    expect(nextPollDelay({ kind: 'active', run: active, reconnecting: false }, 0, true)).toBeNull()
    const v = { kind: 'active' as const, run: active, reconnecting: false }
    expect(reduceRunView(v, err('aborted'))).toBe(v)
  })
})
```

`useRun.test.tsx` uses `vi.useFakeTimers()`, a `vi.mock('../data/workflows')` whose `getRun` resolves from a queue, and React's `act` with `createRoot` in a `happy-dom` environment (add `// @vitest-environment happy-dom` and `npm i -D happy-dom`). It asserts:
1. Only one request is in flight at a time: the next one starts only after the previous one resolves plus 1500 ms.
2. No requests follow a terminal response.
3. Changing `id` aborts the in-flight request, and **"ignores a response for a superseded id"**: a late response for the old id leaves the view on `loading` for the new id.
4. Unmounting aborts and clears the timer.
5. Firing `visibilitychange` with `hidden=true` stops scheduling; `hidden=false` fetches immediately.

- [ ] **Step 2: Run the tests to confirm they fail.**

- [ ] **Step 3: Implement.**

```ts
// lifecycle.ts
import type { ApiError } from '../data/client'
import type { AgentId, Run } from '../data/types'
// (RunView and RunEvent exactly as in the Interfaces block above)
export function reduceRunView(prev: RunView, ev: RunEvent): RunView {
  if (ev.type === 'loaded') {
    const run = ev.run
    if (run.detail === 'stored') return { kind: 'degraded', run }
    switch (run.status) {
      case 'completed': return { kind: 'completed', run }
      case 'failed': return { kind: 'failed', run, failedAgent: run.agents.find((a) => a.state === 'failed')?.id ?? null }
      case 'cancelled': return { kind: 'cancelled', run }
      default: return { kind: 'active', run, reconnecting: false }
    }
  }
  const k = ev.error.kind
  if (k === 'aborted') return prev
  if (prev.kind === 'active') return k === 'not-found' ? { kind: 'not-found', lastRun: prev.run } : { ...prev, reconnecting: true }
  if (k === 'not-found') return { kind: 'not-found', lastRun: null }
  if (prev.kind === 'loading' || prev.kind === 'unreachable') return { kind: 'unreachable', lastRun: null }
  return prev
}
export function nextPollDelay(view: RunView, failures: number, hidden: boolean): number | null {
  if (hidden) return null
  if (view.kind !== 'active' && view.kind !== 'unreachable' && view.kind !== 'loading') return null
  return failures === 0 ? 1500 : Math.min(15_000, 3000 * 2 ** (failures - 1))
}
```

```ts
// useRun.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../data/client'
import { getRun } from '../data/workflows'
import { nextPollDelay, reduceRunView, type RunView } from './lifecycle'

export function useRun(id: string) {
  const [view, setView] = useState<RunView>({ kind: 'loading' })
  const [nonce, setNonce] = useState(0)
  const viewRef = useRef(view)
  viewRef.current = view
  useEffect(() => {
    let alive = true
    let failures = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let ctrl: AbortController | undefined
    setView({ kind: 'loading' })
    viewRef.current = { kind: 'loading' }
    const schedule = () => {
      clearTimeout(timer)
      const delay = nextPollDelay(viewRef.current, failures, document.visibilityState === 'hidden')
      if (delay !== null) timer = setTimeout(tick, delay)
    }
    const tick = async () => {
      ctrl = new AbortController()
      try {
        const run = await getRun(id, ctrl.signal)
        if (!alive) return
        failures = 0
        const next = reduceRunView(viewRef.current, { type: 'loaded', run })
        viewRef.current = next
        setView(next)
      } catch (e) {
        if (!alive) return
        const error = e instanceof ApiError ? e : new ApiError('bad-response', String(e))
        if (error.kind !== 'aborted') failures++
        const next = reduceRunView(viewRef.current, { type: 'error', error })
        viewRef.current = next
        setView(next)
      }
      if (alive) schedule()
    }
    const onVisible = () => { if (document.visibilityState === 'visible' && alive) { clearTimeout(timer); ctrl?.abort(); void tick() } }
    document.addEventListener('visibilitychange', onVisible)
    void tick()
    return () => { alive = false; clearTimeout(timer); ctrl?.abort(); document.removeEventListener('visibilitychange', onVisible) }
  }, [id, nonce])
  return { view, retry: useCallback(() => setNonce((n) => n + 1), []) }
}
```

- [ ] **Step 4: Run** `npx vitest run src/dashboard/run`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(dashboard): run lifecycle and polling`.

---

### Task 8: Overview (goal input, run creation, recent runs, system line)

**Files:**
- Create: `src/dashboard/pages/OverviewPage.tsx`, `src/dashboard/run/useSystemStatus.ts`, `src/dashboard/run/useCreateRun.ts`, `src/dashboard/run/RecentRunRow.tsx`
- Modify: `NexusDashboard.tsx` (index route), `shell/BackendStatus.tsx` (consume `useSystemStatus`)
- Test: `e2e/dashboard/overview.spec.ts`

**Interfaces:**
- Consumes: `createRun`, `localRuns`, `useLocalRuns`, `getSystemStatus`, `getRun`.
- Produces:
  - `useSystemStatus(): { status: 'connecting' | 'connected' | 'unreachable'; snapshot: SystemSnapshot | null }`, polling every 10 s and pausing while hidden.
  - `useCreateRun(): { submit(goal): Promise<void>; pending: boolean; error: string | null }`. On success it calls `localRuns.add({ id, goal, submittedAt: new Date().toISOString() })`, then `navigate('/dashboard/runs/' + id)`.
  - `RecentRunRow({ entry })`, which fetches the status once with `getRun` (no polling on Overview) and shows the glyph and label, goal, short id, and "Started from this browser · 2 min ago" (client time, via `Intl.RelativeTimeFormat`). A 404 shows "Not on backend".

Overview layout follows spec §6:
- `<h1>What should NEXUS work on?</h1>`;
- a labelled `<textarea>` with `aria-describedby` pointing at the hint and the error;
- **Run →** (the primary button), disabled when `goal.trim()` is empty or a request is pending; its label reads "Starting…" while pending; `⌘/Ctrl+Enter` submits;
- the hint "NEXUS chooses which agents to run from your goal.";
- below, a `Panel` "Recent runs · started from this browser" with at most 5 `RecentRunRow`s and a "View all" link;
- below that, the system line "Workflows since backend start: 1 running · 0 queued · 4 complete · 0 failed" with a link to Agents.

The CPU, memory and resources fields are never rendered.

- [ ] **Step 1: Write the failing E2E tests.**

```ts
import { expect, test } from '@playwright/test'
import { fixture, mockBackend } from './mockBackend'

test('a goal creates a real run and opens its detail', async ({ page }) => {
  const calls = await mockBackend(page, { runSequence: [fixture('full-poll-00.json')] })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What should NEXUS work on?')
  const run = page.getByRole('button', { name: /Run/ })
  await expect(run).toBeDisabled()
  await page.getByLabel('Goal').fill('Explore the product and create onboarding documentation')
  await run.click()
  const id = fixture('full-create.json').workflow_id
  await expect(page).toHaveURL(new RegExp(`/dashboard/runs/${id}$`))
  expect(calls.create).toEqual([{ goal: 'Explore the product and create onboarding documentation', user_id: 'dashboard' }])
  expect(calls.status).toBe(0)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('nexus.runs.v1')!))
  expect(stored.runs[0]).toMatchObject({ id, goal: 'Explore the product and create onboarding documentation' })
})

test('run creation failure keeps the goal and explains', async ({ page }) => {
  await mockBackend(page, { unreachable: true })
  await page.goto('/dashboard')
  await page.getByLabel('Goal').fill('anything')
  await page.getByRole('button', { name: /Run/ }).click()
  await expect(page.getByRole('alert')).toContainText("couldn't reach the backend")
  await expect(page.getByLabel('Goal')).toHaveValue('anything')
  await expect(page.getByRole('button', { name: /Run/ })).toBeEnabled()
})

test('no runs yet', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard')
  await expect(page.getByText('No runs from this browser yet.')).toBeVisible()
})

test('long and blank goals', async ({ page }) => {
  await mockBackend(page, {})
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard')
  await page.getByLabel('Goal').fill('   \n  ')
  await expect(page.getByRole('button', { name: /Run/ })).toBeDisabled()
  await page.getByLabel('Goal').fill('x'.repeat(5000))
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})

test('the system line never shows CPU or memory', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard')
  await expect(page.getByText(/since backend start/)).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/cpu|memory|MB\b/i)
})
```

- [ ] **Step 2: Run the tests to confirm they fail.** **Step 3: Implement** the files above, following the interface descriptions. **Step 4: Run them to confirm they pass.** **Step 5: Commit**: `feat(dashboard): overview and real run creation`.

---

### Task 9: Run Detail (header, orchestrator band, agents, run map, states)

**Files:**
- Create: `src/dashboard/pages/RunDetailPage.tsx`, `src/dashboard/run-detail/{RunHeader,OrchestratorBand,AgentList,RunMap,RunStateNotice,OutputPanel}.tsx`
- Test: `e2e/dashboard/run-detail.spec.ts`, `src/dashboard/run-detail/runDetail.test.tsx`

**Interfaces:**
- Consumes: `useRun`, `RunView`, `localRuns`, the UI primitives, and `OUTPUT_RENDERERS` (Task 10; until then `OutputPanel` renders `RawOutput`).
- Produces: the page for `runs/:runId`.

Behaviour (spec §7 and §16):
- **`RunHeader`:**
  - `<h1>` with the goal, or "Run <id>" when the goal is empty;
  - a `StatusPill` with the run status;
  - the id in Geist Mono with a `CopyButton`;
  - "Started from this browser {time}" only when `localRuns` has the id;
  - "elapsed m:ss*", whose tooltip reads "From the first agent being queued to the last agent finishing; excludes time waiting for the orchestrator." For an active run it reads "running for", and it shows "—" when `elapsedMs` is null.
- **`OrchestratorBand`:**

  | Run status | Text |
  |---|---|
  | queued | "Queued: waiting for a worker" |
  | running/waiting | "Running · {Agent} in progress" |
  | completed | "Complete · {k} agents ran" (k = agents with a task; **a count of real tasks, never "of 6"**) |
  | failed | "Failed at {Agent}" |
  | cancelled | "Cancelled" |

  It shows "Reconnecting…" when `reconnecting`, and "Updating every 1.5 s" while active.
- **`AgentList`:**
  - an `<ol aria-label="Agents">` of six `<li data-state>` rows, with `aria-current="step"` on the running agent;
  - each row: glyph and label, name, elapsed (`formatDuration`), summary, and "retried ×n" when `retries > 0`;
  - a failed row shows `error.summary` plus a `Disclosure` "Details" with `<pre>` of `error.detail`;
  - selecting a row selects its output tab.
- **`RunMap`:**
  - an inline SVG chain; under 768px it becomes a vertical list;
  - nodes: goal → six agents → N; agents in state `not-in-run` are dimmed, and the N is `#666F76` until the run is `completed`;
  - `role="img"` with `aria-label="Run map: Explorer complete, Knowledge running, …"`.
- **`RunStateNotice`** renders the notice for each view state. Exact copy:

  | View | Notice |
  |---|---|
  | loading | `Skeleton` with label "Loading run…" |
  | not-found | "This run isn't on the backend. It may have been lost when the backend restarted; runs in progress are kept in memory." Buttons: "Remove from this browser" (calls `localRuns.remove` and navigates to Runs) and "Back to runs". When `lastRun` is present, the last known agents render below, labelled "Last known state". |
  | degraded | "Showing saved results. Step-by-step detail isn't available after a backend restart." |
  | unreachable | "Can't reach the NEXUS backend." plus a Retry button |
  | failed | the band and pill show the failure; completed outputs stay available |

- **Live region:** a single `<p aria-live="polite" className="sr-only">`. It announces only when an agent enters completed/failed and when the run becomes terminal, computed by diffing the previous and next `run.agents` in a `useEffect`.

- [ ] **Step 1: Write failing tests.**

E2E (`run-detail.spec.ts`), using recorded sequences:

```ts
import { expect, test } from '@playwright/test'
import { fixture, mockBackend } from './mockBackend'
import { readdirSync } from 'node:fs'

const seq = (prefix: string) => readdirSync(new URL('../fixtures/', import.meta.url)).filter((f) => f.startsWith(`${prefix}-poll-`)).sort().map(fixture)
const id = (b: { workflow_id: string }) => b.workflow_id

test('watches a real recorded run from start to finish', async ({ page }) => {
  const polls = seq('full')
  await mockBackend(page, { runSequence: polls })
  await page.goto(`/dashboard/runs/${id(polls[0])}`)
  const agents = page.getByRole('list', { name: 'Agents' })
  await expect(agents.getByRole('listitem')).toHaveCount(6)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(polls[0].goal)
  await expect(page.locator('.nx-pill').first()).toContainText(/Complete|Failed/, { timeout: 30_000 })
  await expect(page.locator('body')).not.toContainText(/\b\d+\s*(of|\/)\s*6\b/)
})

test('agents without a task read "Not in this run" once the run ends', async ({ page }) => {
  const polls = seq('qa')
  await mockBackend(page, { runSequence: [polls[polls.length - 1]] })
  await page.goto(`/dashboard/runs/${id(polls[0])}`)
  await expect(page.getByRole('list', { name: 'Agents' })).toContainText('Not in this run')
})

test('backend restart mid-run', async ({ page }) => {
  const polls = seq('full')
  await mockBackend(page, { runSequence: [polls[0], null] })
  await page.goto(`/dashboard/runs/${id(polls[0])}`)
  await expect(page.getByText("This run isn't on the backend.")).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Last known state')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(polls[0].goal)
})

test('stored detail after restart is shown as degraded', async ({ page }) => {
  const stored = fixture('stored-after-restart.json')
  test.skip(!stored.workflow_id, 'restart produced a 404, covered by the test above')
  await mockBackend(page, { runSequence: [stored] })
  await page.goto(`/dashboard/runs/${stored.workflow_id}`)
  await expect(page.getByText('Showing saved results.')).toBeVisible()
})

test('unknown run and unreachable backend', async ({ page }) => {
  await mockBackend(page, { runSequence: [] })
  await page.goto('/dashboard/runs/wf-00000000')
  await expect(page.getByText("This run isn't on the backend.")).toBeVisible()
  await mockBackend(page, { unreachable: true })
  await page.goto('/dashboard/runs/wf-00000001')
  await expect(page.getByText("Can't reach the NEXUS backend.")).toBeVisible()
})

test('never calls /status/{id}', async ({ page }) => {
  const polls = seq('full')
  const calls = await mockBackend(page, { runSequence: polls })
  await page.goto(`/dashboard/runs/${id(polls[0])}`)
  await page.waitForTimeout(4000)
  expect(calls.status).toBe(0)
})
```

Unit (`runDetail.test.tsx`, rendered to static markup from fixtures):
- `OrchestratorBand` text for each status, and no `/of 6/`;
- `RunMap`'s `aria-label` lists six agents and its markup has no branching;
- `AgentList` marks exactly one `aria-current="step"` while running;
- a failed agent row contains its summary and a `<details>`.

- [ ] **Step 2: Run the tests to confirm they fail.** **Step 3: Implement.** **Step 4: Run them to confirm they pass.** **Step 5: Commit**: `feat(dashboard): run detail with real run states`.

---

### Task 10: Output renderers

**Files:**
- Create: `src/dashboard/outputs/{ExplorerOutput,KnowledgeOutput,DocumentationOutput,QAOutput,DemoOutput,ReleaseOutput,RawOutput}.tsx`, `outputs/markdown.tsx`, `outputs/graphLayout.ts`, `outputs/index.ts`
- Modify: `run-detail/OutputPanel.tsx`
- Test: `src/dashboard/outputs/outputs.test.tsx`

**Interfaces:**
- Produces:
  - `OUTPUT_RENDERERS: { [K in AgentId]: (p: { output: Extract<AgentOutput, { agent: K }>; runId: string }) => JSX.Element }`
  - `renderMarkdown(src: string): ReactNode[]`
  - `layoutGraph(nodes, edges, size): { x: number; y: number }[]`

**Output mapping:**

| Agent | Renders | Notes |
|---|---|---|
| Explorer | entity heading; components as pills; dimensions as a list; key insights as an `<ol>` | `reportedMetrics` go in a `Disclosure` "Reported by agent" in muted text. If `hasShowcase`, an `<iframe title="Explorer showcase" sandbox="allow-scripts" src={API_BASE + /workflows/{id}/explorer_html} loading="lazy">` (16:9; 4:3 under 768px) plus a link "Open full screen" with the same URL |
| Knowledge | SVG from `layoutGraph`, with the root at the centre and other nodes on rings by `type`, angles by index (deterministic) | Lines 0.75px `--nx-grey-500`; nodes r=3, root r=5; labels 11px `--nx-grey-300`. A node list `<ul>` sits under the SVG for screen readers and narrow screens. "Graph density (reported): {density}" |
| Documentation | `renderMarkdown`: `#`/`##`/`###` → h3/h4/h5 (the page already has h1/h2); `- `/`* ` lists; `1. ` lists; paragraphs; `**bold**`; `` `code` `` | Never uses `dangerouslySetInnerHTML`. Reader width 68ch |
| QA | a `DataRows` table of `tests` (Check, Result, Score, Detail) | Header line "Reported by agent: {passed}/{total} passed · {passRate}", only for fields that exist |
| Demo | "Generated by Gemini" or "Generated by fallback engine" from `generatedBy`; `status`; `lineCount` | Iframe `title="Demo showcase"` with `sandbox="allow-scripts"`, `src=/workflows/{id}/demo_html`, plus "Open full screen" |
| Release | definition list: Release, Deployment status, QA pass rate (reported), Components validated (pills), Summary | |
| Raw | `Disclosure` "Raw output" with `<pre>{JSON.stringify(raw, null, 2)}</pre>` | Shown when a renderer finds none of its fields, or always as the last element of each renderer |

`OutputPanel`:
- `Tabs` over the agents that have output, in product order;
- the selected tab is synced to `location.hash`; the default is the most recently completed agent;
- `role="tabpanel"` with `id="panel-{id}"` and `aria-labelledby="tab-{id}"`;
- with no output, "No output yet" while active or "Not produced in this run" when terminal.

- [ ] **Step 1: Write failing tests.**

```tsx
import { renderToStaticMarkup as html } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { normalizeOutput, normalizeRun } from '../data/normalize'
import { AGENT_ORDER } from '../data/agents'
import { OUTPUT_RENDERERS } from './index'
import { renderMarkdown } from './markdown'
import { layoutGraph } from './graphLayout'

const polls = Object.values(import.meta.glob('../../../e2e/fixtures/full-poll-*.json', { eager: true, import: 'default' })) as unknown[]
const run = normalizeRun(polls[polls.length - 1])

describe('output renderers', () => {
  it('render every recorded output', () => {
    for (const id of AGENT_ORDER) {
      const out = run.outputs[id]
      if (!out) continue
      const Render = OUTPUT_RENDERERS[id] as (p: { output: typeof out; runId: string }) => JSX.Element
      expect(() => html(<Render output={out} runId={run.id} />), id).not.toThrow()
    }
  })
  it('every renderer survives malformed output', () => {
    for (const id of AGENT_ORDER) for (const bad of ['just text', 42, [], { nodes: 'x', tests_run: {} }]) {
      const out = normalizeOutput(id, bad)
      if (!out) continue
      const Render = OUTPUT_RENDERERS[id] as (p: { output: typeof out; runId: string }) => JSX.Element
      expect(html(<Render output={out} runId="wf-x" />), `${id} ${JSON.stringify(bad)}`).toContain('Raw output')
    }
  })
  it('labels agent-reported numbers and never shows them as headline metrics', () => {
    const ex = run.outputs.explorer
    if (ex) expect(html(<OUTPUT_RENDERERS.explorer output={ex as never} runId={run.id} />)).toContain('Reported by agent')
  })
  it('sandboxes showcase iframes', () => {
    const demo = run.outputs.demo
    if (demo) expect(html(<OUTPUT_RENDERERS.demo output={demo as never} runId={run.id} />)).toMatch(/<iframe[^>]*sandbox="allow-scripts"[^>]*title="Demo showcase"|title="Demo showcase"[^>]*sandbox="allow-scripts"/)
  })
})

describe('markdown subset', () => {
  it('renders structure and escapes HTML', () => {
    const out = html(<>{renderMarkdown('# T\n\nHello **b** `c`\n\n- a\n- <img src=x onerror=alert(1)>')}</>)
    expect(out).toContain('<h3')
    expect(out).toContain('<strong>b</strong>')
    expect(out).toContain('&lt;img')
    expect(out).not.toContain('<img')
  })
})

describe('graph layout', () => {
  it('is deterministic and keeps the root centred', () => {
    const nodes = [{ id: 'root', label: 'R', type: 'CoreEntity' }, { id: 'a', label: 'A', type: 'Component' }, { id: 'b', label: 'B', type: 'AnalysisDimension' }]
    const a = layoutGraph(nodes, [], 300)
    expect(layoutGraph(nodes, [], 300)).toEqual(a)
    expect(a[0]).toEqual({ x: 150, y: 150 })
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail.**

- [ ] **Step 3: Implement.** The layout and Markdown modules:

```ts
// graphLayout.ts
const RING: Record<string, number> = { CoreEntity: 0, Component: 1, SubEntity: 1, AnalysisDimension: 2, Relationship: 2 }
export function layoutGraph(nodes: { id: string; type: string }[], _edges: unknown[], size: number) {
  const c = size / 2
  const rings = new Map<number, number[]>()
  nodes.forEach((n, i) => { const r = n.id === 'root' ? 0 : (RING[n.type] ?? 2) || 1; rings.set(r, [...(rings.get(r) ?? []), i]) })
  const pos: { x: number; y: number }[] = nodes.map(() => ({ x: c, y: c }))
  for (const [r, idx] of rings) {
    if (r === 0) continue
    const radius = (size / 2 - 24) * (r / 2)
    idx.forEach((i, k) => { const a = (2 * Math.PI * k) / idx.length - Math.PI / 2; pos[i] = { x: Math.round((c + radius * Math.cos(a)) * 100) / 100, y: Math.round((c + radius * Math.sin(a)) * 100) / 100 } })
  }
  return pos
}
```

```tsx
// markdown.tsx: block parser + inline (**bold**, `code`); text goes through React, so it is escaped by construction
import type { ReactNode } from 'react'
function inline(s: string, key: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((t, i) =>
    t.startsWith('**') ? <strong key={`${key}-${i}`}>{t.slice(2, -2)}</strong> : t.startsWith('`') ? <code key={`${key}-${i}`}>{t.slice(1, -1)}</code> : t)
}
export function renderMarkdown(src: string): ReactNode[] {
  const out: ReactNode[] = []
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) { const Tag = (['h3', 'h4', 'h5'] as const)[h[1].length - 1]; out.push(<Tag key={i}>{inline(h[2], `h${i}`)}</Tag>); i++; continue }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items: ReactNode[] = []
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i])) { items.push(<li key={i}>{inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''), `l${i}`)}</li>); i++ }
      out.push(ordered ? <ol key={`o${i}`}>{items}</ol> : <ul key={`u${i}`}>{items}</ul>)
      continue
    }
    if (!line.trim()) { i++; continue }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) para.push(lines[i++])
    out.push(<p key={`p${i}`}>{inline(para.join(' '), `p${i}`)}</p>)
  }
  return out
}
```

The renderer components follow the table above. Each one ends with `<RawOutput raw={output.raw} />`, which keeps the "Raw output" disclosure available and satisfies the malformed-output test.

- [ ] **Step 4: Run the tests to confirm they pass.** **Step 5: Commit**: `feat(dashboard): agent output renderers`.

---

### Task 11: Runs, Agents, output sections and Settings

**Files:**
- Create: `src/dashboard/pages/{RunsPage,AgentsPage,OutputSectionPage,SettingsPage}.tsx`, `src/dashboard/run/useLatestOutput.ts`
- Modify: `NexusDashboard.tsx` (wire the routes)
- Test: `e2e/dashboard/sections.spec.ts`

**Interfaces:**
- Consumes: `useLocalRuns`, `getRun`, `useSystemStatus`, `agentPurpose`, `setApiKey`.
- Produces:
  - `useLatestOutput(agent: AgentId): { state: 'none' | 'loading' | 'found' | 'error'; runId?: string; goal?: string }`. It walks the local index newest-first, calls `getRun` for at most 5 entries, and returns the first run whose `outputs[agent]` exists.

**Pages:**
- **RunsPage:**
  - `<h1>Runs</h1>` and the caption "Started from this browser. NEXUS doesn't list runs across browsers yet.";
  - a `DataRows` table with columns Run (goal, linked), Status (one `getRun` per row; the table polls only while any row is active, every 5 s), Run ID (mono), Started (client time);
  - an "Open a run by ID" form (an input matching `^wf-[a-z0-9]+$`, navigating to its detail);
  - an empty state when the index is empty.
- **AgentsPage:**
  - `<h1>Agents</h1>`, then six rows: name, purpose (`agentPurpose`), and "Live worker pool · {active}/{limit} busy · {queued} queued";
  - a note: "Per-agent history needs backend support.";
  - no CPU, memory or resources anywhere.
- **OutputSectionPage({ kind }):**
  - `<h1>{label}</h1>`, then `EmptyState` title "Backend support needed", body "{Label} across runs needs a run-listing endpoint (GET /workflows). Until then, each run's {label} output is on its run page.";
  - action: when `useLatestOutput` finds a run, "Open latest {label}" linking to `/dashboard/runs/{id}#{agent}`; otherwise "Start a run".
  - kind → agent: `knowledge→knowledge`, `documentation→documentation`, `qa→qa`, `demos→demo`, `releases→release`.
- **SettingsPage:**
  - `<h1>Settings</h1>`, a "Gemini API key" `<input type="password" autocomplete="off">` and Save, calling `setApiKey`;
  - success: "Saved. The backend will use this key for new runs." (`role="status"`);
  - failure: `role="alert"`;
  - the note "The backend can't report whether a key is already set." (R9).

- [ ] **Step 1: Write the failing E2E tests.**

```ts
import { expect, test } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { fixture, mockBackend } from './mockBackend'

const seed = (page: import('@playwright/test').Page, runs: { id: string; goal: string }[]) =>
  page.addInitScript((r) => localStorage.setItem('nexus.runs.v1', JSON.stringify({ version: 1, runs: r.map((x) => ({ ...x, submittedAt: '2026-10-03T10:00:00.000Z' })) })), runs)

test('runs lists only runs started from this browser, with live status', async ({ page }) => {
  const done = fixture('full-poll-' + '00.json')
  await seed(page, [{ id: done.workflow_id, goal: done.goal }])
  await mockBackend(page, { runSequence: [done] })
  await page.goto('/dashboard/runs')
  await expect(page.getByText('Started from this browser.')).toBeVisible()
  await expect(page.getByRole('link', { name: done.goal })).toHaveAttribute('href', `/dashboard/runs/${done.workflow_id}`)
})

for (const [path, label] of [['knowledge', 'Knowledge'], ['documentation', 'Documentation'], ['qa', 'QA'], ['demos', 'Demos'], ['releases', 'Releases']]) {
  test(`${label} shows backend support needed and no sample records`, async ({ page }) => {
    await mockBackend(page, {})
    await page.goto(`/dashboard/${path}`)
    await expect(page.getByText('Backend support needed')).toBeVisible()
    await expect(page.locator('table, [role="row"]')).toHaveCount(0)
  })
}

test('output sections link to the latest real run with that output', async ({ page }) => {
  const files = readdirSync(new URL('../fixtures/', import.meta.url)).filter((f) => f.startsWith('full-poll-')).sort()
  const last = fixture(files[files.length - 1])
  test.skip(!last.context?.knowledge_graph_output, 'recorded run produced no knowledge output')
  await seed(page, [{ id: last.workflow_id, goal: last.goal }])
  await mockBackend(page, { runSequence: [last] })
  await page.goto('/dashboard/knowledge')
  await expect(page.getByRole('link', { name: 'Open latest Knowledge' })).toHaveAttribute('href', `/dashboard/runs/${last.workflow_id}#knowledge`)
})

test('with no local runs, output sections offer to start one', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard/knowledge')
  await expect(page.getByRole('link', { name: 'Start a run' })).toHaveAttribute('href', '/dashboard')
})

test('agents page shows the live worker pool and no resource telemetry', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard/agents')
  await expect(page.getByText(/Live worker pool/).first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/cpu|memory|MB\b/i)
})
```


- [ ] **Step 2: Run the tests to confirm they fail.** **Step 3: Implement.** **Step 4: Run them to confirm they pass.** **Step 5: Commit**: `feat(dashboard): runs, agents, output sections, settings`.

---

### Task 12: FastAPI serves the built frontend

**Files:**
- Create: `backend/frontend_serving.py`, `backend/tests/test_frontend_serving.py`
- Modify: `backend/main.py`: two lines, placed directly after `app.add_middleware(...)` and before any route decorator, so the SPA routes register first and take precedence.

**Interfaces:**
- Produces: `mount_frontend(app: FastAPI, dist: Path) -> bool`.
  - Returns `False` (registering nothing) when `dist/index.html` is missing, so the existing behaviour is untouched.
  - Otherwise it registers `/assets` static files, the root files of `dist` (e.g. `favicon.svg`), and SPA fallbacks for `/`, `/dashboard` and `/dashboard/{path:path}`.
  - API routes are untouched.

- [ ] **Step 1: Write the failing test.**

```python
# backend/tests/test_frontend_serving.py
from pathlib import Path
from fastapi import FastAPI
from fastapi.testclient import TestClient
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from frontend_serving import mount_frontend


def make_dist(tmp_path: Path) -> Path:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><div id=root></div>", encoding="utf-8")
    (dist / "assets" / "app-123.js").write_text("console.log(1)", encoding="utf-8")
    (dist / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    return dist


def test_serves_spa_routes_assets_and_keeps_api(tmp_path):
    app = FastAPI()
    assert mount_frontend(app, make_dist(tmp_path)) is True

    @app.get("/workflows/{wid}")
    def wf(wid: str):
        return {"workflow_id": wid}

    c = TestClient(app)
    for path in ["/", "/dashboard", "/dashboard/runs/wf-1"]:
        r = c.get(path)
        assert r.status_code == 200 and 'id=root' in r.text, path
    assert c.get("/assets/app-123.js").text == "console.log(1)"
    assert c.get("/favicon.svg").status_code == 200
    assert c.get("/workflows/wf-1").json() == {"workflow_id": "wf-1"}
    assert c.get("/assets/missing.js").status_code == 404


def test_no_build_registers_nothing(tmp_path):
    app = FastAPI()
    assert mount_frontend(app, tmp_path / "nope") is False
    assert TestClient(app).get("/dashboard").status_code == 404
```

- [ ] **Step 2: Run** `python -m pytest backend/tests/test_frontend_serving.py -q`. Expected: FAIL, "No module named 'frontend_serving'".

- [ ] **Step 3: Implement.**

```python
# backend/frontend_serving.py
"""Serve the built NEXUS frontend (frontend/dist) from FastAPI: landing at /, dashboard at /dashboard/*."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def mount_frontend(app: FastAPI, dist: Path) -> bool:
    index = dist / "index.html"
    if not index.is_file():
        return False
    assets = dist / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="frontend-assets")

    def spa() -> FileResponse:
        return FileResponse(index, media_type="text/html")

    for path in ("/", "/dashboard", "/dashboard/{path:path}"):
        app.add_api_route(path, spa, methods=["GET"], include_in_schema=False)
    for f in dist.iterdir():
        if f.is_file() and f.name != "index.html":
            app.add_api_route(f"/{f.name}", (lambda p=f: FileResponse(p)), methods=["GET"], include_in_schema=False)
    return True
```

In `backend/main.py`, insert these three lines directly after the `app.add_middleware(...)` call, before any `@app` route decorator. Starlette matches routes in registration order, so the SPA routes take precedence over the legacy `/` and `/dashboard` handlers, which stay in place as the fallback when there is no build:

```python
from pathlib import Path as _Path  # noqa: E402
from frontend_serving import mount_frontend  # noqa: E402
mount_frontend(app, _Path(__file__).resolve().parents[1] / "frontend" / "dist")
```

- [ ] **Step 4: Run the pytest command.** Expected: 2 passed.

Then do a manual check:
1. `cd frontend && npm run build`, then from the repo root run `python backend/main.py`.
2. Open `http://127.0.0.1:3000/` (landing) and `/dashboard` (dashboard).
3. Confirm "Launch NEXUS" works and that `GET /system/status` still returns JSON.

- [ ] **Step 5: Commit**: `feat(backend): serve built frontend at / and /dashboard`.

---

### Task 13: Responsive, accessibility and motion pass

**Files:**
- Modify: `src/dashboard/dashboard.css` and any page needing fixes
- Test: `e2e/dashboard/responsive.spec.ts` (extend), `e2e/dashboard/a11y.spec.ts`

- [ ] **Step 1: Write failing tests.**

```ts
// a11y.spec.ts
import { expect, test } from '@playwright/test'
import { fixture, mockBackend } from './mockBackend'
import { readdirSync } from 'node:fs'
const polls = readdirSync(new URL('../fixtures/', import.meta.url)).filter((f) => f.startsWith('full-poll-')).sort().map(fixture)

test('keyboard path: skip link → nav → goal → Run', async ({ page }) => {
  await mockBackend(page, {})
  await page.goto('/dashboard')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await page.getByLabel('Goal').focus()
  await page.keyboard.type('g')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /Run/ })).toBeFocused()
})

test('every page has one h1 and labelled landmarks', async ({ page }) => {
  await mockBackend(page, { runSequence: polls })
  for (const p of ['/dashboard', '/dashboard/runs', `/dashboard/runs/${polls[0].workflow_id}`, '/dashboard/agents', '/dashboard/qa', '/dashboard/settings']) {
    await page.goto(p)
    await expect(page.locator('h1'), p).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Dashboard' })).toHaveCount(1)
  }
})

test('output tabs are keyboard operable', async ({ page }) => {
  await mockBackend(page, { runSequence: [polls[polls.length - 1]] })
  await page.goto(`/dashboard/runs/${polls[0].workflow_id}`)
  const tabs = page.getByRole('tab')
  test.skip((await tabs.count()) < 2, 'recorded run has fewer than two outputs')
  await tabs.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.nth(1)).toBeFocused()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
})

test('poll ticks are not announced', async ({ page }) => {
  await mockBackend(page, { runSequence: polls })
  await page.goto(`/dashboard/runs/${polls[0].workflow_id}`)
  await expect(page.locator('[aria-live]')).toHaveCount(1)
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('no transitions and no pulse', async ({ page }) => {
    await mockBackend(page, { runSequence: polls })
    await page.goto(`/dashboard/runs/${polls[0].workflow_id}`)
    const anim = await page.evaluate(() => [...document.querySelectorAll('.nx-app *')].some((el) => { const s = getComputedStyle(el); return s.animationName !== 'none' || parseFloat(s.transitionDuration) > 0 }))
    expect(anim).toBe(false)
  })
})
```

Extend `responsive.spec.ts` to cover Overview, Runs, Run Detail and Agents at 1440, 1024 and 390, checking:
- no horizontal overflow;
- Run Detail is two columns at 1440 and one column at ≤ 1199;
- at 390 the run map has `data-orientation="vertical"` and table rows are stacked (`thead` hidden).

- [ ] **Step 2: Run the tests to confirm they fail.**

- [ ] **Step 3: Fix what fails.** Expected fixes:
  - Run Detail grid CSS (`grid-template-columns: 360px minmax(0,1fr)` at ≥ 1200px);
  - the `RunMap` orientation attribute driven by the same `useNavMode` breakpoint;
  - iframe aspect ratios;
  - contrast of `--nx-err` on `--nx-surface-1`. Verify ≥ 4.5:1 with the contrast helper already in `e2e/a11y.spec.ts`; if it fails, lighten to `#d48e87`.
- [ ] **Step 4: Run** all `e2e/dashboard/*`. Expected: PASS.
- [ ] **Step 5: Commit**: `fix(dashboard): responsive, accessibility and motion pass`.

---

### Task 14: Full verification, performance and regression

**Files:**
- Create: `e2e/dashboard/perf.spec.ts`
- No production changes unless a check fails.

- [ ] **Step 1: Write the performance and isolation tests.**

```ts
import { expect, test } from '@playwright/test'
import { SCENE_CHUNK } from '../helpers'
import { mockBackend } from './mockBackend'

test('the dashboard never loads the 3D scene, and only one run request is ever in flight', async ({ page }) => {
  const urls: string[] = []
  let inFlight = 0
  let maxInFlight = 0
  page.on('request', (r) => { urls.push(r.url()); if (/\/workflows\/[^/]+$/.test(r.url())) { inFlight++; maxInFlight = Math.max(maxInFlight, inFlight) } })
  page.on('requestfinished', (r) => { if (/\/workflows\/[^/]+$/.test(r.url())) inFlight-- })
  page.on('requestfailed', (r) => { if (/\/workflows\/[^/]+$/.test(r.url())) inFlight-- })
  await mockBackend(page, { runSequence: [] })
  await page.goto('/dashboard/runs/wf-00000000')
  await page.waitForTimeout(3000)
  expect(urls.some((u) => SCENE_CHUNK.test(u))).toBe(false)
  expect(maxInFlight).toBeLessThanOrEqual(1)
})
```

- [ ] **Step 2: Run the whole verification.** Expected results:
  1. `npx vitest run`: every unit test passes, including the 83 pre-existing ones.
  2. Playwright, full suite: all pre-existing E2E tests (37) plus the new dashboard specs pass.
  3. `npm run build`: passes, and the build output lists a separate `NexusDashboard-*.js` chunk. The landing entry chunk size stays within +5 kB gzip of its size before Task 1; record both numbers.
  4. `npm run lint`: 0 errors.
  5. `python -m pytest backend/tests/test_frontend_serving.py -q`: passes.
  6. A no-mock-data guard: `grep -rEn "sample|mock|fake|lorem" frontend/src/dashboard --include=*.ts --include=*.tsx` returns nothing, except the word "mock" in test files under `e2e/`.

- [ ] **Step 3: Manual live check** against a real backend: `python backend/main.py` plus `npm run dev` (proxy).
  1. Create a run from Overview.
  2. Watch Run Detail reach a terminal state and open each output tab.
  3. Restart the backend and reload the run page; confirm the not-found or degraded state.
  4. Take screenshots at 1440, 1024 and 390 for review.

- [ ] **Step 4: Commit**: `test(dashboard): performance and isolation checks`.

---

## Rollback and regression considerations

- **Landing isolation.** Landing code is untouched. The only shared entry change is `App.tsx` → `AppRouter`, so reverting `App.tsx` to `return <LandingPage />` and removing `router.tsx` fully disables the dashboard. The existing landing E2E suite runs in Tasks 1 and 14.
- **Backend.** `mount_frontend` is a no-op when `frontend/dist/index.html` is absent, so deployments without a frontend build behave exactly as today. Rolling back means deleting its three-line hook. API routes are registered independently and are tested to still respond.
- **Dependency.** `react-router` is the only runtime addition, and it is only reachable through `router.tsx`. `happy-dom` is a dev dependency for one hook test.
- **Data.** localStorage key `nexus.runs.v1` is versioned. A future schema change uses `v2` and ignores `v1`; no migration is needed because the index can be rebuilt.
- **Commits.** Commits stage exact paths, never including the uncommitted landing room and laptop work.

## Execution order and dependencies

1. Task 1 → 2 → 3, the shell.
2. Task 4, fixtures. Needs a running backend; required before 5, 7, 9, 10 and 11.
3. Task 5 → 6 → 7.
4. Task 8, then 9, then 10, then 11.
5. Task 12 is independent and can run any time after Task 1.
6. Tasks 13 and 14 come last.

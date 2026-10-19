# NEXUS Dashboard — Part 1 Design Spec

Date: 2026-10-03 · Status: draft for review · Branch: `redesign/sharplink-inspired`

**External dashboard reference: none provided.** Sources of truth are (1) the NEXUS landing page and its design system in `frontend/src/landing/` and `frontend/src/index.css`, (2) the FastAPI backend in `backend/main.py` and `backend/agents/orchestrator/`, traced by reading the code, and (3) the product workflow Goal → Orchestrator → six agents → outputs.

Every response shape below was read from the backend source, not inferred from endpoint names. Where a value could not be confirmed from source, it is marked **verify against a live response** and Phase 2 captures real responses before any UI depends on them.

---

## 1. Product intent

The landing page says: *one goal, six agents, one run.* The dashboard is where the user actually does that: types a goal, starts a real workflow, watches the orchestrator hand the goal to the agents, and inspects what each agent produced.

Success for Part 1:

- From "Launch NEXUS" a user reaches the dashboard, enters a goal and presses **Run**; a real `POST /workflows` creates the run.
- The Run Detail page shows the real workflow and per-agent task state, updating while the run is active, and renders every output the backend actually returned.
- Nothing on screen is invented. Where the backend cannot supply something, the UI says so plainly.
- It is visibly the same product as the landing page.

Out of scope for Part 1: data-driven Knowledge, Documentation, QA, Demos and Releases listings (Part 2), authentication, teams, billing, any backend change other than those listed as optional in §12.

## 2. Design principles

1. **Operational, not cinematic.** No 3D, no scroll choreography, no decorative motion. The landing page shows NEXUS happening; the dashboard lets you run and inspect it.
2. **Same materials.** Reuse the landing tokens (§5.4): `#080808` ground, `#E1E5E5` text, greys `#C0C4C6 / #838A8F / #666F76`, graphite surfaces `#1C2227 / #20272C`, Geist and Geist Mono, thin borders, 999px pills, ○ ● ✓.
3. **Truth over completeness.** Show only what the backend returns. Label derived values with what they mean. Mark gaps as *backend extension required*.
4. **Lists, not cards.** Rows with hairline separators, compact panels, timelines. No KPI grids, no chart walls.
5. **One accent: none.** Monochrome by default. Restrained semantic colour only for failure (red), warning (amber) and, sparingly, success (green).
6. **The six agents are the spine.** Every view that touches a run shows the same six agents, in the same order, with the same glyphs.

## 3. Information architecture

Evaluated against what is real today:

| Area | Part 1 role | Why |
|---|---|---|
| **Overview** | Start a run; recent runs from this browser; one quiet system line | The primary action is starting a run |
| **Runs** | Runs started from this browser + open a run by ID | No list endpoint; IDs we created are real |
| **Run detail** (`Runs › <goal>`) | The core screen | Fully backed by `GET /workflows/{id}` |
| **Agents** | Six agents: purpose (product copy) + live worker slots and queue depth | `/system/status` exposes per-agent concurrency and queues |
| **Outputs: Knowledge, Documentation, QA, Demos, Releases** | Routes exist; each renders an honest *backend extension required* state that links to the latest local run's matching output | Outputs are per-run; cross-run listing needs `GET /workflows` (list) |
| **Settings** | Gemini API key (write-only) | `POST /api-key` is real; nothing else is configurable |

Critical evaluation of the proposed IA: Knowledge, Documentation, QA, Demos and Releases are **not independent data sources** in this backend; they are the six agents' per-run outputs. In Part 1 their primary home is the Run Detail outputs panel. Once a run-list endpoint exists, each section becomes a cross-run view of one output type (§9), with no further new endpoints needed. The sidebar groups them under **Outputs** to make that relationship visible.

Sidebar:

```
N NEXUS
  Overview
  Runs
INTELLIGENCE
  Agents
OUTPUTS
  Knowledge        ·
  Documentation    ·
  QA               ·
  Demos            ·
  Releases         ·
──────────
  Settings
  ● Backend connected        (system status line)
```

The `·` marker is a muted dot meaning "cross-run view needs backend support"; its tooltip and the page itself explain.

## 4. Route structure

Current repo: a single Vite SPA, `index.html` → `main.tsx` → `App.tsx` → `<LandingPage/>`. No router. The landing CTA is a plain `<a href="/dashboard">`.

Decision: add **`react-router`** (v7, library mode, `createBrowserRouter`). Justification: nested layout (shell + outlet), URL params for runs, links that support cmd/middle-click, and route-level code splitting. A hand-rolled router would need all of these.

```
/                          LandingPage (unchanged, eager)
/dashboard                 DashboardLayout › Overview          (lazy chunk)
/dashboard/runs            Runs
/dashboard/runs/:runId     RunDetail
/dashboard/agents          Agents
/dashboard/knowledge       OutputSection kind=knowledge
/dashboard/documentation   OutputSection kind=documentation
/dashboard/qa              OutputSection kind=qa
/dashboard/demos           OutputSection kind=demo
/dashboard/releases        OutputSection kind=release
/dashboard/settings        Settings
/dashboard/*               NotFound (inside shell)
```

- The whole `/dashboard` tree is one `lazy()` import, so the landing page's initial bundle does not grow. A regression test asserts no dashboard module is requested on `/`.
- `App.tsx` changes from rendering `<LandingPage/>` to rendering the router. **No landing file is modified.** The landing component is imported as-is.
- Landing → dashboard: "Launch NEXUS" stays `href="/dashboard"`. Same SPA, so it works in dev, preview and production (§12).
- API paths (`/workflows`, `/system`, `/api-key`) never collide with app routes, which all live under `/` and `/dashboard`.

## 5. Dashboard shell

### 5.1 Layout

```
┌───────────┬──────────────────────────────────────────────┐
│ Sidebar   │ Top bar: breadcrumb            run id · copy │
│ 232px     ├──────────────────────────────────────────────┤
│           │ Page content, max-width 1120px, 32px gutters │
└───────────┴──────────────────────────────────────────────┘
```

### 5.2 Sidebar

- NEXUS logo (reuse `landing/NexusLogo.tsx` by import), then groups as in §3. Items 32px tall, 13px Geist, `#838A8F`; active item `#E1E5E5` with a 2px left hairline, not a filled block.
- Bottom: Settings, then a one-line **backend status** from `/system/status` polling: `● Connected`, `○ Connecting…`, `✕ Backend unreachable`.

### 5.3 Top bar

Breadcrumb (`NEXUS / Runs / Website onboarding`), and on Run Detail the run ID in Geist Mono with a copy button. No search, notifications or avatar: nothing backs them.

### 5.4 Design system (tokens + primitives)

Reuse `--nx-*` from `src/index.css` unchanged. Add dashboard tokens in `src/dashboard/dashboard.css`, scoped under `.nx-app`, so they cannot leak into the landing page:

| Token | Value | Use |
|---|---|---|
| `--nx-surface-1` | `#0D1012` | panels |
| `--nx-surface-2` | `#111518` | hover, raised rows, inputs |
| `--nx-line` | `rgba(225,229,229,.08)` | separators |
| `--nx-line-strong` | `rgba(225,229,229,.14)` | panel borders, focus-adjacent |
| `--nx-ok` | `#86A98F` | success, sparingly |
| `--nx-warn` | `#C9A27A` | warning (already used in `screen.css` fail state) |
| `--nx-err` | `#C97B74` | failure |
| `--nx-radius-panel` | `8px` | panels |
| type scale | 12 / 13 / 14 / 16 / 20 / 28px | Geist; IDs, timestamps, counts in Geist Mono with tabular numbers |
| spacing | 4px grid: 4 8 12 16 24 32 48 | |

Primitives (`src/dashboard/ui/`): `Button` (light pill = primary, matching landing `.button--light`; ghost), `TextArea`, `StatusGlyph`, `StatusPill`, `Panel`, `DataTable` (rows + separators, collapses to stacked rows), `Tabs`, `Breadcrumbs`, `EmptyState`, `ErrorState`, `Skeleton`, `CopyButton`, `Disclosure`.

Status vocabulary, the same everywhere:

| Backend | UI glyph | Label |
|---|---|---|
| `QUEUED` | ○ | Queued |
| `WAITING` | ○ | Waiting |
| `RUNNING` | ● | Running |
| `COMPLETED` | ✓ | Complete |
| `FAILED` | ✕ (red) | Failed |
| `CANCELLED` | – (muted) | Cancelled |
| no task yet | ○ (muted) | Not started |
| run finished, agent had no task | – (muted) | Not in this run |

✕ and – extend the landing vocabulary only for states the landing never shows; they are the minimum needed to be truthful about failure and cancellation.

## 6. Overview UX

```
What should NEXUS work on?

┌──────────────────────────────────────────────────────┐
│ Describe the outcome you want, in plain language…    │
│                                                      │
│                                          [ Run → ]   │
└──────────────────────────────────────────────────────┘
NEXUS chooses which agents to run from your goal.

RECENT RUNS · started from this browser          View all
Website onboarding        ● Running     wf-3a9c…   2 min ago
Release documentation     ✓ Complete    wf-91be…   1 h ago

SYSTEM · since backend start
Workflows 1 running · 0 queued · 4 complete · 0 failed      Agent slots →
```

- The goal box echoes the landing Prompt screen: large Geist text, light **Run →** pill. `⌘/Ctrl+Enter` submits.
- Submit: `POST /workflows {goal, user_id:"dashboard"}` → `{workflow_id, status:"SUBMITTED"}` → store `{id, goal, submittedAt}` locally → navigate to `/dashboard/runs/:id`. The button shows `Starting…` and stays disabled only while the request is in flight.
- Validation: empty or whitespace goal disables Run. There is no other client validation; the backend accepts any string.
- The hint line is true: the backend routes by keywords (`test`/`qa` → QA flow, `doc` → Documentation flow, `demo` → Demo flow, otherwise all six).
- **Recent runs** are the IDs this browser created (localStorage), each row's status fetched live from `GET /workflows/{id}`. The heading says *started from this browser* because there is no list endpoint. "2 min ago" is the client submit time, labelled as such in the tooltip.
- **System line** uses `jobs_summary.workflows` from `/system/status`. These counts are in-memory since backend start, and the label says so. CPU and memory from `resources` are **not shown** (see §11, R4).

## 7. Run Detail UX

Desktop, two columns; narrow screens stack in reading order.

```
NEXUS / Runs / Analyze the onboarding flows…            wf-3a9c1f20 ⧉

Analyze the onboarding flows of three note-taking apps   ● RUNNING
Started from this browser 14:02 · 3 agents complete · elapsed 2m 41s*

ORCHESTRATOR
Running · agent 4 in progress (QA)                     Polling every 1.5 s

┌ AGENTS ────────────────────┐  ┌ OUTPUT · Knowledge ───────────────┐
│ ✓ Explorer     0:48        │  │ [Explorer][Knowledge][Docs][QA]…  │
│   Inkwell · 6 components   │  │                                   │
│ ✓ Knowledge    0:31        │  │   (renderer for selected agent)   │
│   14 nodes · 13 edges      │  │                                   │
│ ✓ Documentation 1:02       │  │                                   │
│ ● QA           running…    │  │                                   │
│ ○ Demo         not started │  │                                   │
│ ○ Release      not started │  │                                   │
└────────────────────────────┘  └───────────────────────────────────┘
RUN MAP  goal → Explorer → Knowledge → Docs → QA → Demo → Release → N
```

- **Header:** goal (backend `goal`), run status pill (workflow `status`), run ID. "Started from this browser" appears only when the ID is in local storage. `elapsed*` is defined in §10.6 and has a tooltip with its definition.
- **Orchestrator band:** workflow status and which agent currently has a `RUNNING` task. It does **not** say "4 of 6": the plan is not returned (§11, R2). After the run completes, the number of tasks is the true number of steps, and agents without a task show *Not in this run*.
- **Agents list:** the six agents, always in product order. Each row shows the glyph and label from §5.4; the task elapsed time (§10.6); and a one-line summary from real output fields when present (§10.5). A failed row shows the first line of `error_msg`, with a *Details* disclosure for the full traceback.
- **Output panel:** tabs for the agents that have output. The default tab is the most recently completed agent; the user's choice is kept in the URL hash (`#documentation`). Renderers are in §8.
- **Run map:** a small SVG chain from the goal through the agents to the N mark. It is a **chain, not a fan-out**, because the scheduler runs the plan strictly in order (`scheduler._on_task_complete` dispatches the next step only after the previous one completes). Nodes take their status style; agents not in the run are dimmed once the run is final. The N is subtle (16px, `#666F76`) and turns `#E1E5E5` only when the workflow is `COMPLETED`.

## 8. Agent UX

### 8.1 Output renderers (Run Detail)

Each renderer accepts the normalized output (§10.4), guards every field, and falls back to a "Raw output" disclosure (pretty JSON) if the expected fields are missing.

| Agent | Source key in `context` | Renders | Notes |
|---|---|---|---|
| Explorer | `explorer_output` | entity, key components (chips), analysis dimensions, key insights list; **Explorer showcase** iframe | `metrics` values are LLM-prompted ("number 100–500") or fallback constants: rendered under *Reported by agent* in muted text, never as KPIs |
| Knowledge | `knowledge_graph_output` | 2D SVG graph of `nodes` and `edges` (thin lines, small nodes, labels, monochrome, landing style); node list; `graph_density` | Layout is deterministic: root at the centre, types on rings |
| Documentation | `documentation_output` (Markdown string) | Document reader: headings, paragraphs, lists, bold, in Geist at a 68ch measure | Small in-house Markdown subset renderer; no raw HTML, so no injection path |
| QA | `qa_output` | `pass_rate`, totals, a `tests_run` table (name, result, score, detail) | Numbers are agent-reported; labelled so |
| Demo | `demo_output` | Sandboxed iframe of `GET /workflows/{id}/demo_html`; status, `generated_by` ("Gemini" or "Fallback engine"), `line_count` | `sandbox="allow-scripts"`, no same-origin. The showcase has its own styling, which the dashboard frames as an artefact |
| Release | `release_output` | `release_id`, `deployment_status`, `components_validated`, `qa_pass_rate`, `release_summary` | Shown as a convergence summary |

The Explorer iframe uses `GET /workflows/{id}/explorer_html`. Both iframe endpoints return a generic placeholder page if the file is missing, so the frame always loads.

### 8.2 Agents page

Six rows in product order. Each row has the name, one-sentence purpose (static product copy, identical to the landing captions), the live worker slots `active / limit` from `concurrency[<internal name>]`, and the queue depth from `queues["agent_<internal name>"]`. The heading says *Live worker pool*. "Recent runs" per agent comes only from local runs and is labelled; full history is Part 2.

## 9. Secondary sections

| Section | Part 1 | Part 2, once `GET /workflows` (list) exists |
|---|---|---|
| Knowledge | Extension-required state + "Open latest knowledge graph" (newest local run with `knowledge_graph_output`) | Graphs across runs; select a run → graph + entity panel |
| Documentation | Same pattern | Document list (run goal, date) → reader |
| QA | Same pattern | QA runs table: run, pass rate, totals, date |
| Demos | Same pattern | Demo list: run, generated_by, date → preview |
| Releases | Same pattern | Releases: release_id, deployment status, QA pass rate, run |
| Settings | Gemini API key form → `POST /api-key` | + key-configured status (needs R9) |

The extension-required state is a designed empty state, not an error: a title, one sentence on what the backend must provide, and a link to where the data can be seen today (Run Detail). **No sample records are rendered anywhere.** If Part 2 needs visual design data before the endpoints exist, it lives in `src/dashboard/__mocks__/`, is imported only by Storybook-style test fixtures, and is excluded from the build by an ESLint rule (`no-restricted-imports`) on production code.

## 10. Backend, API and data architecture

### 10.1 Layers

```
Pages / components        (domain types only)
      ↓
hooks: useRun, useLocalRuns, useSystemStatus, useCreateRun
      ↓
data layer src/dashboard/data/
  client.ts      fetch wrapper: base URL, timeout, AbortSignal, typed errors
  raw.ts         raw response types, exactly as traced
  normalize.ts   raw → domain (names, statuses, outputs, timestamps)
  workflows.ts   createRun(goal), getRun(id)
  system.ts      getSystemStatus()
  settings.ts    setApiKey(key)
  localRuns.ts   localStorage index of runs created here
      ↓
FastAPI (same origin in production; Vite proxy in dev)
```

Components never call `fetch` and never see raw shapes or internal agent names.

### 10.2 Endpoints used

| Endpoint | Used for | Notes |
|---|---|---|
| `POST /workflows` | create run | body `{goal, user_id, priority}`; we send `user_id:"dashboard"` and omit `priority` (default 1) |
| `GET /workflows/{id}` | run detail + polling | authoritative |
| `GET /workflows/{id}/demo_html` | Demo iframe | HTML |
| `GET /workflows/{id}/explorer_html` | Explorer iframe | HTML |
| `GET /system/status` | system line, Agents page | |
| `POST /api-key` | Settings | `{api_key}` → `{status:"ok"}` |
| `GET /status/{id}` | **not used** | reports agents as `idle` while running (checks `IN_PROGRESS`, which never occurs) |
| `POST /analyze`, `GET /check-veo` | not used | aliases / out of scope |

### 10.3 Raw models (from source)

```ts
// POST /workflows
type RawCreateRun = { workflow_id: string; status: 'SUBMITTED' }

type RawStatus = 'QUEUED' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

// GET /workflows/{id}: in-memory branch (normal case)
type RawRunLive = {
  workflow_id: string
  user_id: string
  goal: string
  status: RawStatus
  priority: number
  context: Record<string, unknown>   // goal + accumulated agent outputs
  tasks: RawTask[]                   // DB rows ordered by created_at
}
// GET /workflows/{id}: DB-fallback branch (workflow not in memory, e.g. after restart)
type RawRunStored = { workflow_id: string; status: RawStatus; goal: string; context: Record<string, unknown> }

type RawTask = {
  task_id: string
  workflow_id: string
  agent_name: 'explorer' | 'knowledge_graph' | 'documentation' | 'qa' | 'demo' | 'release'
  status: RawStatus
  priority: number
  input_data: Record<string, unknown>
  output_data: Record<string, unknown>  // e.g. { qa_output: {...} }
  error_msg: string | null              // message + full traceback
  retry_count: number
  created_at: string                    // SQLite CURRENT_TIMESTAMP 'YYYY-MM-DD HH:MM:SS', UTC, no zone
  updated_at: string
}

// GET /system/status
type RawSystemStatus = {
  jobs_summary: {
    workflows: { running: number; queued: number; completed: number; failed: number; total: number }
    tasks: { running: number; queued: number; total: number }
  }
  concurrency: Record<string, { active: number; limit: number; available: number }>  // keys = internal agent names
  queues: Record<string, number>   // 'workflows', 'agent_<internal name>'
  resources: { cpu_percent: number; memory_percent: number; available_memory_mb: number /* + fields to verify */ }
}
```

**Verify against a live response (Phase 2, before UI depends on it):** the remaining `resources` fields; whether `context` carries keys other than outputs and `goal`; the exact `created_at` format. Phase 2 records real responses from a running backend into `e2e/fixtures/*.json`, and tests run against those recordings, not hand-written shapes.

### 10.4 Domain models

```ts
type AgentId = 'explorer' | 'knowledge' | 'documentation' | 'qa' | 'demo' | 'release'
type RunStatus = 'queued' | 'waiting' | 'running' | 'completed' | 'failed' | 'cancelled'
type AgentState = RunStatus | 'not-started' | 'not-in-run'

interface Run {
  id: string
  goal: string
  status: RunStatus
  detail: 'live' | 'stored'          // stored = DB fallback, no task detail
  agents: Record<AgentId, AgentRun>  // always all six, product order
  outputs: Partial<Record<AgentId, AgentOutput>>
  elapsedMs: number | null           // §10.6
  activeAgent: AgentId | null
}
interface AgentRun {
  state: AgentState
  startedAt: Date | null   // task created_at (queued)
  endedAt: Date | null     // task updated_at when terminal
  elapsedMs: number | null
  error: { summary: string; detail: string } | null
  summary: string | null   // §10.5
}
```

`AgentOutput` is a tagged union per agent; each variant's fields are optional and match §8.1.

### 10.5 Normalization rules

- **Names:** `explorer→explorer`, `knowledge_graph→knowledge`, `documentation→documentation`, `qa→qa`, `demo→demo`, `release→release`. Unknown names are logged in development and ignored. A unit test asserts the display names equal the landing page's `AGENTS[].name`.
- **Outputs:** read from `context` by key (`explorer_output`, `knowledge_graph_output`, `documentation_output`, `qa_output`, `demo_output`, `release_output`). `context` is the merged source because it survives in the DB fallback; `task.output_data` is a secondary source.
- **Agent state:**
  1. latest task for that agent → its status;
  2. else output present in `context` → `completed` (DB-fallback case);
  3. else run terminal → `not-in-run`;
  4. else `not-started`.
- **Summaries:** built only from present fields, for example `entity` + `key_components.length`; `nodes.length` / `edges.length`; first Markdown heading; `pass_rate`; `generated_by`; `release_id`. No field → no summary.
- **Errors:** `error_msg` split at the first newline: summary and traceback.
- **Retries:** if an agent has several task rows, the latest by `created_at` wins and the count is shown as `retried ×n`.

### 10.6 Time and duration

- Task timestamps are parsed as UTC.
- **Agent elapsed** = `updated_at − created_at` for a terminal task: *time from being queued to finishing, one-second resolution*. For a running task it is `now − created_at`, labelled "running for".
- **Run elapsed** = last terminal task `updated_at` − first task `created_at`. It excludes the orchestrator's queue time before the first task, and the tooltip says so. `null` (shown as "—") in the stored-detail case.
- No run-level start time is shown except the local submit time for runs created here, labelled *Started from this browser*.

### 10.7 Polling strategy

- `useRun(id)` uses a `setTimeout` chain (never `setInterval`), so requests never overlap. Each request has an `AbortController` and is aborted on unmount or id change.
- **Cadence:** 1.5 s while the status is `queued`, `waiting` or `running`. It stops on `completed`, `failed` or `cancelled`, after one final fetch.
- **Hidden tab:** paused while `document.visibilityState === 'hidden'`, with an immediate fetch on return.
- **Errors:** network errors and 5xx back off 3 s → 6 s → 12 s → 15 s (cap), keeping the last good data on screen with a "Reconnecting…" note. A 404 stops polling and shows *Run not found* (§16).
- `useSystemStatus` polls every 10 s and pauses when hidden.
- **Cost note:** each poll returns the full `context`, including the Documentation Markdown and every output. That is acceptable for one open run; a lightweight status endpoint is R7.

## 11. Real vs missing backend capabilities

**Table A: concept → NEXUS UI → backend support**

External dashboard reference: none provided.

| Concept (from landing / product workflow) | NEXUS UI | Backend support |
|---|---|---|
| Goal | Overview goal box | **Real**: `POST /workflows` |
| Orchestrator | Run Detail orchestrator band | **Partial**: workflow status real; plan not returned |
| Six agents | Agents list on Run Detail | **Real**: per-agent tasks in `GET /workflows/{id}` |
| Agent outputs | Output panel, six renderers | **Real**: `context.*_output` |
| Network → N | Run map (sequential chain) | **Real**: derived from task states; ordering per scheduler |
| Live agent pool | Agents page | **Real**: `/system/status` concurrency + queues |
| Run history | Runs, Recent runs | **Missing**: browser-local IDs only |
| Knowledge / Docs / QA / Demos / Releases as libraries | Output sections | **Missing**: needs run listing |

**Table B: feature → backend → frontend → backend change**

| Feature | Current backend support | Frontend implementation (Part 1) | Backend change required | Class |
|---|---|---|---|---|
| Create run | `POST /workflows` | Overview goal box | — | REAL |
| Agent status | `tasks[].status` in `GET /workflows/{id}` | Agents list, run map | — (do not use `/status/{id}`; R1) | REAL |
| Agent outputs | `context.*_output` | Six renderers | — | REAL |
| Agent errors | `tasks[].error_msg` | Error summary + traceback disclosure | — | REAL |
| Demo / Explorer showcase | `/workflows/{id}/demo_html`, `/explorer_html` | Sandboxed iframes | — | REAL |
| Live agent pool | `/system/status` | Agents page, system line | — | REAL |
| Gemini API key | `POST /api-key` | Settings form (write-only) | R9 for "is a key set?" | PARTIALLY SUPPORTED |
| Explicit execution plan ("n of m") | Not returned | Not shown; *Not in this run* only after the run ends | R2: return `plan` + `current_step_index` | BACKEND EXTENSION REQUIRED |
| Run-level timestamps | In DB, not returned | Derived run elapsed from tasks, labelled | R3: return `created_at`/`updated_at` | PARTIALLY SUPPORTED |
| Run listing | None | Browser-local list of created IDs, labelled | R4: `GET /workflows` (paginated) | BACKEND EXTENSION REQUIRED |
| Persistent run history | SQLite rows exist; in-memory workflows lost on restart; DB fallback omits tasks | `detail:'stored'` mode; agent state inferred from context | R5: include tasks in fallback; R4 for history | PARTIALLY SUPPORTED |
| Knowledge listing | None | Extension state + link to latest local graph | R4 (then derived from outputs) | BACKEND EXTENSION REQUIRED |
| Documentation listing | None | Same | R4 | BACKEND EXTENSION REQUIRED |
| QA history | None | Same | R4 | BACKEND EXTENSION REQUIRED |
| Demo history | None | Same | R4 | BACKEND EXTENSION REQUIRED |
| Release history | None | Same | R4 | BACKEND EXTENSION REQUIRED |
| Output provenance (LLM vs fallback) | Only `demo_output.generated_by` | Shown for Demo; other outputs labelled *agent-reported* | R6 | PARTIALLY SUPPORTED |
| Cancel a run | `CANCELLED` state exists, no endpoint | Not offered | R10 | BACKEND EXTENSION REQUIRED |
| System resources (CPU, memory) | Returned, but `psutil` is not in `requirements.txt`, so likely constant fallback values (0 %, 4096 MB) | **Not shown** | R11 | BACKEND EXTENSION REQUIRED |
| Serve dashboard in production | `/` and `/dashboard` read `frontend/static/*.html`, which does not exist | Dev proxy; production per §12 | R8 | BACKEND EXTENSION REQUIRED |

### Backend changes genuinely needed for a production-quality dashboard

| # | Change | Size | Unblocks |
|---|---|---|---|
| R1 | Fix `GET /status/{id}` (`IN_PROGRESS` → `RUNNING`/`WAITING`/`QUEUED`) or remove it | tiny | correctness for any other client |
| R2 | Add `plan` and `current_step_index` to `GET /workflows/{id}` (both branches) | tiny | "n of m", upcoming agents |
| R3 | Add workflow `created_at`/`updated_at` to `GET /workflows/{id}` | tiny | true run start and duration |
| R4 | `GET /workflows?limit&cursor`: id, goal, status, created_at, updated_at, plan | small | Runs history, all Part 2 sections |
| R5 | Include `tasks` in the DB-fallback branch | tiny | full detail after restart |
| R6 | `generated_by` on every agent output; fallbacks should not emit invented metrics | small | honest outputs |
| R7 | Lightweight status (e.g. `?fields=status,tasks`) | small | cheap polling |
| R8 | Serve `frontend/dist`: `/assets/*` static + SPA fallback for `/` and `/dashboard/*` | small | production serving |
| R9 | `GET /api-key/status → {configured: bool}` | tiny | Settings |
| R10 | `POST /workflows/{id}/cancel` | small | cancel |
| R11 | Add `psutil` or remove `resources` | tiny | truthful system metrics |

None of these is needed to ship Part 1. R2–R5 and R8 are the highest value.

## 12. Serving and integration strategy

Findings:

- **Build:** `frontend` is a Vite 8 SPA (`npm run build` → `frontend/dist`); `npm run preview` serves it on :4173 with history fallback. There is no root-level frontend build: the root `build.js` and `start.js` only set up Python and launch `backend/main.py` (uvicorn, `PORT` default 3000).
- **FastAPI serving today:** `/` and `/dashboard` read `frontend/static/index.html` and `frontend/static/dashboard.html`. That directory does not exist, so `/dashboard` returns "APIP Dashboard Not Found". CORS is fully open (`*`).

Decision:

- **Development:** Vite dev server (:5173) with `server.proxy` for `/workflows`, `/system`, `/api-key` → `http://127.0.0.1:${NEXUS_API_PORT ?? 3000}`. The frontend uses relative URLs, so dev and production behave identically. If the backend is down, the dashboard shows *Backend unreachable*.
- **Production, recommended (R8):** FastAPI serves the built SPA: mount `frontend/dist/assets` at `/assets`, return `frontend/dist/index.html` for `/` and `/dashboard/{path:path}`, and keep API routes as they are. One origin, no CORS, and "Launch NEXUS" just works. This is a small backend edit and needs your approval because backend work was out of scope.
- **Production, without R8:** host `frontend/dist` on any static host with SPA fallback and set `VITE_API_BASE` to the API origin (CORS is already `*`). Supported by the client's base-URL setting at no extra cost.
- Landing and dashboard coexist in one bundle graph: the landing eager, the dashboard a lazy chunk, and `/` never loads dashboard code.

## 13. Responsive behaviour

| Width | Shell | Content |
|---|---|---|
| ≥ 1200px | Persistent 232px sidebar | Run Detail two columns (agents 360px · output fluid) |
| 768–1199px | 56px icon rail; a toggle expands it to 232px as an overlay (Esc closes) | Run Detail single column: header → orchestrator → agents → output → map |
| < 768px | Top bar with logo + menu button; navigation in a left drawer (`<dialog>`, focus-trapped, Esc and scrim close) | Tables become stacked rows (title line + meta line); tabs scroll horizontally; the run map becomes vertical; iframes 4:3 with an "Open full screen" link |

- The goal box keeps its size at every width.
- Agent rows wrap their summary under the name.
- Nothing scrolls horizontally except the tab strip and code blocks.

## 14. Accessibility

- **Landmarks:** `<nav aria-label="Dashboard">`, `<main>`, `<header>`; one `<h1>` per page; a skip link to main.
- **Keyboard:** everything is reachable. Tabs follow the WAI-ARIA tabs pattern (arrow keys). The drawer traps focus and returns it to its trigger. `⌘/Ctrl+Enter` submits the goal.
- **Focus:** a visible 2px `#E1E5E5` outline with offset, matching the landing page.
- **Status semantics:** glyphs are `aria-hidden`, and every status has a text label. The agents list is an `<ol>`, with the running agent marked `aria-current="step"` (the same pattern as the landing rail).
- **Live announcements:** one `aria-live="polite"` region per run announces only infrequent transitions: an agent completing or failing, and the run reaching a terminal state. Poll ticks, elapsed timers and counters are **not** announced.
- **Loading:** `aria-busy` on the region being loaded; skeletons are `aria-hidden` with a visually hidden "Loading run…".
- **Errors:** error states are `role="alert"` only when caused by a user action (run creation failed). Background polling errors are shown, not announced.
- **Iframes:** have a `title`.
- **Contrast:** all text at least 4.5:1 on its surface (the landing tokens already pass; `--nx-err` and `--nx-warn` are checked).
- **Reduced motion:** see §15.

## 15. Motion

- Status changes: 150 ms opacity/colour crossfade on the glyph and label.
- New output tab: 150 ms fade.
- Drawer: 200 ms transform.
- Page changes: none (instant), apart from the route-level skeleton.
- Running glyph: a slow 2 s opacity pulse (0.55↔1) on ● only. It is the only looping motion and is removed under reduced motion.
- `prefers-reduced-motion: reduce`: every transition becomes 0 ms and the pulse stops.
- No scroll-linked or 3D motion anywhere.

## 16. Loading, error and empty states

| State | Where | Treatment |
|---|---|---|
| Dashboard loading | Route chunk loading | Shell renders immediately; content skeleton |
| No runs yet | Overview recent runs, Runs | "No runs from this browser yet." + focus link to the goal box |
| Run creation failed | Overview | Inline under the goal box, `role="alert"`: the backend message or "NEXUS couldn't reach the backend." Goal text kept; Run re-enabled |
| Backend unreachable | Any page | Sidebar status `✕ Backend unreachable`; data panels show "Can't reach NEXUS backend at <origin>." with Retry |
| Reconnecting | Run Detail mid-poll | Last data kept; orchestrator band shows "Reconnecting…" |
| Run not found (404) | Run Detail | "This run isn't on the backend. It may have been lost when the backend restarted; in-progress runs are kept in memory." Actions: Remove from this browser, Back to runs |
| Stored detail only | Run Detail (DB fallback) | Note: "Showing saved results. Step-by-step detail isn't available after a backend restart." Agent states inferred from outputs; elapsed "—" |
| Run queued | Run Detail | Orchestrator: "Queued: waiting for a worker"; all agents *Not started* |
| Agent waiting / queued | Agent row | ○ Queued / Waiting |
| Agent running | Agent row | ● Running, "running for 0:42" |
| Agent completed | Agent row | ✓ Complete, elapsed, summary |
| Agent failed | Agent row + output tab | ✕ Failed, error summary, traceback disclosure; run status from backend (FAILED) |
| Workflow failed | Header + band | Red pill "Failed"; band names the failed agent; completed outputs stay inspectable |
| Output unavailable | Output tab | "No output yet" (running) or "Not produced in this run" (terminal) |
| Iframe output missing | Demo / Explorer tab | The backend serves a placeholder page; we additionally show the `generated_by`/status metadata |
| Extension required | Output sections | Designed empty state (§9) |

## 17. Testing strategy

**Unit (Vitest):**

- `normalize`: agent-name mapping (including unknown names); status mapping for all six raw statuses; agent-state precedence; the `not-in-run` rule; retries; error splitting; summaries per output, including missing fields; live vs stored branch; UTC timestamp parsing; elapsed definitions.
- `client`: error typing (network, 404, 5xx, malformed JSON); base URL.
- `useRun` polling, with fake timers: cadence, no overlap, stop on terminal, backoff ladder, 404 stop, pause when hidden, abort on unmount.
- `localRuns`: add, remove, dedupe, corrupt-storage recovery.
- Renderers: each renders from recorded fixtures and from missing-field fixtures without throwing; the Markdown renderer escapes HTML.
- Consistency: dashboard agent display names equal the landing `AGENTS[].name`.

**E2E (Playwright, API intercepted with `page.route` serving recorded backend responses):**

- Routing: `/`, `/dashboard`, every section route, unknown route, deep link to `/dashboard/runs/:id`, and the landing CTA navigating to `/dashboard`.
- Create run: the goal is submitted with the exact request body, navigation to the returned ID, and the ID stored locally.
- Polling: a sequence of recorded responses (queued → running explorer → … → completed) drives the UI through every state; polling stops at terminal.
- Failed workflow, missing workflow (404), backend unreachable (aborted route), stored-detail fallback.
- Empty states: no local runs; each extension-required section.
- Responsive: 1440, 1024 and 390 widths (sidebar vs rail vs drawer; stacked rows; no horizontal overflow).
- Reduced motion: transitions are 0 and there is no pulse.
- Accessibility: keyboard path (skip link → nav → goal → Run), drawer focus trap, tabs keyboard behaviour, status labels present, single `<h1>`.
- **Optional live smoke test** against a real backend, only when `NEXUS_LIVE_API=1`: create a run and see a task appear.

**Regression:**

- The existing 83 unit tests and 37 E2E tests pass unchanged.
- New check: loading `/` requests no dashboard chunk.
- `npm run build` and `npm run lint` pass with 0 errors.

## 18. Implementation phases

| Phase | Delivers | Exit check |
|---|---|---|
| 1. Router + shell + design system | `react-router`, lazy `/dashboard` tree, `DashboardLayout`, sidebar/rail/drawer, tokens, UI primitives, NotFound, extension-required pages | Routing E2E; landing regression; no dashboard chunk on `/` |
| 2. Data layer + fixtures | Record real responses from a running backend into `e2e/fixtures`; `raw.ts`, `normalize.ts`, `client.ts`, `workflows.ts`, `system.ts`, `localRuns.ts`; Vite proxy | Normalization and client unit tests green against recorded fixtures |
| 3. Overview + run creation | Goal box, `POST /workflows`, navigation, recent runs (local), system line | Create-run E2E; error and empty states |
| 4. Run Detail | Header, orchestrator band, agents list, run map, `useRun` polling, all run/agent states | Polling unit + E2E state sequence; 404, failed, stored, unreachable |
| 5. Outputs | Six renderers, Markdown subset, KG SVG, sandboxed Demo/Explorer iframes, raw fallback | Renderer tests from fixtures |
| 6. Agents + Runs + Settings | Agents live pool, Runs table (local + open by ID), Settings API key | E2E for each |
| 7. Responsive, accessibility, polish | Breakpoints, keyboard, reduced motion, contrast, performance pass | Full suite, build, lint, screenshot review at 1440/1024/390 |

Part 2 starts after R4 (and ideally R2, R3, R5, R6) lands in the backend.

## Decisions requiring approval

1. Add the `react-router` dependency (§4).
2. Recent runs and Runs use browser-local run IDs, clearly labelled (§6).
3. The Agents page uses live `/system/status` concurrency (§8.2).
4. Production serving: recommend R8 (a small backend edit), or a static host with `VITE_API_BASE` (§12).
5. Phase 2 records real backend responses as test fixtures. This needs a running backend once, with a Gemini key or knowingly using its fallback engine.

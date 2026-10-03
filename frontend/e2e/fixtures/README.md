# Recorded backend fixtures

Recorded 2026-10-03 (re-recorded in fix round 1) by `scripts/capture-fixtures.mjs` from `python backend/main.py` on http://127.0.0.1:3000 against an isolated, empty SQLite DB. Engine path: **fallback path (GEMINI_API_KEY unset)**; this is the user-approved alternative to the Gemini path. The script saves responses verbatim and never edits them.

## Files
Machine log of the last capture (run ids, snapshot counts, states seen): [RECORDED.md](RECORDED.md). This README is hand-maintained; the script never writes it.

Capture used `POLL_MS=20` against a fresh DB (capture2.db), same fallback path.
- `system-status.json`: GET /system/status on an idle backend (body only). Contains an untyped `resources` object that the dashboard never reads.
- `full-create.json` (wf-284658cf) and `qa-create.json` (wf-21216e31): POST /workflows responses, `{ workflow_id, status: "SUBMITTED" }`.
- `full-poll-00..07.json`: 8 distinct snapshots of the full run (6 agents). RUNNING with `tasks: []`, then the task list grows one agent at a time (explorer, knowledge_graph, documentation, qa, demo, release, each COMPLETED when first seen), run still RUNNING after the last task, then COMPLETED.
- `qa-poll-00..04.json`: 5 snapshots of the QA run. QUEUED `[]`, RUNNING with explorer, then +knowledge_graph, then +qa as **RUNNING** (the only genuine task-level RUNNING state captured), then COMPLETED with three tasks (explorer, knowledge_graph, qa). The backend creates a task row only when that agent starts, so the other three agents have no task in this run.
- No snapshot shows a task QUEUED or a task row with partial output; even at 20 ms only the full run's tasks (COMPLETED when first seen) and the one qa RUNNING were observed. Task timestamps have 1 s resolution (`YYYY-MM-DD HH:MM:SS`, no `T`, no timezone).
- `not-found.json`: the capture script's `{ status, body }` object for GET /workflows/wf-00000000, i.e. `{ "status": 404, "body": { "detail": "Workflow not found" } }`. Unlike the other files it is NOT the bare response body.
- `stored-after-restart.json`: GET /workflows/wf-284658cf after stopping and restarting the backend with the same DB. HTTP status **200**. Stored shape `{ workflow_id, status: "COMPLETED", goal, context }`: no `user_id`, `priority` or `tasks`. Body as returned, re-indented (2 spaces) only. Nothing was re-enqueued (the run had completed).
- `derived-failed.json`: NOT a backend recording (no run failed naturally). Derived from `full-poll-07.json`, changing only three values: top-level `status` COMPLETED -> FAILED; the `qa` task `status` COMPLETED -> FAILED; that task's `error_msg` null -> "Derived failure message (not produced by the backend)". The glob `*-poll-*.json` does not match it.

## Differences between the brief's raw types and the recordings
1. `RawCreateRun.status` narrowed from `string` to the literal `'SUBMITTED'` (not one of RAW_STATUSES).
2. `RawTask.agent_name` narrowed from `string` to `RawAgentName` (all six recorded names belong to it).
3. `RawTask.input_data` narrowed from `Record<string, unknown>` to `{ goal?: string; context: Record<string, unknown> }` (always has `context`; `goal` seen on every task).
4. Added `RawErrorBody { detail: string }` for the recorded 404 body.
5. `RawRunStored` documented as the post-restart shape; the recording confirms its fields (`workflow_id, status, goal, context`) with no extras. Type guards unchanged.
6. Not differences, confirmed: RawStatus values (QUEUED seen on qa-poll-00), RawRunLive, task fields, RawSystemStatus (`resources` left untyped).

# Recorded backend fixtures

Recorded 2026-10-03 by `scripts/capture-fixtures.mjs` from `python backend/main.py` on http://127.0.0.1:3000 against an isolated, empty SQLite DB. Engine path: **fallback path (GEMINI_API_KEY unset)**; this is the user-approved alternative to the Gemini path. The script saves responses verbatim and never edits them.

## Files
- `system-status.json`: GET /system/status on an idle backend (body only). Contains an untyped `resources` object that the dashboard never reads.
- `full-create.json` (wf-d60283bf) and `qa-create.json` (wf-c0f8d126): POST /workflows responses, `{ workflow_id, status: "SUBMITTED" }`.
- `full-poll-00..01.json`: 2 distinct snapshots of the full run (6 agents). RUNNING with `tasks: []`, then COMPLETED with all six tasks COMPLETED.
- `qa-poll-00..01.json`: 2 distinct snapshots of the QA run. QUEUED with `tasks: []`, then COMPLETED with three tasks (explorer, knowledge_graph, qa). So the backend runs only the agents the goal needs; the other three agents have no task.
- Both runs finish within the first 250 ms poll interval, so only the first and last states are observable. All task timestamps are identical to the second (`YYYY-MM-DD HH:MM:SS`, no `T`, no timezone).
- `not-found.json`: the capture script's `{ status, body }` object for GET /workflows/wf-00000000, i.e. `{ "status": 404, "body": { "detail": "Workflow not found" } }`. Unlike the other files it is NOT the bare response body.
- `stored-after-restart.json`: GET /workflows/wf-d60283bf after stopping and restarting the backend with the same DB. HTTP status **200**. Shape is the stored shape `{ workflow_id, status: "COMPLETED", goal, context }`: no `user_id`, no `priority`, no `tasks`. Nothing was re-enqueued because the run had already completed (backend.log shows no agent activity after the restart).
- `derived-failed.json`: NOT a backend recording (no run failed naturally). Derivation from `full-poll-01.json`, changing only three values: top-level `status` COMPLETED -> FAILED; the `qa` task `status` COMPLETED -> FAILED; that task's `error_msg` null -> "Derived failure message (not produced by the backend)". Nothing else differs. The glob `*-poll-*.json` does not match it.

## Differences between the brief's raw types and the recordings
1. `RawCreateRun.status` narrowed from `string` to the literal `'SUBMITTED'` (not one of RAW_STATUSES).
2. `RawTask.agent_name` narrowed from `string` to `RawAgentName` (all six recorded names belong to it).
3. `RawTask.input_data` narrowed from `Record<string, unknown>` to `{ goal?: string; context: Record<string, unknown> }` (always has `context`; `goal` seen on every task).
4. Added `RawErrorBody { detail: string }` for the recorded 404 body.
5. `RawRunStored` documented as the post-restart shape; the recording confirms its fields (`workflow_id, status, goal, context`) with no extras. Type guards unchanged.
6. Not differences, confirmed: RawStatus values (QUEUED seen on qa-poll-00), RawRunLive, task fields, RawSystemStatus (`resources` left untyped).

# ADIP-agent

FastAPI orchestrator that runs the six-agent workflow and serves the NEXUS frontend.

## Run

```bash
pip install -r backend/requirements.txt
cd frontend && npm ci && npm run build && cd ..   # produces frontend/dist
python backend/main.py                            # http://localhost:3000
```

With `frontend/dist` present, `/` serves the landing page and `/dashboard` the dashboard.
Without it the API still runs, but `/` shows a "Dashboard Not Found" page, so build the frontend first.
For frontend development, run `npm run dev` in `frontend/` instead; Vite proxies the API to port 3000
(`NEXUS_API_PORT` overrides it).

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `orchestrator_jobs.db` in the working directory | SQLite file for workflow persistence (`*.db` is gitignored) |
| `GEMINI_API_KEY` | unset | Optional. Without it the agents use their built-in fallback. The dashboard's Settings page can also set it at runtime (`POST /api-key`); it is held in process memory only. |

Optional packages: `psutil` (resource readings) and `google-genai` (only for `/check-veo`).

## Tests

```bash
python -m pytest backend/tests/test_frontend_serving.py -q
```

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
import tempfile

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from agents.orchestrator.agent import OrchestratorAgent

app = FastAPI(title="ADIP Orchestrator API", description="Autonomous Product Intelligence Platform Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pathlib import Path as _Path  # noqa: E402
from frontend_serving import mount_frontend  # noqa: E402
mount_frontend(app, _Path(__file__).resolve().parents[1] / "frontend" / "dist")

_repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_static_dir = os.path.join(_repo_root, "frontend", "static")
_dashboard_path = os.path.join(_static_dir, "dashboard.html")

def get_dashboard_html():
    if os.path.exists(_dashboard_path):
        with open(_dashboard_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>APIP Dashboard Not Found</h1>"

orchestrator = OrchestratorAgent()

class WorkflowRequest(BaseModel):
    goal: str
    user_id: str = "anonymous"
    priority: int = 1

class ApiKeyRequest(BaseModel):
    api_key: str

@app.post("/api-key")
def set_api_key(req: ApiKeyRequest):
    """Receive the Gemini API key from the dashboard and wire it into the process env."""
    if not req.api_key:
        raise HTTPException(status_code=400, detail="api_key must not be empty")
    os.environ["GEMINI_API_KEY"] = req.api_key
    return {"status": "ok"}

_landing_path = os.path.join(_static_dir, "index.html")

def get_landing_html():
    if os.path.exists(_landing_path):
        with open(_landing_path, "r", encoding="utf-8") as f:
            return f.read()
    return None

@app.get("/", response_class=HTMLResponse)
def read_root():
    """Serve the APIP Landing Page (falls back to Dashboard)"""
    landing = get_landing_html()
    if landing:
        return HTMLResponse(content=landing, status_code=200)
    return HTMLResponse(content=get_dashboard_html(), status_code=200)

@app.get("/dashboard", response_class=HTMLResponse)
def read_dashboard():
    """Serve the APIP Dashboard directly"""
    return HTMLResponse(content=get_dashboard_html(), status_code=200)

@app.post("/workflows")
def submit_workflow(req: WorkflowRequest):
    wf_id = orchestrator.submit_workflow({"goal": req.goal}, user_id=req.user_id, priority=req.priority)
    return {"workflow_id": wf_id, "status": "SUBMITTED"}

@app.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: str):
    status = orchestrator.get_workflow_status(workflow_id)
    if not status:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return status

# ── Frontend-compatible aliases ───────────────────────────────────

class AnalyzeRequest(BaseModel):
    product_url: str
    api_key: str | None = None

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """Alias: accepts product_url, maps to /workflows."""
    if req.api_key:
        os.environ["GEMINI_API_KEY"] = req.api_key
    wf_id = orchestrator.submit_workflow({"goal": req.product_url}, user_id="dashboard")
    return {"run_id": wf_id, "status": "SUBMITTED"}

def _safe_parse(val):
    """Return val as a JSON-serialisable object. Handles dicts, strings that
    look like Python dicts/lists, and plain strings."""
    import ast
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    if isinstance(val, str):
        s = val.strip()
        if s.startswith("{") or s.startswith("["):
            try:
                return ast.literal_eval(s)
            except Exception:
                pass
    return val

@app.get("/status/{run_id}")
def get_status(run_id: str):
    """Alias: maps /status/:id to /workflows/:id with frontend-compatible shape."""
    raw = orchestrator.get_workflow_status(run_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Run not found")
    ctx = raw.get("context", {})
    is_running = raw.get("status", "").upper() == "IN_PROGRESS"
    key_map = {
        "Explorer":  "explorer_output",
        "Knowledge": "knowledge_graph_output",
        "Docs":      "documentation_output",
        "QA":        "qa_output",
        "Demo":      "demo_output",
        "Release":   "release_output",
    }
    agents: dict = {}
    for label, ctx_key in key_map.items():
        out = ctx.get(ctx_key)
        parsed = _safe_parse(out)
        agents[label] = {
            "status": "done" if parsed else ("running" if is_running else "idle"),
            "output": parsed,
        }
    return {
        "run_id": run_id,
        "status": raw.get("status", "idle").lower(),
        "agents": agents,
    }

@app.get("/workflows/{workflow_id}/demo_html", response_class=HTMLResponse)
def get_demo_html(workflow_id: str):
    """Serve the Demo Agent's generated interactive 3D HTML showcase for an iframe"""
    status = orchestrator.get_workflow_status(workflow_id)
    if not status or "context" not in status:
        raise HTTPException(status_code=404, detail="Workflow context not found")
    demo_out = status["context"].get("demo_output", {})
    file_path = demo_out.get("animation_file", "")
    if file_path and os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    # Fallback inline showcase if file isn't on disk
    return HTMLResponse(content=f"<html><body style='background:#0a0e1a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;'><h2>3D Demo Showcase for Workflow {workflow_id}</h2></body></html>", status_code=200)

@app.get("/workflows/{workflow_id}/explorer_html", response_class=HTMLResponse)
def get_explorer_html(workflow_id: str):
    """Serve the Explorer Agent's generated interactive video showcase for an iframe"""
    status = orchestrator.get_workflow_status(workflow_id)
    if not status or "context" not in status:
        raise HTTPException(status_code=404, detail="Workflow context not found")
    exp_out = status["context"].get("explorer_output", {})
    file_path = exp_out.get("explorer_video_file", "")
    if file_path and os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    return HTMLResponse(content=f"<html><body style='background:#0a0e1a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;'><h2>Explorer Video Showcase for Workflow {workflow_id}</h2></body></html>", status_code=200)

@app.get("/system/status")
def system_status():
    return orchestrator.get_system_status()

@app.get("/check-veo")
def check_veo():
    """Check if Veo 3.1 video generation is accessible with the current API key."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {"available": False, "reason": "No GEMINI_API_KEY set"}
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        # List models and look for veo
        models = list(client.models.list())
        veo_models = [m.name for m in models if "veo" in m.name.lower()]
        if veo_models:
            return {"available": True, "veo_models": veo_models}
        else:
            # Try a quick generate call to see if we get access error vs model-not-found
            return {"available": False, "reason": "No Veo models in your account", "all_models_count": len(models)}
    except Exception as e:
        return {"available": False, "reason": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

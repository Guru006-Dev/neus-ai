from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from agents.orchestrator.agent import OrchestratorAgent

app = FastAPI(title="ADIP Orchestrator API", description="Autonomous Product Intelligence Platform Orchestrator")

# Load dashboard HTML at startup (avoids file-serving issues in read-only containers)
_dashboard_html = ""
_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
_dashboard_path = os.path.join(_static_dir, "dashboard.html")
if os.path.exists(_dashboard_path):
    with open(_dashboard_path, "r", encoding="utf-8") as f:
        _dashboard_html = f.read()

# Initialize the robust orchestrator agent
orchestrator = OrchestratorAgent()

class WorkflowRequest(BaseModel):
    goal: str
    user_id: str = "anonymous"
    priority: int = 1

@app.get("/", response_class=HTMLResponse)
def read_root():
    """Serve the APIP Dashboard"""
    return HTMLResponse(content=_dashboard_html, status_code=200)

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

@app.get("/system/status")
def system_status():
    return orchestrator.get_system_status()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

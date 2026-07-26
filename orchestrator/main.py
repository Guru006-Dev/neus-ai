from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from agents.orchestrator.agent import OrchestratorAgent

app = FastAPI(title="ADIP Orchestrator API", description="Autonomous Product Intelligence Platform Orchestrator")

# Serve static files (dashboard)
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Initialize the robust orchestrator agent (handles writable directory fallback automatically)
orchestrator = OrchestratorAgent()

class WorkflowRequest(BaseModel):
    goal: str
    user_id: str = "anonymous"
    priority: int = 1

@app.get("/")
def read_root():
    """Serve the APIP Dashboard"""
    return FileResponse(os.path.join(static_dir, "dashboard.html"))

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

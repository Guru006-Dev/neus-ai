"""
Endpoint tests for the FastAPI app in backend/main.py, run in-process with TestClient.

Same checks as the original manual script (GET /, GET /system/status, POST /workflows,
GET /workflows/{id}), without a running server: importing this module does no network
access and never exits the process. main.py builds its OrchestratorAgent at import time,
so the fixture sets DB_PATH to a temporary database first, removes GEMINI_API_KEY so the
agents use their offline fallback, sends generated files to a temporary directory, and
stops the orchestrator afterwards.
"""

import importlib
import sys
import tempfile
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1]
FULL_PLAN = ["explorer", "knowledge_graph", "documentation", "qa", "demo", "release"]
TIMEOUT_S = 30.0


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("endpoints")
    artifacts = tmp / "artifacts"
    artifacts.mkdir()
    mp = pytest.MonkeyPatch()
    mp.setenv("DB_PATH", str(tmp / "orchestrator.db"))
    mp.delenv("GEMINI_API_KEY", raising=False)
    mp.setattr(tempfile, "tempdir", str(artifacts))
    mp.syspath_prepend(str(BACKEND))
    sys.modules.pop("main", None)
    main = importlib.import_module("main")
    # Load shedding is not under test; a busy machine must not stall the workflow.
    mp.setattr(main.orchestrator.resource_manager, "is_resource_available", lambda: True)
    try:
        with TestClient(main.app) as c:
            c.main = main
            c.tmp = tmp
            yield c
    finally:
        main.orchestrator.stop()
        sys.modules.pop("main", None)
        mp.undo()


def wait_for_terminal(client, workflow_id):
    deadline = time.monotonic() + TIMEOUT_S
    body = None
    while time.monotonic() < deadline:
        body = client.get(f"/workflows/{workflow_id}").json()
        if body["status"] in ("COMPLETED", "FAILED"):
            return body
        time.sleep(0.05)
    pytest.fail(f"workflow {workflow_id} still {body and body['status']} after {TIMEOUT_S}s")


def test_app_uses_the_temporary_database(client):
    assert Path(client.main.orchestrator.db.db_path) == client.tmp / "orchestrator.db"


def test_root_serves_html(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/html")
    assert res.text.strip()


def test_system_status_reports_jobs_concurrency_and_queues(client):
    res = client.get("/system/status")
    assert res.status_code == 200
    data = res.json()
    assert {"jobs_summary", "concurrency", "queues", "resources"} <= set(data)
    assert set(data["concurrency"]) == set(FULL_PLAN)
    assert all({"active", "limit", "available"} <= set(v) for v in data["concurrency"].values())
    assert {"workflows", "tasks"} <= set(data["jobs_summary"])


def test_submit_then_read_workflow_until_completed(client):
    goal = "Analyze the onboarding flow of an example app"
    res = client.post("/workflows", json={"goal": goal, "user_id": "endpoint-test"})
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "SUBMITTED"
    wf_id = body["workflow_id"]
    assert wf_id.startswith("wf-")

    first = client.get(f"/workflows/{wf_id}")
    assert first.status_code == 200
    assert first.json()["user_id"] == "endpoint-test"

    final = wait_for_terminal(client, wf_id)
    assert final["status"] == "COMPLETED"
    assert final["goal"] == goal
    assert [t["agent_name"] for t in final["tasks"]] == FULL_PLAN
    assert all(t["status"] == "COMPLETED" for t in final["tasks"])


def test_unknown_workflow_is_404(client):
    res = client.get("/workflows/wf-00000000")
    assert res.status_code == 404
    assert res.json() == {"detail": "Workflow not found"}


def test_submit_without_goal_is_rejected(client):
    assert client.post("/workflows", json={}).status_code == 422

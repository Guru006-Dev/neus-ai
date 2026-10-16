"""
Regression tests for the orchestrator engine in backend/agents/orchestrator.

Each test builds a real OrchestratorAgent (scheduler, worker pool, SQLite persistence and the
six registered agents) against its own temporary database, runs it in-process and shuts it
down afterwards. Nothing touches the network or the repository:
  - GEMINI_API_KEY is removed, so every agent takes its deterministic offline fallback;
  - tempfile's directory is redirected to the test's tmp_path, so the HTML the agents write lands there;
  - the scheduler's CPU/memory load-shedding check is pinned to "available", so a busy CI machine
    cannot stall a workflow (load shedding itself is not under test here).
"""

import os
import sys
import tempfile
import time

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.orchestrator.agent import OrchestratorAgent  # noqa: E402
from agents.orchestrator.job_manager import JobStatus  # noqa: E402

# A goal with none of the router's keywords (qa, test, doc, demo) routes to the full six-agent plan.
FULL_SUITE_GOAL = "Analyze the onboarding flow of an example note-taking app"
FULL_PLAN = ["explorer", "knowledge_graph", "documentation", "qa", "demo", "release"]
OUTPUT_KEY = {
    "explorer": "explorer_output",
    "knowledge_graph": "knowledge_graph_output",
    "documentation": "documentation_output",
    "qa": "qa_output",
    "demo": "demo_output",
    "release": "release_output",
}
TERMINAL = {JobStatus.COMPLETED.value, JobStatus.FAILED.value}
# The offline engine finishes a full workflow in a few seconds; this bounds a hung scheduler.
WORKFLOW_TIMEOUT_S = 30.0


@pytest.fixture
def isolated_env(tmp_path, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("DB_PATH", raising=False)
    artifacts = tmp_path / "artifacts"
    artifacts.mkdir()
    monkeypatch.setattr(tempfile, "tempdir", str(artifacts))
    return tmp_path


def _make_orchestrator(db_path, monkeypatch):
    orch = OrchestratorAgent(db_path=str(db_path))
    monkeypatch.setattr(orch.resource_manager, "is_resource_available", lambda: True)
    return orch


def _shutdown(orch):
    orch.stop()
    thread = orch.scheduler._thread
    if thread is not None:
        thread.join(timeout=5)
        assert not thread.is_alive(), "scheduler thread did not stop"


@pytest.fixture
def db_path(isolated_env):
    return isolated_env / "orchestrator.db"


@pytest.fixture
def orchestrator(db_path, monkeypatch):
    orch = _make_orchestrator(db_path, monkeypatch)
    yield orch
    _shutdown(orch)


def wait_for_terminal(orch, workflow_id, timeout=WORKFLOW_TIMEOUT_S):
    deadline = time.monotonic() + timeout
    status = None
    while time.monotonic() < deadline:
        status = orch.get_workflow_status(workflow_id)
        if status and status["status"] in TERMINAL:
            return status
        time.sleep(0.05)
    pytest.fail(f"workflow {workflow_id} not finished after {timeout}s; last status: {status and status['status']}")


# 1. Startup -------------------------------------------------------------------------------------

def test_startup_initialises_components_and_starts_background_engine(orchestrator, db_path):
    for name in ("router", "planner", "registry", "db", "job_manager", "concurrency",
                 "queue_manager", "resource_manager", "worker_pool", "scheduler"):
        assert getattr(orchestrator, name) is not None, name
    assert orchestrator.scheduler._running is True
    assert orchestrator.scheduler._thread.is_alive()
    assert orchestrator.worker_pool._running is True
    assert len(orchestrator.worker_pool._workers) == 8
    assert db_path.is_file()
    assert orchestrator.db.db_path == str(db_path)


# 2. Submission ----------------------------------------------------------------------------------

def test_submit_returns_workflow_id_and_initial_record(orchestrator):
    wf_id = orchestrator.submit_workflow({"goal": FULL_SUITE_GOAL}, user_id="u-submit", priority=2)

    assert wf_id.startswith("wf-") and len(wf_id) == len("wf-") + 8
    status = orchestrator.get_workflow_status(wf_id)
    assert status["workflow_id"] == wf_id
    assert status["goal"] == FULL_SUITE_GOAL
    assert status["user_id"] == "u-submit"
    assert status["priority"] == 2
    assert status["status"] in {s.value for s in JobStatus} - {JobStatus.FAILED.value, JobStatus.CANCELLED.value}
    assert orchestrator.job_manager.get_workflow(wf_id).plan == FULL_PLAN


def test_router_keywords_select_shorter_plans(orchestrator):
    plans = {
        goal: orchestrator.job_manager.get_workflow(orchestrator.submit_workflow({"goal": goal})).plan
        for goal in ("Run QA on checkout", "Write docs for the API", "Record a demo", FULL_SUITE_GOAL)
    }
    assert plans["Run QA on checkout"] == ["explorer", "knowledge_graph", "qa"]
    assert plans["Write docs for the API"] == ["explorer", "knowledge_graph", "documentation"]
    assert plans["Record a demo"] == ["explorer", "knowledge_graph", "demo"]
    assert plans[FULL_SUITE_GOAL] == FULL_PLAN


# 3. Agent registry ------------------------------------------------------------------------------

def test_registry_holds_exactly_the_six_agents(orchestrator):
    assert sorted(orchestrator.registry.agents) == sorted(FULL_PLAN)
    for name in FULL_PLAN:
        assert orchestrator.registry.get(name) is orchestrator.registry.agents[name]


def test_each_agent_runs_on_its_upstream_outputs(orchestrator, isolated_env):
    """Chain the agents by hand in plan order, the way the scheduler merges outputs into the context."""
    context = {"goal": FULL_SUITE_GOAL}
    for name in FULL_PLAN:
        output = orchestrator.registry.get(name).run(dict(context))
        assert isinstance(output, dict) and list(output) == [OUTPUT_KEY[name]], name
        assert output[OUTPUT_KEY[name]], f"{name} returned an empty result"
        context.update(output)

    explorer = context["explorer_output"]
    assert explorer["entity"]
    assert explorer["key_components"]
    graph = context["knowledge_graph_output"]
    assert any(n["id"] == "root" for n in graph["nodes"])
    node_ids = {n["id"] for n in graph["nodes"]}
    assert all(e["source"] in node_ids and e["target"] in node_ids for e in graph["edges"])
    assert isinstance(context["documentation_output"], str) and context["documentation_output"].strip()
    assert {"total_validations", "passed", "failed", "pass_rate"} <= set(context["qa_output"])

    # Generated files go to the redirected temp dir, never the repository.
    explorer_file = explorer["explorer_video_file"]
    assert os.path.dirname(explorer_file) == str(isolated_env / "artifacts")
    assert os.path.isfile(explorer_file)


# 4. Execution -----------------------------------------------------------------------------------

def test_full_workflow_completes_with_six_completed_tasks_in_plan_order(orchestrator):
    wf_id = orchestrator.submit_workflow({"goal": FULL_SUITE_GOAL}, user_id="u-run")
    status = wait_for_terminal(orchestrator, wf_id)

    assert status["status"] == JobStatus.COMPLETED.value
    tasks = status["tasks"]
    assert [t["agent_name"] for t in tasks] == FULL_PLAN
    for task in tasks:
        assert task["status"] == JobStatus.COMPLETED.value, task["agent_name"]
        assert task["error_msg"] is None, task["agent_name"]
        assert list(task["output_data"]) == [OUTPUT_KEY[task["agent_name"]]]
    # Every agent's output is merged into the workflow context.
    assert set(OUTPUT_KEY.values()) <= set(status["context"])
    assert orchestrator.job_manager.get_workflow(wf_id).current_step_index == len(FULL_PLAN)


def test_downstream_agents_receive_upstream_output(orchestrator, monkeypatch):
    seen = {}
    qa = orchestrator.registry.get("qa")
    real_run = qa.run

    def spy(context):
        seen.update(context)
        return real_run(context)

    monkeypatch.setattr(qa, "run", spy)
    wf_id = orchestrator.submit_workflow({"goal": FULL_SUITE_GOAL})
    assert wait_for_terminal(orchestrator, wf_id)["status"] == JobStatus.COMPLETED.value
    assert seen["goal"] == FULL_SUITE_GOAL
    assert {"explorer_output", "knowledge_graph_output", "documentation_output"} <= set(seen)


# 5. Persistence ---------------------------------------------------------------------------------

def test_completed_workflow_and_tasks_are_persisted(orchestrator):
    wf_id = orchestrator.submit_workflow({"goal": FULL_SUITE_GOAL}, user_id="u-db", priority=3)
    wait_for_terminal(orchestrator, wf_id)

    row = orchestrator.db.get_workflow(wf_id)
    assert row["workflow_id"] == wf_id
    assert row["user_id"] == "u-db"
    assert row["goal"] == FULL_SUITE_GOAL
    assert row["priority"] == 3
    assert row["status"] == JobStatus.COMPLETED.value
    assert row["plan"] == FULL_PLAN
    assert set(OUTPUT_KEY.values()) <= set(row["context"])

    task_rows = orchestrator.db.get_tasks_for_workflow(wf_id)
    assert [t["agent_name"] for t in task_rows] == FULL_PLAN
    assert all(t["workflow_id"] == wf_id and t["status"] == JobStatus.COMPLETED.value for t in task_rows)
    assert all(t["input_data"]["goal"] == FULL_SUITE_GOAL for t in task_rows)


def test_finished_workflow_is_readable_after_restart(db_path, monkeypatch):
    first = _make_orchestrator(db_path, monkeypatch)
    try:
        wf_id = first.submit_workflow({"goal": FULL_SUITE_GOAL})
        wait_for_terminal(first, wf_id)
    finally:
        _shutdown(first)

    second = _make_orchestrator(db_path, monkeypatch)
    try:
        # Not in the new process's memory: served from the database.
        assert second.job_manager.get_workflow(wf_id) is None
        status = second.get_workflow_status(wf_id)
        assert status["status"] == JobStatus.COMPLETED.value
        assert status["goal"] == FULL_SUITE_GOAL
        assert set(OUTPUT_KEY.values()) <= set(status["context"])
    finally:
        _shutdown(second)


# 6. Unknown workflow ----------------------------------------------------------------------------

def test_unknown_workflow_id_returns_none(orchestrator):
    assert orchestrator.get_workflow_status("wf-00000000") is None
    assert orchestrator.db.get_workflow("wf-00000000") is None
    assert orchestrator.db.get_tasks_for_workflow("wf-00000000") == []


# 7. Failure propagation -------------------------------------------------------------------------

def test_agent_exception_fails_the_task_and_the_workflow(orchestrator, monkeypatch):
    def boom(context):
        raise RuntimeError("knowledge graph exploded")

    monkeypatch.setattr(orchestrator.registry.get("knowledge_graph"), "run", boom)
    wf_id = orchestrator.submit_workflow({"goal": FULL_SUITE_GOAL})
    status = wait_for_terminal(orchestrator, wf_id)

    assert status["status"] == JobStatus.FAILED.value
    tasks = status["tasks"]
    # Execution stops at the failing step: nothing after it is scheduled.
    assert [t["agent_name"] for t in tasks] == ["explorer", "knowledge_graph"]
    assert tasks[0]["status"] == JobStatus.COMPLETED.value
    assert tasks[1]["status"] == JobStatus.FAILED.value
    assert "knowledge graph exploded" in tasks[1]["error_msg"]
    assert orchestrator.db.get_workflow(wf_id)["status"] == JobStatus.FAILED.value
    # The failed agent's concurrency slot is released.
    assert orchestrator.concurrency.active_counts["knowledge_graph"] == 0


def test_run_reports_failure_instead_of_success(orchestrator, monkeypatch):
    def boom(context):
        raise RuntimeError("release failed")

    monkeypatch.setattr(orchestrator.registry.get("release"), "run", boom)
    result = orchestrator.run({"goal": FULL_SUITE_GOAL}, timeout=WORKFLOW_TIMEOUT_S)
    assert result["status"] == JobStatus.FAILED.value
    assert result["tasks"][-1]["agent_name"] == "release"
    assert result["tasks"][-1]["status"] == JobStatus.FAILED.value


# 8. Isolation -----------------------------------------------------------------------------------

def test_each_orchestrator_uses_only_its_own_database(isolated_env, monkeypatch):
    a = _make_orchestrator(isolated_env / "a.db", monkeypatch)
    try:
        wf_a = a.submit_workflow({"goal": FULL_SUITE_GOAL})
        wait_for_terminal(a, wf_a)
    finally:
        _shutdown(a)

    b = _make_orchestrator(isolated_env / "b.db", monkeypatch)
    try:
        assert b.get_workflow_status(wf_a) is None
        assert b.job_manager.get_all_jobs_summary()["workflows"]["total"] == 0
    finally:
        _shutdown(b)


def test_fresh_database_starts_with_no_recovered_work(orchestrator):
    summary = orchestrator.job_manager.get_all_jobs_summary()
    assert summary["workflows"]["total"] == 0
    assert summary["tasks"]["total"] == 0
    assert orchestrator.db.get_active_workflows() == []

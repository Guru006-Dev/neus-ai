"""
Overload-protection tests for the orchestrator: per-agent concurrency limits, priority
scheduling, queue isolation between agents, error isolation and restart recovery.

Semantics under test, as implemented in backend/agents/orchestrator:
  - ConcurrencyController: at most `limit` tasks of one agent run at the same time; the
    scheduler only dispatches while a slot is free, and a finished task releases its slot.
  - QueueManager: the sort key is 100 - priority, so a higher priority number runs first;
    equal priorities run in creation order (created_at).

Each test runs a real OrchestratorAgent on a database in its own temporary directory; agent
HTML output goes there too, GEMINI_API_KEY is removed (offline fallback) and the scheduler's
CPU/memory load-shedding check is pinned to "available" so a busy machine cannot stall a run.
"""

import os
import sys
import tempfile
import threading
import time
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.orchestrator.agent import OrchestratorAgent  # noqa: E402
from agents.orchestrator.job_manager import JobStatus, Task, Workflow  # noqa: E402
from agents.orchestrator.queues import QueueManager  # noqa: E402
from agents.orchestrator.registry import BaseAgent  # noqa: E402

TIMEOUT_S = 15.0
TERMINAL = (JobStatus.COMPLETED.value, JobStatus.FAILED.value)


class FailingAgent(BaseAgent):
    def __init__(self):
        super().__init__("FailingAgent", execution_time=0.01)

    def run(self, context: dict) -> dict:
        raise RuntimeError("Simulated agent execution error!")


class InstrumentedAgent(BaseAgent):
    """Records how many of its runs overlap and the order in which runs start.

    With `gate` set, every run blocks until the gate opens, so tasks can be queued behind it.
    """

    def __init__(self, hold_s: float = 0.0, gate: threading.Event = None):
        super().__init__("Instrumented", execution_time=0)
        self.hold_s = hold_s
        self.gate = gate
        self._lock = threading.Lock()
        self.active = 0
        self.max_active = 0
        self.started = []

    def run(self, context: dict) -> dict:
        with self._lock:
            self.active += 1
            self.max_active = max(self.max_active, self.active)
            self.started.append(context["goal"])
        try:
            if self.gate is not None:
                self.gate.wait(TIMEOUT_S)
            time.sleep(self.hold_s)
        finally:
            with self._lock:
                self.active -= 1
        return {"instrumented_output": context["goal"]}


class TestOverloadProtectionComprehensive(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self._tmp.name, "orchestrator.db")
        artifacts = os.path.join(self._tmp.name, "artifacts")
        os.mkdir(artifacts)
        self._saved_tempdir = tempfile.tempdir
        tempfile.tempdir = artifacts
        self._saved_key = os.environ.pop("GEMINI_API_KEY", None)
        self.orchestrators = []
        self.orchestrator = self.start_orchestrator(custom_limits={"demo": 1, "qa": 2, "explorer": 5})

    def tearDown(self):
        for orch in self.orchestrators:
            orch.stop()
        for orch in self.orchestrators:
            if orch.scheduler._thread is not None:
                orch.scheduler._thread.join(timeout=5)
        tempfile.tempdir = self._saved_tempdir
        if self._saved_key is not None:
            os.environ["GEMINI_API_KEY"] = self._saved_key
        # Agent threads that are still unwinding may hold the database briefly on Windows.
        _retry_cleanup(self._tmp)

    def start_orchestrator(self, custom_limits):
        orch = OrchestratorAgent(db_path=self.db_path, custom_limits=custom_limits)
        orch.resource_manager.is_resource_available = lambda: True
        self.orchestrators.append(orch)
        return orch

    def add_agent(self, name, agent, limit):
        self.orchestrator.registry.register(name, agent)
        self.orchestrator.concurrency.set_limit(name, limit)

    def submit_plan(self, plan, goal, priority=1):
        """Queue a workflow with an explicit plan, as the scheduler would for a routed request."""
        wf = self.orchestrator.job_manager.create_workflow(user_id="tester", goal=goal, plan=plan, priority=priority)
        self.orchestrator.queue_manager.enqueue_workflow(wf)
        return wf.workflow_id

    def wait_terminal(self, wf_ids, orch=None):
        orch = orch or self.orchestrator
        deadline = time.monotonic() + TIMEOUT_S
        statuses = {}
        while time.monotonic() < deadline:
            statuses = {w: (orch.get_workflow_status(w) or {}).get("status") for w in wf_ids}
            if all(s in TERMINAL for s in statuses.values()):
                return statuses
            time.sleep(0.02)
        self.fail(f"workflows not finished within {TIMEOUT_S}s: {statuses}")

    def wait_until(self, predicate, what):
        deadline = time.monotonic() + TIMEOUT_S
        while time.monotonic() < deadline:
            if predicate():
                return
            time.sleep(0.01)
        self.fail(f"timed out waiting for {what}")

    def test_01_concurrency_limit_and_queuing(self):
        """No more than `limit` tasks of one agent run at once; the rest queue and then all complete."""
        self.assertEqual(self.orchestrator.concurrency.limits["demo"], 1)
        self.assertEqual(self.orchestrator.concurrency.limits["qa"], 2)

        agent = InstrumentedAgent(hold_s=0.15)
        self.add_agent("limited", agent, limit=2)
        wf_ids = [self.submit_plan(["limited"], goal=f"job-{i}") for i in range(6)]

        statuses = self.wait_terminal(wf_ids)
        self.assertEqual(set(statuses.values()), {JobStatus.COMPLETED.value})
        self.assertEqual(agent.max_active, 2, "the limit must be reached and never exceeded")
        self.assertEqual(len(agent.started), 6)
        self.assertEqual(self.orchestrator.concurrency.active_counts["limited"], 0, "all slots released")

    def test_01b_limit_of_one_runs_tasks_strictly_one_at_a_time(self):
        agent = InstrumentedAgent(hold_s=0.08)
        self.add_agent("serial", agent, limit=1)
        wf_ids = [self.submit_plan(["serial"], goal=f"job-{i}") for i in range(4)]

        statuses = self.wait_terminal(wf_ids)
        self.assertEqual(set(statuses.values()), {JobStatus.COMPLETED.value})
        self.assertEqual(agent.max_active, 1)

    def test_02_priority_scheduling(self):
        """Tasks waiting for a busy agent start in priority order (higher number first)."""
        gate = threading.Event()
        agent = InstrumentedAgent(gate=gate)
        self.add_agent("gated", agent, limit=1)

        blocker = self.submit_plan(["gated"], goal="blocker", priority=5)
        self.wait_until(lambda: agent.active == 1, "the blocker to occupy the only slot")
        queued = [
            self.submit_plan(["gated"], goal="low", priority=1),
            self.submit_plan(["gated"], goal="high", priority=10),
            self.submit_plan(["gated"], goal="mid", priority=5),
        ]
        self.wait_until(
            lambda: self.orchestrator.queue_manager.get_queue_lengths().get("agent_gated") == 3,
            "all three tasks to be queued behind the blocker",
        )
        gate.set()

        statuses = self.wait_terminal([blocker] + queued)
        self.assertEqual(set(statuses.values()), {JobStatus.COMPLETED.value})
        self.assertEqual(agent.started, ["blocker", "high", "mid", "low"])

    def test_02b_queue_orders_by_priority_then_creation_time(self):
        qm = QueueManager()
        for i, (prio, created) in enumerate([(1, 1.0), (10, 3.0), (5, 2.0), (10, 2.5), (5, 1.5)]):
            qm.enqueue_workflow(Workflow(workflow_id=f"wf-{i}", user_id="u", goal="g", plan=[], priority=prio, created_at=created))
            qm.enqueue_task(Task(task_id=f"t-{i}", workflow_id=f"wf-{i}", agent_name="a", priority=prio, created_at=created))

        workflows = []
        while (wf := qm.dequeue_workflow()) is not None:
            workflows.append(wf.workflow_id)
        tasks = []
        while (t := qm.dequeue_task("a")) is not None:
            tasks.append(t.task_id)

        self.assertEqual(workflows, ["wf-3", "wf-1", "wf-4", "wf-2", "wf-0"])
        self.assertEqual(tasks, ["t-3", "t-1", "t-4", "t-2", "t-0"])

    def test_03_non_blocking_multi_tenant_queues(self):
        """A saturated agent does not hold up work queued for a different agent."""
        gate = threading.Event()
        busy = InstrumentedAgent(gate=gate)
        free = InstrumentedAgent()
        self.add_agent("busy", busy, limit=1)
        self.add_agent("free", free, limit=1)
        try:
            blocked = [self.submit_plan(["busy"], goal=f"busy-{i}") for i in range(2)]
            self.wait_until(lambda: busy.active == 1, "the busy agent's slot to fill")
            independent = self.submit_plan(["free"], goal="independent")

            self.assertEqual(self.wait_terminal([independent])[independent], JobStatus.COMPLETED.value)
            self.assertEqual(busy.active, 1, "the busy agent must still be held while the other agent finished")
            for wf in blocked:
                self.assertNotIn(self.orchestrator.get_workflow_status(wf)["status"], TERMINAL)
        finally:
            gate.set()
        self.assertEqual(set(self.wait_terminal(blocked).values()), {JobStatus.COMPLETED.value})

    def test_04_error_isolation(self):
        """A failing task fails its workflow, frees its slot and leaves a concurrent workflow unaffected."""
        self.add_agent("failing", FailingAgent(), limit=5)
        wf_fail = self.submit_plan(["explorer", "failing"], goal="Test failure handling")
        wf_normal = self.orchestrator.submit_workflow({"goal": "Run QA tests"}, user_id="UserNormal")

        statuses = self.wait_terminal([wf_fail, wf_normal])
        self.assertEqual(statuses[wf_fail], JobStatus.FAILED.value)
        self.assertEqual(statuses[wf_normal], JobStatus.COMPLETED.value)

        tasks = self.orchestrator.get_workflow_status(wf_fail)["tasks"]
        self.assertEqual([t["agent_name"] for t in tasks], ["explorer", "failing"])
        self.assertEqual(tasks[1]["status"], JobStatus.FAILED.value)
        self.assertIn("Simulated agent execution error!", tasks[1]["error_msg"])
        self.assertEqual(self.orchestrator.concurrency.active_counts["failing"], 0)

    def test_05_server_restart_recovery(self):
        """A workflow interrupted mid-run is reloaded from the database and completed after a restart.

        The first step's agent has no concurrency slot in the first process, so the workflow is left
        RUNNING with that task queued when the process stops: the interrupted state, without a task
        thread that a real restart would have killed.
        """
        self.orchestrator.registry.register("pending", InstrumentedAgent())
        wf_id = self.submit_plan(["pending", "qa"], goal="Recover after restart")
        self.wait_until(
            lambda: self.orchestrator.queue_manager.get_queue_lengths().get("agent_pending") == 1,
            "the first task to be queued",
        )
        self.orchestrator.stop()
        self.orchestrator.scheduler._thread.join(timeout=5)
        self.assertEqual(self.orchestrator.db.get_workflow(wf_id)["status"], JobStatus.RUNNING.value)
        self.assertEqual([t["status"] for t in self.orchestrator.db.get_tasks_for_workflow(wf_id)], [JobStatus.QUEUED.value])

        restarted = self.start_orchestrator(custom_limits={"demo": 1})
        recovered_agent = InstrumentedAgent()
        restarted.registry.register("pending", recovered_agent)
        restarted.concurrency.set_limit("pending", 1)

        status = self.wait_terminal([wf_id], orch=restarted)[wf_id]
        self.assertEqual(status, JobStatus.COMPLETED.value)
        self.assertEqual(recovered_agent.started, ["Recover after restart"])
        # The in-memory status is set just before the row is written, so poll the database.
        self.wait_until(
            lambda: restarted.db.get_workflow(wf_id)["status"] == JobStatus.COMPLETED.value,
            "the completed status to be persisted",
        )
        self.assertIn("qa_output", restarted.db.get_workflow(wf_id)["context"])


def _retry_cleanup(tmp):
    for _ in range(20):
        try:
            tmp.cleanup()
            return True
        except OSError:
            time.sleep(0.05)
    return False


if __name__ == "__main__":
    unittest.main()

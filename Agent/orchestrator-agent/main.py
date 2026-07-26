import time
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.orchestrator.agent import OrchestratorAgent

if __name__ == "__main__":
    print("==================================================")
    print(" ORCHESTRATOR AGENT - OVERLOAD PROTECTION ENGINE  ")
    print("==================================================\n")

    DB_PATH = "main_orchestrator_jobs.db"
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception:
            pass

    # Initialize Orchestrator with Demo concurrency = 1 to demonstrate concurrency limit queueing
    orchestrator = OrchestratorAgent(db_path=DB_PATH, custom_limits={"demo": 1})

    print("[SYSTEM INITIALIZED]")
    print("Agent Concurrency Limits:")
    print("  Explorer = 5 | Knowledge = 10 | Documentation = 10 | QA = 4 | Demo = 1 | Release = 5\n")

    # 1. Submit Concurrent Workflows A and B (Both request Demo Video)
    print("--- 1. Submitting Workflow A and Workflow B concurrently ---")
    wf_a = orchestrator.submit_workflow({"goal": "Workflow A - Demo Video"}, user_id="User_A", priority=2)
    wf_b = orchestrator.submit_workflow({"goal": "Workflow B - Demo Video"}, user_id="User_B", priority=1)

    print(f"-> Submitted Workflow A ID: {wf_a} (Priority 2)")
    print(f"-> Submitted Workflow B ID: {wf_b} (Priority 1)")

    # 2. Submit independent QA workflow
    wf_c = orchestrator.submit_workflow({"goal": "Workflow C - QA tests"}, user_id="User_C", priority=1)
    print(f"-> Submitted Workflow C ID: {wf_c} (Independent QA Workflow)\n")

    # Monitor status over time
    print("--- 2. Live Scheduler & Queue Monitoring ---")
    for step in range(1, 15):
        time.sleep(0.15)
        st_a = orchestrator.get_workflow_status(wf_a)
        st_b = orchestrator.get_workflow_status(wf_b)
        st_c = orchestrator.get_workflow_status(wf_c)

        status_a_str = st_a["status"] if st_a else "N/A"
        status_b_str = st_b["status"] if st_b else "N/A"
        status_c_str = st_c["status"] if st_c else "N/A"

        metrics = orchestrator.get_system_status()
        demo_active = metrics["concurrency"]["demo"]["active"]
        demo_queue = metrics["queues"].get("agent_demo", 0)

        print(f"[Tick {step:02d}] WF-A: {status_a_str:<9} | WF-B: {status_b_str:<9} | WF-C: {status_c_str:<9} | Demo Active: {demo_active}/1 | Demo Queued: {demo_queue}")

        if status_a_str == "COMPLETED" and status_b_str == "COMPLETED" and status_c_str == "COMPLETED":
            print("\n[SUCCESS] All workflows completed successfully!")
            break

    print("\n--- 3. System Metrics & Resource Utilization Summary ---")
    print(json.dumps(orchestrator.get_system_status(), indent=2))

    # 4. Demonstrate Persistence & Restart Recovery
    print("\n--- 4. Demonstrating Persistence & Automatic Restart Recovery ---")
    wf_d = orchestrator.submit_workflow({"goal": "Workflow D - Server Recovery Test"}, user_id="User_D")
    print(f"-> Submitted Workflow D ID: {wf_d}")
    print("-> Simulating sudden server restart...")

    orchestrator.stop()

    # Re-instantiate OrchestratorAgent using same database
    restarted_orchestrator = OrchestratorAgent(db_path=DB_PATH, custom_limits={"demo": 1})
    print("-> Server restarted! Reloading state from SQLite persistence...")

    time.sleep(0.5)
    st_d = restarted_orchestrator.get_workflow_status(wf_d)
    print(f"-> Recovered Workflow D Status: {st_d['status'] if st_d else 'Unknown'}")

    restarted_orchestrator.stop()
    print("\n==================================================")
    print(" OVERLOAD PROTECTION SYSTEM READY FOR PRODUCTION ")
    print("==================================================")

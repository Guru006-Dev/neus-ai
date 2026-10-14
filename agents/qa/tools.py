import json
import asyncio
import os
import sys
from pathlib import Path

# Add agent directory to path for imports
agent_dir = os.path.join(os.path.dirname(__file__), "agent")
sys.path.insert(0, agent_dir)

from agents.qa.agent import QAAgent


def qa_run_tests(target_app: str, test_types: str = "smoke,regression") -> str:
    """
    Execute QAAgent to run tests against the target application.

    Args:
        target_app: Name of the target application (e.g., "test_app")
        test_types: Comma-separated test types to run (e.g., "smoke,regression")

    Returns:
        JSON string containing test results and coverage information
    """
    try:
        # Construct graph path based on target_app
        agent_dir_path = os.path.dirname(__file__)
        graph_path = os.path.join(agent_dir_path, "agent", f"{target_app}_graph.json")

        # Verify graph file exists
        if not os.path.exists(graph_path):
            return json.dumps({
                "status": "ERROR",
                "error": f"Graph file not found: {graph_path}",
                "target_app": target_app,
                "tests_executed": 0,
                "passed": 0,
                "failed": 0,
                "coverage": "0%"
            })

        # Initialize and run QAAgent
        agent = QAAgent(graph_path)
        results, coverage = agent.run()

        # Convert results to JSON-serializable format
        test_results = []
        for result in results.results:
            test_results.append({
                "test_case_id": result.test_case_id,
                "status": result.status.value,
                "logs": result.logs,
                "error_message": result.error_message,
                "execution_time_ms": result.execution_time_ms,
                "artifacts": result.artifacts
            })

        # Build response with actual test results
        response = {
            "status": "PASSED" if results.total_failed == 0 else "FAILED",
            "target_app": target_app,
            "test_types": test_types,
            "tests_executed": len(results.results),
            "passed": results.total_passed,
            "failed": results.total_failed,
            "skipped": results.total_skipped,
            "coverage": f"{coverage.coverage_percentage}%",
            "coverage_percentage": coverage.coverage_percentage,
            "entities_covered": coverage.entities_covered,
            "entities_missed": coverage.entities_missed,
            "results": test_results
        }

        return json.dumps(response, indent=2)

    except Exception as e:
        # Return error response with proper error handling
        return json.dumps({
            "status": "ERROR",
            "error": str(e),
            "target_app": target_app,
            "tests_executed": 0,
            "passed": 0,
            "failed": 0,
            "coverage": "0%"
        })

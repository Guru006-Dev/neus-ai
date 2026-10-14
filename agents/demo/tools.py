import json
import asyncio
import sys
import os
from typing import Dict, Any

# Add agent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'agent'))

from democriticIntelligence.agents.demo.agent import DemoAgent


def demo_create_video_workflow(workflow_title: str, app_name: str = "Amazon", render_3d: bool = True) -> str:
    """Execute DemoAgent functionality to create a video workflow.

    Args:
        workflow_title: Title of the workflow to process
        app_name: Application name (default: "Amazon")
        render_3d: Whether to render 3D elements (default: True)

    Returns:
        JSON string with workflow results and status
    """
    try:
        # Create context dictionary with the provided parameters
        context = {
            "workflow_title": workflow_title,
            "app_name": app_name,
            "render_3d": render_3d
        }

        # Initialize the DemoAgent
        agent = DemoAgent()

        # Store context in agent for use by components
        agent.context = context
        agent.workflow_title = workflow_title
        agent.app_name = app_name
        agent.render_3d = render_3d

        # Execute the agent pipeline
        print(f"[tools] Starting DemoAgent pipeline for workflow: {workflow_title} (app: {app_name}, render_3d: {render_3d})")
        success = agent.run_pipeline()

        # Prepare the response
        result = {
            "agent": "demo-agent",
            "workflow_title": workflow_title,
            "app_name": app_name,
            "render_3d": render_3d,
            "status": "COMPLETED" if success else "FAILED",
            "success": success,
            "context": context
        }

        print(f"[tools] DemoAgent pipeline completed with status: {result['status']}")
        return json.dumps(result)

    except Exception as e:
        # Handle any errors and return error response
        error_result = {
            "agent": "demo-agent",
            "workflow_title": workflow_title,
            "app_name": app_name,
            "render_3d": render_3d,
            "status": "ERROR",
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }
        print(f"[tools] DemoAgent error: {type(e).__name__}: {str(e)}")
        return json.dumps(error_result)

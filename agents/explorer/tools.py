import json
import asyncio
import logging
import sys
from pathlib import Path
from typing import Optional

# The Explorer package imports itself as `agents.explorer.*`, rooted at ./agent.
agent_dir = Path(__file__).resolve().parent / "agent"
if str(agent_dir) not in sys.path:
    sys.path.insert(0, str(agent_dir))

from agents.explorer.agent import ExplorerAgent
from agents.explorer.config import ExplorerConfig
from agents.explorer.exceptions import ExplorerException

logger = logging.getLogger(__name__)


async def explorer_record_session(target_url: str, headless: bool = True) -> str:
    """Execute ExplorerAgent to explore a target URL and record the session.

    Args:
        target_url: The URL of the web application to explore
        headless: Whether to run the browser in headless mode (default: True)

    Returns:
        JSON string containing the exploration results from ExplorationResult

    Raises:
        ExplorerException: If the exploration run fails
    """
    try:
        # Create configuration with provided parameters
        config = ExplorerConfig(
            target_url=target_url,
            headless=headless
        )

        # Initialize the Explorer Agent with the config
        agent = ExplorerAgent(config)

        # Execute the exploration
        logger.info(f"Starting exploration of {target_url} (headless={headless})")
        result = await agent.explore(target_url=target_url)

        # Serialize the ExplorationResult to JSON
        result_json = result.model_dump_json(indent=2)
        logger.info(f"Exploration completed successfully for {target_url}")

        return result_json

    except ExplorerException as e:
        logger.error(f"Explorer exception during exploration: {e}")
        error_response = {
            "error": "exploration_failed",
            "message": str(e),
            "target_url": target_url,
            "status": "FAILED"
        }
        return json.dumps(error_response)
    except Exception as e:
        logger.error(f"Unexpected error during exploration: {e}", exc_info=True)
        error_response = {
            "error": "unexpected_error",
            "message": str(e),
            "target_url": target_url,
            "status": "FAILED"
        }
        return json.dumps(error_response)

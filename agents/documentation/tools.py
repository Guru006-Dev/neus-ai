import json
import logging
import sys
from pathlib import Path

# Add agent directory to Python path for imports
agent_dir = Path(__file__).parent / "agent" / "documentation_agent"
if str(agent_dir) not in sys.path:
    sys.path.insert(0, str(agent_dir))

try:
    from agent import DocumentationAgent
    from config import Settings
    from models import GeneratedDocuments, ProductKnowledgeGraph
except ImportError as e:
    logging.error(f"Failed to import agent components: {e}")
    raise

logger = logging.getLogger(__name__)


async def docs_publish_documentation(title: str, category: str = "guide") -> str:
    """
    Execute DocumentationAgent functionality.

    Args:
        title: Title for the documentation
        category: Type of document to generate ("guide", "faq", or "release-notes")

    Returns:
        JSON string containing the agent results

    Raises:
        ValueError: If an unsupported category is provided
        RuntimeError: If agent execution fails
    """
    try:
        # Initialize settings from environment
        settings = Settings()
        logger.info(f"Initialized DocumentationAgent settings")

        # Create agent instance
        agent = DocumentationAgent(settings)
        logger.info("Created DocumentationAgent instance")

        # Create minimal ProductKnowledgeGraph with title
        graph = ProductKnowledgeGraph(
            version="unreleased"
        )

        # Awaited, not asyncio.run(): the MCP server already runs an event loop.
        result = await _generate_documentation(agent, graph, category, title)

        return json.dumps({
            "status": "PUBLISHED",
            "title": title,
            "category": category,
            "result": result
        })

    except ValueError as e:
        error_msg = f"Invalid category: {e}"
        logger.error(error_msg)
        return json.dumps({
            "status": "ERROR",
            "title": title,
            "category": category,
            "error": error_msg
        })

    except RuntimeError as e:
        error_msg = f"Agent execution failed: {e}"
        logger.error(error_msg)
        return json.dumps({
            "status": "ERROR",
            "title": title,
            "category": category,
            "error": error_msg
        })

    except Exception as e:
        error_msg = f"Unexpected error during documentation generation: {e}"
        logger.error(error_msg, exc_info=True)
        return json.dumps({
            "status": "ERROR",
            "title": title,
            "category": category,
            "error": error_msg
        })


async def _generate_documentation(
    agent: DocumentationAgent,
    graph: ProductKnowledgeGraph,
    category: str,
    title: str
) -> dict:
    """
    Generate documentation based on category.

    Args:
        agent: DocumentationAgent instance
        graph: ProductKnowledgeGraph to generate from
        category: Type of document ("guide", "faq", or "release-notes")
        title: Title for the documentation

    Returns:
        Dictionary containing generation results

    Raises:
        ValueError: If category is not supported
    """
    if category == "guide":
        markdown = await agent.generate_user_guide(graph)
        return {
            "type": "user_guide",
            "title": title,
            "markdown_preview": markdown[:500] + "..." if len(markdown) > 500 else markdown,
            "length": len(markdown)
        }
    elif category == "faq":
        markdown = await agent.generate_faq(graph)
        return {
            "type": "faq",
            "title": title,
            "markdown_preview": markdown[:500] + "..." if len(markdown) > 500 else markdown,
            "length": len(markdown)
        }
    elif category == "release-notes":
        markdown = await agent.generate_release_notes(graph)
        return {
            "type": "release_notes",
            "title": title,
            "markdown_preview": markdown[:500] + "..." if len(markdown) > 500 else markdown,
            "length": len(markdown)
        }
    else:
        raise ValueError(
            f"Unsupported category: {category}. "
            f"Must be one of: 'guide', 'faq', 'release-notes'"
        )

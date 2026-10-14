import json
import sys
from pathlib import Path
from typing import Dict, Any

# The Release Intelligence package imports itself as `agents.release_intelligence.*`, rooted at ./agent.
agent_dir = Path(__file__).resolve().parent / "agent"
if str(agent_dir) not in sys.path:
    sys.path.insert(0, str(agent_dir))

from agents.release_intelligence.agent import ReleaseIntelligenceAgent
from agents.release_intelligence.models.knowledge_graph import KnowledgeGraphVersion, PageNode


def _create_version_for_release(
    base_version: str,
    new_version: str,
    release_type: str
) -> tuple[KnowledgeGraphVersion, KnowledgeGraphVersion]:
    """Create old and new KnowledgeGraphVersion objects for release comparison.

    Args:
        base_version: The previous version identifier
        new_version: The new version identifier
        release_type: Type of release ('major', 'minor', 'patch')

    Returns:
        Tuple of (old_version, new_version) KnowledgeGraphVersion objects
    """
    # Create base version with minimal structure
    old_graph = KnowledgeGraphVersion(
        version_id=base_version,
        pages=[
            PageNode(id="p1", title="Dashboard", url_path="/dashboard"),
            PageNode(id="p2", title="Settings", url_path="/settings"),
        ]
    )

    # Create new version with changes based on release type
    new_pages = [
        PageNode(id="p1", title="Dashboard", url_path="/dashboard"),
        PageNode(id="p2", title="Settings", url_path="/settings"),
    ]

    if release_type == "major":
        # Major: significant architectural changes
        new_pages.extend([
            PageNode(id="p3", title="Analytics", url_path="/analytics"),
            PageNode(id="p4", title="Reports", url_path="/reports"),
            PageNode(id="p5", title="Integration Hub", url_path="/integrations"),
        ])
    elif release_type == "minor":
        # Minor: new features
        new_pages.extend([
            PageNode(id="p3", title="Reports", url_path="/reports"),
            PageNode(id="p4", title="Templates", url_path="/templates"),
        ])
    elif release_type == "patch":
        # Patch: bug fixes, only modify existing page
        new_pages[0] = PageNode(
            id="p1",
            title="Dashboard (Enhanced)",
            url_path="/dashboard",
            description="Improved dashboard performance and UI"
        )

    new_graph = KnowledgeGraphVersion(
        version_id=new_version,
        pages=new_pages
    )

    return old_graph, new_graph


async def release_generate_notes(version: str, release_type: str = "minor") -> str:
    """Generate release notes by orchestrating ReleaseIntelligenceAgent.

    Args:
        version: Target version identifier (e.g., "1.1.0", "2.0.0")
        release_type: Type of release - 'major', 'minor', or 'patch' (default: 'minor')

    Returns:
        JSON string containing generated release notes with metadata

    Raises:
        ValueError: If version or release_type are invalid
        ReleaseIntelligenceError: If the agent pipeline fails
    """
    try:
        # Validate inputs
        if not version or not isinstance(version, str):
            raise ValueError(f"Invalid version: {version}")

        if release_type not in ("major", "minor", "patch"):
            raise ValueError(f"Invalid release_type: {release_type}. Must be 'major', 'minor', or 'patch'")

        # Determine base version (simple semantic versioning decrement)
        version_parts = version.split(".")
        if len(version_parts) != 3:
            raise ValueError(f"Version must follow semver format (e.g., 1.0.0), got: {version}")

        try:
            major, minor, patch = map(int, version_parts)
        except ValueError:
            raise ValueError(f"Version parts must be integers, got: {version}")

        # Calculate base version based on release type
        if release_type == "major":
            base_version = f"{major - 1}.0.0"
        elif release_type == "minor":
            base_version = f"{major}.{minor - 1 if minor > 0 else 0}.0"
        else:  # patch
            base_version = f"{major}.{minor}.{patch - 1 if patch > 0 else 0}"

        # Create version graph objects
        old_graph, new_graph = _create_version_for_release(base_version, version, release_type)

        # Initialize and run the Release Intelligence Agent
        agent = ReleaseIntelligenceAgent()
        # Awaited, not asyncio.run(): the MCP server already runs an event loop.
        result = await agent.run(old_graph, new_graph)

        # Extract release notes
        release_notes = result.release_notes

        # Format output as JSON with all release note variants
        output: Dict[str, Any] = {
            "version": version,
            "release_type": release_type,
            "release_id": result.release_id,
            "status": "SUCCESS",
            "old_version": result.old_version_id,
            "new_version": result.new_version_id,
            "total_changes": result.release_summary.total_changes,
            "release_notes": {
                "customer": {
                    "title": release_notes.customer_notes.title,
                    "summary": release_notes.customer_notes.summary,
                    "markdown": release_notes.customer_notes.raw_markdown,
                },
                "internal_engineering": {
                    "title": release_notes.internal_engineering_notes.title,
                    "summary": release_notes.internal_engineering_notes.summary,
                    "markdown": release_notes.internal_engineering_notes.raw_markdown,
                },
                "executive": {
                    "title": release_notes.executive_summary_notes.title,
                    "summary": release_notes.executive_summary_notes.summary,
                    "markdown": release_notes.executive_summary_notes.raw_markdown,
                },
                "technical": {
                    "title": release_notes.technical_notes.title,
                    "summary": release_notes.technical_notes.summary,
                    "markdown": release_notes.technical_notes.raw_markdown,
                },
            },
            "executive_overview": result.release_summary.executive_overview,
        }

        return json.dumps(output, indent=2)

    except Exception as e:
        # Return error response in consistent format
        error_response: Dict[str, Any] = {
            "version": version,
            "release_type": release_type,
            "status": "ERROR",
            "error": str(e),
        }
        return json.dumps(error_response, indent=2)

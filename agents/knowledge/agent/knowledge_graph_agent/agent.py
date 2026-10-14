"""KnowledgeGraphAgent implementation with Gemini API integration.

Provides a standalone agent for querying and building semantic knowledge graphs.
Includes fallback functionality for graceful degradation when API is unavailable.
"""

import time
import os
import json
import re
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GEMINI LLM CLIENT — Lightweight API client using urllib
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class GeminiClient:
    """Lightweight Gemini API client using urllib (no extra dependencies).

    Falls back gracefully if no API key is set. Uses urllib to avoid dependency bloat.
    """

    API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

    def __init__(self):
        """Initialize client with API key from environment."""
        self.api_key = os.environ.get("GEMINI_API_KEY", "")

    @property
    def available(self) -> bool:
        """Check if API key is configured."""
        return bool(self.api_key)

    def generate(
        self, prompt: str, max_tokens: int = 8192, temperature: float = 0.7
    ) -> str:
        """Call Gemini API and return text response.

        Args:
            prompt: The input prompt to send to Gemini
            max_tokens: Maximum output tokens (default: 8192)
            temperature: Sampling temperature (default: 0.7)

        Returns:
            API response text, or empty string on failure
        """
        if not self.available:
            return ""
        try:
            url = f"{self.API_URL}?key={self.api_key}"
            payload = json.dumps(
                {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens,
                    },
                }
            ).encode("utf-8")

            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
        except Exception as e:
            print(f"  [GeminiClient] API call failed: {e}")
        return ""

    def generate_json(self, prompt: str, fallback: Optional[Dict] = None) -> Dict:
        """Generate and parse JSON from Gemini.

        Args:
            prompt: The input prompt (JSON output will be requested)
            fallback: Fallback dict if API fails or JSON parsing fails

        Returns:
            Parsed JSON response or fallback dict
        """
        full_prompt = (
            prompt
            + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown fences, no explanation."
        )
        raw = self.generate(full_prompt, temperature=0.4)
        if not raw:
            return fallback or {}
        try:
            # Strip markdown code fences if present
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned.strip())
            return json.loads(cleaned)
        except json.JSONDecodeError:
            print(f"  [GeminiClient] JSON parse failed, using fallback")
            return fallback or {}


# Global shared client
_gemini = GeminiClient()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BASE AGENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class BaseAgent:
    """Base class for all agents.

    Provides common functionality like LLM access, topic extraction, and utilities.
    """

    def __init__(self, name: str, execution_time: float = 0.1):
        """Initialize agent.

        Args:
            name: Agent name for logging
            execution_time: Artificial execution time for testing (default: 0.1s)
        """
        self.name = name
        self.execution_time = execution_time
        self.llm = _gemini

    def _extract_topic(self, context: Dict[str, Any]) -> str:
        """Extract topic/goal from context.

        Tries multiple keys: 'query', 'goal', 'topic'
        """
        for key in ["query", "goal", "topic"]:
            if key in context:
                return context[key]
        return "Unknown Topic"

    def _make_slug(self, topic: str) -> str:
        """Convert topic to filename-safe slug."""
        return re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")[:40]

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Run the agent.

        Args:
            context: Input context dict with parameters

        Returns:
            Output dict with results
        """
        print(f"  [{self.name}] Started processing...")
        time.sleep(self.execution_time)
        print(f"  [{self.name}] Completed processing.")
        return {}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# KNOWLEDGE GRAPH AGENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class KnowledgeGraphAgent(BaseAgent):
    """Agent for building and querying semantic knowledge graphs.

    Takes a query or topic and returns:
    - nodes: List of entities/concepts with metadata
    - edges: List of relationships between nodes
    - insights: Semantic insights derived from the graph
    - graph_density: Metric measuring relationship density
    """

    def __init__(self):
        """Initialize KnowledgeGraphAgent."""
        super().__init__("KnowledgeGraphAgent", execution_time=0.2)

    def _fallback_simple_graph(self, query: str) -> Dict[str, Any]:
        """Generate a simple fallback knowledge graph from query.

        Breaks down the query into components and builds a basic graph structure.
        """
        # Split query into words for basic entity extraction
        words = [w for w in query.split() if len(w) > 3]
        entities = list(set([w.capitalize() for w in words[:6]])) or [query.title()]

        # Create root node for the query
        nodes = [{"id": "root", "label": query.title(), "type": "Query"}]

        # Add entity nodes
        edges = []
        for i, entity in enumerate(entities):
            node_id = f"entity_{i}"
            nodes.append({"id": node_id, "label": entity, "type": "Entity"})
            edges.append({"source": "root", "target": node_id, "relation": "INCLUDES"})

        # Add cross-relationships between entities for richness
        for i in range(len(entities) - 1):
            edges.append(
                {
                    "source": f"entity_{i}",
                    "target": f"entity_{i+1}",
                    "relation": "RELATED_TO",
                }
            )

        graph_density = len(edges) / max(len(nodes), 1)

        return {
            "nodes": nodes,
            "edges": edges,
            "graph_density": f"{graph_density:.2f}",
            "insights": [
                f"Query identifies {len(entities)} key entities",
                f"Graph shows {len(edges)} relationships",
                f"Graph density: {graph_density:.2f}",
            ],
        }

    def _fallback_structured_graph(
        self, query: str, explorer_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate a more structured fallback graph using explorer data if available.

        If explorer_output is provided in context, uses that to build a richer graph.
        """
        if explorer_data is None:
            explorer_data = {}

        entity = explorer_data.get("entity", query.title())
        comps = explorer_data.get("key_components", [query.title()])
        dims = explorer_data.get("analysis_dimensions", [])

        # Create root node
        nodes = [{"id": "root", "label": entity, "type": "CoreEntity"}]
        edges = []

        # Add component nodes
        for i, c in enumerate(comps):
            nid = f"comp_{i}"
            nodes.append({"id": nid, "label": c, "type": "Component"})
            edges.append({"source": nid, "target": "root", "relation": "COMPONENT_OF"})

        # Add analysis dimension nodes
        for i, d in enumerate(dims[:5]):
            nid = f"dim_{i}"
            short = d.split(" of ")[0] if " of " in d else d[:35]
            nodes.append({"id": nid, "label": short, "type": "AnalysisDimension"})
            edges.append({"source": "root", "target": nid, "relation": "ANALYZED_VIA"})

        graph_density = len(edges) / max(len(nodes), 1)

        return {
            "nodes": nodes,
            "edges": edges,
            "graph_density": f"{graph_density:.2f}",
            "insights": [
                f"Entity '{entity}' mapped with {len(comps)} components",
                f"Analysis covered {len(dims)} dimensions",
                f"Knowledge graph density: {graph_density:.2f}",
                f"Total relationships identified: {len(edges)}",
            ],
        }

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Run the knowledge graph agent.

        Args:
            context: Input context with 'query' or 'goal' parameter.
                     Can also include 'explorer_output' for richer graph building.

        Returns:
            Dict with 'nodes', 'edges', 'graph_density', and 'insights'
        """
        query = self._extract_topic(context)
        explorer_data = context.get("explorer_output", {})

        print(
            f"  [{self.name}] Building knowledge graph for query: {query}"
        )

        # Prepare data for LLM
        entity = explorer_data.get("entity", query.title())
        comps = explorer_data.get("key_components", [])
        insights = explorer_data.get("key_insights", [])
        dims = explorer_data.get("analysis_dimensions", [])

        comps_str = ", ".join(comps[:6]) if comps else query
        insights_str = "; ".join(insights[:4]) if insights else ""
        dims_str = ", ".join(dims[:5]) if dims else ""

        # Prepare the LLM prompt
        prompt = f"""You are a knowledge graph architect. Build a comprehensive semantic knowledge graph for: "{query}"

"""
        if explorer_data:
            prompt += f"""Based on explorer intelligence:
Entity: {entity}
Key Components: {comps_str}
Analysis Dimensions: {dims_str}
Insights: {insights_str}

"""

        prompt += f"""Build a knowledge graph that captures:
1. Main entities and concepts
2. Relationships and dependencies
3. Semantic connections

Return JSON with this exact structure:
{{
  "nodes": [
    {{"id": "unique_id", "label": "entity name", "type": "CoreEntity|Component|AnalysisDimension|SubEntity|Concept"}},
    ...
  ],
  "edges": [
    {{"source": "node_id", "target": "node_id", "relation": "COMPONENT_OF|ANALYZED_VIA|DEPENDS_ON|INFLUENCES|COMPETES_WITH|RELATED_TO|INCLUDES"}},
    ...
  ],
  "graph_density": "0.XX",
  "insights": ["insight 1", "insight 2", ...]
}}

Create 10-20 meaningful nodes and 15-25 edges showing real relationships."""

        # Try to get result from Gemini
        fallback = (
            self._fallback_structured_graph(query, explorer_data)
            if explorer_data
            else self._fallback_simple_graph(query)
        )

        llm_result = self.llm.generate_json(prompt, fallback=fallback)

        # Ensure required fields exist
        if not llm_result or "nodes" not in llm_result:
            llm_result = fallback

        # Add insights if not present
        if "insights" not in llm_result:
            llm_result["insights"] = [
                f"Knowledge graph built for '{query}'",
                f"Graph contains {len(llm_result.get('nodes', []))} entities",
                f"Identified {len(llm_result.get('edges', []))} relationships",
            ]

        # Ensure graph_density exists
        if "graph_density" not in llm_result:
            nodes = llm_result.get("nodes", [])
            edges = llm_result.get("edges", [])
            graph_density = len(edges) / max(len(nodes), 1)
            llm_result["graph_density"] = f"{graph_density:.2f}"

        print(f"  [{self.name}] Graph built: {len(llm_result.get('nodes', []))} nodes, {len(llm_result.get('edges', []))} edges")

        return {
            "knowledge_graph_output": llm_result,
            "query": query,
            "status": "success",
        }

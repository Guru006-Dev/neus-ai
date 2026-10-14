"""Knowledge Graph MCP Tools

Implements tools that leverage the KnowledgeGraphAgent for querying and building
semantic knowledge graphs.
"""

import json
from agent.knowledge_graph_agent.agent import KnowledgeGraphAgent


def codex_query_knowledge_graph(query: str) -> str:
    """Execute KnowledgeGraphAgent to build a knowledge graph from a query.

    Takes a query string and returns a structured knowledge graph with nodes,
    edges, and semantic insights. Integrates with Gemini API for intelligent
    graph building, with fallback to simple graph construction.

    Args:
        query: The query or topic to build a knowledge graph for

    Returns:
        JSON string containing:
        - query: The input query
        - knowledge_graph_output: Dict with nodes, edges, graph_density, insights
        - status: "success" or error status
    """
    try:
        # Initialize and run the agent
        agent = KnowledgeGraphAgent()
        context = {"query": query}

        # Run the agent
        result = agent.run(context)

        # Build the response
        response = {
            "query": query,
            "agent": "KnowledgeGraphAgent",
            "status": result.get("status", "success"),
        }

        # Add knowledge graph data
        if "knowledge_graph_output" in result:
            kg_output = result["knowledge_graph_output"]
            response["nodes"] = kg_output.get("nodes", [])
            response["edges"] = kg_output.get("edges", [])
            response["graph_density"] = kg_output.get("graph_density", "0.0")
            response["insights"] = kg_output.get("insights", [])
            response["nodes_count"] = len(response["nodes"])
            response["edges_count"] = len(response["edges"])

        return json.dumps(response)

    except Exception as e:
        # Return error response
        error_response = {
            "query": query,
            "agent": "KnowledgeGraphAgent",
            "status": "error",
            "error": str(e),
            "nodes": [],
            "edges": [],
            "insights": [f"Error building knowledge graph: {str(e)}"],
        }
        return json.dumps(error_response)

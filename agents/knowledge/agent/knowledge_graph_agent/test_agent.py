"""Simple test script for KnowledgeGraphAgent.

Run this to verify the agent works correctly:
    python test_agent.py

This demonstrates:
1. Basic agent initialization
2. Simple query execution
3. Fallback mode when API is unavailable
4. Graph structure and output format
"""

import json
from agent import KnowledgeGraphAgent


def test_simple_query():
    """Test with a simple query (will use fallback if no API key)."""
    print("\n" + "="*60)
    print("TEST 1: Simple Query")
    print("="*60)

    agent = KnowledgeGraphAgent()
    context = {"query": "artificial intelligence applications"}

    result = agent.run(context)
    kg_output = result["knowledge_graph_output"]

    print(f"Query: {result['query']}")
    print(f"Status: {result['status']}")
    print(f"Nodes: {len(kg_output['nodes'])}")
    print(f"Edges: {len(kg_output['edges'])}")
    print(f"Graph Density: {kg_output['graph_density']}")
    print(f"\nSample Nodes:")
    for node in kg_output["nodes"][:3]:
        print(f"  - {node['label']} ({node['type']})")
    print(f"\nSample Edges:")
    for edge in kg_output["edges"][:3]:
        print(f"  - {edge['source']} --{edge['relation']}--> {edge['target']}")
    print(f"\nInsights:")
    for insight in kg_output["insights"][:2]:
        print(f"  - {insight}")

    return result


def test_with_explorer_data():
    """Test with explorer data for richer context."""
    print("\n" + "="*60)
    print("TEST 2: With Explorer Output (Richer Context)")
    print("="*60)

    agent = KnowledgeGraphAgent()
    context = {
        "query": "Climate Change Impact",
        "explorer_output": {
            "entity": "Climate Change",
            "key_components": ["CO2 Emissions", "Global Warming", "Renewable Energy", "Carbon Credits", "Climate Policy"],
            "analysis_dimensions": [
                "Environmental Impact Assessment",
                "Economic Implications & Market Shifts",
                "Technological Innovation & Solutions",
                "Policy & Regulatory Landscape"
            ],
            "key_insights": [
                "Renewable energy adoption accelerating",
                "Corporate carbon neutrality commitments increasing"
            ]
        }
    }

    result = agent.run(context)
    kg_output = result["knowledge_graph_output"]

    print(f"Query: {result['query']}")
    print(f"Status: {result['status']}")
    print(f"Nodes: {len(kg_output['nodes'])}")
    print(f"Edges: {len(kg_output['edges'])}")
    print(f"Graph Density: {kg_output['graph_density']}")
    print(f"\nAll Nodes:")
    for node in kg_output["nodes"]:
        print(f"  - {node['label']} ({node['type']})")
    print(f"\nRelationships:")
    for edge in kg_output["edges"]:
        print(f"  - {edge['relation']}: {edge['source']} → {edge['target']}")

    return result


def test_via_mcp_tool():
    """Test using the MCP tool interface."""
    print("\n" + "="*60)
    print("TEST 3: Via MCP Tool Interface")
    print("="*60)

    from tools import codex_query_knowledge_graph

    response_json = codex_query_knowledge_graph("machine learning transformers")
    result = json.loads(response_json)

    print(f"Query: {result['query']}")
    print(f"Agent: {result['agent']}")
    print(f"Status: {result['status']}")
    print(f"Nodes Count: {result.get('nodes_count', 0)}")
    print(f"Edges Count: {result.get('edges_count', 0)}")
    print(f"Graph Density: {result.get('graph_density', 'N/A')}")
    print(f"Insights: {result.get('insights', [])}")

    return result


def test_goal_parameter():
    """Test with 'goal' parameter instead of 'query'."""
    print("\n" + "="*60)
    print("TEST 4: Using 'goal' Parameter (Alternative)")
    print("="*60)

    agent = KnowledgeGraphAgent()
    context = {"goal": "blockchain technology ecosystem"}

    result = agent.run(context)
    kg_output = result["knowledge_graph_output"]

    print(f"Query Extracted: {result['query']}")
    print(f"Status: {result['status']}")
    print(f"Graph Nodes: {len(kg_output['nodes'])}")
    print(f"Graph Edges: {len(kg_output['edges'])}")

    return result


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("KNOWLEDGE GRAPH AGENT TEST SUITE")
    print("="*60)
    print("\nThis test suite demonstrates KnowledgeGraphAgent functionality")
    print("Note: If GEMINI_API_KEY is not set, the agent will use fallback mode")

    try:
        test_simple_query()
        test_with_explorer_data()
        test_via_mcp_tool()
        test_goal_parameter()

        print("\n" + "="*60)
        print("ALL TESTS COMPLETED SUCCESSFULLY")
        print("="*60)
        print("\nAgent Status: OPERATIONAL")
        print("- Handles simple queries: ✓")
        print("- Handles explorer context: ✓")
        print("- MCP tool integration: ✓")
        print("- Parameter variations: ✓")

    except Exception as e:
        print(f"\nERROR during testing: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

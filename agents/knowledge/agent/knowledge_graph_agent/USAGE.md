# KnowledgeGraphAgent Usage Guide

## Overview

The `KnowledgeGraphAgent` is a standalone Python agent that builds and queries semantic knowledge graphs. It uses the Gemini API for intelligent graph construction with graceful fallback to rule-based graph generation.

## Installation

The agent requires:
- Python 3.7+
- Dependencies listed in `../../requirements.txt` (mcp, fastmcp, pydantic)
- Optional: `GEMINI_API_KEY` environment variable for API access

## Quick Start

### Direct Agent Usage

```python
from agent.knowledge_graph_agent.agent import KnowledgeGraphAgent

# Create agent instance
agent = KnowledgeGraphAgent()

# Run with a simple query
context = {
    "query": "What is the relationship between AI and healthcare?"
}

result = agent.run(context)

# Access results
kg_output = result["knowledge_graph_output"]
nodes = kg_output["nodes"]  # List of entities
edges = kg_output["edges"]  # List of relationships
insights = kg_output["insights"]  # Semantic insights
density = kg_output["graph_density"]  # Relationship density metric
```

### Via MCP Tool (Recommended)

```python
from tools import codex_query_knowledge_graph
import json

# Query through MCP interface
response_json = codex_query_knowledge_graph("machine learning applications")
result = json.loads(response_json)

print(f"Query: {result['query']}")
print(f"Nodes: {result['nodes_count']}")
print(f"Edges: {result['edges_count']}")
print(f"Graph Density: {result['graph_density']}")
print(f"Insights: {result['insights']}")
```

### With Explorer Output (Rich Context)

If you have explorer output from another agent, pass it for richer graph building:

```python
context = {
    "query": "Apple Inc strategic positioning",
    "explorer_output": {
        "entity": "Apple Inc",
        "key_components": ["iPhone", "Services", "Mac", "iPad", "Wearables"],
        "analysis_dimensions": [
            "Market Position & Competitive Landscape",
            "Product Innovation Pipeline",
            "Revenue Architecture",
            "Customer Experience"
        ],
        "key_insights": [
            "Services driving recurring revenue",
            "Ecosystem lock-in strengthening market position"
        ]
    }
}

result = agent.run(context)
```

## Output Format

### Nodes

Each node represents an entity or concept:

```json
{
  "id": "unique_identifier",
  "label": "Entity Name",
  "type": "CoreEntity|Component|AnalysisDimension|SubEntity|Concept"
}
```

### Edges

Each edge represents a relationship:

```json
{
  "source": "source_node_id",
  "target": "target_node_id",
  "relation": "COMPONENT_OF|ANALYZED_VIA|DEPENDS_ON|INFLUENCES|COMPETES_WITH|RELATED_TO|INCLUDES"
}
```

### Complete Response Structure

```json
{
  "query": "Input query string",
  "agent": "KnowledgeGraphAgent",
  "status": "success",
  "nodes": [
    {"id": "root", "label": "Query Topic", "type": "CoreEntity"},
    ...
  ],
  "edges": [
    {"source": "node1", "target": "node2", "relation": "RELATED_TO"},
    ...
  ],
  "graph_density": "0.42",
  "insights": [
    "Semantic insight 1",
    "Semantic insight 2",
    ...
  ],
  "nodes_count": 15,
  "edges_count": 18
}
```

## Configuration

### Environment Variables

- `GEMINI_API_KEY`: API key for Gemini API (if not set, agent uses fallback)
- `DEBUG`: Set to enable debug logging (optional)

### Agent Parameters

The agent's execution behavior can be customized:

```python
# Create with custom execution time
agent = KnowledgeGraphAgent()
agent.execution_time = 0.5  # Seconds (for simulation)
```

## Fallback Behavior

The agent implements two levels of fallback when Gemini API is unavailable:

1. **Simple Fallback**: Creates basic graph from query keywords
   - Used when no explorer data is provided
   - Creates root node and entity nodes
   - Adds simple relationships

2. **Structured Fallback**: Uses explorer output if available
   - Creates richer graph with components and dimensions
   - Preserves semantic structure from explorer phase
   - Falls back to simple mode if no explorer data

## Error Handling

The tool returns error responses with status "error":

```json
{
  "query": "input query",
  "agent": "KnowledgeGraphAgent",
  "status": "error",
  "error": "Error message describing what went wrong",
  "nodes": [],
  "edges": [],
  "insights": ["Error building knowledge graph: ..."]
}
```

## Integration with Orchestrator

The agent can be used as part of a larger orchestration pipeline:

```
Explorer Agent (discovers entities)
    ↓
Knowledge Graph Agent (builds semantic graph)
    ↓
Documentation Agent (generates reports)
```

Pass explorer output to KnowledgeGraphAgent for best results:

```python
# After Explorer Agent runs
context = {
    "query": topic,
    "explorer_output": explorer_result["explorer_output"]
}
result = kg_agent.run(context)
```

## Performance Characteristics

- **Execution Time**: ~200ms (0.2s) baseline + API latency
- **Graph Size**: Typically 10-20 nodes, 15-25 edges
- **Graph Density**: Ranges from 0.5 to 2.5 (edges per node ratio)
- **API Timeout**: 30 seconds per request
- **Graceful Degradation**: Falls back instantly if API unavailable

## Testing

Run the agent locally:

```bash
cd knowledge-mcp
python -c "
from agent.knowledge_graph_agent.agent import KnowledgeGraphAgent
agent = KnowledgeGraphAgent()
result = agent.run({'query': 'cloud computing trends'})
print('Nodes:', len(result['knowledge_graph_output']['nodes']))
print('Edges:', len(result['knowledge_graph_output']['edges']))
"
```

## Advanced: Custom Prompts

To modify the graph building logic, edit the prompt in `agent.py`'s `run()` method. The prompt controls:
- Node types and granularity
- Relationship types
- Graph size and complexity
- Insight generation

## Troubleshooting

**Issue**: Empty graphs or "Unknown Topic"
- **Solution**: Ensure query is non-empty and meaningful

**Issue**: API errors despite valid key
- **Solution**: Check GEMINI_API_KEY environment variable is set
- **Solution**: Verify API quota is available
- **Solution**: Check internet connectivity

**Issue**: Slow response time
- **Solution**: This is normal (Gemini API calls take 5-30s)
- **Solution**: Agent includes 30s timeout - increase if needed

**Issue**: Same graph every time (fallback mode)
- **Solution**: Verify GEMINI_API_KEY is set and valid
- **Solution**: Check API key has appropriate permissions

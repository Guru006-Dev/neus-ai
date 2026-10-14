# KnowledgeGraphAgent - Quick Start Guide

## What Is It?

A standalone Python agent that builds semantic knowledge graphs from queries. Part of the knowledge-mcp MCP server.

## Quick Setup

### 1. No Setup Required!
The agent is ready to use. To enable Gemini API (optional):

```bash
export GEMINI_API_KEY="your-api-key-here"
```

### 2. Verify It Works

```bash
cd knowledge-mcp/agent/knowledge_graph_agent
python test_agent.py
```

Expected: All 4 tests pass ✓

## Usage

### Via MCP Tool (Recommended)

```python
from tools import codex_query_knowledge_graph
import json

result = json.loads(codex_query_knowledge_graph("your query"))
print(f"Nodes: {result['nodes_count']}")
print(f"Edges: {result['edges_count']}")
print(f"Insights: {result['insights']}")
```

### Direct Python

```python
from agent.knowledge_graph_agent.agent import KnowledgeGraphAgent

agent = KnowledgeGraphAgent()
result = agent.run({"query": "your query"})
nodes = result["knowledge_graph_output"]["nodes"]
edges = result["knowledge_graph_output"]["edges"]
```

### With Rich Context (Explorer Data)

```python
context = {
    "query": "topic",
    "explorer_output": {
        "entity": "Topic Name",
        "key_components": ["component1", "component2"],
        "analysis_dimensions": ["dimension1", "dimension2"],
        "key_insights": ["insight1", "insight2"]
    }
}
result = agent.run(context)
```

## Output Format

```json
{
  "query": "your query",
  "nodes": [
    {"id": "n1", "label": "Entity Name", "type": "CoreEntity"},
    {"id": "n2", "label": "Component", "type": "Component"}
  ],
  "edges": [
    {"source": "n1", "target": "n2", "relation": "COMPONENT_OF"}
  ],
  "graph_density": "0.42",
  "insights": ["insight1", "insight2"],
  "nodes_count": 2,
  "edges_count": 1,
  "status": "success"
}
```

## File Locations

| File | Purpose |
|------|---------|
| `agent/knowledge_graph_agent/agent.py` | Main implementation |
| `agent/knowledge_graph_agent/__init__.py` | Package exports |
| `tools.py` | MCP tool wrapper |
| `agent/knowledge_graph_agent/README.md` | Full documentation |
| `agent/knowledge_graph_agent/USAGE.md` | Detailed guide |
| `agent/knowledge_graph_agent/test_agent.py` | Test suite |

## Common Tasks

### Simple Graph Query
```python
agent.run({"query": "machine learning"})
```
Returns basic graph (5-7 nodes)

### Rich Graph from Explorer
```python
agent.run({"query": "topic", "explorer_output": {...}})
```
Returns detailed graph (10-20 nodes)

### Using Alternative Parameter Name
```python
agent.run({"goal": "my goal"})  # Works the same as 'query'
```

### Check API Status
```python
from agent.knowledge_graph_agent.agent import GeminiClient
client = GeminiClient()
print(f"API Available: {client.available}")
# True if GEMINI_API_KEY is set, False otherwise
```

## What Happens Without API Key?

The agent uses fallback mode:
- Simple mode: Generates basic graph from keywords
- Never fails - always returns valid graph
- Perfect for development/testing

## Performance

- **Execution Time**: ~200ms baseline + 5-30s API latency
- **Graph Size**: 5-7 nodes (simple) or 10-20 nodes (rich)
- **Response Time**: Fast fallback or 5-30s with API

## Troubleshooting

### Graph is too simple?
- Set `GEMINI_API_KEY` to enable Gemini API
- Use explorer_output for richer context

### Getting errors?
- Check `status` field in response
- `status: "error"` returns error details
- See USAGE.md for common issues

### Same graph every time?
- GEMINI_API_KEY likely not set
- Agent is using fallback mode
- This is normal and safe

## Integration Points

### With Orchestrator Pipeline
```
Explorer → KnowledgeGraphAgent → Documentation
```

### With Other Agents
```python
# From explorer agent
explorer_result = explorer_agent.run(context)

# Pass to knowledge graph agent
context["explorer_output"] = explorer_result["explorer_output"]
kg_result = kg_agent.run(context)
```

## Files Modified

- ✓ `tools.py` - Now uses real agent
- ✓ `IMPLEMENTATION_SUMMARY.md` - Created (detailed overview)
- ✓ `AGENT_QUICKSTART.md` - Created (this file)
- ✓ Created agent implementation
  - `agent/knowledge_graph_agent/agent.py`
  - `agent/knowledge_graph_agent/__init__.py`
  - `agent/knowledge_graph_agent/README.md`
  - `agent/knowledge_graph_agent/USAGE.md`
  - `agent/knowledge_graph_agent/test_agent.py`

## Next Steps

1. **Test It**: Run `test_agent.py`
2. **Configure**: Set `GEMINI_API_KEY` (optional)
3. **Use It**: Via MCP tool or direct Python
4. **Read More**: See `agent/knowledge_graph_agent/README.md`

## Support

- **Full Documentation**: See `agent/knowledge_graph_agent/README.md`
- **Usage Examples**: See `agent/knowledge_graph_agent/USAGE.md`
- **Testing**: Run `agent/knowledge_graph_agent/test_agent.py`
- **Troubleshooting**: See USAGE.md section "Troubleshooting"

---

**Status**: ✓ Production Ready\
**Tests**: ✓ All Passing\
**Dependencies**: ✓ No New Dependencies\
**Ready to Deploy**: ✓ Yes

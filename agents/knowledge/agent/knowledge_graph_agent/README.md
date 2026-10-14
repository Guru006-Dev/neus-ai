# KnowledgeGraphAgent Implementation

## Overview

This directory contains a complete standalone implementation of the **KnowledgeGraphAgent** - an agent for building and querying semantic knowledge graphs. It integrates with Google's Gemini API for intelligent graph construction and provides graceful fallback mechanisms when the API is unavailable.

## Project Structure

```
knowledge-mcp/
├── agent/
│   └── knowledge_graph_agent/           # THIS DIRECTORY
│       ├── __init__.py                  # Package exports
│       ├── agent.py                     # Main implementation
│       ├── README.md                    # This file
│       ├── USAGE.md                     # Detailed usage guide
│       └── test_agent.py                # Test suite
├── server.py                            # MCP server (FastMCP)
├── tools.py                             # MCP tools that use this agent
├── schemas.py                           # Pydantic schemas
├── config.py                            # Configuration
└── requirements.txt                     # Dependencies
```

## Files Created

### 1. `agent.py` (Main Implementation)

Contains four core classes:

#### **GeminiClient**
- Lightweight HTTP client for Gemini API (no heavy dependencies)
- Uses urllib for API calls
- Handles JSON generation with fallback support
- Graceful degradation when API key is missing

```python
client = GeminiClient()
response = client.generate("Your prompt here")
json_response = client.generate_json("Return JSON...")
```

#### **BaseAgent**
- Abstract base class for all agents
- Provides common functionality:
  - LLM access via shared `_gemini` client
  - Topic extraction from context (supports 'query', 'goal', 'topic' keys)
  - Slug generation for filenames
  - Standard `run()` method interface

#### **KnowledgeGraphAgent**
- Core agent for building semantic knowledge graphs
- Key capabilities:
  - Accepts query strings or topics
  - Optionally uses explorer output for richer context
  - Generates structured graphs with nodes and edges
  - Provides semantic insights
  - Calculates graph density metrics

**Methods:**
- `run(context: Dict) -> Dict`: Main execution method
- `_fallback_simple_graph()`: Basic graph from keywords
- `_fallback_structured_graph()`: Richer graph from explorer data

### 2. `__init__.py`

Exports the public API:
```python
from agent import KnowledgeGraphAgent, GeminiClient, BaseAgent
```

### 3. `USAGE.md`

Comprehensive guide covering:
- Installation and setup
- Quick start examples
- Output format specification
- Configuration options
- Fallback behavior
- Error handling
- Integration patterns
- Troubleshooting

### 4. `test_agent.py`

Test suite with 4 test scenarios:
1. Simple query (fallback mode)
2. Query with explorer output (rich context)
3. Via MCP tool interface
4. Using 'goal' parameter variant

## Integration Points

### 1. With tools.py (MCP Tool)

The `tools.py` file imports and uses KnowledgeGraphAgent:

```python
def codex_query_knowledge_graph(query: str) -> str:
    agent = KnowledgeGraphAgent()
    context = {"query": query}
    result = agent.run(context)
    return json.dumps(result)
```

### 2. With server.py (MCP Server)

The server exposes the tool via FastMCP:

```python
from tools import codex_query_knowledge_graph
mcp = FastMCP("KnowledgeGraphAgent Server")
mcp.tool()(codex_query_knowledge_graph)
```

### 3. With Orchestrator Pipeline

Can be used as part of a larger agent pipeline:

```
Explorer Agent → Knowledge Graph Agent → Documentation Agent
```

Pass explorer output for enhanced graph building:
```python
context = {
    "query": topic,
    "explorer_output": explorer_result
}
result = kg_agent.run(context)
```

## Key Features

### 1. Gemini API Integration
- Uses Gemini 2.0 Flash model for intelligent graph building
- Temperature-optimized for JSON output (0.4 for structured data)
- Configurable via environment variable: `GEMINI_API_KEY`

### 2. Graceful Fallback
Two-tier fallback strategy:

**Tier 1: Simple Fallback**
- Used when no explorer data available
- Extracts entities from query keywords
- Creates basic star topology graph
- Always succeeds (never fails)

**Tier 2: Structured Fallback**
- Used when explorer output is available
- Preserves semantic structure
- Uses components and analysis dimensions
- Richer graph (10-20 nodes vs 5-7)

### 3. Flexible Context Handling
Supports multiple input formats:
```python
# Simple query
{"query": "machine learning"}

# With 'goal' parameter
{"goal": "climate change analysis"}

# With explorer context
{"query": "topic", "explorer_output": {...}}
```

### 4. Rich Output Format

Returns graph with:
- **Nodes**: Entities with types (CoreEntity, Component, etc.)
- **Edges**: Relationships with semantic relation types
- **Insights**: Derived semantic insights
- **Metrics**: Graph density and counts

## Configuration

### Environment Variables

```bash
# Enable Gemini API
export GEMINI_API_KEY="your-api-key-here"

# Optional: Enable debug logging
export DEBUG=True
```

### Runtime Configuration

```python
agent = KnowledgeGraphAgent()
agent.execution_time = 0.5  # Simulate longer execution
```

## Node Types

Supported entity types in graph nodes:

| Type | Purpose |
|------|---------|
| `CoreEntity` | Main entity being analyzed |
| `Component` | Sub-components of core entity |
| `AnalysisDimension` | Strategic analysis dimensions |
| `SubEntity` | Supporting entities |
| `Concept` | Abstract concepts |
| `Query` | Query/topic node |
| `Entity` | Generic entity |
| `Relationship` | Explicit relationship entities |

## Relationship Types

Supported semantic relationships:

| Relation | Meaning |
|----------|---------|
| `COMPONENT_OF` | Is a component/part of |
| `ANALYZED_VIA` | Analyzed through this dimension |
| `DEPENDS_ON` | Has a dependency on |
| `INFLUENCES` | Has influence over |
| `COMPETES_WITH` | Competes with |
| `RELATED_TO` | Has semantic relation to |
| `INCLUDES` | Includes or contains |

## Performance

| Metric | Value |
|--------|-------|
| Baseline Execution | ~200ms |
| API Latency | 5-30s (Gemini API) |
| Total Timeout | 30s per request |
| Typical Nodes Generated | 10-20 |
| Typical Edges Generated | 15-25 |
| Graph Density Range | 0.5-2.5 |

## Error Handling

The agent returns error responses with detailed information:

```json
{
  "query": "input",
  "agent": "KnowledgeGraphAgent",
  "status": "error",
  "error": "Description of error",
  "nodes": [],
  "edges": [],
  "insights": ["Error building knowledge graph: ..."]
}
```

Common error scenarios:
- Invalid API key → Falls back to simple graph
- API timeout → Returns fallback
- Malformed context → Uses defaults
- Query too short → Still generates graph

## Testing

Run the test suite:

```bash
cd knowledge-mcp/agent/knowledge_graph_agent
python test_agent.py
```

Expected output:
```
============================================================
KNOWLEDGE GRAPH AGENT TEST SUITE
============================================================
...
ALL TESTS COMPLETED SUCCESSFULLY
============================================================

Agent Status: OPERATIONAL
- Handles simple queries: ✓
- Handles explorer context: ✓
- MCP tool integration: ✓
- Parameter variations: ✓
```

## Design Patterns

### 1. Factory Pattern
`GeminiClient` is a shared singleton accessed via global `_gemini`

### 2. Template Method Pattern
`BaseAgent.run()` defines the interface; subclasses implement specifics

### 3. Strategy Pattern
Fallback methods provide alternative graph generation strategies

### 4. Context Pattern
Context dict carries all execution parameters and shared state

## Dependencies

All dependencies are lightweight and already in `requirements.txt`:

| Package | Purpose |
|---------|---------|
| `mcp` | MCP protocol support |
| `fastmcp` | FastMCP server framework |
| `pydantic` | Data validation (optional here) |

**No heavy dependencies**: Uses stdlib `urllib` instead of `requests`

## Future Enhancements

Potential improvements:

1. **Multi-model Support**
   - Support for other LLM providers (Anthropic, OpenAI)
   - Model selection via config

2. **Graph Persistence**
   - Save/load graphs from files
   - Graph versioning

3. **Graph Visualization**
   - Generate graph visualizations
   - Export to D3.js, GraphQL formats

4. **Advanced Querying**
   - Graph traversal queries
   - Relationship path finding
   - Semantic similarity search

5. **Fine-tuning**
   - Learn custom node/edge types
   - Domain-specific graph templates

## Troubleshooting

### Issue: "Empty graph generated"
**Cause**: Query too short or vague
**Solution**: Use longer, more specific queries

### Issue: "API call failed"
**Cause**: GEMINI_API_KEY not set or invalid
**Solution**:
```bash
export GEMINI_API_KEY="your-key"
# or set in system environment variables
```

### Issue: "Same graph every time"
**Cause**: Fallback mode active (API key missing or invalid)
**Solution**: Verify API key configuration

### Issue: "Slow responses"
**Cause**: Gemini API latency is normal
**Solution**: This is expected; typical response time is 5-30s

## References

- [Gemini API Documentation](https://ai.google.dev/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Agent Design Patterns](https://en.wikipedia.org/wiki/Agent_pattern)

## License

This implementation is part of the APIP project.

## Support

For issues or questions:
1. Check `USAGE.md` for common scenarios
2. Run `test_agent.py` to verify setup
3. Enable `DEBUG=True` for detailed logging
4. Check GEMINI_API_KEY configuration

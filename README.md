# APIP Multi-Agent Autonomous System

Welcome to the **Autonomous Product Intelligence Platform (APIP)** repository. This repository implements an enterprise-grade Model Context Protocol (MCP) architecture. The monolithic monolithic agent system has been broken out into independent, microservice-based MCP servers governed by a centralized standalone Orchestrator.

---

## 🤖 System Architecture & 8-Agent Lifecycle

The APIP pipeline executes workflows across specialized agents in a decoupled, robust sequence orchestrated by the **Orchestrator Agent**:

```mermaid
graph TD;
    Orchestrator[Orchestrator FastAPI Server]
    Orchestrator-->|MCP RPC|Explorer MCP;
    Orchestrator-->|MCP RPC|KnowledgeGraph MCP;
    Orchestrator-->|MCP RPC|UniversalDirector MCP;
    Orchestrator-->|MCP RPC|Documentation MCP;
    Orchestrator-->|MCP RPC|QA MCP;
    Orchestrator-->|MCP RPC|ReleaseIntelligence MCP;
    Orchestrator-->|MCP RPC|Demo MCP;
```

### 📁 Directory Structure

```text
root/
├── orchestrator/             <-- Standalone FastAPI Engine with Queueing, Concurrency Limits & Persistence
├── explorer-mcp/             <-- Browser telemetry & session recorder MCP server
├── knowledge-mcp/            <-- Codex Knowledge Graph node & edge constructor MCP server
├── documentation-mcp/        <-- Architecture blueprint & doc generator MCP server
├── qa-mcp/                   <-- Automated test suites MCP server
├── demo-mcp/                 <-- 3D WebGL animation, TTS narrative, MP4 generation MCP server
├── release-mcp/              <-- Version diffing & risk assessment MCP server
├── shared/                   <-- Shared utility components, Configs, DB schemas, etc.
└── README.md
```

Each MCP server contains its business logic fully intact within its `agent/` sub-folder and can be launched individually using FastMCP.

---

## 🚀 How to Run the Pipeline

### 1. Launch the Orchestrator
The Orchestrator provides a REST API that distributes workflows to individual servers automatically taking care of resource constraints and queueing.
```bash
cd orchestrator
pip install -r requirements.txt
python main.py
```

### 2. Launching MCP Servers
Each MCP Server runs completely independently. For example:
```bash
cd explorer-mcp
pip install -r requirements.txt
python server.py
```

*Note: For the orchestrator to fully execute multi-agent workflows, all required sub component MCP servers must be discoverable endpoints.*

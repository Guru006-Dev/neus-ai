# ADIP Multi-Agent Autonomous System

Welcome to the **ADIP Multi-Agent Autonomous System** repository. This repository contains the consolidated 8-agent system architecture, Model Context Protocol (MCP) server & clients, automated app pipeline, and isolated testing output directories.

---

## 🤖 System Architecture & 8-Agent Lifecycle

The ADIP pipeline executes workflows across **8 specialized agents** in a strict, canonical sequence:

```text
1. Orchestrator Agent ➔ 2. Explorer Agent ➔ 3. Codex Knowledge Graph Agent ➔
4. Universal Director Agent ➔ 5. Documentation Agent ➔ 6. QA Agent ➔
7. Release Intelligence Agent ➔ 8. Demo Agent
```

### 📁 Directory Structure

```text
ADIP/
├── Agent/
│   ├── orchestrator-agent/          <-- Orchestrator Agent engine & MCP client
│   ├── universal-director-agent/    <-- 3D WebGL animation templates & director scripts
│   ├── qa-agent/                    <-- Automated test suites & tactical match simulations
│   ├── release-intelligence/        <-- Version diffing & risk assessment
│   ├── documentation/               <-- Architecture blueprint & doc generator
│   ├── codex-knowledge-graph/       <-- Node & edge dependency graph constructor
│   ├── explorer/                    <-- Browser telemetry & session recorder
│   ├── mcp_agent_server.py          <-- Model Context Protocol (MCP) FastMCP Server
│   └── automated_app_pipeline.py    <-- End-to-end 8-agent execution runner
│
└── applications/
    ├── Amazon/                      <-- Isolated outputs for Amazon
    ├── YouTube/                     <-- Isolated outputs for YouTube
    └── Facebook/                    <-- Isolated outputs for Facebook
```

---

## 🚀 How to Run the Pipeline

### 1. Start the FastMCP Agent Server
```bash
python Agent/mcp_agent_server.py
```

### 2. Run End-to-End Application Pipeline for Any App
```bash
python Agent/automated_app_pipeline.py <AppName>
```
*(Example: `python Agent/automated_app_pipeline.py Spotify`)*

This automatically executes all 8 agents in order and creates `applications/<AppName>/` with all 8 step artifacts, neural voiceover MP3 audio, 3D WebGL WebM recording, and final HD MP4 showcase video with subtitles.

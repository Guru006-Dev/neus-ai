# Capture log (machine written)

Recorded 2026-10-03T16:11:09.470Z from http://127.0.0.1:3000. fallback path (GEMINI_API_KEY unset). POLL_MS=20.

- full wf-284658cf: 8 snapshots
  - 00 RUNNING []
  - 01 RUNNING [explorer:COMPLETED]
  - 02 RUNNING [explorer:COMPLETED, knowledge_graph:COMPLETED]
  - 03 RUNNING [explorer:COMPLETED, knowledge_graph:COMPLETED, documentation:COMPLETED]
  - 04 RUNNING [explorer:COMPLETED, knowledge_graph:COMPLETED, documentation:COMPLETED, qa:COMPLETED]
  - 05 RUNNING [explorer:COMPLETED, knowledge_graph:COMPLETED, documentation:COMPLETED, qa:COMPLETED, demo:COMPLETED]
  - 06 RUNNING [explorer:COMPLETED, knowledge_graph:COMPLETED, documentation:COMPLETED, qa:COMPLETED, demo:COMPLETED, release:COMPLETED]
  - 07 COMPLETED [explorer:COMPLETED, knowledge_graph:COMPLETED, documentation:COMPLETED, qa:COMPLETED, demo:COMPLETED, release:COMPLETED]
- qa wf-21216e31: 5 snapshots
  - 00 QUEUED []
  - 01 RUNNING [explorer:COMPLETED]
  - 02 RUNNING [explorer:COMPLETED, knowledge_graph:COMPLETED]
  - 03 RUNNING [explorer:COMPLETED, knowledge_graph:COMPLETED, qa:RUNNING]
  - 04 COMPLETED [explorer:COMPLETED, knowledge_graph:COMPLETED, qa:COMPLETED]

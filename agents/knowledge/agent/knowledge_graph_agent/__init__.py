"""Knowledge Graph Agent for querying and building knowledge graphs.

This module provides a standalone KnowledgeGraphAgent that can query knowledge graphs
and return nodes, edges, and semantic relationships derived from a query or topic.
"""

from .agent import KnowledgeGraphAgent, GeminiClient, BaseAgent

__all__ = ["KnowledgeGraphAgent", "GeminiClient", "BaseAgent"]

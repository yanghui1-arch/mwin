from typing import Dict
from .toolkits import Tool
from .search import WebSearch
from .project_context import ProjectContext
from .repository_context import RepositoryContext
from .query_step import QueryStep
from .bash import Bash

__all__ = ["Tool"]

"""TOOL_KITS is a collection of all tools.
Every tool will be added in TOOL_KITS.
"""
TOOL_KITS:Dict[str, Tool] = {
    "web_search": WebSearch(),
    "load_project_context": ProjectContext(),
    "load_repository_context": RepositoryContext(),
    "query_step": QueryStep(),
    "bash_command": Bash()
}

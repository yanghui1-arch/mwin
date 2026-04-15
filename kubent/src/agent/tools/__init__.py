from typing import Dict
from .toolkits import Tool
from .search import WebSearch
from .query_step import QueryStep
from .bash import Bash

__all__ = ["Tool"]

"""TOOL_KITS is a collection of all tools.
Every tool will be added in TOOL_KITS.
"""
TOOL_KITS:Dict[str, Tool] = {
    "web_search": WebSearch(),
    "query_step": QueryStep(),
    "bash_command": Bash()
}
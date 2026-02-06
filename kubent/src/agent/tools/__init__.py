from typing import Dict
from .toolkits import Tool
from .search import SearchGoogle
from .kubent_think import KubentThink
from .robin_think import RobinThink
from .query_step import QueryStep
from .robin import ConsultRobin
from .bash import Bash

__all__ = ["Tool"]

"""TOOL_KITS is a collection of all tools.
Every tool will be added in TOOL_KITS.
"""
TOOL_KITS:Dict[str, Tool] = {
    "search_google": SearchGoogle(),
    "think_process": KubentThink(),
    "robin_think_process": RobinThink(),
    "query_step": QueryStep(),
    "bash_command": Bash(),
    
    # tool that offers by agent
    "consult_robin": ConsultRobin(),
}
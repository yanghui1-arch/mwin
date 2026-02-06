from dataclasses import dataclass, field
from typing import List, Dict
from uuid import UUID
from collections import defaultdict
from ..repository.models import Step


@dataclass
class MermaidResult:
    """Wraps a mermaid diagram string with an ID mapping table.

    Attributes:
        diagram:  The mermaid flowchart string.
        node_map: Short node id -> original Step UUID.
    """
    diagram: str
    node_map: Dict[str, UUID] = field(default_factory=dict)

    def __str__(self) -> str:
        return f"""
Node maps to UUID:
{"\n".join([f"{n}: {uid}" for n, uid in self.node_map.items()])}
\n\n
{self.diagram}
        """


def _group_by_parent(steps: List[Step]):
    ctx = defaultdict(list)
    for s in steps:
        ctx[s.parent_step_id].append(s)
    return ctx


def _sort_by_time(steps: List[Step]):
    return sorted(steps, key=lambda s: s.start_time)


def _assign_short_ids(steps: List[Step]):
    """Assign deterministic short ids (n0, n1, ...) in chronological order."""
    ordered = _sort_by_time(steps)
    id_map: Dict[UUID, str] = {}
    for i, s in enumerate(ordered):
        id_map[s.id] = f"n{i}"
    return id_map


def steps_to_mermaid(steps: List[Step]) -> MermaidResult:
    """Draw a steps execution stack with mermaid.

    Args:
        steps: A list of steps from one trace.

    Returns:
        MermaidResult containing the diagram and a node_map (short_id -> UUID).
    """
    if not steps:
        return MermaidResult(diagram="flowchart TD", node_map={})

    short = _assign_short_ids(steps)
    by_id = {s.id: s for s in steps}
    ctx = _group_by_parent(steps)

    lines = ["flowchart TD"]

    # --- main (root-level steps) ---
    roots = _sort_by_time(ctx.get(None, []))
    if roots:
        lines.append('  subgraph MAIN["main"]')
        for s in roots:
            lines.append(f'    {short[s.id]}["{s.name}"]')
        for a, b in zip(roots, roots[1:]):
            lines.append(f'    {short[a.id]} --> {short[b.id]}')
        lines.append("  end")

    # --- child subgraphs ---
    for pid, children in ctx.items():
        if pid is None:
            continue
        parent = by_id[pid]
        children = _sort_by_time(children)
        lines.append(f'  subgraph {short[parent.id]}_ctx["{parent.name}()"]')
        for s in children:
            lines.append(f'    {short[s.id]}["{s.name}"]')
        for a, b in zip(children, children[1:]):
            lines.append(f'    {short[a.id]} --> {short[b.id]}')
        lines.append("  end")
        # cross-subgraph edge
        lines.append(f'  {short[parent.id]} -.-> {short[children[0].id]}')

    diagram = "\n".join(lines)
    node_map = {sid: uuid for uuid, sid in short.items()}
    return MermaidResult(diagram=diagram, node_map=node_map)

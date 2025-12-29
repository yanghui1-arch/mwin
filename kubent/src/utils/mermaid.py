from typing import List
from collections import defaultdict
from ..repository.models import Step

def __group_by_context(steps: List[Step]):
    """Group steps with parent step id.
    Define main steps which key is None. Define calling context steps which key is its parent step id.

    Args:
        steps(List[Step]): a list of steps

    Returns:
        A grouped dict.
    """

    ctx = defaultdict(list)
    for s in steps:
        ctx[s.parent_step_id].append(s)
    return ctx

def __sort_by_time(steps: List[Step]):
    return sorted(steps, key=lambda s: s.start_time)

def steps_to_mermaid(steps: List[Step]) -> str:
    """Draw a steps execution stack with mermaid.
    
    Args:
        steps(List[Step]): a list of steps

    Returns:
        Mermaid format string
    """
    steps_by_id = {s.id: s for s in steps}
    ctx = __group_by_context(steps)
    lines = ["flowchart TD"]

    # --- 1. MAIN ---
    main_steps = __sort_by_time(ctx.get(None, []))
    lines.append('    subgraph MAIN["main()"]')
    # nodes
    for s in main_steps:
        lines.append(f'        {s.id}["{s.name}"]')
    # edges
    for a, b in zip(main_steps, main_steps[1:]):
        lines.append(f'        {a.id} --> {b.id}')

    lines.append("    end")

    # --- 2. subgraph ---
    for parent_id, sub_steps in ctx.items():
        if parent_id is None:
            continue

        parent = steps_by_id[parent_id]
        sub_steps = __sort_by_time(sub_steps)

        lines.append(f'    subgraph {parent.id}_CTX["{parent.name}()"]')
        # nodes
        for s in sub_steps:
            lines.append(f'        {s.id}["{s.name}"]')
        # edges
        for a, b in zip(sub_steps, sub_steps[1:]):
            lines.append(f'        {a.id} --> {b.id}')

        lines.append("    end")

        # --- 3. cross subgraph: an edge that enters this subgraph ---
        first = sub_steps[0]
        lines.append(
            f'    {parent.id} -.-> {first.id}'
        )

    return "\n".join(lines)


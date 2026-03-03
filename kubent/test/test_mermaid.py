"""Unit tests for src.utils.mermaid

Covers:
  - steps_to_mermaid: empty input, single root, multiple roots, parent-child,
    multiple children, reversed insertion order, node_map correctness.
  - MermaidResult.__str__: contains diagram and id mapping.
  - _sort_by_time: correctness, immutability.
  - _assign_short_ids: chronological numbering, empty input.
  - _group_by_parent: roots under None, children under parent id.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

import pytest

from src.utils.mermaid import (
    MermaidResult,
    _assign_short_ids,
    _group_by_parent,
    _sort_by_time,
    steps_to_mermaid,
)
from src.repository.models.step import Step


# ── helpers ───────────────────────────────────────────────────────────────────

_BASE_TIME = datetime(2024, 1, 1, 0, 0, 0)


def _make_step(
    name: str,
    offset_seconds: int = 0,
    parent_step_id: uuid.UUID | None = None,
) -> Step:
    """Construct a detached Step ORM object for testing (no DB session needed)."""
    s = Step()
    s.id = uuid.uuid4()
    s.name = name
    s.trace_id = uuid.uuid4()
    s.parent_step_id = parent_step_id
    s.start_time = _BASE_TIME + timedelta(seconds=offset_seconds)
    s.end_time = s.start_time + timedelta(seconds=1)
    s.type = "llm"
    s.tags = []
    s.input = {}
    s.output = {}
    s.project_name = "test_project"
    s.project_id = 1
    return s


# ── tests: steps_to_mermaid ───────────────────────────────────────────────────

class TestStepsToMermaid:
    def test_empty_list_returns_base_flowchart(self):
        result = steps_to_mermaid([])
        assert result.diagram == "flowchart TD"
        assert result.node_map == {}

    def test_single_root_step_has_node_and_main_subgraph(self):
        s = _make_step("my_agent", 0)
        result = steps_to_mermaid([s])
        assert "flowchart TD" in result.diagram
        assert "my_agent" in result.diagram
        assert "n0" in result.diagram
        assert 'subgraph MAIN["main"]' in result.diagram

    def test_single_root_has_correct_node_map(self):
        s = _make_step("agent", 0)
        result = steps_to_mermaid([s])
        assert result.node_map == {"n0": s.id}

    def test_multiple_roots_are_sequentially_connected(self):
        s0 = _make_step("a", 0)
        s1 = _make_step("b", 1)
        s2 = _make_step("c", 2)
        result = steps_to_mermaid([s0, s1, s2])
        assert "n0 --> n1" in result.diagram
        assert "n1 --> n2" in result.diagram

    def test_root_step_names_appear_in_diagram(self):
        s0 = _make_step("step_alpha", 0)
        s1 = _make_step("step_beta", 1)
        result = steps_to_mermaid([s0, s1])
        assert "step_alpha" in result.diagram
        assert "step_beta" in result.diagram

    def test_child_step_creates_subgraph_with_parent_name(self):
        parent = _make_step("parent_fn", 0)
        child = _make_step("child_fn", 1, parent_step_id=parent.id)
        result = steps_to_mermaid([parent, child])
        assert "child_fn" in result.diagram
        assert "parent_fn()" in result.diagram

    def test_cross_subgraph_dotted_edge_present(self):
        parent = _make_step("p", 0)
        child = _make_step("c", 1, parent_step_id=parent.id)
        result = steps_to_mermaid([parent, child])
        assert "-.-> " in result.diagram

    def test_multiple_children_are_sequentially_connected(self):
        parent = _make_step("p", 0)
        c1 = _make_step("c1", 1, parent_step_id=parent.id)
        c2 = _make_step("c2", 2, parent_step_id=parent.id)
        result = steps_to_mermaid([parent, c1, c2])
        # Children c1 -> c2 sequential arrow must exist
        assert "n1 --> n2" in result.diagram or "n2 --> n3" in result.diagram

    def test_node_map_contains_all_steps(self):
        s0 = _make_step("a", 0)
        s1 = _make_step("b", 1)
        s2 = _make_step("c", 2, parent_step_id=s1.id)
        result = steps_to_mermaid([s0, s1, s2])
        assert len(result.node_map) == 3
        ids = set(result.node_map.values())
        assert s0.id in ids
        assert s1.id in ids
        assert s2.id in ids

    def test_str_representation_contains_diagram_and_id_map(self):
        s = _make_step("only_step", 0)
        result = steps_to_mermaid([s])
        text = str(result)
        assert "n0" in text
        assert str(s.id) in text
        assert "flowchart TD" in text

    def test_list_order_does_not_affect_short_id_assignment(self):
        """Short IDs follow chronological order, not list insertion order."""
        earlier = _make_step("earlier", 0)
        later = _make_step("later", 100)
        # Deliberately pass in reverse chronological order
        result = steps_to_mermaid([later, earlier])
        assert result.node_map["n0"] == earlier.id
        assert result.node_map["n1"] == later.id

    def test_no_arrow_for_single_root_step(self):
        s = _make_step("solo", 0)
        result = steps_to_mermaid([s])
        assert "n0 --> n1" not in result.diagram

    def test_no_child_subgraph_when_all_roots(self):
        s0 = _make_step("x", 0)
        s1 = _make_step("y", 1)
        result = steps_to_mermaid([s0, s1])
        # No subgraph should be created for a child context
        assert "subgraph n" not in result.diagram

    def test_only_one_cross_edge_for_single_parent(self):
        """The dotted edge from parent to first child must appear exactly once."""
        root = _make_step("root", 0)
        c1 = _make_step("c1", 1, parent_step_id=root.id)
        c2 = _make_step("c2", 2, parent_step_id=root.id)
        c3 = _make_step("c3", 3, parent_step_id=root.id)
        result = steps_to_mermaid([root, c1, c2, c3])
        assert result.diagram.count("-.->") == 1

    def test_two_separate_parents_each_get_a_subgraph(self):
        r1 = _make_step("root1", 0)
        r2 = _make_step("root2", 1)
        c1 = _make_step("child1", 2, parent_step_id=r1.id)
        c2 = _make_step("child2", 3, parent_step_id=r2.id)
        result = steps_to_mermaid([r1, r2, c1, c2])
        # Both parent names should appear as subgraph headers
        assert "root1()" in result.diagram
        assert "root2()" in result.diagram
        assert result.diagram.count("-.->") == 2


# ── tests: _sort_by_time ──────────────────────────────────────────────────────

class TestSortByTime:
    def test_sorts_ascending_by_start_time(self):
        s0 = _make_step("a", 10)
        s1 = _make_step("b", 5)
        s2 = _make_step("c", 15)
        result = _sort_by_time([s0, s1, s2])
        assert [s.name for s in result] == ["b", "a", "c"]

    def test_single_element_unchanged(self):
        s = _make_step("only", 0)
        assert _sort_by_time([s]) == [s]

    def test_empty_list(self):
        assert _sort_by_time([]) == []

    def test_does_not_mutate_input_list(self):
        s0 = _make_step("a", 10)
        s1 = _make_step("b", 5)
        original = [s0, s1]
        _sort_by_time(original)
        assert original == [s0, s1]

    def test_already_sorted_list_unchanged(self):
        s0 = _make_step("a", 0)
        s1 = _make_step("b", 1)
        result = _sort_by_time([s0, s1])
        assert [s.name for s in result] == ["a", "b"]


# ── tests: _assign_short_ids ──────────────────────────────────────────────────

class TestAssignShortIds:
    def test_ids_follow_chronological_order(self):
        s0 = _make_step("last", 20)
        s1 = _make_step("first", 0)
        id_map = _assign_short_ids([s0, s1])
        assert id_map[s1.id] == "n0"
        assert id_map[s0.id] == "n1"

    def test_sequential_numbering_for_multiple_steps(self):
        steps = [_make_step(f"s{i}", i) for i in range(5)]
        id_map = _assign_short_ids(steps)
        for i, s in enumerate(steps):
            assert id_map[s.id] == f"n{i}"

    def test_empty_input_returns_empty_dict(self):
        assert _assign_short_ids([]) == {}

    def test_single_step_gets_n0(self):
        s = _make_step("only", 0)
        id_map = _assign_short_ids([s])
        assert id_map[s.id] == "n0"


# ── tests: _group_by_parent ───────────────────────────────────────────────────

class TestGroupByParent:
    def test_root_steps_grouped_under_none_key(self):
        s0 = _make_step("root1", 0)
        s1 = _make_step("root2", 1)
        groups = _group_by_parent([s0, s1])
        assert None in groups
        assert len(groups[None]) == 2

    def test_children_grouped_under_parent_id(self):
        parent = _make_step("p", 0)
        child = _make_step("c", 1, parent_step_id=parent.id)
        groups = _group_by_parent([parent, child])
        assert parent.id in groups
        assert groups[parent.id] == [child]

    def test_mixed_roots_and_children_grouped_correctly(self):
        r = _make_step("root", 0)
        c = _make_step("child", 1, parent_step_id=r.id)
        groups = _group_by_parent([r, c])
        assert len(groups[None]) == 1
        assert groups[None][0] is r
        assert groups[r.id][0] is c

    def test_empty_input_returns_empty_mapping(self):
        groups = _group_by_parent([])
        assert len(groups) == 0

    def test_multiple_children_under_same_parent(self):
        parent = _make_step("p", 0)
        c1 = _make_step("c1", 1, parent_step_id=parent.id)
        c2 = _make_step("c2", 2, parent_step_id=parent.id)
        c3 = _make_step("c3", 3, parent_step_id=parent.id)
        groups = _group_by_parent([parent, c1, c2, c3])
        assert len(groups[parent.id]) == 3

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Node,
  type Edge,
  MarkerType,
  Panel,
  type ReactFlowInstance,
} from "@xyflow/react";
import { TraceProcessNode } from "./trace-process-node";
import dagre from "dagre";
import { useState, useMemo, Fragment, useCallback, useEffect } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { LLMJsonCard } from "../llm-json-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { FunctionIOCard } from "../fn-io-card";
import { TraceIONode } from "./trace-process-io-node";
import type { Track } from "@/api/trace";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Workflow } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";

interface TraceDialogProcessPanelProps {
  input?: Record<string, unknown> | undefined;
  tracks: Track[];
  output?: Record<string, unknown> | string | undefined;
  errorInfo?: string;
}

const nodeTypes = {
  processNode: TraceProcessNode,
  ioNode: TraceIONode,
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 76;

const MAIN_EDGE_COLOR = "rgb(var(--process-flow-main-rgb))";

type ScopeItem = { trackId: string; trackName: string };

type TreeRow = {
  track: Track;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
};

const TRACK_TYPE_META: Record<
  Track["type"],
  { label: string; dotClassName: string; badgeClassName: string }
> = {
  llm_response: {
    label: "LLM",
    dotClassName: "bg-blue-500",
    badgeClassName: "bg-blue-500/10 text-blue-700",
  },
  tool: {
    label: "Tool",
    dotClassName: "bg-amber-500",
    badgeClassName: "bg-amber-500/10 text-amber-700",
  },
  retrieve: {
    label: "Retrieve",
    dotClassName: "bg-emerald-500",
    badgeClassName: "bg-emerald-500/10 text-emerald-700",
  },
  customized: {
    label: "General",
    dotClassName: "bg-violet-500",
    badgeClassName: "bg-violet-500/10 text-violet-700",
  },
};

function sortByStartTime(a: Track, b: Track): number {
  return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
}

function formatTrackTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildFlowGraph(
  levelTracks: Track[],
  inputData: Record<string, unknown> | undefined,
  outputData: Record<string, unknown> | string | undefined,
  errorInfo: string | undefined,
  childrenMap: Map<string, Track[]>,
  trackById: Map<string, Track>,
  scopeName?: string,
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({
    rankdir: "TB",
    nodesep: 50,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const hasInput = !!inputData;
  const hasOutput = !!outputData || !!errorInfo;

  if (hasInput) {
    dagreGraph.setNode("input", { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  if (hasOutput) {
    dagreGraph.setNode("output", { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const t of levelTracks) {
    dagreGraph.setNode(`process-${t.id}`, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  // Recursion detection: walk up parent chain and check for same name
  const recursionCache = new Map<string, boolean>();
  function isRecursive(track: Track): boolean {
    if (recursionCache.has(track.id)) return recursionCache.get(track.id)!;
    let current = track.parent_step_id
      ? trackById.get(track.parent_step_id)
      : undefined;
    while (current) {
      if (current.name === track.name) {
        recursionCache.set(track.id, true);
        return true;
      }
      current = current.parent_step_id
        ? trackById.get(current.parent_step_id)
        : undefined;
    }
    recursionCache.set(track.id, false);
    return false;
  }

  // Build sequential edges
  const edges: Edge[] = [];
  let edgeIdx = 0;
  const edgeStyle = { stroke: MAIN_EDGE_COLOR, strokeWidth: 2 };
  const markerEnd = {
    type: MarkerType.ArrowClosed as const,
    color: MAIN_EDGE_COLOR,
  };

  // input -> first track
  if (hasInput && levelTracks.length > 0) {
    const targetId = `process-${levelTracks[0].id}`;
    dagreGraph.setEdge("input", targetId);
    edges.push({
      id: `edge-${edgeIdx++}`,
      source: "input",
      target: targetId,
      type: "smoothstep",
      style: edgeStyle,
      markerEnd,
    });
  }

  // track[i] -> track[i+1]
  for (let i = 0; i < levelTracks.length - 1; i++) {
    const sourceId = `process-${levelTracks[i].id}`;
    const targetId = `process-${levelTracks[i + 1].id}`;
    dagreGraph.setEdge(sourceId, targetId);
    edges.push({
      id: `edge-${edgeIdx++}`,
      source: sourceId,
      target: targetId,
      type: "smoothstep",
      style: edgeStyle,
      markerEnd,
    });
  }

  // last track -> output
  if (hasOutput && levelTracks.length > 0) {
    const sourceId = `process-${levelTracks[levelTracks.length - 1].id}`;
    dagreGraph.setEdge(sourceId, "output");
    edges.push({
      id: `edge-${edgeIdx++}`,
      source: sourceId,
      target: "output",
      type: "smoothstep",
      style: edgeStyle,
      markerEnd,
    });
  }

  // input -> output when there are no tracks
  if (hasInput && hasOutput && levelTracks.length === 0) {
    dagreGraph.setEdge("input", "output");
    edges.push({
      id: `edge-${edgeIdx++}`,
      source: "input",
      target: "output",
      type: "smoothstep",
      style: edgeStyle,
      markerEnd,
    });
  }

  dagre.layout(dagreGraph);

  // Compute which nodes have incoming/outgoing edges for handle visibility
  const hasIncoming = new Set<string>();
  const hasOutgoing = new Set<string>();
  for (const e of edges) {
    hasIncoming.add(e.target);
    hasOutgoing.add(e.source);
  }

  // Build xyflow nodes
  const nodes: Node[] = [];

  if (hasInput) {
    const pos = dagreGraph.node("input");
    nodes.push({
      id: "input",
      data: {
        label: "input",
        input: inputData,
        ...(scopeName && { title: `${scopeName} Input` }),
      },
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      type: "ioNode",
    });
  }

  for (const track of levelTracks) {
    const nodeId = `process-${track.id}`;
    const pos = dagreGraph.node(nodeId);

    const durationMs =
      new Date(track.end_time).getTime() -
      new Date(track.start_time).getTime();
    const durationLabel =
      durationMs < 1000
        ? `${durationMs}ms`
        : `${(durationMs / 1000).toFixed(2)}s`;
    const hasChildTracks = (childrenMap.get(track.id)?.length ?? 0) > 0;

    nodes.push({
      id: nodeId,
      data: {
        label: track.name,
        title: track.name,
        trackType: track.type,
        hasPrev: hasIncoming.has(nodeId),
        hasNext: hasOutgoing.has(nodeId),
        llm_inputs: track.input.llm_inputs,
        llm_outputs: track.output.llm_outputs,
        fn_inputs: track.input.func_inputs,
        fn_output: track.output.func_output,
        errorInfo: track.error_info,
        durationLabel,
        isRecursive: isRecursive(track),
        hasChildren: hasChildTracks,
        cost: track.cost,
      },
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      type: "processNode",
    });
  }

  if (hasOutput) {
    const pos = dagreGraph.node("output");
    nodes.push({
      id: "output",
      data: {
        label: "output",
        output: outputData,
        errorInfo,
        ...(scopeName && { title: `${scopeName} Output` }),
      },
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      type: "ioNode",
    });
  }

  return { nodes, edges };
}

export function TraceDialogProcessPanel({
  input,
  tracks,
  output,
  errorInfo,
}: TraceDialogProcessPanelProps) {
  const { t } = useTranslation();

  // Drill-down navigation state
  const [scopeStack, setScopeStack] = useState<ScopeItem[]>([]);
  const [collapsedTrackIds, setCollapsedTrackIds] = useState<Set<string>>(
    new Set(),
  );
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node, Edge> | null
  >(null);

  const currentScope =
    scopeStack.length > 0 ? scopeStack[scopeStack.length - 1] : null;

  // Lookup maps from all tracks
  const trackById = useMemo(() => {
    const map = new Map<string, Track>();
    for (const t of tracks) map.set(t.id, t);
    return map;
  }, [tracks]);

  const childrenMap = useMemo(() => {
    const map = new Map<string, Track[]>();
    for (const t of tracks) {
      if (t.parent_step_id) {
        if (!map.has(t.parent_step_id)) map.set(t.parent_step_id, []);
        map.get(t.parent_step_id)!.push(t);
      }
    }
    return map;
  }, [tracks]);

  const sortedChildrenMap = useMemo(() => {
    const map = new Map<string, Track[]>();
    for (const [parentId, children] of childrenMap.entries()) {
      map.set(parentId, [...children].sort(sortByStartTime));
    }
    return map;
  }, [childrenMap]);

  const rootTracks = useMemo(
    () => tracks.filter((t) => !t.parent_step_id).sort(sortByStartTime),
    [tracks],
  );

  // Current level tracks sorted by start_time
  const levelTracks = useMemo(() => {
    const filtered = !currentScope
      ? tracks.filter((t) => !t.parent_step_id)
      : tracks.filter((t) => t.parent_step_id === currentScope.trackId);
    return filtered.sort(sortByStartTime);
  }, [tracks, currentScope]);

  // IO data for current level
  const levelInput = useMemo<Record<string, unknown> | undefined>(() => {
    if (!currentScope) return input;
    const track = trackById.get(currentScope.trackId);
    return track?.input.func_inputs as Record<string, unknown> | undefined;
  }, [currentScope, trackById, input]);

  const levelOutput = useMemo<
    Record<string, unknown> | string | undefined
  >(() => {
    if (!currentScope) return output;
    const track = trackById.get(currentScope.trackId);
    return track?.output.func_output as
      | Record<string, unknown>
      | string
      | undefined;
  }, [currentScope, trackById, output]);

  const levelErrorInfo = useMemo(() => {
    if (!currentScope) return errorInfo;
    const track = trackById.get(currentScope.trackId);
    return track?.error_info;
  }, [currentScope, trackById, errorInfo]);

  // Build flow graph for current level
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      buildFlowGraph(
        levelTracks,
        levelInput,
        levelOutput,
        levelErrorInfo,
        childrenMap,
        trackById,
        currentScope?.trackName,
      ),
    [
      levelTracks,
      levelInput,
      levelOutput,
      levelErrorInfo,
      childrenMap,
      trackById,
      currentScope?.trackName,
    ],
  );

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeDetailDisplayType, setNodeDetailDisplayType] = useState<
    "llm" | "fn"
  >("llm");

  const selectedNodeId = activeTrackId
    ? `process-${activeTrackId}`
    : selectedNode?.id ?? null;

  const graphNodes = useMemo(
    () =>
      initialNodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      })),
    [initialNodes, selectedNodeId],
  );

  useEffect(() => {
    if (collapsedTrackIds.size === 0) return;
    setCollapsedTrackIds((prev) => {
      const next = new Set([...prev].filter((id) => trackById.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [trackById, collapsedTrackIds.size]);

  const buildScopeStackForTrack = useCallback(
    (trackId: string): ScopeItem[] => {
      const nextScope: ScopeItem[] = [];
      const visited = new Set<string>();
      let current = trackById.get(trackId);

      while (current?.parent_step_id) {
        const parentId = current.parent_step_id;
        if (visited.has(parentId)) break;
        visited.add(parentId);
        const parent = trackById.get(parentId);
        if (!parent) break;
        nextScope.push({ trackId: parent.id, trackName: parent.name });
        current = parent;
      }

      return nextScope.reverse();
    },
    [trackById],
  );

  const handleToggleTreeRow = useCallback((trackId: string) => {
    setCollapsedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  }, []);

  const treeRows = useMemo<TreeRow[]>(() => {
    const rows: TreeRow[] = [];

    const appendRows = (track: Track, depth: number) => {
      const children = sortedChildrenMap.get(track.id) ?? [];
      const hasChildren = children.length > 0;
      const collapsed = collapsedTrackIds.has(track.id);

      rows.push({
        track,
        depth,
        hasChildren,
        collapsed,
      });

      if (!hasChildren || collapsed) return;
      for (const childTrack of children) {
        appendRows(childTrack, depth + 1);
      }
    };

    for (const rootTrack of rootTracks) {
      appendRows(rootTrack, 0);
    }

    return rows;
  }, [rootTracks, sortedChildrenMap, collapsedTrackIds]);

  const handleTreeTrackClick = useCallback(
    (trackId: string) => {
      setCollapsedTrackIds((prev) => {
        const next = new Set(prev);
        const visited = new Set<string>();
        let current = trackById.get(trackId);

        while (current?.parent_step_id) {
          const parentId = current.parent_step_id;
          if (visited.has(parentId)) break;
          visited.add(parentId);
          next.delete(parentId);
          current = trackById.get(parentId);
        }

        return next;
      });

      setScopeStack(buildScopeStackForTrack(trackId));
      setActiveTrackId(trackId);
      setFocusNodeId(`process-${trackId}`);
      setSelectedNode(null);
      setNodeDetailDisplayType("llm");
    },
    [trackById, buildScopeStackForTrack],
  );

  const handleRootClick = useCallback(() => {
    setScopeStack([]);
    setActiveTrackId(null);
    setFocusNodeId(null);
    setSelectedNode(null);
    setNodeDetailDisplayType("llm");
    requestAnimationFrame(() => {
      flowInstance?.fitView({ padding: 0.2, duration: 320 });
    });
  }, [flowInstance]);

  const handleEnterExecution = (trackId: string, trackName: string) => {
    setScopeStack((prev) => [...prev, { trackId, trackName }]);
    setActiveTrackId(trackId);
    setFocusNodeId(null);
    setSelectedNode(null);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index < 0) {
      setScopeStack([]);
    } else {
      setScopeStack((prev) => prev.slice(0, index + 1));
    }

    setSelectedNode(null);
    setNodeDetailDisplayType("llm");
    const nextActiveScope = index >= 0 ? scopeStack[index] : null;
    setActiveTrackId(nextActiveScope?.trackId ?? null);
    setFocusNodeId(null);
  };

  // Check if selected process node has children
  const selectedNodeHasChildren =
    selectedNode &&
    selectedNode.id !== "input" &&
    selectedNode.id !== "output" &&
    (childrenMap.get(selectedNode.id.replace("process-", ""))?.length ?? 0) > 0;

  useEffect(() => {
    if (!focusNodeId || !flowInstance) return;

    const animationFrame = requestAnimationFrame(() => {
      const targetNode = flowInstance
        .getNodes()
        .find((node) => node.id === focusNodeId);

      if (!targetNode) {
        return;
      }

      flowInstance.fitView({
        nodes: [targetNode],
        duration: 420,
        padding: 0.65,
        maxZoom: 1.75,
      });
      setFocusNodeId(null);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [focusNodeId, flowInstance, graphNodes]);

  return (
    <div className="w-full h-[80vh]">
      <div className="grid h-full w-full grid-cols-[320px_minmax(0,1fr)] gap-3">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-gradient-to-b from-card to-secondary/30 shadow-sm">
          <div className="space-y-1 border-b border-border/80 px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <Workflow className="h-3.5 w-3.5" />
              {t("traceDialog.structureTree")}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("traceDialog.graphHint")}
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleRootClick}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  !currentScope && !activeTrackId
                    ? "bg-[rgba(var(--process-flow-main-rgb),0.12)] text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className="font-medium">{t("traceDialog.root")}</span>
                <span className="text-[10px] font-mono uppercase tracking-wide">
                  {t("traceDialog.trackCount", { count: tracks.length })}
                </span>
              </button>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 p-2">
              {treeRows.length === 0 && (
                <div className="rounded-md px-3 py-2 text-sm text-muted-foreground">
                  {t("traceDialog.noTracks")}
                </div>
              )}
              {treeRows.map((row) => {
                const isActive = activeTrackId === row.track.id;
                const isInScope = scopeStack.some(
                  (scope) => scope.trackId === row.track.id,
                );
                const typeMeta =
                  TRACK_TYPE_META[row.track.type] ?? TRACK_TYPE_META.customized;

                return (
                  <button
                    key={row.track.id}
                    type="button"
                    onClick={() => handleTreeTrackClick(row.track.id)}
                    className={cn(
                      "group relative flex w-full items-center gap-2 rounded-lg border border-transparent py-1.5 pr-2 text-left transition-colors",
                      isActive
                        ? "border-[rgba(var(--process-flow-main-rgb),0.35)] bg-[rgba(var(--process-flow-main-rgb),0.13)]"
                        : "hover:border-border/80 hover:bg-muted/60",
                      isInScope && !isActive && "bg-muted/45",
                    )}
                    style={{ paddingLeft: `${10 + row.depth * 16}px` }}
                  >
                    <span
                      className="flex h-5 w-4 items-center justify-center text-muted-foreground"
                      onClick={(event) => {
                        if (!row.hasChildren) return;
                        event.stopPropagation();
                        handleToggleTreeRow(row.track.id);
                      }}
                    >
                      {row.hasChildren ? (
                        row.collapsed ? (
                          <ChevronRight className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-border" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        typeMeta.dotClassName,
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-foreground">
                        {row.track.name}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {formatTrackTime(row.track.start_time)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        typeMeta.badgeClassName,
                      )}
                    >
                      {typeMeta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="h-full min-w-0 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <ReactFlow
            key={currentScope?.trackId ?? "root"}
            proOptions={{ hideAttribution: true }}
            defaultNodes={graphNodes}
            defaultEdges={initialEdges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => {
              setSelectedNode(node);
              setNodeDetailDisplayType("llm");
              if (node.id.startsWith("process-")) {
                setActiveTrackId(node.id.replace("process-", ""));
              } else {
                setActiveTrackId(null);
              }
            }}
            onInit={setFlowInstance}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={3}
              pannable
              zoomable
              className="bg-background! border-border!"
            />
            {scopeStack.length > 0 && (
              <Panel
                className="flex items-center gap-1 rounded-md bg-primary-foreground px-3 py-1.5 text-sm text-foreground shadow-sm"
                position="top-center"
              >
                <button
                  type="button"
                  className="text-muted-foreground hover:underline"
                  onClick={() => handleBreadcrumbClick(-1)}
                >
                  {t("traceDialog.root")}
                </button>
                {scopeStack.map((scope, i) => (
                  <Fragment key={scope.trackId}>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <button
                      type="button"
                      className={cn(
                        "hover:underline",
                        i === scopeStack.length - 1
                          ? "font-semibold"
                          : "text-muted-foreground",
                      )}
                      onClick={() => handleBreadcrumbClick(i)}
                    >
                      {scope.trackName}
                    </button>
                  </Fragment>
                ))}
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
      <Sheet open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        {selectedNode &&
          (selectedNode.id === "input" || selectedNode.id === "output") && (
            <SheetContent className="p-4 max-w-[40vw] md:max-w-[480px] max-h-[calc(100vh-2rem)] overflow-auto">
              <SheetHeader>
                <SheetTitle>
                  {selectedNode.id === "input"
                    ? t("traceDialog.input")
                    : t("traceDialog.output")}
                </SheetTitle>
              </SheetHeader>
              <FunctionIOCard
                data={
                  (selectedNode.id === "input"
                    ? selectedNode.data.input
                    : selectedNode.data.output) as
                    | string
                    | Record<string, unknown>
                    | undefined
                }
                labelTitle={
                  selectedNode.id === "input"
                    ? t("traceDialog.input")
                    : t("traceDialog.output")
                }
                errorInfo={
                  selectedNode.data.errorInfo as string | undefined
                }
              />
            </SheetContent>
          )}
        {selectedNode &&
          selectedNode.id !== "input" &&
          selectedNode.id !== "output" && (
            <SheetContent className="p-4 max-w-[40vw] md:max-w-[480px] max-h-[calc(100vh-2rem)] overflow-auto">
              <SheetHeader>
                <SheetTitle>
                  {
                    (selectedNode.data.title ??
                      t("traceDialog.step")) as string
                  }
                </SheetTitle>
              </SheetHeader>
              {selectedNodeHasChildren && (
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() =>
                    handleEnterExecution(
                      selectedNode.id.replace("process-", ""),
                      selectedNode.data.title as string,
                    )
                  }
                >
                  {t("traceDialog.enterExecution")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  variant="link"
                  className={
                    nodeDetailDisplayType === "llm"
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }
                  onClick={() => {
                    setNodeDetailDisplayType("llm");
                  }}
                >
                  <Label>{t("traceDialog.llmInputOutput")}</Label>
                </Button>
                <Button
                  variant="link"
                  className={
                    nodeDetailDisplayType === "fn"
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }
                  onClick={() => {
                    setNodeDetailDisplayType("fn");
                  }}
                >
                  <Label>{t("traceDialog.stepFunctionInputOutput")}</Label>
                </Button>
              </div>
              {nodeDetailDisplayType === "llm" &&
                (selectedNode.data.llm_inputs ||
                selectedNode.data.llm_outputs ? (
                  <div className="flex flex-col gap-4">
                    <LLMJsonCard
                      jsonObject={
                        selectedNode.data.llm_inputs as Record<string, unknown>
                      }
                      labelTitle={t("traceDialog.input")}
                    />
                    <LLMJsonCard
                      jsonObject={
                        selectedNode.data.llm_outputs as Record<
                          string,
                          unknown
                        >
                      }
                      labelTitle={t("traceDialog.output")}
                    />
                  </div>
                ) : (
                  t("traceDialog.noLLMTracked", {
                    title: selectedNode.data.title,
                  })
                ))}
              {nodeDetailDisplayType === "fn" &&
                (selectedNode.data.fn_inputs || selectedNode.data.fn_output ? (
                  <div className="flex flex-col gap-4">
                    <FunctionIOCard
                      data={
                        selectedNode.data.fn_inputs as
                          | Record<string, unknown>
                          | undefined
                      }
                      labelTitle={t("traceDialog.input")}
                    />
                    <FunctionIOCard
                      data={
                        selectedNode.data.fn_output as
                          | string
                          | Record<string, unknown>
                          | undefined
                      }
                      labelTitle={t("traceDialog.output")}
                      errorInfo={
                        selectedNode.data.errorInfo as string | undefined
                      }
                    />
                  </div>
                ) : (
                  t("traceDialog.noFunctionTracked", {
                    title: selectedNode.data.title,
                  })
                ))}
            </SheetContent>
          )}
      </Sheet>
    </div>
  );
}




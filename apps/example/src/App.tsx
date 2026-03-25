//
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  NodeResizer,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeProps,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useControls, folder, button, Leva, levaStore } from "leva";
import { useEdgeRouting, resolveCollisions, type ConnectorType } from "reactflow-edge-routing";
import { RoutedEdge } from "./RoutedEdge";
import { EditableRoutedEdge } from "./editable-edge";
import { createEnrichNode } from "./enrichNode";
import { runAutoLayout, type LayoutDirection, type LayoutAlgorithmName, type ElkMode } from "./auto-layout";
import { expandGroups } from "./expandGroups";

// Data imports
import { basicNodes, basicEdges } from "./data/initialElementsBasic";
import { nodes as groupNodes, edges as groupEdges } from "./data/initialElements";
import { subflowNodes, subflowEdges } from "./data/initialElementsSubflows";
import { dagNodes, dagEdges } from "./data/initialElementsDAG";
import { treeNodes, treeEdges } from "./data/initialElementsTree";
import { stressNodes, stressEdges } from "./data/initialElementsStress";
import { elkNodes, elkEdges } from "./data/initialElementsElk";
import { autoLayoutGroupNodes, autoLayoutGroupEdges } from "./data/initialElementsAutoLayoutGroups";
import { editableEdgeNodes, editableEdgeEdges } from "./data/initialElementsEditableEdge";

// ---------------------------------------------------------------------------
// Custom multi-handle nodes
// ---------------------------------------------------------------------------

function pinYs(h: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    Math.round((h * (i + 1)) / (count + 1) * 10) / 10
  );
}

const SPLIT_W = 80, SPLIT_H = 70;
const [splitInY] = pinYs(SPLIT_H, 1);
const [splitOutY1, splitOutY2, splitOutY3] = pinYs(SPLIT_H, 3);

const SplitterNode = memo((_props: NodeProps) => (
  <div style={{ width: SPLIT_W, height: SPLIT_H, position: "relative", borderRadius: 8 }}>
    <svg viewBox={`0 0 ${SPLIT_W} ${SPLIT_H}`} width={SPLIT_W} height={SPLIT_H}>
      <rect x={0} y={0} width={SPLIT_W} height={SPLIT_H} rx={6} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} />
      <text x={SPLIT_W / 2} y={SPLIT_H / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#1d4ed8" fontWeight="bold" fontFamily="sans-serif">Split</text>
    </svg>
    <Handle id="in" type="target" position={Position.Left} style={{ left: 0, top: splitInY, width: 8, height: 8, background: "#3b82f6", border: "2px solid #1d4ed8", transform: "translate(-50%, -50%)" }} />
    <Handle id="out-0" type="source" position={Position.Right} style={{ left: SPLIT_W, top: splitOutY1, width: 8, height: 8, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
    <Handle id="out-1" type="source" position={Position.Right} style={{ left: SPLIT_W, top: splitOutY2, width: 8, height: 8, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
    <Handle id="out-2" type="source" position={Position.Right} style={{ left: SPLIT_W, top: splitOutY3, width: 8, height: 8, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
  </div>
));

const MERGE_W = 80, MERGE_H = 70;
const [mergeInY1, mergeInY2, mergeInY3] = pinYs(MERGE_H, 3);
const [mergeOutY] = pinYs(MERGE_H, 1);

const MergerNode = memo((_props: NodeProps) => (
  <div style={{ width: MERGE_W, height: MERGE_H, position: "relative", borderRadius: 8 }}>
    <svg viewBox={`0 0 ${MERGE_W} ${MERGE_H}`} width={MERGE_W} height={MERGE_H}>
      <rect x={0} y={0} width={MERGE_W} height={MERGE_H} rx={6} fill="#fef3c7" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={MERGE_W / 2} y={MERGE_H / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#92400e" fontWeight="bold" fontFamily="sans-serif">Merge</text>
    </svg>
    <Handle id="in-0" type="target" position={Position.Left} style={{ left: 0, top: mergeInY1, width: 8, height: 8, background: "#f59e0b", border: "2px solid #92400e", transform: "translate(-50%, -50%)" }} />
    <Handle id="in-1" type="target" position={Position.Left} style={{ left: 0, top: mergeInY2, width: 8, height: 8, background: "#f59e0b", border: "2px solid #92400e", transform: "translate(-50%, -50%)" }} />
    <Handle id="in-2" type="target" position={Position.Left} style={{ left: 0, top: mergeInY3, width: 8, height: 8, background: "#f59e0b", border: "2px solid #92400e", transform: "translate(-50%, -50%)" }} />
    <Handle id="out" type="source" position={Position.Right} style={{ left: MERGE_W, top: mergeOutY, width: 8, height: 8, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
  </div>
));

const PROC_W = 100, PROC_H = 60;
const [procInY1, procInY2] = pinYs(PROC_H, 2);
const [procOutY1, procOutY2] = pinYs(PROC_H, 2);

const ProcessNode = memo(({ data }: NodeProps) => (
  <div style={{ width: PROC_W, height: PROC_H, position: "relative", borderRadius: 8 }}>
    <svg viewBox={`0 0 ${PROC_W} ${PROC_H}`} width={PROC_W} height={PROC_H}>
      <rect x={0} y={0} width={PROC_W} height={PROC_H} rx={6} fill="#e0e7ff" stroke="#6366f1" strokeWidth={1.5} />
      <text x={PROC_W / 2} y={PROC_H / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#4338ca" fontWeight="bold" fontFamily="sans-serif">
        {(data as { label?: string })?.label ?? "Process"}
      </text>
    </svg>
    <Handle id="in-0" type="target" position={Position.Left} style={{ left: 0, top: procInY1, width: 8, height: 8, background: "#6366f1", border: "2px solid #4338ca", transform: "translate(-50%, -50%)" }} />
    <Handle id="in-1" type="target" position={Position.Left} style={{ left: 0, top: procInY2, width: 8, height: 8, background: "#6366f1", border: "2px solid #4338ca", transform: "translate(-50%, -50%)" }} />
    <Handle id="out-0" type="source" position={Position.Right} style={{ left: PROC_W, top: procOutY1, width: 8, height: 8, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
    <Handle id="out-1" type="source" position={Position.Right} style={{ left: PROC_W, top: procOutY2, width: 8, height: 8, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
  </div>
));

// Generic multi-handle node — reads handle counts + style from data
const BASIC_W = 140, BASIC_H = 50;

const BasicMultiNode = memo(({ data }: NodeProps) => {
  const d = data as {
    label?: string;
    sources?: number;
    targets?: number;
    borderColor?: string;
    borderRadius?: number;
    fill?: string;
    textColor?: string;
    opacity?: number;
  };
  const sources = d.sources ?? 0;
  const targets = d.targets ?? 0;
  const w = BASIC_W;
  const h = BASIC_H;
  const borderColor = d.borderColor ?? "#64748b";
  const radius = d.borderRadius ?? 6;
  const fill = d.fill ?? "#f8fafc";
  const textColor = d.textColor ?? "#1e293b";
  const tgtYs = pinYs(h, targets);
  const srcYs = pinYs(h, sources);

  return (
    <div style={{ width: w, height: h, position: "relative", opacity: d.opacity ?? 1 }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
        <rect x={0} y={0} width={w} height={h} rx={radius} fill={fill} stroke={borderColor} strokeWidth={1.5} />
        <text x={w / 2} y={h / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill={textColor} fontWeight="600" fontFamily="sans-serif">
          {d.label ?? "Node"}
        </text>
      </svg>
      {tgtYs.map((y, i) => (
        <Handle key={`in-${i}`} id={`in-${i}`} type="target" position={Position.Left}
          style={{ left: 0, top: y, width: 7, height: 7, background: borderColor, border: `2px solid ${borderColor}`, transform: "translate(-50%, -50%)" }} />
      ))}
      {srcYs.map((y, i) => (
        <Handle key={`out-${i}`} id={`out-${i}`} type="source" position={Position.Right}
          style={{ left: w, top: y, width: 7, height: 7, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
      ))}
    </div>
  );
});

// Group node with resizer
const GroupNode = memo(({ selected }: NodeProps) => (
  <div style={{ width: "100%", height: "100%", position: "relative" }}>
    <NodeResizer isVisible={selected} minWidth={100} minHeight={100} />
  </div>
));

// ---------------------------------------------------------------------------
// Handle positions by layout direction
// ---------------------------------------------------------------------------

function handlePositionsForDirection(dir: LayoutDirection): { src: Position; tgt: Position } {
  switch (dir) {
    case "LR": return { src: Position.Right, tgt: Position.Left };
    case "RL": return { src: Position.Left, tgt: Position.Right };
    case "TB": return { src: Position.Bottom, tgt: Position.Top };
    case "BT": return { src: Position.Top, tgt: Position.Bottom };
  }
}

// ---------------------------------------------------------------------------
// Example definitions
// ---------------------------------------------------------------------------

type ExampleKey = "basic" | "multi-handle" | "groups" | "subflows" | "dag" | "tree" | "auto-layout" | "auto-layout-groups" | "stress" | "editable-edge";

interface ExampleDef {
  key: ExampleKey;
  label: string;
  nodes: Node[];
  edges: Edge[];
  layout?: { direction?: LayoutDirection; elkMode?: ElkMode; spacing?: number; algorithm?: LayoutAlgorithmName };
  skipLayout?: boolean;
}

const EXAMPLES: ExampleDef[] = [
  { key: "basic", label: "Basic", nodes: basicNodes, edges: basicEdges, skipLayout: false },
  { key: "multi-handle", label: "Multi-Handle", skipLayout: true, nodes: [
    { id: "split", type: "splitter", position: { x: 50, y: 100 }, data: {} },
    { id: "procA", type: "process", position: { x: 280, y: 30 }, data: { label: "Proc A" } },
    { id: "procB", type: "process", position: { x: 280, y: 180 }, data: { label: "Proc B" } },
    { id: "procC", type: "process", position: { x: 280, y: 330 }, data: { label: "Proc C" } },
    { id: "merge", type: "merger", position: { x: 520, y: 100 }, data: {} },
  ], edges: ((): Edge[] => {
    const mk = (color: string) => ({ type: MarkerType.ArrowClosed, width: 12, height: 12, color });
    const e = (id: string, source: string, sh: string, target: string, th: string, color: string): Edge => ({
      id, source, sourceHandle: sh, target, targetHandle: th, type: "routed",
      markerEnd: mk(color),
      data: { strokeColor: color },
    });
    return [
      e("e-split-a", "split", "out-0", "procA", "in-0", "#3b82f6"),
      e("e-split-b", "split", "out-1", "procB", "in-0", "#f59e0b"),
      e("e-split-c", "split", "out-2", "procC", "in-0", "#ef4444"),
      e("e-a-merge", "procA", "out-0", "merge", "in-0", "#3b82f6"),
      e("e-b-merge", "procB", "out-0", "merge", "in-1", "#f59e0b"),
      e("e-c-merge", "procC", "out-0", "merge", "in-2", "#ef4444"),
      e("e-a-b",     "procA", "out-1", "procB", "in-1", "#8b5cf6"),
    ];
  })()},
  { key: "groups", label: "Groups", nodes: groupNodes, edges: groupEdges, skipLayout: true },
  { key: "subflows", label: "Subflows", nodes: subflowNodes, edges: subflowEdges, skipLayout: true },
  { key: "dag", label: "DAG", nodes: dagNodes, edges: dagEdges, layout: { direction: "TB", elkMode: "layered", spacing: 30 } },
  { key: "tree", label: "Tree", nodes: treeNodes, edges: treeEdges, layout: { direction: "TB", elkMode: "mrtree", spacing: 20 } },
  { key: "auto-layout", label: "Auto Layout", nodes: elkNodes, edges: elkEdges, layout: { direction: "LR", elkMode: "mrtree", spacing: 30 } },
  { key: "auto-layout-groups", label: "Layout+Groups", nodes: autoLayoutGroupNodes, edges: autoLayoutGroupEdges, layout: { direction: "LR", elkMode: "layered", spacing: 30 } },
  { key: "stress", label: "Stress (200)", nodes: stressNodes, edges: stressEdges, skipLayout: true },
  { key: "editable-edge", label: "Editable Edge", nodes: editableEdgeNodes, edges: editableEdgeEdges, skipLayout: true },
];

// ---------------------------------------------------------------------------
// Node / edge types
// ---------------------------------------------------------------------------

const nodeTypes = {
  splitter: SplitterNode,
  merger: MergerNode,
  process: ProcessNode,
  group: GroupNode,
  basicMulti: BasicMultiNode,
};

const edgeTypes = { routed: RoutedEdge, "editable-routed": EditableRoutedEdge };

// ---------------------------------------------------------------------------
// Flow canvas
// ---------------------------------------------------------------------------

function FlowCanvas() {
  const [activeExample, setActiveExample] = useState<ExampleKey>("basic");
  const [nodes, setNodes] = useState<Node[]>(EXAMPLES[0].nodes);
  const [edges, setEdges] = useState<Edge[]>(EXAMPLES[0].edges);
  const { getInternalNode, fitView } = useReactFlow();
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const resetRoutingRef = useRef<() => void>(() => {});
  const withMeasuredRef = useRef<(nds: Node[]) => Node[]>((nds) => nds);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Switch example — run layout, resolve collisions, reset routing
  useEffect(() => {
    const ex = EXAMPLES.find((e) => e.key === activeExample)!;
    const doSwitch = async () => {
      let prepared = expandGroups(ex.nodes);
      const dir = ex.layout?.direction ?? "LR";
      if (!ex.skipLayout && ex.layout) {
        prepared = await runAutoLayout(prepared, ex.edges, {
          algorithm: ex.layout.algorithm ?? "elk",
          direction: dir,
          spacing: ex.layout.spacing ?? 20,
          elkMode: ex.layout.elkMode ?? "mrtree",
        });
        prepared = expandGroups(prepared);
        prepared = resolveCollisions(prepared, { maxIterations: 50, overlapThreshold: 0.5, margin: 20 });
      }
      // Set handle positions based on layout direction
      const { src, tgt } = handlePositionsForDirection(dir);
      prepared = prepared.map((n) => n.type === "group" ? n : { ...n, sourcePosition: src, targetPosition: tgt });
      setNodes(prepared);
      setEdges(ex.edges);
      setTimeout(() => {
        resetRoutingRef.current();
        fitView({ padding: 0.15 });
      }, 150);
    };
    doSwitch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExample]);

  // Leva routing settings
  const {
    connectorType, edgeToEdgeSpacing, edgeToNodeSpacing, handleSpacing,
    edgeRounding, diagramGridSize, stubSize, shouldSplitEdgesNearHandle, segmentPenalty, anglePenalty, reverseDirectionPenalty,
    crossingPenalty, hateCrossings, pinInsideOffset,
    nudgeOrthogonalSegmentsConnectedToShapes, nudgeSharedPathsWithCommonEndPoint,
    performUnifyingNudgingPreprocessingStep, nudgeOrthogonalTouchingColinearSegments,
    debounceMs, realTimeRouting, autoBestSideConnection, hideHandles, routeOnlyWhenBlocked,
  } = useControls("Routing", {
    connectorType: { value: "orthogonal" as ConnectorType, options: ["orthogonal", "bezier"] as ConnectorType[], label: "Edge Style" },
    edgeRounding: { value: 0, min: 0, max: 48, step: 1, label: "Rounding" },
    edgeToEdgeSpacing: { value: 6, min: 0, max: 50, step: 1, label: "Edge↔Edge" },
    edgeToNodeSpacing: { value: 8, min: 0, max: 48, step: 1, label: "Edge↔Node" },
    diagramGridSize: { value: 0, min: 0, max: 48, step: 1, label: "Grid Size" },
    stubSize: { value: 12, min: 0, max: 60, step: 1, label: "Stub Size" },
    shouldSplitEdgesNearHandle: { value: true, label: "Split Near Handle" },
    autoBestSideConnection: { value: false, label: "Auto Best Side" },
    hateCrossings: { value: false, label: "Avoid Crossings" },
    routeOnlyWhenBlocked: { value: true, label: "Route Only When Blocked" },
    hideHandles: { value: true, label: "Hide Handles" },
    realTimeRouting: { value: false, label: "Route While Dragging" },
    "Spacing": folder({
      handleSpacing: { value: 6, min: 1, max: 60, step: 1, label: "Handle" },
      pinInsideOffset: { value: 0, min: 0, max: 20, step: 1, label: "Pin Offset" },
    }, { collapsed: true }),
    "Penalties": folder({
      segmentPenalty: { value: 10, min: 0, max: 100, step: 1, label: "Segment" },
      anglePenalty: { value: 0, min: 0, max: 100, step: 1, label: "Angle" },
      reverseDirectionPenalty: { value: 0, min: 0, max: 100, step: 1, label: "Reverse" },
      crossingPenalty: { value: 0, min: 0, max: 200, step: 1, label: "Crossing" },
    }, { collapsed: true }),
    "Nudging": folder({
      nudgeOrthogonalSegmentsConnectedToShapes: { value: true, label: "At Shapes" },
      nudgeSharedPathsWithCommonEndPoint: { value: true, label: "Shared Paths" },
      performUnifyingNudgingPreprocessingStep: { value: true, label: "Unify First" },
      nudgeOrthogonalTouchingColinearSegments: { value: false, label: "Colinear" },
    }, { collapsed: true }),
    "Performance": folder({
      debounceMs: { value: 0, min: 0, max: 200, step: 5, label: "Debounce (ms)" },
    }, { collapsed: true }),
  });

  // Leva layout settings
  const layoutControls = useControls("Layout", {
    algorithm: { value: "elk" as LayoutAlgorithmName, options: ["elk", "dagre"] as LayoutAlgorithmName[], label: "Algorithm" },
    elkMode: { value: "mrtree" as ElkMode, options: ["layered", "stress", "mrtree", "force", "radial"] as ElkMode[], label: "ELK Mode" },
    direction: { value: "LR" as LayoutDirection, options: { "→ Right": "LR", "↓ Down": "TB", "← Left": "RL", "↑ Up": "BT" } as Record<string, LayoutDirection>, label: "Direction" },
    spacing: { value: 20, min: 10, max: 200, step: 10, label: "Spacing" },
    resolveOverlaps: { value: true, label: "Fix Overlaps" },
    "Run Layout": button(async (get) => {
      const algo = get("Layout.algorithm") as LayoutAlgorithmName;
      const elkM = get("Layout.elkMode") as ElkMode;
      const dir = get("Layout.direction") as LayoutDirection;
      const sp = get("Layout.spacing") as number;
      const fix = get("Layout.resolveOverlaps") as boolean;
      let laid = await runAutoLayout(nodesRef.current, edgesRef.current, { algorithm: algo, direction: dir, spacing: sp, elkMode: elkM });
      laid = expandGroups(laid);
      if (fix) laid = resolveCollisions(laid, { maxIterations: 50, overlapThreshold: 0.5, margin: 20 });
      const { src, tgt } = handlePositionsForDirection(dir);
      laid = laid.map((n) => n.type === "group" ? n : { ...n, sourcePosition: src, targetPosition: tgt });
      setNodes(laid);
      setTimeout(() => {
        resetRoutingRef.current();
        fitView({ padding: 0.15 });
      }, 150);
    }),
  });

  const enrichNode = useMemo(() => createEnrichNode(getInternalNode), [getInternalNode]);

  useEffect(() => {
    if (connectorType === "bezier") {
      levaStore.set({ "Routing.edgeToEdgeSpacing": 0, "Routing.edgeToNodeSpacing": 12, "Routing.shouldSplitEdgesNearHandle": false }, false);
    } else {
      levaStore.set({ "Routing.edgeToEdgeSpacing": 6, "Routing.edgeToNodeSpacing": 8, "Routing.shouldSplitEdgesNearHandle": true }, false);
    }
    setTimeout(() => resetRoutingRef.current(), 50);
  }, [connectorType]);

  const { updateRoutingOnNodesChange, resetRouting } = useEdgeRouting(nodes, edges, {
    connectorType,
    edgeToEdgeSpacing,
    edgeToNodeSpacing,
    handleSpacing, edgeRounding, diagramGridSize, stubSize, shouldSplitEdgesNearHandle,
    segmentPenalty, anglePenalty, reverseDirectionPenalty, crossingPenalty,
    hateCrossings, pinInsideOffset, autoBestSideConnection, routeOnlyWhenBlocked,
    nudgeOrthogonalSegmentsConnectedToShapes, nudgeSharedPathsWithCommonEndPoint,
    performUnifyingNudgingPreprocessingStep, nudgeOrthogonalTouchingColinearSegments,
    debounceMs, realTimeRouting, enrichNode,
  });
  resetRoutingRef.current = resetRouting;


  const onNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    updateRoutingOnNodesChange(changes);
  }, [updateRoutingOnNodesChange]);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, type: "routed" }, eds));
  }, []);

  // Sync measured dimensions from React Flow's internal store into user nodes
  const withMeasured = useCallback((nds: Node[]) =>
    nds.map((n) => {
      const internal = getInternalNode(n.id);
      if (internal?.measured?.width && internal?.measured?.height) {
        return { ...n, measured: internal.measured };
      }
      return n;
    }),
  [getInternalNode]);
  withMeasuredRef.current = withMeasured;

  const onNodeDragStop = useCallback(() => {
    if (layoutControls.resolveOverlaps) {
      setNodes((nds) => resolveCollisions(withMeasured(nds), { maxIterations: 50, overlapThreshold: 0.5, margin: 20 }));
    }
    // Wait for React Flow to internalize updated positions, then re-route
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resetRouting();
    }));
  }, [layoutControls.resolveOverlaps, resetRouting, setNodes, withMeasured]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, padding: "6px 10px", background: "#1e293b", flexShrink: 0, overflowX: "auto" }}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.key}
            onClick={() => setActiveExample(ex.key)}
            style={{
              padding: "5px 12px",
              fontSize: 12,
              fontFamily: "sans-serif",
              fontWeight: activeExample === ex.key ? 600 : 400,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              background: activeExample === ex.key ? "#3b82f6" : "transparent",
              color: activeExample === ex.key ? "#fff" : "#94a3b8",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }} className={hideHandles ? "hide-handles" : ""}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

export default function App() {
  return (
    <ReactFlowProvider>
      <Leva
        titleBar={{ title: "\u2699\uFE0F Edge Routing Settings" }}
        collapsed={isMobile}
        theme={{ sizes: { rootWidth: isMobile ? "280px" : "360px" } }}
      />
      <style>{`
        .hide-handles .react-flow__handle { visibility: hidden; }
        div[class*="leva-"] label > div {
          overflow: visible !important;
          text-overflow: unset !important;
          white-space: normal !important;
          word-break: break-word !important;
          line-height: 1.3 !important;
        }
        div[class*="leva-"] label input[type="checkbox"] {
          width: 18px !important;
          height: 18px !important;
        }
        div[class*="leva-"] label svg {
          width: 18px !important;
          height: 18px !important;
        }
        @media (max-width: 767px) {
          div[class*="leva-c-kWgxhW"] {
            top: 44px !important;
            right: 4px !important;
            left: auto !important;
            width: auto !important;
            max-width: calc(100vw - 8px) !important;
            max-height: calc(100vh - 54px) !important;
          }
        }
      `}</style>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}

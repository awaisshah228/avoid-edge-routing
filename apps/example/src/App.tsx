import { memo, useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useControls, folder, Leva } from "leva";
import { useEdgeRouting, type ConnectorType } from "edge-routing";
import { RoutedEdge } from "./RoutedEdge";
import { createEnrichNode } from "./enrichNode";

// ---------------------------------------------------------------------------
// Custom multi-handle nodes (demonstrates pin-accurate routing)
// ---------------------------------------------------------------------------

/** Evenly space N pins within a side (4px padding top/bottom). */
function pinYs(h: number, count: number): number[] {
  const bodyY = 4;
  const bodyH = h - 8;
  return Array.from({ length: count }, (_, i) =>
    Math.round((bodyY + (bodyH * (i + 1)) / (count + 1)) * 10) / 10
  );
}

// --- Node dimensions (declared early so pin registry can reference them) ---
const SPLIT_W = 80;
const SPLIT_H = 70;
const [splitInY] = pinYs(SPLIT_H, 1);
const [splitOutY1, splitOutY2, splitOutY3] = pinYs(SPLIT_H, 3);

const SplitterNode = memo(({ selected }: NodeProps) => (
  <div style={{ width: SPLIT_W, height: SPLIT_H, position: "relative", borderRadius: 8, outline: selected ? "2px solid #6366f1" : undefined, outlineOffset: 2 }}>
    <svg viewBox={`0 0 ${SPLIT_W} ${SPLIT_H}`} width={SPLIT_W} height={SPLIT_H}>
      <rect x={4} y={4} width={SPLIT_W - 8} height={SPLIT_H - 8} rx={6} fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} />
      <text x={SPLIT_W / 2} y={SPLIT_H / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#1d4ed8" fontWeight="bold" fontFamily="sans-serif">Split</text>
    </svg>
    <Handle id="in" type="target" position={Position.Left} style={{ left: 0, top: splitInY, width: 8, height: 8, background: "#3b82f6", border: "2px solid #1d4ed8", transform: "translate(-50%, -50%)" }} />
    <Handle id="out-0" type="source" position={Position.Right} style={{ left: SPLIT_W, top: splitOutY1, width: 8, height: 8, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
    <Handle id="out-1" type="source" position={Position.Right} style={{ left: SPLIT_W, top: splitOutY2, width: 8, height: 8, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
    <Handle id="out-2" type="source" position={Position.Right} style={{ left: SPLIT_W, top: splitOutY3, width: 8, height: 8, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
  </div>
));

// --- Merger: 3 inputs left, 1 output right ---
const MERGE_W = 80;
const MERGE_H = 70;
const [mergeInY1, mergeInY2, mergeInY3] = pinYs(MERGE_H, 3);
const [mergeOutY] = pinYs(MERGE_H, 1);

const MergerNode = memo(({ selected }: NodeProps) => (
  <div style={{ width: MERGE_W, height: MERGE_H, position: "relative", borderRadius: 8, outline: selected ? "2px solid #6366f1" : undefined, outlineOffset: 2 }}>
    <svg viewBox={`0 0 ${MERGE_W} ${MERGE_H}`} width={MERGE_W} height={MERGE_H}>
      <rect x={4} y={4} width={MERGE_W - 8} height={MERGE_H - 8} rx={6} fill="#fef3c7" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={MERGE_W / 2} y={MERGE_H / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#92400e" fontWeight="bold" fontFamily="sans-serif">Merge</text>
    </svg>
    <Handle id="in-0" type="target" position={Position.Left} style={{ left: 0, top: mergeInY1, width: 8, height: 8, background: "#f59e0b", border: "2px solid #92400e", transform: "translate(-50%, -50%)" }} />
    <Handle id="in-1" type="target" position={Position.Left} style={{ left: 0, top: mergeInY2, width: 8, height: 8, background: "#f59e0b", border: "2px solid #92400e", transform: "translate(-50%, -50%)" }} />
    <Handle id="in-2" type="target" position={Position.Left} style={{ left: 0, top: mergeInY3, width: 8, height: 8, background: "#f59e0b", border: "2px solid #92400e", transform: "translate(-50%, -50%)" }} />
    <Handle id="out" type="source" position={Position.Right} style={{ left: MERGE_W, top: mergeOutY, width: 8, height: 8, background: "#22c55e", border: "2px solid #16a34a", transform: "translate(-50%, -50%)" }} />
  </div>
));

// --- Process: 2 inputs left, 2 outputs right ---
const PROC_W = 100;
const PROC_H = 60;
const [procInY1, procInY2] = pinYs(PROC_H, 2);
const [procOutY1, procOutY2] = pinYs(PROC_H, 2);

const ProcessNode = memo(({ data, selected }: NodeProps) => (
  <div style={{ width: PROC_W, height: PROC_H, position: "relative", borderRadius: 8, outline: selected ? "2px solid #6366f1" : undefined, outlineOffset: 2 }}>
    <svg viewBox={`0 0 ${PROC_W} ${PROC_H}`} width={PROC_W} height={PROC_H}>
      <rect x={4} y={4} width={PROC_W - 8} height={PROC_H - 8} rx={6} fill="#e0e7ff" stroke="#6366f1" strokeWidth={1.5} />
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

// ---------------------------------------------------------------------------
// Node / edge types
// ---------------------------------------------------------------------------

const nodeTypes = {
  splitter: SplitterNode,
  merger: MergerNode,
  process: ProcessNode,
};

const edgeTypes = { routed: RoutedEdge };

// ---------------------------------------------------------------------------
// Initial data
// ---------------------------------------------------------------------------

const initialNodes: Node[] = [
  { id: "split", type: "splitter", position: { x: 50, y: 100 }, data: {} },
  { id: "procA", type: "process", position: { x: 280, y: 30 }, data: { label: "Proc A" } },
  { id: "procB", type: "process", position: { x: 280, y: 180 }, data: { label: "Proc B" } },
  { id: "procC", type: "process", position: { x: 280, y: 330 }, data: { label: "Proc C" } },
  { id: "merge", type: "merger", position: { x: 520, y: 100 }, data: {} },
];

const initialEdges: Edge[] = [
  { id: "e-split-a", source: "split", sourceHandle: "out-0", target: "procA", targetHandle: "in-0", type: "routed" },
  { id: "e-split-b", source: "split", sourceHandle: "out-1", target: "procB", targetHandle: "in-0", type: "routed" },
  { id: "e-split-c", source: "split", sourceHandle: "out-2", target: "procC", targetHandle: "in-0", type: "routed" },
  { id: "e-a-merge", source: "procA", sourceHandle: "out-0", target: "merge", targetHandle: "in-0", type: "routed" },
  { id: "e-b-merge", source: "procB", sourceHandle: "out-0", target: "merge", targetHandle: "in-1", type: "routed" },
  { id: "e-c-merge", source: "procC", sourceHandle: "out-0", target: "merge", targetHandle: "in-2", type: "routed" },
  { id: "e-a-b", source: "procA", sourceHandle: "out-1", target: "procB", targetHandle: "in-1", type: "routed" },
];

// ---------------------------------------------------------------------------
// Flow canvas (must be inside ReactFlowProvider)
// ---------------------------------------------------------------------------

function FlowCanvas() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const { getInternalNode } = useReactFlow();

  // ---------------------------------------------------------------------------
  // Leva settings panel — all libavoid options exposed
  // ---------------------------------------------------------------------------
  const {
    connectorType,
    edgeToEdgeSpacing,
    edgeToNodeSpacing,
    handleSpacing,
    edgeRounding,
    segmentPenalty,
    anglePenalty,
    reverseDirectionPenalty,
    crossingPenalty,
    hateCrossings,
    pinInsideOffset,
    nudgeOrthogonalSegmentsConnectedToShapes,
    nudgeSharedPathsWithCommonEndPoint,
    performUnifyingNudgingPreprocessingStep,
    nudgeOrthogonalTouchingColinearSegments,
    debounceMs,
  } = useControls({
    // ---- Important settings (top level) ----
    connectorType: {
      value: "orthogonal" as ConnectorType,
      options: ["orthogonal", "bezier", "polyline"] as ConnectorType[],
      label: "Edge Style",
    },
    edgeToEdgeSpacing: { value: 4, min: 1, max: 40, step: 1, label: "Edge↔Edge" },
    edgeToNodeSpacing: { value: 20, min: 1, max: 60, step: 1, label: "Edge↔Node" },
    edgeRounding: { value: 8, min: 0, max: 30, step: 1, label: "Rounding" },
    hateCrossings: { value: false, label: "Avoid Crossings" },

    // ---- Advanced settings (folders) ----
    "Spacing": folder({
      handleSpacing: { value: 20, min: 1, max: 60, step: 1, label: "Handle" },
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

  // Create enrichNode — reads exact handle positions from DOM via getInternalNode
  const enrichNode = useMemo(
    () => createEnrichNode(getInternalNode),
    [getInternalNode]
  );

  // Wire up libavoid edge routing with all settings from panel
  const { updateRoutingOnNodesChange } = useEdgeRouting(nodes, edges, {
    connectorType,
    edgeToEdgeSpacing,
    edgeToNodeSpacing,
    handleSpacing,
    edgeRounding,
    segmentPenalty,
    anglePenalty,
    reverseDirectionPenalty,
    crossingPenalty,
    hateCrossings,
    pinInsideOffset,
    nudgeOrthogonalSegmentsConnectedToShapes,
    nudgeSharedPathsWithCommonEndPoint,
    performUnifyingNudgingPreprocessingStep,
    nudgeOrthogonalTouchingColinearSegments,
    debounceMs,
    enrichNode,
  });

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      updateRoutingOnNodesChange(changes);
    },
    [updateRoutingOnNodesChange]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: "routed" }, eds));
    },
    []
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App root — wraps in ReactFlowProvider so useReactFlow() works
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <ReactFlowProvider>
      <Leva titleBar={{ title: "Edge Routing" }} />
      <FlowCanvas />
    </ReactFlowProvider>
  );
}

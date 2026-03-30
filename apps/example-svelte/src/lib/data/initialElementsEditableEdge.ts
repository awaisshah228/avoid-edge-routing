import { MarkerType, type Node, type Edge } from "@xyflow/svelte";

export const editableEdgeNodes: Node[] = [
  { id: "a", type: "basicMulti", data: { label: "Node A", sources: 2, targets: 0, borderColor: "#3b82f6", fill: "#eff6ff" }, position: { x: 0, y: 100 } },
  { id: "b", type: "basicMulti", data: { label: "Node B", sources: 1, targets: 1, borderColor: "#8b5cf6", fill: "#f5f3ff" }, position: { x: 320, y: 0 } },
  { id: "c", type: "basicMulti", data: { label: "Blocker", sources: 0, targets: 0, borderColor: "#94a3b8", opacity: 0.6 }, position: { x: 480, y: 100 } },
  { id: "d", type: "basicMulti", data: { label: "Node D", sources: 1, targets: 2, borderColor: "#f59e0b", fill: "#fffbeb" }, position: { x: 320, y: 200 } },
  { id: "e", type: "basicMulti", data: { label: "Node E", sources: 0, targets: 2, borderColor: "#10b981", fill: "#f0fdf4", textColor: "#065f46" }, position: { x: 700, y: 100 } },
];

function ee(id: string, source: string, target: string, sourceHandle: string, targetHandle: string, color: string): Edge {
  return { id, source, target, sourceHandle, targetHandle, type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color }, data: { strokeColor: color } };
}

export const editableEdgeEdges: Edge[] = [
  ee("e-a-b", "a", "b", "out-0", "in-0", "#3b82f6"),
  ee("e-a-d", "a", "d", "out-1", "in-0", "#3b82f6"),
  ee("e-b-e", "b", "e", "out-0", "in-0", "#8b5cf6"),
  ee("e-d-e", "d", "e", "out-0", "in-1", "#f59e0b"),
];

import { MarkerType, type Node, type Edge } from "@xyflow/svelte";

export const subflowNodes: Node[] = [
  { id: "1", data: { label: "Node 0" }, position: { x: 250, y: 5 }, style: "width: 150px; height: 40px;" },
  { id: "2", data: { label: "Group A" }, position: { x: 50, y: 100 }, style: "width: 220px; height: 140px; background-color: rgba(59, 130, 246, 0.05); border: 1px dashed #3b82f6; border-radius: 8px;", type: "group" },
  { id: "2a", data: { label: "Node A.1" }, position: { x: 35, y: 50 }, parentId: "2", expandParent: true, style: "width: 150px; height: 40px;" },
  { id: "3", data: { label: "Node 1" }, position: { x: 380, y: 100 }, style: "width: 150px; height: 40px;" },
  { id: "4", data: { label: "Group B" }, position: { x: 340, y: 200 }, style: "width: 380px; height: 340px; background-color: rgba(34, 197, 94, 0.05); border: 1px dashed #22c55e; border-radius: 8px;", type: "group" },
  { id: "4a", data: { label: "Node B.1" }, position: { x: 30, y: 55 }, parentId: "4", expandParent: true, style: "width: 150px; height: 40px;" },
  { id: "4b", data: { label: "Group B.A" }, position: { x: 30, y: 140 }, style: "background-color: rgba(255, 0, 255, 0.08); height: 170px; width: 320px; border: 1px dashed #d946ef; border-radius: 8px;", parentId: "4", type: "group" },
  { id: "4b1", data: { label: "Node B.A.1" }, position: { x: 30, y: 40 }, parentId: "4b", expandParent: true, style: "width: 110px; height: 40px;" },
  { id: "4b2", data: { label: "Node B.A.2" }, position: { x: 180, y: 100 }, parentId: "4b", expandParent: true, style: "width: 110px; height: 40px;" },
];

const subflowEdgeColors: Record<string, string> = { "1": "#e91e63", "2a": "#2196f3", "3": "#ff9800", "4a": "#009688", "4b1": "#9c27b0" };

function se(id: string, source: string, target: string): Edge {
  const color = subflowEdgeColors[source] ?? "#94a3b8";
  return { id, source, target, type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color }, data: { strokeColor: color } };
}

export const subflowEdges: Edge[] = [
  se("e1-3", "1", "3"), se("e2a-4a", "2a", "4a"), se("e3-4b", "3", "4b1"),
  se("e4a-4b1", "4a", "4b1"), se("e4a-4b2", "4a", "4b2"), se("e4b1-4b2", "4b1", "4b2"),
];

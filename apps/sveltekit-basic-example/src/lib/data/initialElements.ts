import type { Node, Edge } from "@xyflow/svelte";

/**
 * Initial nodes — 2x2 grid layout with a blocker in the centre.
 * Matches the Next.js basic example exactly.
 */
export const initialNodes: Node[] = [
  { id: "1", type: "basic",   position: { x: 100, y: 100 }, data: { label: "Node A" } },
  { id: "2", type: "basic",   position: { x: 100, y: 560 }, data: { label: "Node B" } },
  { id: "3", type: "basic",   position: { x: 660, y: 180 }, data: { label: "Node C" } },
  { id: "4", type: "basic",   position: { x: 860, y: 560 }, data: { label: "Node D" } },
  { id: "5", type: "blocker", position: { x: 490, y: 390 }, data: { label: "Blocker" } },
];

/**
 * Initial edges — all wired right->left so routing honours explicit handles.
 */
export const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", sourceHandle: "right", target: "2", targetHandle: "left", type: "routed" },
  { id: "e1-3", source: "1", sourceHandle: "right", target: "3", targetHandle: "left", type: "routed" },
  { id: "e2-4", source: "2", sourceHandle: "right", target: "4", targetHandle: "left", type: "routed" },
  { id: "e3-4", source: "3", sourceHandle: "right", target: "4", targetHandle: "left", type: "routed" },
];

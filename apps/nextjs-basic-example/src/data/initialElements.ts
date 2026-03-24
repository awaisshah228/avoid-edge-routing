import type { Node, Edge } from "@xyflow/react";

/**
 * Initial nodes — 2×2 grid layout with a blocker in the centre.
 *
 * Node A (top-left) and Node B (bottom-left) on the left.
 * Node C (top-right) and Node D (bottom-right) on the right.
 * The Blocker sits in the centre so the router must go around it.
 */
// Layout:
//
//   Node A (100, 100)               Node C (660, 180)
//
//                     [Blocker (490, 390)]
//
//   Node B (100, 560)               Node D (860, 560)
//
export const initialNodes: Node[] = [
  { id: "1", type: "basic",   position: { x: 100, y: 100 }, data: { label: "Node A" } },
  { id: "2", type: "basic",   position: { x: 100, y: 560 }, data: { label: "Node B" } },
  { id: "3", type: "basic",   position: { x: 660, y: 180 }, data: { label: "Node C" } },
  { id: "4", type: "basic",   position: { x: 860, y: 560 }, data: { label: "Node D" } },
  // Obstacle — no edges, sits in the centre so the router goes around it
  { id: "5", type: "blocker", position: { x: 490, y: 390 }, data: { label: "Blocker" } },
];

/**
 * Initial edges — all wired right→left so routing honours explicit handles.
 * autoBestSideConnection is disabled; the router uses these handle IDs directly.
 */
export const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", sourceHandle: "right", target: "2", targetHandle: "left", type: "routed" },
  { id: "e1-3", source: "1", sourceHandle: "right", target: "3", targetHandle: "left", type: "routed" },
  { id: "e2-4", source: "2", sourceHandle: "right", target: "4", targetHandle: "left", type: "routed" },
  { id: "e3-4", source: "3", sourceHandle: "right", target: "4", targetHandle: "left", type: "routed" },
];

import type { Node, Edge } from "@xyflow/react";

/**
 * Initial nodes — diamond layout with a blocker in the centre.
 *
 * Node A (left) → Node B (top) and Node C (bottom) → Node D (right).
 * The Blocker sits between them so the router must go around it.
 */
export const initialNodes: Node[] = [
  { id: "1", type: "basic",   position: { x: 50,  y: 265 }, data: { label: "Node A" } },
  { id: "2", type: "basic",   position: { x: 500, y: 80  }, data: { label: "Node B" } },
  { id: "3", type: "basic",   position: { x: 500, y: 460 }, data: { label: "Node C" } },
  { id: "4", type: "basic",   position: { x: 950, y: 265 }, data: { label: "Node D" } },
  // Obstacle — no edges attached, just blocks the straight-line paths
  { id: "5", type: "blocker", position: { x: 480, y: 270 }, data: { label: "Blocker" } },
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

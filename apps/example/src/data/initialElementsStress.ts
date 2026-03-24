import { MarkerType, type Node, type Edge } from "@xyflow/react";

const COLS = 20;
const ROWS = 10;
const NODE_W = 120;
const NODE_H = 40;
const GAP_X = 180;
const GAP_Y = 80;

export const stressNodes: Node[] = [];
export const stressEdges: Edge[] = [];

const colors = [
  "#e91e63", "#2196f3", "#ff9800", "#9c27b0", "#009688",
  "#f44336", "#4caf50", "#00bcd4", "#795548", "#3f51b5",
];

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const id = `n-${row}-${col}`;
    stressNodes.push({
      id,
      data: { label: `${row}-${col}` },
      position: { x: col * GAP_X, y: row * GAP_Y },
      style: { width: NODE_W, height: NODE_H },
    });
  }
}

let edgeIdx = 0;

// Horizontal edges (right neighbor)
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS - 1; col++) {
    if ((row + col) % 3 !== 0) continue;
    const src = `n-${row}-${col}`;
    const tgt = `n-${row}-${col + 1}`;
    const color = colors[edgeIdx % colors.length];
    stressEdges.push({
      id: `e-${edgeIdx++}`,
      source: src,
      target: tgt,
      type: "routed",
      markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color },
      data: { strokeColor: color },
    });
  }
}

// Vertical edges (down neighbor)
for (let row = 0; row < ROWS - 1; row++) {
  for (let col = 0; col < COLS; col++) {
    if ((row * 3 + col) % 5 !== 0) continue;
    const src = `n-${row}-${col}`;
    const tgt = `n-${row + 1}-${col}`;
    const color = colors[edgeIdx % colors.length];
    stressEdges.push({
      id: `e-${edgeIdx++}`,
      source: src,
      target: tgt,
      type: "routed",
      markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color },
      data: { strokeColor: color },
    });
  }
}

// Some skip-one edges for cross-routing
for (let row = 0; row < ROWS - 2; row++) {
  for (let col = 0; col < COLS - 2; col++) {
    if ((row + col) % 7 !== 0) continue;
    const src = `n-${row}-${col}`;
    const tgt = `n-${row + 2}-${col + 2}`;
    const color = colors[edgeIdx % colors.length];
    stressEdges.push({
      id: `e-${edgeIdx++}`,
      source: src,
      target: tgt,
      type: "routed",
      markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color },
      data: { strokeColor: color },
    });
  }
}

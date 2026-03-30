import { MarkerType, type Node, type Edge } from "@xyflow/svelte";

const COLS = 20, ROWS = 10, NODE_W = 120, NODE_H = 40, GAP_X = 180, GAP_Y = 80;
export const stressNodes: Node[] = [];
export const stressEdges: Edge[] = [];
const colors = ["#e91e63", "#2196f3", "#ff9800", "#9c27b0", "#009688", "#f44336", "#4caf50", "#00bcd4", "#795548", "#3f51b5"];

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    stressNodes.push({ id: `n-${row}-${col}`, data: { label: `${row}-${col}` }, position: { x: col * GAP_X, y: row * GAP_Y }, style: `width: ${NODE_W}px; height: ${NODE_H}px;` });
  }
}

let edgeIdx = 0;
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS - 1; col++) {
    if ((row + col) % 3 !== 0) continue;
    const color = colors[edgeIdx % colors.length];
    stressEdges.push({ id: `e-${edgeIdx++}`, source: `n-${row}-${col}`, target: `n-${row}-${col + 1}`, type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color }, data: { strokeColor: color } });
  }
}
for (let row = 0; row < ROWS - 1; row++) {
  for (let col = 0; col < COLS; col++) {
    if ((row * 3 + col) % 5 !== 0) continue;
    const color = colors[edgeIdx % colors.length];
    stressEdges.push({ id: `e-${edgeIdx++}`, source: `n-${row}-${col}`, target: `n-${row + 1}-${col}`, type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color }, data: { strokeColor: color } });
  }
}
for (let row = 0; row < ROWS - 2; row++) {
  for (let col = 0; col < COLS - 2; col++) {
    if ((row + col) % 7 !== 0) continue;
    const color = colors[edgeIdx % colors.length];
    stressEdges.push({ id: `e-${edgeIdx++}`, source: `n-${row}-${col}`, target: `n-${row + 2}-${col + 2}`, type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color }, data: { strokeColor: color } });
  }
}

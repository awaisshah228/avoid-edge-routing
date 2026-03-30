import { MarkerType, type Node, type Edge } from "@xyflow/svelte";

export const elkNodes: Node[] = [
  { id: "input", data: { label: "User Input" }, position: { x: 0, y: 0 }, style: "width: 150px; height: 50px; border: 2px solid #818cf8; border-radius: 12px;" },
  { id: "auth", data: { label: "Authenticate" }, position: { x: 0, y: 0 }, style: "width: 140px; height: 50px;" },
  { id: "validate", data: { label: "Validate" }, position: { x: 0, y: 0 }, style: "width: 140px; height: 50px;" },
  { id: "fetch-db", data: { label: "Fetch DB" }, position: { x: 0, y: 0 }, style: "width: 140px; height: 50px;" },
  { id: "fetch-api", data: { label: "Fetch API" }, position: { x: 0, y: 0 }, style: "width: 140px; height: 50px;" },
  { id: "cache", data: { label: "Cache" }, position: { x: 0, y: 0 }, style: "width: 120px; height: 50px; opacity: 0.7;" },
  { id: "merge", data: { label: "Merge Results" }, position: { x: 0, y: 0 }, style: "width: 150px; height: 50px;" },
  { id: "transform", data: { label: "Transform" }, position: { x: 0, y: 0 }, style: "width: 140px; height: 50px;" },
  { id: "filter", data: { label: "Filter" }, position: { x: 0, y: 0 }, style: "width: 120px; height: 50px;" },
  { id: "format", data: { label: "Format" }, position: { x: 0, y: 0 }, style: "width: 120px; height: 50px;" },
  { id: "respond", data: { label: "Respond" }, position: { x: 0, y: 0 }, style: "width: 140px; height: 50px; border: 2px solid #4ade80; border-radius: 12px;" },
  { id: "log", data: { label: "Log" }, position: { x: 0, y: 0 }, style: "width: 100px; height: 50px;" },
  { id: "error", data: { label: "Error" }, position: { x: 0, y: 0 }, style: "width: 120px; height: 50px; border: 2px solid #f87171; border-radius: 12px;" },
];

const elkEdgeColors: Record<string, string> = { "input": "#e91e63", "auth": "#2196f3", "validate": "#ff9800", "fetch-db": "#009688", "fetch-api": "#9c27b0", "cache": "#4caf50", "merge": "#f44336", "transform": "#00bcd4", "filter": "#ff5722", "format": "#3f51b5", "log": "#795548" };

function ee(id: string, source: string, target: string): Edge {
  const color = elkEdgeColors[source] ?? "#94a3b8";
  return { id, source, target, type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color }, data: { strokeColor: color } };
}

export const elkEdges: Edge[] = [
  ee("e-input-auth", "input", "auth"), ee("e-input-validate", "input", "validate"),
  ee("e-auth-fetch-db", "auth", "fetch-db"), ee("e-auth-fetch-api", "auth", "fetch-api"),
  ee("e-fetch-db-cache", "fetch-db", "cache"), ee("e-fetch-db-merge", "fetch-db", "merge"),
  ee("e-fetch-api-merge", "fetch-api", "merge"), ee("e-cache-merge", "cache", "merge"),
  ee("e-validate-merge", "validate", "merge"), ee("e-merge-transform", "merge", "transform"),
  ee("e-transform-filter", "transform", "filter"), ee("e-transform-log", "transform", "log"),
  ee("e-filter-format", "filter", "format"), ee("e-format-respond", "format", "respond"),
  ee("e-merge-error", "merge", "error"), ee("e-log-respond", "log", "respond"),
];

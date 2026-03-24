import { MarkerType, type Node, type Edge } from "@xyflow/react";

/**
 * ELK + libavoid example: nodes have no manual positions —
 * ELK auto-layout positions them, then libavoid routes edges around them.
 */

export const elkNodes: Node[] = [
  {
    id: "input",
    data: { label: "User Input" },
    position: { x: 0, y: 0 },
    style: { width: 150, height: 50, border: "2px solid #818cf8", borderRadius: 12 },
  },
  {
    id: "auth",
    data: { label: "Authenticate" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "validate",
    data: { label: "Validate" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "fetch-db",
    data: { label: "Fetch DB" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "fetch-api",
    data: { label: "Fetch API" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "cache",
    data: { label: "Cache" },
    position: { x: 0, y: 0 },
    style: { width: 120, height: 50, opacity: 0.7 },
  },
  {
    id: "merge",
    data: { label: "Merge Results" },
    position: { x: 0, y: 0 },
    style: { width: 150, height: 50 },
  },
  {
    id: "transform",
    data: { label: "Transform" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "filter",
    data: { label: "Filter" },
    position: { x: 0, y: 0 },
    style: { width: 120, height: 50 },
  },
  {
    id: "format",
    data: { label: "Format" },
    position: { x: 0, y: 0 },
    style: { width: 120, height: 50 },
  },
  {
    id: "respond",
    data: { label: "Respond" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50, border: "2px solid #4ade80", borderRadius: 12 },
  },
  {
    id: "log",
    data: { label: "Log" },
    position: { x: 0, y: 0 },
    style: { width: 100, height: 50 },
  },
  {
    id: "error",
    data: { label: "Error" },
    position: { x: 0, y: 0 },
    style: { width: 120, height: 50, border: "2px solid #f87171", borderRadius: 12 },
  },
];

// Highly distinct edge colors per source node
const elkEdgeColors: Record<string, string> = {
  "input":     "#e91e63", // magenta
  "auth":      "#2196f3", // blue
  "validate":  "#ff9800", // orange
  "fetch-db":  "#009688", // teal
  "fetch-api": "#9c27b0", // purple
  "cache":     "#4caf50", // green
  "merge":     "#f44336", // red
  "transform": "#00bcd4", // cyan
  "filter":    "#ff5722", // deep-orange
  "format":    "#3f51b5", // indigo
  "log":       "#795548", // brown
};

function ee(id: string, source: string, target: string): Edge {
  const color = elkEdgeColors[source] ?? "#94a3b8";
  return {
    id, source, target, type: "routed",
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
    data: { strokeColor: color },
  };
}

export const elkEdges: Edge[] = [
  ee("e-input-auth", "input", "auth"),
  ee("e-input-validate", "input", "validate"),
  ee("e-auth-fetch-db", "auth", "fetch-db"),
  ee("e-auth-fetch-api", "auth", "fetch-api"),
  ee("e-fetch-db-cache", "fetch-db", "cache"),
  ee("e-fetch-db-merge", "fetch-db", "merge"),
  ee("e-fetch-api-merge", "fetch-api", "merge"),
  ee("e-cache-merge", "cache", "merge"),
  ee("e-validate-merge", "validate", "merge"),
  ee("e-merge-transform", "merge", "transform"),
  ee("e-transform-filter", "transform", "filter"),
  ee("e-transform-log", "transform", "log"),
  ee("e-filter-format", "filter", "format"),
  ee("e-format-respond", "format", "respond"),
  ee("e-merge-error", "merge", "error"),
  ee("e-log-respond", "log", "respond"),
];

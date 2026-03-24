import { MarkerType, type Node, type Edge } from "@xyflow/react";

export const autoLayoutGroupNodes: Node[] = [
  // ── Group A: Ingestion ──
  {
    id: "group-ingestion",
    data: { label: "Ingestion" },
    type: "group",
    position: { x: 0, y: 0 },
    style: {
      width: 340,
      height: 300,
      backgroundColor: "rgba(99, 102, 241, 0.05)",
      border: "1px dashed #6366f1",
      borderRadius: 8,
    },
  },
  {
    id: "api-input",
    data: { label: "API Input" },
    position: { x: 110, y: 50 },
    parentId: "group-ingestion",
    expandParent: true,
    style: { width: 120, height: 50 },
  },
  {
    id: "file-input",
    data: { label: "File Input" },
    position: { x: 110, y: 140 },
    parentId: "group-ingestion",
    expandParent: true,
    style: { width: 120, height: 50 },
  },
  {
    id: "stream-input",
    data: { label: "Stream Input" },
    position: { x: 110, y: 230 },
    parentId: "group-ingestion",
    expandParent: true,
    style: { width: 120, height: 50 },
  },

  // ── Group B: Processing ──
  {
    id: "group-processing",
    data: { label: "Processing" },
    type: "group",
    position: { x: 450, y: 30 },
    style: {
      width: 340,
      height: 250,
      backgroundColor: "rgba(245, 158, 11, 0.05)",
      border: "1px dashed #f59e0b",
      borderRadius: 8,
    },
  },
  {
    id: "validate",
    data: { label: "Validate" },
    position: { x: 110, y: 50 },
    parentId: "group-processing",
    expandParent: true,
    style: { width: 120, height: 50 },
  },
  {
    id: "transform",
    data: { label: "Transform" },
    position: { x: 110, y: 150 },
    parentId: "group-processing",
    expandParent: true,
    style: { width: 120, height: 50 },
  },

  // ── Group C: Storage ──
  {
    id: "group-storage",
    data: { label: "Storage" },
    type: "group",
    position: { x: 900, y: 0 },
    style: {
      width: 340,
      height: 300,
      backgroundColor: "rgba(34, 197, 94, 0.05)",
      border: "1px dashed #22c55e",
      borderRadius: 8,
    },
  },
  {
    id: "cache",
    data: { label: "Cache" },
    position: { x: 110, y: 50 },
    parentId: "group-storage",
    expandParent: true,
    style: { width: 120, height: 50 },
  },
  {
    id: "database",
    data: { label: "Database" },
    position: { x: 110, y: 140 },
    parentId: "group-storage",
    expandParent: true,
    style: { width: 120, height: 50 },
  },
  {
    id: "archive",
    data: { label: "Archive" },
    position: { x: 110, y: 230 },
    parentId: "group-storage",
    expandParent: true,
    style: { width: 120, height: 50 },
  },

  // ── Standalone nodes ──
  {
    id: "router",
    data: { label: "Router" },
    position: { x: 450, y: 340 },
    style: { width: 120, height: 50 },
  },
  {
    id: "logger",
    data: { label: "Logger" },
    position: { x: 680, y: 340 },
    style: { width: 120, height: 50 },
  },
  {
    id: "monitor",
    data: { label: "Monitor" },
    position: { x: 1300, y: 120 },
    style: { width: 120, height: 50 },
  },
];

// Highly distinct edge colors per source node
const edgeColors: Record<string, string> = {
  "api-input":    "#e91e63", // magenta
  "file-input":   "#2196f3", // blue
  "stream-input": "#ff9800", // orange
  "validate":     "#009688", // teal
  "transform":    "#9c27b0", // purple
  "router":       "#f44336", // red
  "logger":       "#4caf50", // green
  "database":     "#00bcd4", // cyan
  "cache":        "#795548", // brown
};

function e(id: string, source: string, target: string): Edge {
  const color = edgeColors[source] ?? "#94a3b8";
  return {
    id, source, target, type: "routed",
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
    data: { strokeColor: color },
  };
}

export const autoLayoutGroupEdges: Edge[] = [
  // Ingestion → Processing (cross-group)
  e("e-api-validate", "api-input", "validate"),
  e("e-file-validate", "file-input", "validate"),
  e("e-stream-transform", "stream-input", "transform"),
  e("e-api-transform", "api-input", "transform"),

  // Processing → Storage (cross-group)
  e("e-validate-cache", "validate", "cache"),
  e("e-validate-database", "validate", "database"),
  e("e-transform-database", "transform", "database"),
  e("e-transform-archive", "transform", "archive"),

  // Router connections
  e("e-file-router", "file-input", "router"),
  e("e-router-transform", "router", "transform"),
  e("e-router-logger", "router", "logger"),

  // Logger → Storage
  e("e-logger-archive", "logger", "archive"),

  // Storage → Monitor
  e("e-database-monitor", "database", "monitor"),
  e("e-cache-monitor", "cache", "monitor"),
];

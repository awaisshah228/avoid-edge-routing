import { MarkerType, type Node, type Edge } from "@xyflow/react";

export const nodes: Node[] = [
  // ── Input ──
  {
    id: "start",
    data: { label: "Start" },
    position: { x: 0, y: 200 },
    style: { width: 150, height: 50, border: "2px solid #f472b6", borderRadius: 12 },
  },

  // ── Group A: Processing ──
  {
    id: "group-processing",
    data: { label: "Processing" },
    type: "group",
    position: { x: 250, y: 0 },
    style: {
      width: 380,
      height: 420,
      backgroundColor: "rgba(59, 130, 246, 0.05)",
      border: "1px dashed #3b82f6",
      borderRadius: 8,
    },
  },
  {
    id: "validate",
    data: { label: "Validate" },
    position: { x: 120, y: 50 },
    parentId: "group-processing",
    expandParent: true,
    style: { width: 140, height: 50 },
  },
  {
    id: "transform",
    data: { label: "Transform" },
    position: { x: 120, y: 170 },
    parentId: "group-processing",
    expandParent: true,
    style: { width: 140, height: 50 },
  },
  {
    id: "enrich",
    data: { label: "Enrich" },
    position: { x: 120, y: 290 },
    parentId: "group-processing",
    expandParent: true,
    style: { width: 140, height: 50, border: "2px solid #f472b6", borderRadius: 12 },
  },

  // ── Blocker (forces routing around it) ──
  {
    id: "blocker1",
    data: { label: "Blocker" },
    position: { x: 680, y: 80 },
    style: { width: 120, height: 50, opacity: 0.6 },
  },

  // ── Group B: Output ──
  {
    id: "group-output",
    data: { label: "Output" },
    type: "group",
    position: { x: 940, y: 20 },
    style: {
      width: 340,
      height: 460,
      backgroundColor: "rgba(34, 197, 94, 0.05)",
      border: "1px dashed #22c55e",
      borderRadius: 8,
    },
  },
  {
    id: "success",
    data: { label: "Success" },
    position: { x: 100, y: 50 },
    parentId: "group-output",
    expandParent: true,
    style: { width: 140, height: 50, border: "2px solid #4ade80", borderRadius: 12 },
  },
  {
    id: "retry",
    data: { label: "Retry" },
    position: { x: 100, y: 190 },
    parentId: "group-output",
    expandParent: true,
    style: { width: 140, height: 50, border: "2px solid #facc15", borderRadius: 12 },
  },
  {
    id: "error",
    data: { label: "Error" },
    position: { x: 100, y: 330 },
    parentId: "group-output",
    expandParent: true,
    style: { width: 140, height: 50, border: "2px solid #f87171", borderRadius: 12 },
  },

  // ── Middle row ──
  {
    id: "merge",
    data: { label: "Merge" },
    position: { x: 680, y: 200 },
    style: { width: 140, height: 50 },
  },
  {
    id: "decision",
    data: { label: "Decision" },
    position: { x: 680, y: 320 },
    style: { width: 140, height: 50 },
  },

  // ── Side branch ──
  {
    id: "log",
    data: { label: "Log" },
    position: { x: 500, y: 480 },
    style: { width: 120, height: 50 },
  },
  {
    id: "notify",
    data: { label: "Notify" },
    position: { x: 750, y: 480 },
    style: { width: 120, height: 50 },
  },
];

// Highly distinct edge colors per source node
const edgeColors: Record<string, string> = {
  "start":     "#e91e63", // magenta
  "validate":  "#2196f3", // blue
  "transform": "#ff9800", // orange
  "enrich":    "#9c27b0", // purple
  "merge":     "#009688", // teal
  "decision":  "#f44336", // red
  "retry":     "#4caf50", // green
  "log":       "#00bcd4", // cyan
  "notify":    "#795548", // brown
};

function e(id: string, source: string, target: string, extra?: Record<string, unknown>): Edge {
  const color = edgeColors[source] ?? "#94a3b8";
  return {
    id, source, target, type: "routed",
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
    data: { strokeColor: color, ...extra },
  };
}

export const edges: Edge[] = [
  // Start fans out to 3 targets inside the Processing group
  e("e-start-validate", "start", "validate", { label: "check" }),
  e("e-start-transform", "start", "transform", { label: "process" }),
  e("e-start-enrich", "start", "enrich", { label: "extend" }),

  // Processing → Merge (fan-in, edges cross group boundary)
  e("e-validate-merge", "validate", "merge"),
  e("e-transform-merge", "transform", "merge"),

  // Processing → Decision
  e("e-enrich-decision", "enrich", "decision"),
  e("e-transform-decision", "transform", "decision"),

  // Merge/Decision → Output group children (routes must go around blocker1)
  e("e-merge-success", "merge", "success", { label: "ok" }),
  e("e-decision-success", "decision", "success"),
  e("e-decision-retry", "decision", "retry", { label: "retry" }),
  e("e-decision-error", "decision", "error", { label: "fail" }),

  // Retry loops back into Processing group
  e("e-retry-transform", "retry", "transform", { label: "again", strokeDasharray: "5,5" }),

  // Side branch from group child to outside nodes
  e("e-enrich-log", "enrich", "log"),
  e("e-log-notify", "log", "notify"),
  e("e-notify-error", "notify", "error"),
];

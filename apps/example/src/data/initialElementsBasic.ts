
import { MarkerType, type Node, type Edge } from "@xyflow/react";

// Node data: sources = number of source handles, targets = number of target handles
export const basicNodes: Node[] = [
  {
    id: "start",
    type: "basicMulti",
    data: { label: "Start", sources: 3, targets: 0, borderColor: "#f472b6", borderRadius: 12, fill: "#fff1f2" },
    position: { x: 0, y: 150 },
  },
  {
    id: "validate",
    type: "basicMulti",
    data: { label: "Validate", sources: 1, targets: 1, borderColor: "#64748b" },
    position: { x: 300, y: 0 },
  },
  {
    id: "transform",
    type: "basicMulti",
    data: { label: "Transform", sources: 2, targets: 2, borderColor: "#64748b" },
    position: { x: 300, y: 150 },
  },
  {
    id: "enrich",
    type: "basicMulti",
    data: { label: "Enrich", sources: 2, targets: 1, borderColor: "#f472b6", borderRadius: 12, fill: "#fff1f2" },
    position: { x: 300, y: 300 },
  },
  {
    id: "blocker1",
    type: "basicMulti",
    data: { label: "Blocker", sources: 0, targets: 0, borderColor: "#94a3b8", opacity: 0.6 },
    position: { x: 530, y: 60 },
  },
  {
    id: "merge",
    type: "basicMulti",
    data: { label: "Merge", sources: 1, targets: 2, borderColor: "#64748b" },
    position: { x: 700, y: 75 },
  },
  {
    id: "decision",
    type: "basicMulti",
    data: { label: "Decision", sources: 3, targets: 2, borderColor: "#64748b" },
    position: { x: 700, y: 225 },
  },
  {
    id: "blocker2",
    type: "basicMulti",
    data: { label: "Cache", sources: 0, targets: 0, borderColor: "#94a3b8", opacity: 0.6 },
    position: { x: 900, y: 150 },
  },
  {
    id: "success",
    type: "basicMulti",
    data: { label: "Success", sources: 0, targets: 2, borderColor: "#4ade80", borderRadius: 12, fill: "#f0fdf4", textColor: "#166534" },
    position: { x: 1100, y: 50 },
  },
  {
    id: "retry",
    type: "basicMulti",
    data: { label: "Retry", sources: 1, targets: 1, borderColor: "#facc15", borderRadius: 12, fill: "#fefce8", textColor: "#854d0e" },
    position: { x: 1100, y: 200 },
  },
  {
    id: "error",
    type: "basicMulti",
    data: { label: "Error", sources: 0, targets: 2, borderColor: "#f87171", borderRadius: 12, fill: "#fef2f2", textColor: "#991b1b" },
    position: { x: 1100, y: 350 },
  },
  {
    id: "log",
    type: "basicMulti",
    data: { label: "Log", sources: 1, targets: 1, borderColor: "#64748b" },
    position: { x: 500, y: 400 },
  },
  {
    id: "notify",
    type: "basicMulti",
    data: { label: "Notify", sources: 1, targets: 1, borderColor: "#64748b" },
    position: { x: 750, y: 400 },
  },
];

// Highly distinct edge colors per source node
const basicEdgeColors: Record<string, string> = {
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

function be(
  id: string, source: string, target: string,
  sourceHandle: string, targetHandle: string,
  extra?: Record<string, unknown>
): Edge {
  const color = basicEdgeColors[source] ?? "#94a3b8";
  return {
    id, source, target, sourceHandle, targetHandle, type: "routed",
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
    data: { strokeColor: color, ...extra },
  };
}

export const basicEdges: Edge[] = [
  // start (3 sources) → validate, transform, enrich
  be("e-start-validate",  "start", "validate",  "out-0", "in-0", { label: "check" }),
  be("e-start-transform", "start", "transform", "out-1", "in-0", { label: "process" }),
  be("e-start-enrich",    "start", "enrich",    "out-2", "in-0", { label: "extend" }),

  // validate (1 src) → merge (target in-0)
  be("e-validate-merge",  "validate", "merge",  "out-0", "in-0"),

  // transform (2 src) → merge (target in-1), decision (target in-0)
  be("e-transform-merge",    "transform", "merge",    "out-0", "in-1"),
  be("e-transform-decision", "transform", "decision", "out-1", "in-0"),

  // enrich (2 src) → decision (target in-1), log (target in-0)
  be("e-enrich-decision", "enrich", "decision", "out-0", "in-1"),
  be("e-enrich-log",      "enrich", "log",      "out-1", "in-0"),

  // merge (1 src) → success (target in-0)
  be("e-merge-success", "merge", "success", "out-0", "in-0", { label: "ok" }),

  // decision (3 src) → success (in-1), retry (in-0), error (in-0)
  be("e-decision-success", "decision", "success", "out-0", "in-1"),
  be("e-decision-retry",   "decision", "retry",   "out-1", "in-0", { label: "retry" }),
  be("e-decision-error",   "decision", "error",   "out-2", "in-0", { label: "fail" }),

  // retry (1 src) → transform (target in-1)
  be("e-retry-transform", "retry", "transform", "out-0", "in-1", { label: "again", strokeDasharray: "5,5" }),

  // log (1 src) → notify (target in-0)
  be("e-log-notify", "log", "notify", "out-0", "in-0"),

  // notify (1 src) → error (target in-1)
  be("e-notify-error", "notify", "error", "out-0", "in-1"),
];

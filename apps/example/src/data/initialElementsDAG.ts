import { MarkerType, type Node, type Edge } from "@xyflow/react";

/**
 * Complex DAG example: multiple root nodes, disjoint trees, subflows,
 * and edges that cross subflow boundaries.
 *
 * Demonstrates the kind of layout that tools like Dagre and ELK struggle with:
 * - Multiple independent entry points (root nodes)
 * - Nested subflows (groups within groups)
 * - Cross-boundary edges connecting nodes inside different subflows
 */

// ── Tree 1: Data Ingestion Pipeline ──────────────────────────────

const tree1Nodes: Node[] = [
  {
    id: "root1",
    data: { label: "API Gateway" },
    position: { x: 0, y: 0 },
    style: { width: 130, height: 40, border: "2px solid #818cf8", borderRadius: 12 },
  },
  {
    id: "ingest-group",
    data: { label: "Ingestion Layer" },
    position: { x: 0, y: 70 },
    style: {
      width: 10,
      height: 10,
      backgroundColor: "rgba(59, 130, 246, 0.05)",
      border: "1px dashed #3b82f6",
      borderRadius: 8,
    },
    type: "group",
  },
  {
    id: "parser",
    data: { label: "Parser" },
    position: { x: 20, y: 30 },
    parentId: "ingest-group",
    expandParent: true,
    style: { width: 110, height: 36 },
  },
  {
    id: "validator",
    data: { label: "Validator" },
    position: { x: 150, y: 30 },
    parentId: "ingest-group",
    expandParent: true,
    style: { width: 110, height: 36 },
  },
  {
    id: "normalize-group",
    data: { label: "Normalization" },
    position: { x: 20, y: 90 },
    parentId: "ingest-group",
    expandParent: true,
    style: {
      width: 10,
      height: 10,
      backgroundColor: "rgba(255, 0, 255, 0.06)",
      border: "1px dashed #d946ef",
      borderRadius: 8,
    },
    type: "group",
  },
  {
    id: "dedupe",
    data: { label: "Deduplicate" },
    position: { x: 15, y: 30 },
    parentId: "normalize-group",
    expandParent: true,
    style: { width: 100, height: 36 },
  },
  {
    id: "enrich",
    data: { label: "Enrich" },
    position: { x: 135, y: 30 },
    parentId: "normalize-group",
    expandParent: true,
    style: { width: 100, height: 36 },
  },
];

// ── Tree 2: ML Pipeline (disjoint from tree 1) ──────────────────

const tree2Nodes: Node[] = [
  {
    id: "root2",
    data: { label: "Scheduler" },
    position: { x: 450, y: 0 },
    style: { width: 120, height: 40, border: "2px solid #f59e0b", borderRadius: 12 },
  },
  {
    id: "ml-group",
    data: { label: "ML Pipeline" },
    position: { x: 420, y: 70 },
    style: {
      width: 10,
      height: 10,
      backgroundColor: "rgba(34, 197, 94, 0.05)",
      border: "1px dashed #22c55e",
      borderRadius: 8,
    },
    type: "group",
  },
  {
    id: "feature-eng",
    data: { label: "Feature Eng." },
    position: { x: 20, y: 30 },
    parentId: "ml-group",
    expandParent: true,
    style: { width: 110, height: 36 },
  },
  {
    id: "train",
    data: { label: "Train Model" },
    position: { x: 150, y: 30 },
    parentId: "ml-group",
    expandParent: true,
    style: { width: 110, height: 36 },
  },
  {
    id: "eval-group",
    data: { label: "Evaluation" },
    position: { x: 20, y: 90 },
    parentId: "ml-group",
    expandParent: true,
    style: {
      width: 10,
      height: 10,
      backgroundColor: "rgba(251, 146, 60, 0.08)",
      border: "1px dashed #fb923c",
      borderRadius: 8,
    },
    type: "group",
  },
  {
    id: "validate-model",
    data: { label: "Validate" },
    position: { x: 15, y: 30 },
    parentId: "eval-group",
    expandParent: true,
    style: { width: 100, height: 36 },
  },
  {
    id: "benchmark",
    data: { label: "Benchmark" },
    position: { x: 135, y: 30 },
    parentId: "eval-group",
    expandParent: true,
    style: { width: 100, height: 36 },
  },
];

// ── Tree 3: Notification/Output (third root) ────────────────────

const tree3Nodes: Node[] = [
  {
    id: "root3",
    data: { label: "Event Bus" },
    position: { x: 200, y: 380 },
    style: { width: 120, height: 40, border: "2px solid #ec4899", borderRadius: 12 },
  },
  {
    id: "notify-email",
    data: { label: "Email Notify" },
    position: { x: 30, y: 480 },
    style: { width: 110, height: 36 },
  },
  {
    id: "notify-slack",
    data: { label: "Slack Notify" },
    position: { x: 200, y: 480 },
    style: { width: 110, height: 36 },
  },
  {
    id: "dashboard",
    data: { label: "Dashboard" },
    position: { x: 380, y: 480 },
    style: { width: 110, height: 36, border: "2px solid #4ade80", borderRadius: 12 },
  },
  {
    id: "audit-log",
    data: { label: "Audit Log" },
    position: { x: 100, y: 580 },
    style: { width: 110, height: 36 },
  },
];

// ── Shared sink ──────────────────────────────────────────────────

const sharedNodes: Node[] = [
  {
    id: "data-lake",
    data: { label: "Data Lake" },
    position: { x: 200, y: 680 },
    style: { width: 130, height: 40, border: "2px solid #06b6d4", borderRadius: 12 },
  },
];

export const dagNodes: Node[] = [
  ...tree1Nodes,
  ...tree2Nodes,
  ...tree3Nodes,
  ...sharedNodes,
];

// ── Edge colors per source ───────────────────────────────────────

const dagEdgeColors: Record<string, string> = {
  "root1":          "#818cf8", // indigo
  "root2":          "#f59e0b", // amber
  "root3":          "#ec4899", // pink
  "parser":         "#3b82f6", // blue
  "validator":      "#8b5cf6", // violet
  "dedupe":         "#d946ef", // fuchsia
  "enrich":         "#06b6d4", // cyan
  "feature-eng":    "#22c55e", // green
  "train":          "#14b8a6", // teal
  "validate-model": "#fb923c", // orange
  "benchmark":      "#ef4444", // red
  "notify-email":   "#a855f7", // purple
  "notify-slack":   "#f43f5e", // rose
  "dashboard":      "#4ade80", // emerald
  "audit-log":      "#64748b", // slate
};

function de(id: string, source: string, target: string): Edge {
  const color = dagEdgeColors[source] ?? "#94a3b8";
  return {
    id, source, target, type: "routed",
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
    data: { strokeColor: color },
  };
}

export const dagEdges: Edge[] = [
  // Tree 1 internal
  de("e-r1-parser",       "root1",     "parser"),
  de("e-r1-validator",    "root1",     "validator"),
  de("e-parser-dedupe",   "parser",    "dedupe"),
  de("e-validator-enrich","validator",  "enrich"),
  de("e-dedupe-enrich",   "dedupe",    "enrich"),

  // Tree 2 internal
  de("e-r2-feat",         "root2",         "feature-eng"),
  de("e-feat-train",      "feature-eng",   "train"),
  de("e-train-validate",  "train",         "validate-model"),
  de("e-train-bench",     "train",         "benchmark"),
  de("e-validate-bench",  "validate-model","benchmark"),

  // ── Cross-boundary edges (the hard part for layout libs) ──

  // Ingestion → ML pipeline (cross subflow)
  de("e-enrich-feat",     "enrich",        "feature-eng"),

  // Both pipelines → Event Bus
  de("e-enrich-bus",      "enrich",        "root3"),
  de("e-bench-bus",       "benchmark",     "root3"),

  // Event Bus → notifications
  de("e-bus-email",       "root3",         "notify-email"),
  de("e-bus-slack",       "root3",         "notify-slack"),
  de("e-bus-dash",        "root3",         "dashboard"),

  // Notifications → audit
  de("e-email-audit",     "notify-email",  "audit-log"),
  de("e-slack-audit",     "notify-slack",  "audit-log"),

  // Multiple sinks → data lake (convergence)
  de("e-audit-lake",      "audit-log",     "data-lake"),
  de("e-dash-lake",       "dashboard",     "data-lake"),
  de("e-bench-lake",      "benchmark",     "data-lake"),
];

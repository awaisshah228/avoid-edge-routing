import { MarkerType, type Node, type Edge } from "@xyflow/svelte";

export const nodes: Node[] = [
  { id: "start", data: { label: "Start" }, position: { x: 0, y: 200 }, style: "width: 150px; height: 50px; border: 2px solid #f472b6; border-radius: 12px;" },
  { id: "group-processing", data: { label: "Processing" }, type: "group", position: { x: 250, y: 0 }, style: "width: 380px; height: 420px; background-color: rgba(59, 130, 246, 0.05); border: 1px dashed #3b82f6; border-radius: 8px;" },
  { id: "validate", data: { label: "Validate" }, position: { x: 120, y: 50 }, parentId: "group-processing", expandParent: true, style: "width: 140px; height: 50px;" },
  { id: "transform", data: { label: "Transform" }, position: { x: 120, y: 170 }, parentId: "group-processing", expandParent: true, style: "width: 140px; height: 50px;" },
  { id: "enrich", data: { label: "Enrich" }, position: { x: 120, y: 290 }, parentId: "group-processing", expandParent: true, style: "width: 140px; height: 50px; border: 2px solid #f472b6; border-radius: 12px;" },
  { id: "blocker1", data: { label: "Blocker" }, position: { x: 680, y: 80 }, style: "width: 120px; height: 50px; opacity: 0.6;" },
  { id: "group-output", data: { label: "Output" }, type: "group", position: { x: 940, y: 20 }, style: "width: 340px; height: 460px; background-color: rgba(34, 197, 94, 0.05); border: 1px dashed #22c55e; border-radius: 8px;" },
  { id: "success", data: { label: "Success" }, position: { x: 100, y: 50 }, parentId: "group-output", expandParent: true, style: "width: 140px; height: 50px; border: 2px solid #4ade80; border-radius: 12px;" },
  { id: "retry", data: { label: "Retry" }, position: { x: 100, y: 190 }, parentId: "group-output", expandParent: true, style: "width: 140px; height: 50px; border: 2px solid #facc15; border-radius: 12px;" },
  { id: "error", data: { label: "Error" }, position: { x: 100, y: 330 }, parentId: "group-output", expandParent: true, style: "width: 140px; height: 50px; border: 2px solid #f87171; border-radius: 12px;" },
  { id: "merge", data: { label: "Merge" }, position: { x: 680, y: 200 }, style: "width: 140px; height: 50px;" },
  { id: "decision", data: { label: "Decision" }, position: { x: 680, y: 320 }, style: "width: 140px; height: 50px;" },
  { id: "log", data: { label: "Log" }, position: { x: 500, y: 480 }, style: "width: 120px; height: 50px;" },
  { id: "notify", data: { label: "Notify" }, position: { x: 750, y: 480 }, style: "width: 120px; height: 50px;" },
];

const edgeColors: Record<string, string> = {
  "start": "#e91e63", "validate": "#2196f3", "transform": "#ff9800", "enrich": "#9c27b0",
  "merge": "#009688", "decision": "#f44336", "retry": "#4caf50", "log": "#00bcd4", "notify": "#795548",
};

function e(id: string, source: string, target: string, extra?: Record<string, unknown>): Edge {
  const color = edgeColors[source] ?? "#94a3b8";
  return { id, source, target, type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color }, data: { strokeColor: color, ...extra } };
}

export const edges: Edge[] = [
  e("e-start-validate", "start", "validate", { label: "check" }),
  e("e-start-transform", "start", "transform", { label: "process" }),
  e("e-start-enrich", "start", "enrich", { label: "extend" }),
  e("e-validate-merge", "validate", "merge"),
  e("e-transform-merge", "transform", "merge"),
  e("e-enrich-decision", "enrich", "decision"),
  e("e-transform-decision", "transform", "decision"),
  e("e-merge-success", "merge", "success", { label: "ok" }),
  e("e-decision-success", "decision", "success"),
  e("e-decision-retry", "decision", "retry", { label: "retry" }),
  e("e-decision-error", "decision", "error", { label: "fail" }),
  e("e-retry-transform", "retry", "transform", { label: "again", strokeDasharray: "5,5" }),
  e("e-enrich-log", "enrich", "log"),
  e("e-log-notify", "log", "notify"),
  e("e-notify-error", "notify", "error"),
];

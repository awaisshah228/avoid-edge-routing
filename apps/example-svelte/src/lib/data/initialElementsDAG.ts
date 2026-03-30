import { MarkerType, type Node, type Edge } from "@xyflow/svelte";

const tree1Nodes: Node[] = [
  { id: "root1", data: { label: "API Gateway" }, position: { x: 0, y: 0 }, style: "width: 130px; height: 40px; border: 2px solid #818cf8; border-radius: 12px;" },
  { id: "ingest-group", data: { label: "Ingestion Layer" }, position: { x: 0, y: 70 }, style: "width: 10px; height: 10px; background-color: rgba(59, 130, 246, 0.05); border: 1px dashed #3b82f6; border-radius: 8px;", type: "group" },
  { id: "parser", data: { label: "Parser" }, position: { x: 20, y: 30 }, parentId: "ingest-group", expandParent: true, style: "width: 110px; height: 36px;" },
  { id: "validator", data: { label: "Validator" }, position: { x: 150, y: 30 }, parentId: "ingest-group", expandParent: true, style: "width: 110px; height: 36px;" },
  { id: "normalize-group", data: { label: "Normalization" }, position: { x: 20, y: 90 }, parentId: "ingest-group", expandParent: true, style: "width: 10px; height: 10px; background-color: rgba(255, 0, 255, 0.06); border: 1px dashed #d946ef; border-radius: 8px;", type: "group" },
  { id: "dedupe", data: { label: "Deduplicate" }, position: { x: 15, y: 30 }, parentId: "normalize-group", expandParent: true, style: "width: 100px; height: 36px;" },
  { id: "enrich", data: { label: "Enrich" }, position: { x: 135, y: 30 }, parentId: "normalize-group", expandParent: true, style: "width: 100px; height: 36px;" },
];

const tree2Nodes: Node[] = [
  { id: "root2", data: { label: "Scheduler" }, position: { x: 450, y: 0 }, style: "width: 120px; height: 40px; border: 2px solid #f59e0b; border-radius: 12px;" },
  { id: "ml-group", data: { label: "ML Pipeline" }, position: { x: 420, y: 70 }, style: "width: 10px; height: 10px; background-color: rgba(34, 197, 94, 0.05); border: 1px dashed #22c55e; border-radius: 8px;", type: "group" },
  { id: "feature-eng", data: { label: "Feature Eng." }, position: { x: 20, y: 30 }, parentId: "ml-group", expandParent: true, style: "width: 110px; height: 36px;" },
  { id: "train", data: { label: "Train Model" }, position: { x: 150, y: 30 }, parentId: "ml-group", expandParent: true, style: "width: 110px; height: 36px;" },
  { id: "eval-group", data: { label: "Evaluation" }, position: { x: 20, y: 90 }, parentId: "ml-group", expandParent: true, style: "width: 10px; height: 10px; background-color: rgba(251, 146, 60, 0.08); border: 1px dashed #fb923c; border-radius: 8px;", type: "group" },
  { id: "validate-model", data: { label: "Validate" }, position: { x: 15, y: 30 }, parentId: "eval-group", expandParent: true, style: "width: 100px; height: 36px;" },
  { id: "benchmark", data: { label: "Benchmark" }, position: { x: 135, y: 30 }, parentId: "eval-group", expandParent: true, style: "width: 100px; height: 36px;" },
];

const tree3Nodes: Node[] = [
  { id: "root3", data: { label: "Event Bus" }, position: { x: 200, y: 380 }, style: "width: 120px; height: 40px; border: 2px solid #ec4899; border-radius: 12px;" },
  { id: "notify-email", data: { label: "Email Notify" }, position: { x: 30, y: 480 }, style: "width: 110px; height: 36px;" },
  { id: "notify-slack", data: { label: "Slack Notify" }, position: { x: 200, y: 480 }, style: "width: 110px; height: 36px;" },
  { id: "dashboard", data: { label: "Dashboard" }, position: { x: 380, y: 480 }, style: "width: 110px; height: 36px; border: 2px solid #4ade80; border-radius: 12px;" },
  { id: "audit-log", data: { label: "Audit Log" }, position: { x: 100, y: 580 }, style: "width: 110px; height: 36px;" },
];

const sharedNodes: Node[] = [
  { id: "data-lake", data: { label: "Data Lake" }, position: { x: 200, y: 680 }, style: "width: 130px; height: 40px; border: 2px solid #06b6d4; border-radius: 12px;" },
];

export const dagNodes: Node[] = [...tree1Nodes, ...tree2Nodes, ...tree3Nodes, ...sharedNodes];

const dagEdgeColors: Record<string, string> = {
  "root1": "#818cf8", "root2": "#f59e0b", "root3": "#ec4899", "parser": "#3b82f6", "validator": "#8b5cf6",
  "dedupe": "#d946ef", "enrich": "#06b6d4", "feature-eng": "#22c55e", "train": "#14b8a6",
  "validate-model": "#fb923c", "benchmark": "#ef4444", "notify-email": "#a855f7", "notify-slack": "#f43f5e",
  "dashboard": "#4ade80", "audit-log": "#64748b",
};

function de(id: string, source: string, target: string): Edge {
  const color = dagEdgeColors[source] ?? "#94a3b8";
  return { id, source, target, type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color }, data: { strokeColor: color } };
}

export const dagEdges: Edge[] = [
  de("e-r1-parser", "root1", "parser"), de("e-r1-validator", "root1", "validator"),
  de("e-parser-dedupe", "parser", "dedupe"), de("e-validator-enrich", "validator", "enrich"),
  de("e-dedupe-enrich", "dedupe", "enrich"),
  de("e-r2-feat", "root2", "feature-eng"), de("e-feat-train", "feature-eng", "train"),
  de("e-train-validate", "train", "validate-model"), de("e-train-bench", "train", "benchmark"),
  de("e-validate-bench", "validate-model", "benchmark"),
  de("e-enrich-feat", "enrich", "feature-eng"), de("e-enrich-bus", "enrich", "root3"),
  de("e-bench-bus", "benchmark", "root3"),
  de("e-bus-email", "root3", "notify-email"), de("e-bus-slack", "root3", "notify-slack"),
  de("e-bus-dash", "root3", "dashboard"),
  de("e-email-audit", "notify-email", "audit-log"), de("e-slack-audit", "notify-slack", "audit-log"),
  de("e-audit-lake", "audit-log", "data-lake"), de("e-dash-lake", "dashboard", "data-lake"),
  de("e-bench-lake", "benchmark", "data-lake"),
];

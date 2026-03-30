import { MarkerType, type Node, type Edge } from "@xyflow/svelte";

export const autoLayoutGroupNodes: Node[] = [
  { id: "group-ingestion", data: { label: "Ingestion" }, type: "group", position: { x: 0, y: 0 }, style: "width: 340px; height: 300px; background-color: rgba(99, 102, 241, 0.05); border: 1px dashed #6366f1; border-radius: 8px;" },
  { id: "api-input", data: { label: "API Input" }, position: { x: 110, y: 50 }, parentId: "group-ingestion", expandParent: true, style: "width: 120px; height: 50px;" },
  { id: "file-input", data: { label: "File Input" }, position: { x: 110, y: 140 }, parentId: "group-ingestion", expandParent: true, style: "width: 120px; height: 50px;" },
  { id: "stream-input", data: { label: "Stream Input" }, position: { x: 110, y: 230 }, parentId: "group-ingestion", expandParent: true, style: "width: 120px; height: 50px;" },
  { id: "group-processing", data: { label: "Processing" }, type: "group", position: { x: 450, y: 30 }, style: "width: 340px; height: 250px; background-color: rgba(245, 158, 11, 0.05); border: 1px dashed #f59e0b; border-radius: 8px;" },
  { id: "validate", data: { label: "Validate" }, position: { x: 110, y: 50 }, parentId: "group-processing", expandParent: true, style: "width: 120px; height: 50px;" },
  { id: "transform", data: { label: "Transform" }, position: { x: 110, y: 150 }, parentId: "group-processing", expandParent: true, style: "width: 120px; height: 50px;" },
  { id: "group-storage", data: { label: "Storage" }, type: "group", position: { x: 900, y: 0 }, style: "width: 340px; height: 300px; background-color: rgba(34, 197, 94, 0.05); border: 1px dashed #22c55e; border-radius: 8px;" },
  { id: "cache", data: { label: "Cache" }, position: { x: 110, y: 50 }, parentId: "group-storage", expandParent: true, style: "width: 120px; height: 50px;" },
  { id: "database", data: { label: "Database" }, position: { x: 110, y: 140 }, parentId: "group-storage", expandParent: true, style: "width: 120px; height: 50px;" },
  { id: "archive", data: { label: "Archive" }, position: { x: 110, y: 230 }, parentId: "group-storage", expandParent: true, style: "width: 120px; height: 50px;" },
  { id: "router", data: { label: "Router" }, position: { x: 450, y: 340 }, style: "width: 120px; height: 50px;" },
  { id: "logger", data: { label: "Logger" }, position: { x: 680, y: 340 }, style: "width: 120px; height: 50px;" },
  { id: "monitor", data: { label: "Monitor" }, position: { x: 1300, y: 120 }, style: "width: 120px; height: 50px;" },
];

const edgeColors: Record<string, string> = { "api-input": "#e91e63", "file-input": "#2196f3", "stream-input": "#ff9800", "validate": "#009688", "transform": "#9c27b0", "router": "#f44336", "logger": "#4caf50", "database": "#00bcd4", "cache": "#795548" };

function e(id: string, source: string, target: string): Edge {
  const color = edgeColors[source] ?? "#94a3b8";
  return { id, source, target, type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color }, data: { strokeColor: color } };
}

export const autoLayoutGroupEdges: Edge[] = [
  e("e-api-validate", "api-input", "validate"), e("e-file-validate", "file-input", "validate"),
  e("e-stream-transform", "stream-input", "transform"), e("e-api-transform", "api-input", "transform"),
  e("e-validate-cache", "validate", "cache"), e("e-validate-database", "validate", "database"),
  e("e-transform-database", "transform", "database"), e("e-transform-archive", "transform", "archive"),
  e("e-file-router", "file-input", "router"), e("e-router-transform", "router", "transform"),
  e("e-router-logger", "router", "logger"), e("e-logger-archive", "logger", "archive"),
  e("e-database-monitor", "database", "monitor"), e("e-cache-monitor", "cache", "monitor"),
];

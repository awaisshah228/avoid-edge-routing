import { MarkerType, type Node, type Edge } from "@xyflow/svelte";

const CIRCLE = 56;
const cs = `width: ${CIRCLE}px; height: ${CIRCLE}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; padding: 0; text-align: center;`;

const rootNode: Node = { id: "ceo", data: { label: "CEO" }, position: { x: 0, y: 0 }, style: `${cs} border: 3px solid #6366f1; background: #eef2ff; color: #4338ca;` };

const engNodes: Node[] = [
  { id: "eng-group", data: { label: "Engineering" }, position: { x: 0, y: 80 }, style: "width: 10px; height: 10px; background-color: rgba(59, 130, 246, 0.06); border: 1px dashed #3b82f6; border-radius: 12px;", type: "group" },
  { id: "vp-eng", data: { label: "VP Eng" }, position: { x: 20, y: 30 }, parentId: "eng-group", expandParent: true, style: `${cs} border: 2px solid #3b82f6; background: #dbeafe; color: #1d4ed8;` },
  { id: "frontend-group", data: { label: "Frontend" }, position: { x: 10, y: 100 }, parentId: "eng-group", expandParent: true, style: "width: 10px; height: 10px; background-color: rgba(168, 85, 247, 0.06); border: 1px dashed #a855f7; border-radius: 8px;", type: "group" },
  { id: "fe-lead", data: { label: "FE Lead" }, position: { x: 15, y: 30 }, parentId: "frontend-group", expandParent: true, style: `${cs} border: 2px solid #a855f7; background: #f3e8ff; color: #7c3aed;` },
  { id: "fe-dev1", data: { label: "Dev A" }, position: { x: 15, y: 100 }, parentId: "frontend-group", expandParent: true, style: `${cs} border: 1.5px solid #c084fc; background: #faf5ff; color: #7c3aed;` },
  { id: "fe-dev2", data: { label: "Dev B" }, position: { x: 85, y: 100 }, parentId: "frontend-group", expandParent: true, style: `${cs} border: 1.5px solid #c084fc; background: #faf5ff; color: #7c3aed;` },
  { id: "backend-group", data: { label: "Backend" }, position: { x: 200, y: 100 }, parentId: "eng-group", expandParent: true, style: "width: 10px; height: 10px; background-color: rgba(20, 184, 166, 0.06); border: 1px dashed #14b8a6; border-radius: 8px;", type: "group" },
  { id: "be-lead", data: { label: "BE Lead" }, position: { x: 15, y: 30 }, parentId: "backend-group", expandParent: true, style: `${cs} border: 2px solid #14b8a6; background: #ccfbf1; color: #0f766e;` },
  { id: "be-dev1", data: { label: "Dev C" }, position: { x: 15, y: 100 }, parentId: "backend-group", expandParent: true, style: `${cs} border: 1.5px solid #5eead4; background: #f0fdfa; color: #0f766e;` },
  { id: "be-dev2", data: { label: "Dev D" }, position: { x: 85, y: 100 }, parentId: "backend-group", expandParent: true, style: `${cs} border: 1.5px solid #5eead4; background: #f0fdfa; color: #0f766e;` },
];

const productNodes: Node[] = [
  { id: "product-group", data: { label: "Product" }, position: { x: 300, y: 80 }, style: "width: 10px; height: 10px; background-color: rgba(245, 158, 11, 0.06); border: 1px dashed #f59e0b; border-radius: 12px;", type: "group" },
  { id: "vp-product", data: { label: "VP Prod" }, position: { x: 20, y: 30 }, parentId: "product-group", expandParent: true, style: `${cs} border: 2px solid #f59e0b; background: #fef3c7; color: #b45309;` },
  { id: "pm1", data: { label: "PM 1" }, position: { x: 15, y: 100 }, parentId: "product-group", expandParent: true, style: `${cs} border: 1.5px solid #fbbf24; background: #fffbeb; color: #b45309;` },
  { id: "pm2", data: { label: "PM 2" }, position: { x: 85, y: 100 }, parentId: "product-group", expandParent: true, style: `${cs} border: 1.5px solid #fbbf24; background: #fffbeb; color: #b45309;` },
  { id: "designer", data: { label: "Design" }, position: { x: 50, y: 170 }, parentId: "product-group", expandParent: true, style: `${cs} border: 1.5px solid #fb923c; background: #fff7ed; color: #c2410c;` },
];

const opsNodes: Node[] = [
  { id: "ops-group", data: { label: "Operations" }, position: { x: 500, y: 80 }, style: "width: 10px; height: 10px; background-color: rgba(236, 72, 153, 0.06); border: 1px dashed #ec4899; border-radius: 12px;", type: "group" },
  { id: "vp-ops", data: { label: "VP Ops" }, position: { x: 20, y: 30 }, parentId: "ops-group", expandParent: true, style: `${cs} border: 2px solid #ec4899; background: #fce7f3; color: #be185d;` },
  { id: "devops", data: { label: "DevOps" }, position: { x: 15, y: 100 }, parentId: "ops-group", expandParent: true, style: `${cs} border: 1.5px solid #f472b6; background: #fdf2f8; color: #be185d;` },
  { id: "sre", data: { label: "SRE" }, position: { x: 85, y: 100 }, parentId: "ops-group", expandParent: true, style: `${cs} border: 1.5px solid #f472b6; background: #fdf2f8; color: #be185d;` },
  { id: "security", data: { label: "SecOps" }, position: { x: 50, y: 170 }, parentId: "ops-group", expandParent: true, style: `${cs} border: 1.5px solid #f472b6; background: #fdf2f8; color: #be185d;` },
];

export const treeNodes: Node[] = [rootNode, ...engNodes, ...productNodes, ...opsNodes];

const treeEdgeColors: Record<string, string> = { "ceo": "#6366f1", "vp-eng": "#3b82f6", "fe-lead": "#a855f7", "be-lead": "#14b8a6", "vp-product": "#f59e0b", "pm1": "#fbbf24", "pm2": "#fbbf24", "vp-ops": "#ec4899" };

function te(id: string, source: string, target: string): Edge {
  const color = treeEdgeColors[source] ?? "#94a3b8";
  return { id, source, target, type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color }, data: { strokeColor: color } };
}

export const treeEdges: Edge[] = [
  te("e-ceo-eng", "ceo", "vp-eng"), te("e-ceo-prod", "ceo", "vp-product"), te("e-ceo-ops", "ceo", "vp-ops"),
  te("e-eng-fe", "vp-eng", "fe-lead"), te("e-eng-be", "vp-eng", "be-lead"),
  te("e-fe-dev1", "fe-lead", "fe-dev1"), te("e-fe-dev2", "fe-lead", "fe-dev2"),
  te("e-be-dev1", "be-lead", "be-dev1"), te("e-be-dev2", "be-lead", "be-dev2"),
  te("e-prod-pm1", "vp-product", "pm1"), te("e-prod-pm2", "vp-product", "pm2"),
  te("e-pm1-design", "pm1", "designer"), te("e-pm2-design", "pm2", "designer"),
  te("e-ops-devops", "vp-ops", "devops"), te("e-ops-sre", "vp-ops", "sre"),
  te("e-devops-sec", "devops", "security"), te("e-sre-sec", "sre", "security"),
  te("e-be-devops", "be-lead", "devops"), te("e-pm1-fe", "pm1", "fe-lead"),
];

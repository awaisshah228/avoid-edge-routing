/**
 * Auto-layout algorithms: ELK and Dagre.
 * Svelte Flow version — uses string styles instead of React CSSProperties.
 */

import type { Node, Edge } from "@xyflow/svelte";
import Elk, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import dagre from "@dagrejs/dagre";

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 50;
const GROUP_PADDING = 40;

export type LayoutDirection = "TB" | "LR" | "BT" | "RL";
export type LayoutAlgorithmName = "elk" | "dagre";
export type ElkMode = "layered" | "stress" | "mrtree" | "force" | "radial";

export interface AutoLayoutOptions {
  direction?: LayoutDirection;
  algorithm?: LayoutAlgorithmName;
  spacing?: number;
  elkMode?: ElkMode;
}

function parseStyleDim(style: string | undefined, prop: string): number | undefined {
  if (!style) return undefined;
  const match = style.match(new RegExp(`${prop}:\\s*(\\d+(?:\\.\\d+)?)px`));
  return match ? parseFloat(match[1]) : undefined;
}

function getNodeDims(node: Node): { width: number; height: number } {
  const styleW = typeof node.style === "string" ? parseStyleDim(node.style, "width") : undefined;
  const styleH = typeof node.style === "string" ? parseStyleDim(node.style, "height") : undefined;
  return {
    width: node.measured?.width ?? styleW ?? DEFAULT_NODE_WIDTH,
    height: node.measured?.height ?? styleH ?? DEFAULT_NODE_HEIGHT,
  };
}

function hasGroups(nodes: Node[]): boolean {
  return nodes.some((n) => n.type === "group" || n.parentId);
}

const elk = new Elk();

function getElkDirection(d: LayoutDirection) {
  switch (d) {
    case "TB": return "DOWN";
    case "LR": return "RIGHT";
    case "BT": return "UP";
    case "RL": return "LEFT";
  }
}

async function elkLayoutFlat(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number, elkMode: ElkMode = "layered"): Promise<Node[]> {
  const graph = {
    id: "elk-root",
    layoutOptions: {
      "elk.algorithm": elkMode,
      "elk.direction": getElkDirection(direction),
      "elk.spacing.nodeNode": `${spacing}`,
      "elk.spacing.edgeNode": `${spacing * 0.5}`,
      "elk.spacing.edgeEdge": `${spacing * 0.5}`,
      "elk.layered.spacing.nodeNodeBetweenLayers": `${spacing * 1.5}`,
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.separateConnectedComponents": "true",
    },
    children: nodes.map((node) => {
      const { width, height } = getNodeDims(node);
      return { id: node.id, width, height };
    }),
    edges: edges.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
  };

  const root = await elk.layout(graph);
  const layoutNodes = new Map<string, ElkNode>();
  for (const node of root.children ?? []) layoutNodes.set(node.id, node);

  return nodes.map((node) => {
    const elkNode = layoutNodes.get(node.id);
    if (!elkNode) return node;
    return { ...node, position: { x: elkNode.x!, y: elkNode.y! } };
  });
}

async function elkLayoutWithGroups(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number, elkMode: ElkMode = "layered"): Promise<Node[]> {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const groupIds = new Set(nodes.filter((n) => n.type === "group").map((n) => n.id));

  const childrenByParent = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(node);
  }

  function buildElkNode(nodeId: string): ElkNode {
    const node = nodeById.get(nodeId)!;
    const children = childrenByParent.get(nodeId) ?? [];
    if (children.length === 0 || !groupIds.has(nodeId)) {
      const { width, height } = getNodeDims(node);
      return { id: node.id, width, height };
    }
    const internalEdges = edges.filter((e) => {
      const childIds = new Set(children.map((c) => c.id));
      return childIds.has(e.source) && childIds.has(e.target);
    });
    return {
      id: node.id,
      layoutOptions: { "elk.padding": `[top=${GROUP_PADDING},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]` },
      children: children.map((child) => buildElkNode(child.id)),
      edges: internalEdges.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
    };
  }

  const rootChildren = childrenByParent.get("__root__") ?? [];
  const graph = {
    id: "elk-root",
    layoutOptions: {
      "elk.algorithm": elkMode,
      "elk.direction": getElkDirection(direction),
      "elk.spacing.nodeNode": `${spacing}`,
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.separateConnectedComponents": "true",
      "elk.edgeRouting": "ORTHOGONAL",
    },
    children: rootChildren.map((node) => buildElkNode(node.id)),
    edges: edges.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
  };

  const root = await elk.layout(graph);
  const positions = new Map<string, { x: number; y: number }>();
  const groupSizes = new Map<string, { width: number; height: number }>();

  function collectPositions(elkNodes: ElkNode[]) {
    for (const elkNode of elkNodes) {
      positions.set(elkNode.id, { x: elkNode.x!, y: elkNode.y! });
      if (groupIds.has(elkNode.id)) groupSizes.set(elkNode.id, { width: elkNode.width!, height: elkNode.height! });
      if (elkNode.children) collectPositions(elkNode.children);
    }
  }
  collectPositions(root.children ?? []);

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos) return node;
    if (node.type === "group") {
      const size = groupSizes.get(node.id);
      const baseStyle = typeof node.style === "string" ? node.style : "";
      const newStyle = size ? baseStyle.replace(/width:\s*\d+px/, `width: ${size.width}px`).replace(/height:\s*\d+px/, `height: ${size.height}px`) : baseStyle;
      return { ...node, position: pos, style: newStyle };
    }
    return { ...node, position: pos };
  });
}

async function dagreLayoutFlat(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number): Promise<Node[]> {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: spacing, ranksep: spacing });
  for (const node of nodes) { const { width, height } = getNodeDims(node); g.setNode(node.id, { width, height }); }
  for (const edge of edges) g.setEdge(edge.source, edge.target);
  dagre.layout(g);
  return nodes.map((node) => {
    const { x, y } = g.node(node.id);
    const { width, height } = getNodeDims(node);
    return { ...node, position: { x: x - width / 2, y: y - height / 2 } };
  });
}

export async function runAutoLayout(nodes: Node[], edges: Edge[], options: AutoLayoutOptions = {}): Promise<Node[]> {
  const { direction = "LR", algorithm = "elk", spacing = 60, elkMode = "layered" } = options;
  const withGroups = hasGroups(nodes);
  switch (algorithm) {
    case "elk": return withGroups ? elkLayoutWithGroups(nodes, edges, direction, spacing, elkMode) : elkLayoutFlat(nodes, edges, direction, spacing, elkMode);
    case "dagre": return dagreLayoutFlat(nodes, edges, direction, spacing);
    default: return nodes;
  }
}

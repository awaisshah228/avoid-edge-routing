/**
 * Auto-layout algorithms: ELK and Dagre.
 * Supports flat layouts and group-aware layouts (children inside groups).
 * Positions nodes automatically; obstacle-router then routes edges.
 */

import type { Node, Edge } from "@xyflow/react";
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

function getNodeDims(node: Node): { width: number; height: number } {
  const style = node.style as { width?: number; height?: number } | undefined;
  return {
    width: node.measured?.width ?? style?.width ?? DEFAULT_NODE_WIDTH,
    height: node.measured?.height ?? style?.height ?? DEFAULT_NODE_HEIGHT,
  };
}

function hasGroups(nodes: Node[]): boolean {
  return nodes.some((n) => n.type === "group" || n.parentId);
}

// ---------------------------------------------------------------------------
// ELK (shared)
// ---------------------------------------------------------------------------
const elk = new Elk();

function getElkDirection(d: LayoutDirection) {
  switch (d) {
    case "TB": return "DOWN";
    case "LR": return "RIGHT";
    case "BT": return "UP";
    case "RL": return "LEFT";
  }
}

// Flat ELK layout (no groups)
async function elkLayoutFlat(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number, elkMode: ElkMode = "layered"): Promise<Node[]> {
  const graph = {
    id: "elk-root",
    layoutOptions: {
      "elk.algorithm": elkMode,
      "elk.direction": getElkDirection(direction),

      // Spacing
      "elk.spacing.nodeNode": `${spacing}`,
      "elk.spacing.edgeNode": `${spacing * 0.5}`,
      "elk.spacing.edgeEdge": `${spacing * 0.5}`,
      "elk.layered.spacing.nodeNodeBetweenLayers": `${spacing * 1.5}`,
      "elk.layered.spacing.edgeNodeBetweenLayers": `${spacing}`,
      "elk.layered.spacing.edgeEdgeBetweenLayers": `${spacing * 0.5}`,

      // Crossing minimization
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.crossingMinimization.greedySwitch.type": "TWO_SIDED",
      "elk.layered.considerModelOrder.strategy": "PREFER_EDGES",
      "elk.layered.thoroughness": "7",

      // Node placement
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.nodePlacement.networkSimplex.nodeFlexibility.default": "NODE_SIZE",

      // Cycle breaking & layering
      "elk.layered.cycleBreaking.strategy": "INTERACTIVE",
      "elk.layered.layering.strategy": "NETWORK_SIMPLEX",

      // Edge routing within ELK (orthogonal)
      "elk.edgeRouting": "ORTHOGONAL",

      // Separate components
      "elk.separateConnectedComponents": "true",
      "elk.layered.considerModelOrder.components": "MODEL_ORDER",
    },
    children: nodes.map((node) => {
      const { width, height } = getNodeDims(node);
      return { id: node.id, width, height };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
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

// ELK layout with groups (compound nodes)
async function elkLayoutWithGroups(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number, elkMode: ElkMode = "layered"): Promise<Node[]> {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const groupIds = new Set(nodes.filter((n) => n.type === "group").map((n) => n.id));

  const childrenByParent = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(node);
  }

  const elkDir = getElkDirection(direction);

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

    // Per-group ELK options from node.data.elkOptions
    const groupElkOptions = (node.data as { elkOptions?: Record<string, string> })?.elkOptions ?? {};

    return {
      id: node.id,
      layoutOptions: {
        "elk.padding": `[top=${GROUP_PADDING},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
        ...groupElkOptions,
      },
      children: children.map((child) => buildElkNode(child.id)),
      edges: internalEdges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };
  }

  const rootChildren = childrenByParent.get("__root__") ?? [];
  const elkChildren = rootChildren.map((node) => buildElkNode(node.id));

  const allElkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph = {
    id: "elk-root",
    layoutOptions: {
      "elk.algorithm": elkMode,
      "elk.direction": elkDir,

      // Spacing
      "elk.spacing.nodeNode": `${spacing}`,
      "elk.spacing.edgeNode": `${spacing * 0.5}`,
      "elk.spacing.edgeEdge": `${spacing * 0.5}`,
      "elk.layered.spacing.nodeNodeBetweenLayers": `${spacing * 1.5}`,
      "elk.layered.spacing.edgeNodeBetweenLayers": `${spacing}`,
      "elk.layered.spacing.edgeEdgeBetweenLayers": `${spacing * 0.5}`,

      // Crossing minimization
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.crossingMinimization.greedySwitch.type": "TWO_SIDED",
      "elk.layered.considerModelOrder.strategy": "PREFER_EDGES",
      "elk.layered.thoroughness": "7",

      // Node placement
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.nodePlacement.networkSimplex.nodeFlexibility.default": "NODE_SIZE",

      // Cycle breaking & layering
      "elk.layered.cycleBreaking.strategy": "INTERACTIVE",
      "elk.layered.layering.strategy": "NETWORK_SIMPLEX",

      // Edge routing within ELK (orthogonal)
      "elk.edgeRouting": "ORTHOGONAL",

      // Hierarchy & components
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.separateConnectedComponents": "true",
      "elk.layered.considerModelOrder.components": "MODEL_ORDER",
    },
    children: elkChildren,
    edges: allElkEdges,
  };

  const root = await elk.layout(graph);

  const positions = new Map<string, { x: number; y: number }>();
  const groupSizes = new Map<string, { width: number; height: number }>();

  function collectPositions(elkNodes: ElkNode[]) {
    for (const elkNode of elkNodes) {
      positions.set(elkNode.id, { x: elkNode.x!, y: elkNode.y! });
      if (groupIds.has(elkNode.id)) {
        groupSizes.set(elkNode.id, { width: elkNode.width!, height: elkNode.height! });
      }
      if (elkNode.children) collectPositions(elkNode.children);
    }
  }
  collectPositions(root.children ?? []);

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos) return node;
    if (node.type === "group") {
      const size = groupSizes.get(node.id);
      return {
        ...node,
        position: pos,
        style: {
          ...((node.style ?? {}) as Record<string, unknown>),
          ...(size ? { width: size.width, height: size.height } : {}),
        },
      };
    }
    return { ...node, position: pos };
  });
}

// ---------------------------------------------------------------------------
// Dagre (shared)
// ---------------------------------------------------------------------------

// Flat dagre layout (no groups)
async function dagreLayoutFlat(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number): Promise<Node[]> {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: spacing, ranksep: spacing });

  for (const node of nodes) {
    const { width, height } = getNodeDims(node);
    g.setNode(node.id, { width, height });
  }
  for (const edge of edges) g.setEdge(edge.source, edge.target);

  dagre.layout(g);

  return nodes.map((node) => {
    const { x, y } = g.node(node.id);
    const { width, height } = getNodeDims(node);
    return { ...node, position: { x: x - width / 2, y: y - height / 2 } };
  });
}

// Dagre layout with groups (recursive per-group layout)
async function dagreLayoutWithGroups(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number): Promise<Node[]> {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const childrenByParent = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(node);
  }

  const resultPositions = new Map<string, { x: number; y: number }>();
  const computedSizes = new Map<string, { width: number; height: number }>();

  function layoutGroup(parentId: string): { width: number; height: number } {
    const children = childrenByParent.get(parentId) ?? [];
    if (children.length === 0) {
      const node = nodeById.get(parentId);
      return node ? getNodeDims(node) : { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
    }

    // Recursively layout nested groups first
    for (const child of children) {
      if (child.type === "group") {
        const size = layoutGroup(child.id);
        computedSizes.set(child.id, size);
      }
    }

    const childIds = new Set(children.map((c) => c.id));

    // Map all descendants to their direct child ancestor
    const nodeToDirectChild = new Map<string, string>();
    for (const child of children) {
      nodeToDirectChild.set(child.id, child.id);
      const mapDesc = (id: string) => {
        const desc = childrenByParent.get(id) ?? [];
        for (const d of desc) {
          nodeToDirectChild.set(d.id, child.id);
          mapDesc(d.id);
        }
      };
      mapDesc(child.id);
    }

    const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, nodesep: spacing, ranksep: spacing });

    for (const child of children) {
      const size = child.type === "group"
        ? (computedSizes.get(child.id) ?? getNodeDims(child))
        : getNodeDims(child);
      g.setNode(child.id, { width: size.width, height: size.height });
    }

    const addedEdges = new Set<string>();
    for (const edge of edges) {
      const src = nodeToDirectChild.get(edge.source);
      const tgt = nodeToDirectChild.get(edge.target);
      if (!src || !tgt || src === tgt) continue;
      if (!childIds.has(src) || !childIds.has(tgt)) continue;
      const key = `${src}->${tgt}`;
      if (addedEdges.has(key)) continue;
      addedEdges.add(key);
      g.setEdge(src, tgt);
    }

    dagre.layout(g);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const child of children) {
      const { x, y, width, height } = g.node(child.id);
      minX = Math.min(minX, x - width / 2);
      minY = Math.min(minY, y - height / 2);
      maxX = Math.max(maxX, x + width / 2);
      maxY = Math.max(maxY, y + height / 2);
    }

    for (const child of children) {
      const { x, y, width, height } = g.node(child.id);
      resultPositions.set(child.id, {
        x: x - width / 2 - minX + GROUP_PADDING,
        y: y - height / 2 - minY + GROUP_PADDING,
      });
    }

    return {
      width: maxX - minX + GROUP_PADDING * 2,
      height: maxY - minY + GROUP_PADDING * 2,
    };
  }

  layoutGroup("__root__");

  return nodes.map((node) => {
    const pos = resultPositions.get(node.id);
    if (!pos) return node;
    if (node.type === "group") {
      const size = computedSizes.get(node.id);
      return {
        ...node,
        position: pos,
        style: {
          ...((node.style ?? {}) as Record<string, unknown>),
          ...(size ? { width: size.width, height: size.height } : {}),
        },
      };
    }
    return { ...node, position: pos };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function runAutoLayout(
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions = {}
): Promise<Node[]> {
  const { direction = "LR", algorithm = "elk", spacing = 60, elkMode = "layered" } = options;
  const withGroups = hasGroups(nodes);

  switch (algorithm) {
    case "elk":
      return withGroups
        ? elkLayoutWithGroups(nodes, edges, direction, spacing, elkMode)
        : elkLayoutFlat(nodes, edges, direction, spacing, elkMode);
    case "dagre":
      return withGroups
        ? dagreLayoutWithGroups(nodes, edges, direction, spacing)
        : dagreLayoutFlat(nodes, edges, direction, spacing);
    default:
      return nodes;
  }
}

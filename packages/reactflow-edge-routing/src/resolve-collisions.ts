/**
 * Node collision resolution — pushes overlapping nodes apart iteratively.
 *
 * Supports arbitrarily nested subflows: resolves innermost siblings first
 * (bottom-up), so parent group sizes are always based on already-resolved
 * child positions.
 */

import type { Node } from '@xyflow/react';

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 50;

export type CollisionAlgorithmOptions = {
  maxIterations?: number;
  overlapThreshold?: number;
  margin?: number;
};

export type CollisionAlgorithm = (
  nodes: Node[],
  options?: CollisionAlgorithmOptions,
) => Node[];

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  moved: boolean;
  node: Node;
};

// ── Size helpers ─────────────────────────────────────────────────

function getNodeSizeSimple(node: Node): { width: number; height: number } {
  const style = node.style as { width?: number; height?: number } | undefined;
  const w = node.measured?.width ?? node.width ?? style?.width ?? DEFAULT_NODE_WIDTH;
  const h = node.measured?.height ?? node.height ?? style?.height ?? DEFAULT_NODE_HEIGHT;
  return { width: Number(w) || DEFAULT_NODE_WIDTH, height: Number(h) || DEFAULT_NODE_HEIGHT };
}

/**
 * Compute the actual size of a group node from its children, recursively.
 * Works for any nesting depth.
 */
function computeGroupSize(
  nodeId: string,
  childrenByParent: Map<string, Node[]>,
  nodeById: Map<string, Node>
): { width: number; height: number } {
  const children = childrenByParent.get(nodeId);
  if (!children || children.length === 0) {
    const node = nodeById.get(nodeId);
    return node ? getNodeSizeSimple(node) : { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
  }

  let maxRight = 0;
  let maxBottom = 0;

  for (const child of children) {
    const childSize = child.type === "group"
      ? computeGroupSize(child.id, childrenByParent, nodeById)
      : getNodeSizeSimple(child);
    const right = child.position.x + childSize.width;
    const bottom = child.position.y + childSize.height;
    if (right > maxRight) maxRight = right;
    if (bottom > maxBottom) maxBottom = bottom;
  }

  const padding = 20;
  return {
    width: maxRight + padding,
    height: maxBottom + padding,
  };
}

function getNodeSize(
  node: Node,
  childrenByParent: Map<string, Node[]>,
  nodeById: Map<string, Node>
): { width: number; height: number } {
  if (node.measured?.width && node.measured?.height) {
    return { width: node.measured.width, height: node.measured.height };
  }
  if (node.type === "group") {
    return computeGroupSize(node.id, childrenByParent, nodeById);
  }
  return getNodeSizeSimple(node);
}

function buildBoxes(
  nodes: Node[],
  margin: number,
  childrenByParent: Map<string, Node[]>,
  nodeById: Map<string, Node>
): Box[] {
  return nodes.map((node) => {
    const { width, height } = getNodeSize(node, childrenByParent, nodeById);
    return {
      x: node.position.x - margin,
      y: node.position.y - margin,
      width: width + margin * 2,
      height: height + margin * 2,
      node,
      moved: false,
    };
  });
}

// ── Core resolution ──────────────────────────────────────────────

function resolveBoxes(boxes: Box[], maxIter: number, threshold: number): void {
  for (let iter = 0; iter <= maxIter; iter++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i];
        const B = boxes[j];
        const dx = (A.x + A.width * 0.5) - (B.x + B.width * 0.5);
        const dy = (A.y + A.height * 0.5) - (B.y + B.height * 0.5);
        const px = (A.width + B.width) * 0.5 - Math.abs(dx);
        const py = (A.height + B.height) * 0.5 - Math.abs(dy);

        if (px > threshold && py > threshold) {
          A.moved = B.moved = moved = true;
          if (px < py) {
            const half = (px / 2) * (dx > 0 ? 1 : -1);
            A.x += half; B.x -= half;
          } else {
            const half = (py / 2) * (dy > 0 ? 1 : -1);
            A.y += half; B.y -= half;
          }
        }
      }
    }
    if (!moved) break;
  }
}

function getDepth(nodeId: string | undefined, nodeById: Map<string, Node>): number {
  let depth = 0;
  let current = nodeId ? nodeById.get(nodeId) : undefined;
  while (current?.parentId) {
    depth++;
    current = nodeById.get(current.parentId);
  }
  return depth;
}

/**
 * Pushes overlapping nodes apart along the axis with smallest overlap.
 *
 * Strategy:
 * 1. Group ALL nodes (including groups) by parentId
 * 2. Sort groups by depth (deepest first = bottom-up)
 * 3. Resolve innermost siblings first, update their positions, then
 *    resolve outer siblings — so parent group sizes are always computed
 *    from already-resolved child positions.
 */
export const resolveCollisions: CollisionAlgorithm = (
  nodes,
  options = {},
) => {
  if (nodes.length < 2) return nodes;

  const maxIter = options.maxIterations ?? 50;
  const threshold = options.overlapThreshold ?? 0.5;
  const margin = options.margin ?? 20;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const childrenByParent = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(node);
  }

  // Sort parent groups by depth (deepest first) so inner siblings
  // are resolved before outer ones
  const parentKeys = [...childrenByParent.keys()];
  parentKeys.sort((a, b) => {
    const depthA = a === "__root__" ? -1 : getDepth(a, nodeById);
    const depthB = b === "__root__" ? -1 : getDepth(b, nodeById);
    return depthB - depthA;
  });

  const movedNodes = new Map<string, { x: number; y: number }>();

  for (const parentKey of parentKeys) {
    const siblings = childrenByParent.get(parentKey)!;
    if (siblings.length < 2) continue;

    const boxes = buildBoxes(siblings, margin, childrenByParent, nodeById);
    resolveBoxes(boxes, maxIter, threshold);

    for (const box of boxes) {
      if (box.moved) {
        const newPos = { x: box.x + margin, y: box.y + margin };
        movedNodes.set(box.node.id, newPos);
        // Update position in-place so parent size computations in
        // subsequent (shallower) iterations see resolved positions
        box.node.position = newPos;
      }
    }
  }

  if (movedNodes.size === 0) return nodes;

  return nodes.map((node) => {
    const pos = movedNodes.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
};

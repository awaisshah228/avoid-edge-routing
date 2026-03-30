/**
 * Node collision resolution — pushes overlapping nodes apart iteratively.
 * Svelte Flow version — handles string styles.
 */

import type { SvelteFlowNode } from "./create-edge-routing";

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 50;

export type CollisionAlgorithmOptions = {
  maxIterations?: number;
  overlapThreshold?: number;
  margin?: number;
};

function parseStyleDim(style: string | Record<string, unknown> | undefined, prop: string): number | undefined {
  if (!style) return undefined;
  if (typeof style === "object") return (style as Record<string, number>)[prop] ?? undefined;
  const match = style.match(new RegExp(`${prop}:\\s*(\\d+(?:\\.\\d+)?)px`));
  return match ? parseFloat(match[1]) : undefined;
}

function getNodeSize(node: SvelteFlowNode): { width: number; height: number } {
  const w = node.measured?.width ?? parseStyleDim(node.style, "width") ?? node.width ?? DEFAULT_NODE_WIDTH;
  const h = node.measured?.height ?? parseStyleDim(node.style, "height") ?? node.height ?? DEFAULT_NODE_HEIGHT;
  return { width: Number(w) || DEFAULT_NODE_WIDTH, height: Number(h) || DEFAULT_NODE_HEIGHT };
}

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  moved: boolean;
  node: SvelteFlowNode;
};

function buildBoxes(nodes: SvelteFlowNode[], margin: number): Box[] {
  return nodes.map((node) => {
    const { width, height } = getNodeSize(node);
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

function getDepth(nodeId: string | undefined, nodeById: Map<string, SvelteFlowNode>): number {
  let depth = 0;
  let current = nodeId ? nodeById.get(nodeId) : undefined;
  while (current?.parentId) {
    depth++;
    current = nodeById.get(current.parentId);
  }
  return depth;
}

export function resolveCollisions(
  nodes: SvelteFlowNode[],
  options: CollisionAlgorithmOptions = {},
): SvelteFlowNode[] {
  if (nodes.length < 2) return nodes;

  const maxIter = options.maxIterations ?? 50;
  const threshold = options.overlapThreshold ?? 0.5;
  const margin = options.margin ?? 20;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const childrenByParent = new Map<string, SvelteFlowNode[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(node);
  }

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

    const boxes = buildBoxes(siblings, margin);
    resolveBoxes(boxes, maxIter, threshold);

    for (const box of boxes) {
      if (box.moved) {
        const newPos = { x: box.x + margin, y: box.y + margin };
        movedNodes.set(box.node.id, newPos);
        box.node.position = newPos;
      }
    }
  }

  if (movedNodes.size === 0) return nodes;

  return nodes.map((node) => {
    const pos = movedNodes.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

/**
 * expandGroups — Mimics Svelte Flow's expandParent behavior synchronously.
 * Svelte version — works with string styles.
 */

import type { Node } from "@xyflow/svelte";

const PADDING = 20;
const OVERLAP_GAP = 30;

function parseStyleDim(style: string | undefined, prop: string): number | undefined {
  if (!style) return undefined;
  const match = style.match(new RegExp(`${prop}:\\s*(\\d+(?:\\.\\d+)?)px`));
  return match ? parseFloat(match[1]) : undefined;
}

function getWidth(n: Node): number {
  return n.measured?.width ?? parseStyleDim(typeof n.style === "string" ? n.style : undefined, "width") ?? 150;
}

function getHeight(n: Node): number {
  return n.measured?.height ?? parseStyleDim(typeof n.style === "string" ? n.style : undefined, "height") ?? 40;
}

function updateStyleDim(style: string | undefined, prop: string, value: number): string {
  const base = style ?? "";
  const regex = new RegExp(`${prop}:\\s*\\d+(?:\\.\\d+)?px`);
  if (regex.test(base)) return base.replace(regex, `${prop}: ${value}px`);
  return base ? `${base}; ${prop}: ${value}px` : `${prop}: ${value}px`;
}

export function expandGroups(nodes: Node[]): Node[] {
  const result = nodes.map((n) => ({ ...n, position: { ...n.position } }));
  const nodeMap = new Map<string, Node>();
  for (const n of result) nodeMap.set(n.id, n);

  const childrenOf = new Map<string, string[]>();
  for (const n of result) {
    if (n.parentId) {
      const list = childrenOf.get(n.parentId) || [];
      list.push(n.id);
      childrenOf.set(n.parentId, list);
    }
  }

  const groupIds = result.filter((n) => n.type === "group").map((n) => n.id);

  function nestingDepth(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const node = nodeMap.get(id);
    if (!node?.parentId) return 0;
    return 1 + nestingDepth(node.parentId, visited);
  }

  const sortedGroups = [...groupIds].sort((a, b) => nestingDepth(b) - nestingDepth(a));

  for (const groupId of sortedGroups) {
    const group = nodeMap.get(groupId)!;
    const children = childrenOf.get(groupId);
    if (!children || children.length === 0) continue;

    let maxRight = 0;
    let maxBottom = 0;
    for (const childId of children) {
      const child = nodeMap.get(childId)!;
      maxRight = Math.max(maxRight, child.position.x + getWidth(child));
      maxBottom = Math.max(maxBottom, child.position.y + getHeight(child));
    }

    const newWidth = maxRight + PADDING;
    const newHeight = maxBottom + PADDING;
    let style = typeof group.style === "string" ? group.style : "";
    style = updateStyleDim(style, "width", newWidth);
    style = updateStyleDim(style, "height", newHeight);
    (group as any).style = style;
  }

  // Resolve overlaps between siblings
  const siblingGroups = new Map<string, Node[]>();
  for (const n of result) {
    const key = n.parentId ?? "__root__";
    const list = siblingGroups.get(key) || [];
    list.push(n);
    siblingGroups.set(key, list);
  }

  for (const [, siblings] of siblingGroups) {
    if (siblings.length < 2) continue;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < siblings.length; i++) {
        for (let j = i + 1; j < siblings.length; j++) {
          const a = siblings[i], b = siblings[j];
          const aw = getWidth(a), ah = getHeight(a), bw = getWidth(b);
          const xOverlap = a.position.x < b.position.x + bw && b.position.x < a.position.x + aw;
          const yOverlap = a.position.y < b.position.y + getHeight(b) && b.position.y < a.position.y + ah;
          if (xOverlap && yOverlap) {
            const [left, right] = a.position.x <= b.position.x ? [a, b] : [b, a];
            const leftRight = left.position.x + getWidth(left) + OVERLAP_GAP;
            if (right.position.x < leftRight) right.position = { x: leftRight, y: right.position.y };
          }
        }
      }
    }
  }

  return result;
}

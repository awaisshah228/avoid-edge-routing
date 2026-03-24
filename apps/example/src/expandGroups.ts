/**
 * expandGroups — Mimics React Flow's `expandParent` behavior synchronously.
 *
 * Computes group sizes based on their children's positions + sizes,
 * and recursively handles nested groups (groups within groups).
 * Processes deepest groups first so parent groups see correct child sizes.
 *
 * Based on the avoid-nodes-pro server-side example.
 */

import type { Node } from "@xyflow/react";

const PADDING = 20;
const OVERLAP_GAP = 30;

function getWidth(n: Node): number {
  return (n.measured?.width as number) ?? (n.width as number) ?? (n.style?.width as number) ?? 150;
}

function getHeight(n: Node): number {
  return (n.measured?.height as number) ?? (n.height as number) ?? (n.style?.height as number) ?? 40;
}

export function expandGroups(nodes: Node[]): Node[] {
  const result = nodes.map((n) => ({
    ...n,
    position: { ...n.position },
    style: n.style ? { ...n.style } : undefined,
  }));
  const nodeMap = new Map<string, Node>();
  for (const n of result) nodeMap.set(n.id, n);

  // Build parent → children map
  const childrenOf = new Map<string, string[]>();
  for (const n of result) {
    if (n.parentId) {
      const list = childrenOf.get(n.parentId) || [];
      list.push(n.id);
      childrenOf.set(n.parentId, list);
    }
  }

  // Find all group nodes and compute nesting depth
  const groupIds = result.filter((n) => n.type === "group").map((n) => n.id);

  function nestingDepth(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const node = nodeMap.get(id);
    if (!node?.parentId) return 0;
    return 1 + nestingDepth(node.parentId, visited);
  }

  // Sort: deepest groups first
  const sortedGroups = [...groupIds].sort((a, b) => nestingDepth(b) - nestingDepth(a));

  // Expand each group to fit its children
  for (const groupId of sortedGroups) {
    const group = nodeMap.get(groupId)!;
    const children = childrenOf.get(groupId);
    if (!children || children.length === 0) continue;

    let maxRight = 0;
    let maxBottom = 0;

    for (const childId of children) {
      const child = nodeMap.get(childId)!;
      const cw = getWidth(child);
      const ch = getHeight(child);
      maxRight = Math.max(maxRight, child.position.x + cw);
      maxBottom = Math.max(maxBottom, child.position.y + ch);
    }

    const newWidth = maxRight + PADDING;
    const newHeight = maxBottom + PADDING;

    // Update both width/height and style.width/height
    (group as any).width = newWidth;
    (group as any).height = newHeight;
    if (group.style) {
      (group.style as any).width = newWidth;
      (group.style as any).height = newHeight;
    } else {
      (group as any).style = { width: newWidth, height: newHeight };
    }

    // Horizontally center children within the group
    let minX = Infinity;
    let childMaxRight = 0;
    for (const childId of children) {
      const child = nodeMap.get(childId)!;
      const cw = getWidth(child);
      minX = Math.min(minX, child.position.x);
      childMaxRight = Math.max(childMaxRight, child.position.x + cw);
    }
    const childrenWidth = childMaxRight - minX;
    const offsetX = (newWidth - childrenWidth) / 2 - minX;
    if (Math.abs(offsetX) > 1) {
      for (const childId of children) {
        const child = nodeMap.get(childId)!;
        child.position = { x: child.position.x + offsetX, y: child.position.y };
      }
    }
  }

  // After expanding, resolve overlaps between sibling nodes/groups
  resolveOverlaps(result);

  return result;
}

function resolveOverlaps(nodes: Node[]) {
  const siblingGroups = new Map<string, Node[]>();
  for (const n of nodes) {
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
          const a = siblings[i];
          const b = siblings[j];
          const aw = getWidth(a);
          const ah = getHeight(a);
          const bw = getWidth(b);

          const xOverlap = a.position.x < b.position.x + bw && b.position.x < a.position.x + aw;
          const yOverlap = a.position.y < b.position.y + getHeight(b) && b.position.y < a.position.y + ah;

          if (xOverlap && yOverlap) {
            const [left, right] = a.position.x <= b.position.x ? [a, b] : [b, a];
            const leftRight = left.position.x + getWidth(left) + OVERLAP_GAP;
            if (right.position.x < leftRight) {
              right.position = { x: leftRight, y: right.position.y };
            }
          }
        }
      }
    }
  }
}

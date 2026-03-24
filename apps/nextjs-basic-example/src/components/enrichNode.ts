/**
 * enrichNode — Reads exact handle positions from React Flow's DOM
 * measurements and converts them to proportional _handlePins for the
 * edge-routing worker.
 *
 * Works with ANY node type — custom multi-handle nodes and default nodes alike.
 * Uses `getInternalNode()` to access React Flow's internal handle bounds.
 */

import type { Node, ReactFlowInstance } from "@xyflow/react";
import type { HandlePin } from "reactflow-edge-routing";

type HandlePosition = "left" | "right" | "top" | "bottom";

export interface EnrichNodeOptions {
  extraHeight?: number;
}

export function createEnrichNode(
  getInternalNode: ReactFlowInstance["getInternalNode"],
  options?: EnrichNodeOptions
) {
  const extraHeight = options?.extraHeight ?? 0;

  return (node: Node): Node => {
    // Skip group nodes — they're containers, not obstacles with pins
    if (node.type === "group") return node;

    const internal = getInternalNode(node.id);
    if (!internal) return node;

    const style = node.style as { width?: number; height?: number } | undefined;
    const measuredW = node.measured?.width ?? style?.width ?? (node.width as number | undefined);
    const measuredH = node.measured?.height ?? style?.height ?? (node.height as number | undefined);
    if (!measuredW || !measuredH) return node;

    const handleBounds = internal.internals?.handleBounds;
    if (!handleBounds) return node;

    const totalH = measuredH + extraHeight;
    const pins: HandlePin[] = [];

    const sourceHandles = handleBounds.source ?? [];
    const targetHandles = handleBounds.target ?? [];
    const allHandles = [...sourceHandles, ...targetHandles];

    // Track handle counts per type for auto-generating IDs when handles have no id
    let sourceIdx = 0;
    let targetIdx = 0;

    for (const h of allHandles) {
      const isSource = sourceHandles.includes(h);

      // Skip default handles (no explicit id) — let the router decide via autoBestSide
      if (!h.id) {
        if (isSource) sourceIdx++; else targetIdx++;
        continue;
      }

      const handleId = h.id;
      if (isSource) sourceIdx++; else targetIdx++;

      const cx = h.x + h.width / 2;
      const cy = h.y + h.height / 2;

      const side: HandlePosition =
        (h.position as HandlePosition) ??
        inferSide(cx, cy, measuredW, measuredH);

      pins.push({
        handleId,
        xPct: Math.max(0, Math.min(1, cx / measuredW)),
        yPct: Math.max(0, Math.min(1, cy / totalH)),
        side,
      });
    }

    return { ...node, _handlePins: pins, _extraHeight: extraHeight } as Node;
  };
}

function inferSide(x: number, y: number, w: number, h: number): HandlePosition {
  const distLeft = x;
  const distRight = w - x;
  const distTop = y;
  const distBottom = h - y;
  const min = Math.min(distLeft, distRight, distTop, distBottom);
  if (min === distLeft) return "left";
  if (min === distRight) return "right";
  if (min === distTop) return "top";
  return "bottom";
}

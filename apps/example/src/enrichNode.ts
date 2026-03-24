/**
 * enrichNode — Reads exact handle positions from React Flow's DOM
 * measurements and converts them to proportional _handlePins for the
 * edge-routing worker.
 *
 * Uses `getInternalNode()` to access React Flow's internal handle bounds —
 * these are the actual pixel positions of each <Handle> element after all
 * CSS transforms are applied. This is the single source of truth.
 */

import type { Node, ReactFlowInstance } from "@xyflow/react";
import type { HandlePin } from "reactflow-edge-routing";

type HandlePosition = "left" | "right" | "top" | "bottom";

export interface EnrichNodeOptions {
  /**
   * Extra height (px) to add to the libavoid obstacle beyond the node's
   * measured height. Useful for labels/data areas below the shape.
   * @default 0
   */
  extraHeight?: number;
}

/**
 * Creates a function that enriches a node with _handlePins by reading
 * exact DOM-measured handle positions from React Flow's internal state.
 *
 * @param getInternalNode - from `useReactFlow().getInternalNode`
 * @param options - extra height, etc.
 * @returns `(node: Node) => Node` with `_handlePins` attached
 */
export function createEnrichNode(
  getInternalNode: ReactFlowInstance["getInternalNode"],
  options?: EnrichNodeOptions
) {
  const extraHeight = options?.extraHeight ?? 0;

  return (node: Node): Node => {
    const internal = getInternalNode(node.id);
    if (!internal) return node;

    const measuredW = node.measured?.width ?? (node.width as number | undefined);
    const measuredH = node.measured?.height ?? (node.height as number | undefined);
    if (!measuredW || !measuredH) return node;

    const handleBounds = internal.internals?.handleBounds;
    if (!handleBounds) return node;

    const totalH = measuredH + extraHeight;
    const pins: HandlePin[] = [];

    const allHandles = [
      ...(handleBounds.source ?? []),
      ...(handleBounds.target ?? []),
    ];

    for (const h of allHandles) {
      if (!h.id) continue;

      // h.x, h.y = handle element's top-left after CSS transforms
      // h.width, h.height = handle element size
      // We want the CENTER of the handle dot:
      const cx = h.x + h.width / 2;
      const cy = h.y + h.height / 2;

      const side: HandlePosition =
        (h.position as HandlePosition) ??
        inferSide(cx, cy, measuredW, measuredH);

      pins.push({
        handleId: h.id,
        xPct: cx / measuredW,
        yPct: cy / totalH,
        side,
      });
    }

    return { ...node, _handlePins: pins, _extraHeight: extraHeight } as Node;
  };
}

/**
 * Infer which side a handle is on by checking which edge of the node
 * the handle center is closest to.
 */
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

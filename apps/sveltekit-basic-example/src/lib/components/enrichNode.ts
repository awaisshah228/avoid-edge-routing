/**
 * enrichNode — Reads handle positions from Svelte Flow's internal node
 * and converts them to _handlePins for the routing engine.
 * Matches the Next.js basic example enrichNode.
 */

import type { HandlePin } from "svelteflow-edge-routing";

type HandlePosition = "left" | "right" | "top" | "bottom";

export function createEnrichNode(getInternalNode: (id: string) => any) {
  return (node: any): any => {
    if (node.type === "group") return node;

    const internal = getInternalNode?.(node.id);
    if (!internal) return node;

    const measuredW = internal.measured?.width ?? node.measured?.width;
    const measuredH = internal.measured?.height ?? node.measured?.height;
    if (!measuredW || !measuredH) return node;

    const handleBounds = internal.internals?.handleBounds;
    if (!handleBounds) return node;

    const pins: HandlePin[] = [];
    const allHandles = [...(handleBounds.source ?? []), ...(handleBounds.target ?? [])];

    for (const h of allHandles) {
      if (!h.id) continue;
      const cx = h.x + h.width / 2;
      const cy = h.y + h.height / 2;
      const side: HandlePosition = (h.position as HandlePosition) ?? inferSide(cx, cy, measuredW, measuredH);
      pins.push({
        handleId: h.id,
        xPct: Math.max(0, Math.min(1, cx / measuredW)),
        yPct: Math.max(0, Math.min(1, cy / measuredH)),
        side,
      });
    }

    return { ...node, measured: { width: measuredW, height: measuredH }, _handlePins: pins, _extraHeight: 0 };
  };
}

function inferSide(x: number, y: number, w: number, h: number): HandlePosition {
  const distLeft = x, distRight = w - x, distTop = y, distBottom = h - y;
  const min = Math.min(distLeft, distRight, distTop, distBottom);
  if (min === distLeft) return "left";
  if (min === distRight) return "right";
  if (min === distTop) return "top";
  return "bottom";
}

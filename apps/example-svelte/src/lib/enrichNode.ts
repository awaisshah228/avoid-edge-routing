/**
 * enrichNode — Reads exact handle positions from Svelte Flow's internal
 * node data and converts them to proportional _handlePins for the
 * edge-routing worker.
 *
 * Matches the React enrichNode behavior exactly.
 */

import type { HandlePin } from "svelteflow-edge-routing";

type HandlePosition = "left" | "right" | "top" | "bottom";

function parseDim(style: string | Record<string, unknown> | undefined, prop: string): number | undefined {
  if (!style) return undefined;
  if (typeof style === "object") return (style as Record<string, number>)[prop] ?? undefined;
  const match = (style as string).match(new RegExp(`${prop}:\\s*(\\d+(?:\\.\\d+)?)px`));
  return match ? parseFloat(match[1]) : undefined;
}

export function createEnrichNode(
  getInternalNode: (id: string) => any,
) {
  return (node: any): any => {
    if (node.type === "group") return node;

    const internal = getInternalNode?.(node.id);
    if (!internal) return node;

    // Prefer internal measured dimensions (always up-to-date from DOM)
    const measuredW = internal.measured?.width ?? node.measured?.width ?? parseDim(node.style, "width") ?? node.width;
    const measuredH = internal.measured?.height ?? node.measured?.height ?? parseDim(node.style, "height") ?? node.height;
    if (!measuredW || !measuredH) return node;

    // handleBounds is at internal.internals.handleBounds (same as React Flow)
    const handleBounds = internal.internals?.handleBounds;
    if (!handleBounds) return node;

    const pins: HandlePin[] = [];
    const sourceHandles = handleBounds.source ?? [];
    const targetHandles = handleBounds.target ?? [];
    const allHandles = [...sourceHandles, ...targetHandles];

    for (const h of allHandles) {
      // Skip handles without explicit id — let router use autoBestSide
      if (!h.id) continue;

      const cx = h.x + h.width / 2;
      const cy = h.y + h.height / 2;

      const side: HandlePosition =
        (h.position as HandlePosition) ??
        inferSide(cx, cy, measuredW, measuredH);

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

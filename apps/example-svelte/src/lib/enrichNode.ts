/**
 * enrichNode — Reads exact handle positions from Svelte Flow's internal
 * node data and converts them to proportional _handlePins for the
 * edge-routing worker.
 *
 * Works with ANY node type. Uses the internals from Svelte Flow's
 * useSvelteFlow() to access handle bounds.
 */

import type { HandlePin } from "svelteflow-edge-routing";

type HandlePosition = "left" | "right" | "top" | "bottom";

type SvelteFlowNodeLike = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
  style?: string | Record<string, unknown>;
  internals?: {
    handleBounds?: {
      source?: HandleBound[];
      target?: HandleBound[];
    };
  };
  [key: string]: unknown;
};

type HandleBound = {
  id?: string | null;
  position?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function parseDim(style: string | Record<string, unknown> | undefined, prop: string): number | undefined {
  if (!style) return undefined;
  if (typeof style === "object") return (style as Record<string, number>)[prop] ?? undefined;
  const match = style.match(new RegExp(`${prop}:\\s*(\\d+(?:\\.\\d+)?)px`));
  return match ? parseFloat(match[1]) : undefined;
}

export function createEnrichNode(
  getInternalNode?: (id: string) => SvelteFlowNodeLike | undefined,
) {
  return (node: SvelteFlowNodeLike): SvelteFlowNodeLike => {
    if (node.type === "group") return node;

    // Try to get internal node for handle bounds
    const internal = getInternalNode?.(node.id) ?? node;

    if (!internal) {
      console.log(`[enrichNode] No internal node for ${node.id}`);
      return node;
    }

    // Parse dimensions from internal measured, object style, string style, or explicit props
    const internalMeasured = (internal as SvelteFlowNodeLike).measured;
    const measuredW = internalMeasured?.width ?? node.measured?.width ?? parseDim(node.style, "width") ?? node.width;
    const measuredH = internalMeasured?.height ?? node.measured?.height ?? parseDim(node.style, "height") ?? node.height;
    if (!measuredW || !measuredH) return node;

    // In @xyflow/svelte, handleBounds lives at internal.internals.handleBounds
    const internals = (internal as any).internals;
    const handleBounds = internals?.handleBounds;
    if (!handleBounds) {
      console.log(`[enrichNode] No handleBounds for ${node.id}, internals keys:`, internals ? Object.keys(internals) : "none");
      return node;
    }
    console.log(`[enrichNode] ${node.id} has handleBounds:`, Object.keys(handleBounds));

    const pins: HandlePin[] = [];

    const sourceHandles = handleBounds.source ?? [];
    const targetHandles = handleBounds.target ?? [];
    const allHandles = [...sourceHandles, ...targetHandles];

    for (const h of allHandles) {
      if (!h.id) continue;

      const handleId = h.id;
      const cx = h.x + h.width / 2;
      const cy = h.y + h.height / 2;

      const side: HandlePosition =
        (h.position as HandlePosition) ??
        inferSide(cx, cy, measuredW, measuredH);

      pins.push({
        handleId,
        xPct: Math.max(0, Math.min(1, cx / measuredW)),
        yPct: Math.max(0, Math.min(1, cy / measuredH)),
        side,
      });
    }

    return { ...node, _handlePins: pins, _extraHeight: 0 };
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

/**
 * getRoutedEdgePath — Svelte equivalent of useRoutedEdgePath (React hook).
 *
 * Returns a derived store that produces [path, labelX, labelY, wasRouted, controlPoints, pinPoints]
 * for a given edge. Subscribe to it in your Svelte component.
 *
 * Usage:
 *   const pathStore = getRoutedEdgePath({ id, sourceX, sourceY, ... });
 *   $: [path, labelX, labelY, wasRouted] = $pathStore;
 */

import { derived } from "svelte/store";
import { edgeRoutingStore } from "./edge-routing-store";
import { EDGE_BORDER_RADIUS } from "./constants";
import type { ConnectorType } from "./routing-core";

export type Position = "left" | "right" | "top" | "bottom";

export interface GetRoutedEdgePathParams {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: Position;
  targetPosition?: Position;
  borderRadius?: number;
  offset?: number;
  connectorType?: ConnectorType;
  source?: string;
  target?: string;
}

export type RoutePinPoints = {
  sourceX: number; sourceY: number;
  targetX: number; targetY: number;
};

export type RoutedEdgePathResult = [
  path: string,
  labelX: number,
  labelY: number,
  wasRouted: boolean,
  controlPoints: { x: number; y: number }[],
  pinPoints: RoutePinPoints,
];

/**
 * Build a simple straight-line or smooth-step fallback path.
 * Unlike the React version, we don't import from @xyflow/react here.
 * Instead we compute a minimal SVG path directly.
 */
function buildFallbackPath(
  sourceX: number, sourceY: number,
  targetX: number, targetY: number,
  sourcePosition?: Position,
  targetPosition?: Position,
  borderRadius?: number,
  _offset?: number,
): [string, number, number] {
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  if (!sourcePosition || !targetPosition) {
    return [`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`, labelX, labelY];
  }

  // Simple smooth step fallback
  const offset = _offset ?? 20;
  const br = borderRadius ?? EDGE_BORDER_RADIUS;

  // Compute control offsets based on handle position
  let sx = sourceX, sy = sourceY;
  let tx = targetX, ty = targetY;

  const sOffX = sourcePosition === "left" ? -offset : sourcePosition === "right" ? offset : 0;
  const sOffY = sourcePosition === "top" ? -offset : sourcePosition === "bottom" ? offset : 0;
  const tOffX = targetPosition === "left" ? -offset : targetPosition === "right" ? offset : 0;
  const tOffY = targetPosition === "top" ? -offset : targetPosition === "bottom" ? offset : 0;

  const mx1 = sx + sOffX;
  const my1 = sy + sOffY;
  const mx2 = tx + tOffX;
  const my2 = ty + tOffY;

  // Simple path: source → stub → midX → stub → target
  const midX = (mx1 + mx2) / 2;
  const midY = (my1 + my2) / 2;

  const path = `M ${sx} ${sy} L ${mx1} ${my1} L ${midX} ${my1} L ${midX} ${my2} L ${mx2} ${my2} L ${tx} ${ty}`;
  return [path, labelX, labelY];
}

/**
 * Compute routed edge path synchronously from current store state.
 * Use this in Svelte components where you read from the store reactively.
 */
export function computeRoutedEdgePath(
  params: GetRoutedEdgePathParams,
  routes: Record<string, import("./routing-core").AvoidRoute>,
  draggingNodeIds: Set<string>,
): RoutedEdgePathResult {
  const {
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    offset, connectorType, source, target,
  } = params;

  const fallbackPins: RoutePinPoints = { sourceX, sourceY, targetX, targetY };
  const route = routes[id];

  // If a connected node is being dragged, show fallback
  const isDragging =
    draggingNodeIds.size > 0 &&
    ((source != null && draggingNodeIds.has(source)) ||
     (target != null && draggingNodeIds.has(target)));

  if (isDragging) {
    const [path, lx, ly] = buildFallbackPath(
      sourceX, sourceY, targetX, targetY,
      sourcePosition, targetPosition, params.borderRadius, offset
    );
    return [path, lx, ly, false, [], fallbackPins];
  }

  if (route?.path) {
    const controlPoints = route.points && route.points.length > 2
      ? route.points.slice(1, -1)
      : [];
    const pins: RoutePinPoints = {
      sourceX: route.sourceX, sourceY: route.sourceY,
      targetX: route.targetX, targetY: route.targetY,
    };
    return [route.path, route.labelX, route.labelY, true, controlPoints, pins];
  }

  const [path, lx, ly] = buildFallbackPath(
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, params.borderRadius, offset
  );
  return [path, lx, ly, false, [], fallbackPins];
}

/**
 * Create a derived Svelte store that reactively returns the routed edge path.
 * Useful when you want a store-based reactive approach.
 */
export function getRoutedEdgePathStore(
  paramsGetter: () => GetRoutedEdgePathParams
) {
  return derived(edgeRoutingStore, ($store) => {
    const params = paramsGetter();
    return computeRoutedEdgePath(params, $store.routes, $store.draggingNodeIds);
  });
}

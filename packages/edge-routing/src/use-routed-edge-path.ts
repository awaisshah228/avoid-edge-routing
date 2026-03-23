import { useMemo } from "react";
import { getStraightPath, getSmoothStepPath, Position as RFPosition } from "@xyflow/react";
import { useEdgeRoutingStore } from "./edge-routing-store";
import { EDGE_BORDER_RADIUS } from "./constants";

export type Position = "left" | "right" | "top" | "bottom";

/**
 * Max px the routed path endpoints can drift from React Flow's handle
 * positions before we discard the stale route and use a fallback path.
 * Set above the ~6px handle-radius offset between node boundary and
 * React Flow's anchor (center of handle element).
 */
const STALE_THRESHOLD_PX = 10;

function getPathEndpoints(pathStr: string): { sx: number; sy: number; tx: number; ty: number } | null {
  const re = /([\d.\-]+)\s+([\d.\-]+)/g;
  let first: { x: number; y: number } | null = null;
  let last: { x: number; y: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pathStr)) !== null) {
    const pt = { x: Number(m[1]), y: Number(m[2]) };
    if (!first) first = pt;
    last = pt;
  }
  if (!first || !last) return null;
  return { sx: first.x, sy: first.y, tx: last.x, ty: last.y };
}

function isRouteStale(
  routePath: string,
  sourceX: number, sourceY: number,
  targetX: number, targetY: number,
): boolean {
  const ep = getPathEndpoints(routePath);
  if (!ep) return true;
  return (
    Math.abs(ep.sx - sourceX) > STALE_THRESHOLD_PX ||
    Math.abs(ep.sy - sourceY) > STALE_THRESHOLD_PX ||
    Math.abs(ep.tx - targetX) > STALE_THRESHOLD_PX ||
    Math.abs(ep.ty - targetY) > STALE_THRESHOLD_PX
  );
}

const RF_POS: Record<Position, RFPosition> = {
  left: "left" as RFPosition,
  right: "right" as RFPosition,
  top: "top" as RFPosition,
  bottom: "bottom" as RFPosition,
};

export interface UseRoutedEdgePathParams {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: Position;
  targetPosition?: Position;
  borderRadius?: number;
  offset?: number;
}

/**
 * Returns [path, labelX, labelY, wasRouted] for a routed edge.
 * Reads from the routing store (set by the worker); falls back to smooth-step / straight.
 */
export function useRoutedEdgePath(
  params: UseRoutedEdgePathParams
): [path: string, labelX: number, labelY: number, wasRouted: boolean] {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    offset,
  } = params;

  const loaded = useEdgeRoutingStore((s) => s.loaded);
  const route = useEdgeRoutingStore((s) => s.routes[id]);

  return useMemo(() => {
    if (loaded && route && !isRouteStale(route.path, sourceX, sourceY, targetX, targetY)) {
      return [route.path, route.labelX, route.labelY, true];
    }

    if (sourcePosition && targetPosition) {
      const [smoothPath, sLabelX, sLabelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition: RF_POS[sourcePosition],
        targetPosition: RF_POS[targetPosition],
        borderRadius: params.borderRadius ?? EDGE_BORDER_RADIUS,
        offset: offset ?? 20,
      });
      return [smoothPath, sLabelX, sLabelY, false];
    }

    const [straightPath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
    return [straightPath, labelX, labelY, false];
  }, [loaded, route, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, offset, params.borderRadius]);
}

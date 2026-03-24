import { useMemo } from "react";
import { getStraightPath, getSmoothStepPath, Position as RFPosition } from "@xyflow/react";
import { useEdgeRoutingStore } from "./edge-routing-store";
import { EDGE_BORDER_RADIUS } from "./constants";

export type Position = "left" | "right" | "top" | "bottom";

/**
 * Max px the routed path endpoints can drift from React Flow's handle
 * positions before we discard the stale route and use a fallback path.
 *
 * libavoid routes from pin positions on the node boundary, while React Flow
 * reports handle centers (which can be offset by handle size + padding).
 * A generous threshold avoids false "stale" detections that cause fallback
 * paths to be drawn (which don't respect obstacles → overlapping edges).
 */
const STALE_THRESHOLD_PX = 50;

function isRouteStale(
  route: { sourceX: number; sourceY: number; targetX: number; targetY: number },
  sourceX: number, sourceY: number,
  targetX: number, targetY: number,
): boolean {
  return (
    Math.abs(route.sourceX - sourceX) > STALE_THRESHOLD_PX ||
    Math.abs(route.sourceY - sourceY) > STALE_THRESHOLD_PX ||
    Math.abs(route.targetX - targetX) > STALE_THRESHOLD_PX ||
    Math.abs(route.targetY - targetY) > STALE_THRESHOLD_PX
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
    if (loaded && route && !isRouteStale(route, sourceX, sourceY, targetX, targetY)) {
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

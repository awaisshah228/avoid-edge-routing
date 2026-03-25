import { useMemo } from "react";
import { getStraightPath, getSmoothStepPath, getBezierPath, Position as RFPosition } from "@xyflow/react";
import { useEdgeRoutingStore } from "./edge-routing-store";
import { EDGE_BORDER_RADIUS } from "./constants";
import type { ConnectorType } from "./routing-core";

export type Position = "left" | "right" | "top" | "bottom";

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
  connectorType?: ConnectorType;
  source?: string;
  target?: string;
}

function getFallback(
  sourceX: number, sourceY: number,
  targetX: number, targetY: number,
  sourcePosition: Position | undefined,
  targetPosition: Position | undefined,
  connectorType: ConnectorType | undefined,
  borderRadius: number | undefined,
  offset: number | undefined,
): [string, number, number, ...unknown[]] {
  if (sourcePosition && targetPosition) {
    const srcPos = RF_POS[sourcePosition];
    const tgtPos = RF_POS[targetPosition];

    if (connectorType === "bezier") {
      return getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition: srcPos, targetPosition: tgtPos });
    }

    return getSmoothStepPath({
      sourceX, sourceY, targetX, targetY,
      sourcePosition: srcPos, targetPosition: tgtPos,
      borderRadius: borderRadius ?? EDGE_BORDER_RADIUS,
      offset: offset ?? 20,
    });
  }

  return getStraightPath({ sourceX, sourceY, targetX, targetY });
}

export type RoutePinPoints = {
  sourceX: number; sourceY: number;
  targetX: number; targetY: number;
};

/**
 * Returns [path, labelX, labelY, wasRouted, controlPoints, pinPoints] for a routed edge.
 *
 * - While a connected node is being dragged → dashed fallback
 * - If a routed path exists for this edge → solid routed path
 * - No route yet (worker hasn't responded) → dashed fallback
 *
 * `controlPoints` are the intermediate waypoints of the routed path (excluding
 * the source and target anchor points). Use them to build an editable edge on
 * top of auto-routing — e.g. render draggable handles at each waypoint.
 * When no route is available (fallback), `controlPoints` is an empty array.
 *
 * `pinPoints` are the exact source/target positions the router snapped to.
 * Falls back to the passed-in sourceX/Y, targetX/Y when no route is available.
 */
export function useRoutedEdgePath(
  params: UseRoutedEdgePathParams
): [path: string, labelX: number, labelY: number, wasRouted: boolean, controlPoints: { x: number; y: number }[], pinPoints: RoutePinPoints] {
  const {
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    offset, connectorType, source, target,
  } = params;

  const route = useEdgeRoutingStore((s) => s.routes[id]);
  const draggingNodeIds = useEdgeRoutingStore((s) => s.draggingNodeIds);

  return useMemo(() => {
    const fallbackPins: RoutePinPoints = { sourceX, sourceY, targetX, targetY };

    // If a connected node is being dragged, show fallback
    const isDragging =
      draggingNodeIds.size > 0 &&
      ((source != null && draggingNodeIds.has(source)) ||
       (target != null && draggingNodeIds.has(target)));

    if (isDragging) {
      const [path, lx, ly] = getFallback(sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, connectorType, params.borderRadius, offset);
      return [path, lx, ly, false, [], fallbackPins];
    }

    // If we have a routed path, use it (no stale check — trust the router)
    if (route?.path) {
      // Strip the first (source anchor) and last (target anchor) points — the
      // middle points are the editable control points for the connector.
      const controlPoints = route.points && route.points.length > 2
        ? route.points.slice(1, -1)
        : [];
      const pins: RoutePinPoints = {
        sourceX: route.sourceX, sourceY: route.sourceY,
        targetX: route.targetX, targetY: route.targetY,
      };
      return [route.path, route.labelX, route.labelY, true, controlPoints, pins];
    }

    // No route yet — show fallback
    const [path, lx, ly] = getFallback(sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, connectorType, params.borderRadius, offset);
    return [path, lx, ly, false, [], fallbackPins];
  }, [route, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, offset, connectorType, params.borderRadius, source, target, draggingNodeIds]);
}

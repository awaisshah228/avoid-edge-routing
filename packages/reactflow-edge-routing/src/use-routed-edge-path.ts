import { useMemo } from "react";
import { getStraightPath, getSmoothStepPath, getBezierPath, Position as RFPosition } from "@xyflow/react";
import { useEdgeRoutingStore } from "./edge-routing-store";
import { EDGE_BORDER_RADIUS } from "./constants";
import type { ConnectorType } from "./routing-core";

export type Position = "left" | "right" | "top" | "bottom";

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
  connectorType?: ConnectorType;
  /** Source node ID — used to detect if connected node is being dragged */
  source?: string;
  /** Target node ID — used to detect if connected node is being dragged */
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

/**
 * Returns [path, labelX, labelY, wasRouted] for a routed edge.
 *
 * - While a connected node is being dragged → dashed fallback preview
 * - If a fresh routed path is available → solid routed path
 * - Otherwise → dashed fallback preview
 */
export function useRoutedEdgePath(
  params: UseRoutedEdgePathParams
): [path: string, labelX: number, labelY: number, wasRouted: boolean] {
  const {
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    offset, connectorType, source, target,
  } = params;

  const route = useEdgeRoutingStore((s) => s.routes[id]);
  const draggingNodeIds = useEdgeRoutingStore((s) => s.draggingNodeIds);

  return useMemo(() => {
    // If a connected node is being dragged, always show fallback
    const isConnectedNodeDragging =
      draggingNodeIds.size > 0 &&
      ((source != null && draggingNodeIds.has(source)) ||
       (target != null && draggingNodeIds.has(target)));

    if (isConnectedNodeDragging) {
      const [path, lx, ly] = getFallback(sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, connectorType, params.borderRadius, offset);
      return [path, lx, ly, false];
    }

    // If we have a fresh routed path, use it
    if (route && !isRouteStale(route, sourceX, sourceY, targetX, targetY)) {
      return [route.path, route.labelX, route.labelY, true];
    }

    // No route yet — show fallback
    const [path, lx, ly] = getFallback(sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, connectorType, params.borderRadius, offset);
    return [path, lx, ly, false];
  }, [route, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, offset, connectorType, params.borderRadius, source, target, draggingNodeIds]);
}

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
  /** Connector type — determines fallback path style. Default: "orthogonal" */
  connectorType?: ConnectorType;
}

/**
 * Returns [path, labelX, labelY, wasRouted] for a routed edge.
 *
 * - If a fresh routed path is available → use it.
 * - Otherwise → show a fallback preview matching the connector type:
 *   - "bezier" → React Flow's bezier path
 *   - "orthogonal" / "polyline" → React Flow's smooth-step path
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
    connectorType,
  } = params;

  const route = useEdgeRoutingStore((s) => s.routes[id]);

  return useMemo(() => {
    if (route && !isRouteStale(route, sourceX, sourceY, targetX, targetY)) {
      return [route.path, route.labelX, route.labelY, true];
    }

    if (sourcePosition && targetPosition) {
      const srcPos = RF_POS[sourcePosition];
      const tgtPos = RF_POS[targetPosition];

      // Bezier fallback for bezier connector type
      if (connectorType === "bezier") {
        const [bezierPath, bLabelX, bLabelY] = getBezierPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition: srcPos,
          targetPosition: tgtPos,
        });
        return [bezierPath, bLabelX, bLabelY, false];
      }

      // Smooth-step fallback for orthogonal / polyline
      const [smoothPath, sLabelX, sLabelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition: srcPos,
        targetPosition: tgtPos,
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
  }, [route, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, offset, connectorType, params.borderRadius]);
}

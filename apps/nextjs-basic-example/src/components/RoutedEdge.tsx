"use client";

import { memo } from "react";
import { BaseEdge, type EdgeProps } from "@xyflow/react";
import { useRoutedEdgePath } from "reactflow-edge-routing";

function RoutedEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = useRoutedEdgePath({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
    connectorType: "orthogonal",
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: selected ? "#2563eb" : "#94a3b8",
        strokeWidth: selected ? 2.5 : 1.5,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }}
    />
  );
}

export const RoutedEdge = memo(RoutedEdgeComponent);

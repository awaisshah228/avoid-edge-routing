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
  const [edgePath, , , wasRouted] = useRoutedEdgePath({
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
        stroke: selected ? "#2563eb" : wasRouted ? "#94a3b8" : "#94a3b8",
        strokeWidth: selected ? 2.5 : 1.5,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeDasharray: wasRouted ? undefined : "12 4",
      }}
    />
  );
}

export const RoutedEdge = memo(RoutedEdgeComponent);

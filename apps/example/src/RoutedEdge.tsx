import { memo } from "react";
import { BaseEdge, type EdgeProps } from "@xyflow/react";
import { useRoutedEdgePath, useEdgeRoutingStore } from "reactflow-edge-routing";

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
}: EdgeProps) {
  const connectorType = useEdgeRoutingStore((s) => s.connectorType);

  const [edgePath, labelX, labelY, wasRouted] = useRoutedEdgePath({
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
    connectorType,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: selected ? "#2563eb" : wasRouted ? "#64748b" : "#94a3b8",
        strokeWidth: selected ? 2.5 : wasRouted ? 1.5 : 1,
        strokeLinecap: "round",
        strokeDasharray: wasRouted ? undefined : "6 4",
        transition: "stroke-dasharray 0.15s, stroke 0.15s",
      }}
    />
  );
}

export const RoutedEdge = memo(RoutedEdgeComponent);

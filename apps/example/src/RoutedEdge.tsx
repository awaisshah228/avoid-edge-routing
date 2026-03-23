import { memo } from "react";
import { BaseEdge, type EdgeProps } from "@xyflow/react";
import { useRoutedEdgePath } from "edge-routing";

function RoutedEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = useRoutedEdgePath({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: selected ? "#2563eb" : "#64748b",
        strokeWidth: selected ? 2.5 : 1.5,
        strokeLinecap: "round",
      }}
    />
  );
}

export const RoutedEdge = memo(RoutedEdgeComponent);

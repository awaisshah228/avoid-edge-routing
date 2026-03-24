import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { useRoutedEdgePath, useEdgeRoutingStore } from "reactflow-edge-routing";

type EdgeData = {
  strokeColor?: string;
  label?: string;
  strokeDasharray?: string;
  strokeWidth?: number;
};

const EDGE_STROKE_WIDTH = 1.5;
const MIN_EDGE_LENGTH_FOR_LABEL_PX = 72;
const LABEL_WIDTH_APPROX_PX_PER_CHAR = 7;
const LABEL_PADDING_PX = 32;

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
  data,
  markerEnd,
  markerStart,
}: EdgeProps) {
  const connectorType = useEdgeRoutingStore((s) => s.connectorType);
  const edgeData = (data ?? {}) as EdgeData;
  const strokeColor = edgeData.strokeColor ?? "#94a3b8";
  const strokeWidth = edgeData.strokeWidth ?? EDGE_STROKE_WIDTH;
  const label = edgeData.label ?? "";

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

  // Only show label if edge is long enough
  const edgeLength = Math.hypot(targetX - sourceX, targetY - sourceY);
  const labelWidthApprox = label.length * LABEL_WIDTH_APPROX_PX_PER_CHAR;
  const minLengthToShowLabel = Math.max(MIN_EDGE_LENGTH_FOR_LABEL_PX, labelWidthApprox + LABEL_PADDING_PX);
  const showLabel = label && wasRouted && edgeLength >= minLengthToShowLabel;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          stroke: selected ? "#2563eb" : wasRouted ? strokeColor : "#94a3b8",
          strokeWidth: selected ? strokeWidth + 1 : strokeWidth,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeDasharray: wasRouted ? (edgeData.strokeDasharray ?? undefined) : "12 4",
        }}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 10,
              background: "white",
              padding: "2px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "sans-serif",
              border: "1px solid #e2e8f0",
              color: "#475569",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              whiteSpace: "nowrap",
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const RoutedEdge = memo(RoutedEdgeComponent);

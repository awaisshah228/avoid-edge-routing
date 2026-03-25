import { memo, useCallback, useRef } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  useStore,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { useRoutedEdgePath, useEdgeRoutingStore, PathBuilder, type ConnectorType } from "reactflow-edge-routing";
import type { Position } from "@xyflow/react";
import { ControlHandle } from "./ControlHandle";
import { useManualPointsStore, type ManualPoint } from "./useManualPointsStore";

export type EditableRoutedEdgeData = { strokeColor?: string };
export type EditableRoutedEdge = Edge<EditableRoutedEdgeData>;

// ---------------------------------------------------------------------------
// Build a manual path styled to match the active connector type.
// Perpendicular stubs are derived from sourcePosition/targetPosition so the
// edge always exits the node orthogonally, regardless of where waypoints are.
// ---------------------------------------------------------------------------
const STUB_OFFSET = 20;

const HANDLE_DIR: Record<string, { x: number; y: number }> = {
  left:   { x: -1, y:  0 },
  right:  { x:  1, y:  0 },
  top:    { x:  0, y: -1 },
  bottom: { x:  0, y:  1 },
};

function buildManualPath(
  sx: number, sy: number, srcPos: Position | undefined,
  pts: { x: number; y: number }[],
  tx: number, ty: number, tgtPos: Position | undefined,
  connectorType: ConnectorType,
): string {
  // For bezier: add short perpendicular stubs so the smooth curve exits the
  // node in the correct direction. For orthogonal/polyline, stubs create a
  // kink whenever the control point is behind the exit direction, so skip them.
  if (connectorType === "bezier") {
    const srcDir = srcPos ? HANDLE_DIR[srcPos] : null;
    const tgtDir = tgtPos ? HANDLE_DIR[tgtPos] : null;
    const srcStub = srcDir ? { x: sx + srcDir.x * STUB_OFFSET, y: sy + srcDir.y * STUB_OFFSET } : null;
    const tgtStub = tgtDir ? { x: tx + tgtDir.x * STUB_OFFSET, y: ty + tgtDir.y * STUB_OFFSET } : null;
    const points = [
      { x: sx, y: sy },
      ...(srcStub ? [srcStub] : []),
      ...pts,
      ...(tgtStub ? [tgtStub] : []),
      { x: tx, y: ty },
    ];
    return PathBuilder.routedBezierPath(points);
  }

  return PathBuilder.pointsToSvgPath([{ x: sx, y: sy }, ...pts, { x: tx, y: ty }]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function EditableRoutedEdgeComponent({
  id, source, target,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  selected, data, markerEnd, markerStart,
}: EdgeProps<EditableRoutedEdge>) {
  const strokeColor = (data as EditableRoutedEdgeData | undefined)?.strokeColor ?? "#94a3b8";
  const connectorType = useEdgeRoutingStore((s) => s.connectorType);

  const [autoPath, labelX, labelY, wasRouted, autoControlPoints, pinPoints] = useRoutedEdgePath({
    id, source, target,
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    connectorType,
  });

  // Manual points stored outside React Flow state — survive re-renders
  const manualPoints = useManualPointsStore((s) => s.points[id]);
  const setPoints    = useManualPointsStore((s) => s.setPoints);
  const clearPoints  = useManualPointsStore((s) => s.clearPoints);
  const isManual     = manualPoints !== undefined && manualPoints.length > 0;

  // Always-fresh ref so drag callbacks never go stale
  const autoRef = useRef(autoControlPoints);
  autoRef.current = autoControlPoints;

  // ---- Path ----------------------------------------------------------------
  // Manual mode: polyline from source handle → user waypoints → target handle.
  // Auto mode:   proper routed path from the worker.
  //
  // Source/target handles are always taken from the current edge props so the
  // edge stays attached to nodes even when nodes are moved after manual points
  // were placed.
  const edgePath = isManual
    ? buildManualPath(pinPoints.sourceX, pinPoints.sourceY, sourcePosition, manualPoints, pinPoints.targetX, pinPoints.targetY, targetPosition, connectorType)
    : autoPath;

  // ---- Handles to show -----------------------------------------------------
  // Ghost handles = intermediate auto waypoints only (stubs are fixed, not draggable).
  // Manual handles = user-placed points — drag to adjust, right-click to delete.
  const mid = { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2, id: "mid-0" };
  const interiorAutoPoints = autoControlPoints.length > 2
    ? autoControlPoints.slice(1, -1)
    : [];
  const ghostHandles: ManualPoint[] = interiorAutoPoints.length > 0
    ? interiorAutoPoints.map((p, i) => ({ ...p, id: `auto-${i}` }))
    : [mid];

  const shouldShowControls = useStore((s) => {
    const src = s.nodeLookup.get(source);
    const tgt = s.nodeLookup.get(target);
    return selected || src?.selected || tgt?.selected;
  });

  // ---- Callbacks -----------------------------------------------------------
  const onMove = useCallback((handleId: string, x: number, y: number) => {
    const current = useManualPointsStore.getState().points[id] ?? [];
    const exists = current.some((p) => p.id === handleId);
    if (exists) {
      setPoints(id, current.map((p) => (p.id === handleId ? { ...p, x, y } : p)));
    } else {
      // Ghost handle dragged → add as a single new manual point
      setPoints(id, [...current, { id: handleId, x, y }]);
    }
  }, [id, setPoints]);

  const onDelete = useCallback((handleId: string) => {
    const current = useManualPointsStore.getState().points[id] ?? [];
    const next = current.filter((p) => p.id !== handleId);
    next.length === 0 ? clearPoints(id) : setPoints(id, next);
  }, [id, setPoints, clearPoints]);

  const resetToAuto = useCallback(() => clearPoints(id), [id, clearPoints]);

  // ---- Render --------------------------------------------------------------
  return (
    <>
      <BaseEdge
        id={id} path={edgePath}
        markerEnd={markerEnd} markerStart={markerStart}
        style={{
          stroke: selected ? "#2563eb" : (wasRouted || isManual) ? strokeColor : "#94a3b8",
          strokeWidth: selected ? 2.5 : 1.5,
          strokeLinecap: "round", strokeLinejoin: "round",
          strokeDasharray: (wasRouted || isManual) ? undefined : "12 4",
        }}
      />

      {shouldShowControls && (
        <>
          {/* Ghost handles on the auto-routed path — drag to create a manual point */}
          {!isManual && ghostHandles.map((p) => (
            <ControlHandle key={p.id} id={p.id} x={p.x} y={p.y}
              color="#64748b" ghost onMove={onMove} />
          ))}

          {/* Manual points — colored, draggable, right-click to delete */}
          {isManual && manualPoints.map((p) => (
            <ControlHandle key={p.id} id={p.id} x={p.x} y={p.y}
              color={strokeColor} onMove={onMove} onDelete={onDelete} />
          ))}
        </>
      )}

      {/* Reset button — only visible in manual mode */}
      {shouldShowControls && isManual && (
        <EdgeLabelRenderer>
          <div className="nodrag nopan" style={{
            position: "absolute",
            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all", zIndex: 10,
          }}>
            <button onClick={resetToAuto} style={{
              fontSize: 10, fontFamily: "sans-serif", fontWeight: 600,
              padding: "2px 7px", borderRadius: 4,
              border: "1px solid #cbd5e1", background: "white", color: "#64748b",
              cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.1)", lineHeight: 1.4,
            }}>↺ auto</button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const EditableRoutedEdge = memo(EditableRoutedEdgeComponent);

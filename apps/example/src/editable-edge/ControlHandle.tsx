import { useCallback, useEffect, useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";

export type ControlHandlePoint = { x: number; y: number; id: string };

type ControlHandleProps = {
  id: string;
  x: number;
  y: number;
  color: string;
  /** When true: smaller ghost style — dragging creates a new checkpoint */
  ghost?: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onDelete?: (id: string) => void;
};

export function ControlHandle({ id, x, y, color, ghost, onMove, onDelete }: ControlHandleProps) {
  const container = useStore((s) => s.domNode);
  const { screenToFlowPosition } = useReactFlow();
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return;
    e.stopPropagation();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!container || !dragging) return;

    const onMove_ = (e: PointerEvent) => {
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onMove(id, p.x, p.y);
    };
    const onUp = (e: PointerEvent) => {
      container.removeEventListener("pointermove", onMove_);
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onMove(id, p.x, p.y);
      setDragging(false);
    };

    container.addEventListener("pointermove", onMove_);
    container.addEventListener("pointerup", onUp, { once: true });
    container.addEventListener("pointerleave", onUp, { once: true });
    return () => {
      container.removeEventListener("pointermove", onMove_);
      container.removeEventListener("pointerup", onUp);
      container.removeEventListener("pointerleave", onUp);
    };
  }, [container, dragging, id, onMove, screenToFlowPosition]);

  return (
    <circle
      cx={x} cy={y}
      r={ghost ? 4 : 5}
      fill={dragging ? color : "white"}
      stroke={color}
      strokeWidth={ghost ? 1.5 : 2}
      opacity={ghost ? 0.5 : 1}
      className="nopan nodrag"
      style={{ cursor: ghost ? "crosshair" : "grab", pointerEvents: "all" }}
      onPointerDown={onPointerDown}
      onPointerUp={() => setDragging(false)}
      onContextMenu={(e) => { e.preventDefault(); onDelete?.(id); }}
    />
  );
}

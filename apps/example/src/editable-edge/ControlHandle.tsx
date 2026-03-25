import { useCallback } from "react";
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

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2 || !container) return;
    e.stopPropagation();

    // Register the point immediately so the ghost → manual transition happens
    // before any re-render. Listeners are attached directly here (not via
    // useEffect) so they survive the component unmount caused by that transition.
    onMove(id, x, y);

    const handleMove = (ev: PointerEvent) => {
      const p = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      onMove(id, p.x, p.y);
    };
    const handleUp = (ev: PointerEvent) => {
      container.removeEventListener("pointermove", handleMove);
      container.removeEventListener("pointerleave", handleUp);
      document.removeEventListener("pointerup", handleUp);
      const p = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      onMove(id, p.x, p.y);
    };

    container.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp, { once: true });
    container.addEventListener("pointerleave", handleUp, { once: true });
  }, [container, id, x, y, onMove, screenToFlowPosition]);

  return (
    <circle
      cx={x} cy={y}
      r={ghost ? 4 : 5}
      fill="white"
      stroke={color}
      strokeWidth={ghost ? 1.5 : 2}
      opacity={ghost ? 0.5 : 1}
      className="nopan nodrag"
      style={{ cursor: "grab", pointerEvents: "all" }}
      onPointerDown={onPointerDown}
      onContextMenu={(e) => { e.preventDefault(); onDelete?.(id); }}
    />
  );
}

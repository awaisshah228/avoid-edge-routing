<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";

  const W = 80, H = 70;
  function pinYs(h: number, count: number): number[] {
    return Array.from({ length: count }, (_, i) => Math.round((h * (i + 1)) / (count + 1) * 10) / 10);
  }
  const [inY1, inY2, inY3] = pinYs(H, 3);
  const [outY] = pinYs(H, 1);
</script>

<div style="width: {W}px; height: {H}px; position: relative; border-radius: 8px;">
  <svg viewBox="0 0 {W} {H}" width={W} height={H}>
    <rect x={0} y={0} width={W} height={H} rx={6} fill="#fef3c7" stroke="#f59e0b" stroke-width={1.5} />
    <text x={W / 2} y={H / 2 + 1} text-anchor="middle" dominant-baseline="middle" font-size={11} fill="#92400e" font-weight="bold" font-family="sans-serif">Merge</text>
  </svg>
  <Handle id="in-0" type="target" position={Position.Left} style="left: 0; top: {inY1}px; width: 8px; height: 8px; background: #f59e0b; border: 2px solid #92400e; transform: translate(-50%, -50%);" />
  <Handle id="in-1" type="target" position={Position.Left} style="left: 0; top: {inY2}px; width: 8px; height: 8px; background: #f59e0b; border: 2px solid #92400e; transform: translate(-50%, -50%);" />
  <Handle id="in-2" type="target" position={Position.Left} style="left: 0; top: {inY3}px; width: 8px; height: 8px; background: #f59e0b; border: 2px solid #92400e; transform: translate(-50%, -50%);" />
  <Handle id="out" type="source" position={Position.Right} style="left: {W}px; top: {outY}px; width: 8px; height: 8px; background: #22c55e; border: 2px solid #16a34a; transform: translate(-50%, -50%);" />
</div>

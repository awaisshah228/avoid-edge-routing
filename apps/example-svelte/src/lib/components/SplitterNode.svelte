<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";

  const W = 80, H = 70;
  function pinYs(h: number, count: number): number[] {
    return Array.from({ length: count }, (_, i) => Math.round((h * (i + 1)) / (count + 1) * 10) / 10);
  }
  const [inY] = pinYs(H, 1);
  const [outY1, outY2, outY3] = pinYs(H, 3);
</script>

<div style="width: {W}px; height: {H}px; position: relative; border-radius: 8px;">
  <svg viewBox="0 0 {W} {H}" width={W} height={H}>
    <rect x={0} y={0} width={W} height={H} rx={6} fill="#dbeafe" stroke="#3b82f6" stroke-width={1.5} />
    <text x={W / 2} y={H / 2 + 1} text-anchor="middle" dominant-baseline="middle" font-size={11} fill="#1d4ed8" font-weight="bold" font-family="sans-serif">Split</text>
  </svg>
  <Handle id="in" type="target" position={Position.Left} style="left: 0; top: {inY}px; width: 8px; height: 8px; background: #3b82f6; border: 2px solid #1d4ed8; transform: translate(-50%, -50%);" />
  <Handle id="out-0" type="source" position={Position.Right} style="left: {W}px; top: {outY1}px; width: 8px; height: 8px; background: #22c55e; border: 2px solid #16a34a; transform: translate(-50%, -50%);" />
  <Handle id="out-1" type="source" position={Position.Right} style="left: {W}px; top: {outY2}px; width: 8px; height: 8px; background: #22c55e; border: 2px solid #16a34a; transform: translate(-50%, -50%);" />
  <Handle id="out-2" type="source" position={Position.Right} style="left: {W}px; top: {outY3}px; width: 8px; height: 8px; background: #22c55e; border: 2px solid #16a34a; transform: translate(-50%, -50%);" />
</div>

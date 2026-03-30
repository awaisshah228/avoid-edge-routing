<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";

  let { data } = $props();
  const W = 100, H = 60;
  function pinYs(h: number, count: number): number[] {
    return Array.from({ length: count }, (_, i) => Math.round((h * (i + 1)) / (count + 1) * 10) / 10);
  }
  const [inY1, inY2] = pinYs(H, 2);
  const [outY1, outY2] = pinYs(H, 2);
</script>

<div style="width: {W}px; height: {H}px; position: relative; border-radius: 8px;">
  <svg viewBox="0 0 {W} {H}" width={W} height={H}>
    <rect x={0} y={0} width={W} height={H} rx={6} fill="#e0e7ff" stroke="#6366f1" stroke-width={1.5} />
    <text x={W / 2} y={H / 2 + 1} text-anchor="middle" dominant-baseline="middle" font-size={11} fill="#4338ca" font-weight="bold" font-family="sans-serif">{data?.label ?? "Process"}</text>
  </svg>
  <Handle id="in-0" type="target" position={Position.Left} style="left: 0; top: {inY1}px; width: 8px; height: 8px; background: #6366f1; border: 2px solid #4338ca; transform: translate(-50%, -50%);" />
  <Handle id="in-1" type="target" position={Position.Left} style="left: 0; top: {inY2}px; width: 8px; height: 8px; background: #6366f1; border: 2px solid #4338ca; transform: translate(-50%, -50%);" />
  <Handle id="out-0" type="source" position={Position.Right} style="left: {W}px; top: {outY1}px; width: 8px; height: 8px; background: #22c55e; border: 2px solid #16a34a; transform: translate(-50%, -50%);" />
  <Handle id="out-1" type="source" position={Position.Right} style="left: {W}px; top: {outY2}px; width: 8px; height: 8px; background: #22c55e; border: 2px solid #16a34a; transform: translate(-50%, -50%);" />
</div>

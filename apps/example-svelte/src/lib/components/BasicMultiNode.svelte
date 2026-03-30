<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";

  let { data } = $props();
  const W = 140, H = 50;

  function pinYs(h: number, count: number): number[] {
    return Array.from({ length: count }, (_, i) => Math.round((h * (i + 1)) / (count + 1) * 10) / 10);
  }

  const sources = data?.sources ?? 0;
  const targets = data?.targets ?? 0;
  const borderColor = data?.borderColor ?? "#64748b";
  const radius = data?.borderRadius ?? 6;
  const fill = data?.fill ?? "#f8fafc";
  const textColor = data?.textColor ?? "#1e293b";
  const opacity = data?.opacity ?? 1;
  const tgtYs = pinYs(H, targets);
  const srcYs = pinYs(H, sources);
</script>

<div style="width: {W}px; height: {H}px; position: relative; opacity: {opacity};">
  <svg viewBox="0 0 {W} {H}" width={W} height={H}>
    <rect x={0} y={0} width={W} height={H} rx={radius} fill={fill} stroke={borderColor} stroke-width={1.5} />
    <text x={W / 2} y={H / 2 + 1} text-anchor="middle" dominant-baseline="middle" font-size={12} fill={textColor} font-weight="600" font-family="sans-serif">{data?.label ?? "Node"}</text>
  </svg>
  {#each tgtYs as y, i}
    <Handle id="in-{i}" type="target" position={Position.Left} style="left: 0; top: {y}px; width: 7px; height: 7px; background: {borderColor}; border: 2px solid {borderColor}; transform: translate(-50%, -50%);" />
  {/each}
  {#each srcYs as y, i}
    <Handle id="out-{i}" type="source" position={Position.Right} style="left: {W}px; top: {y}px; width: 7px; height: 7px; background: #22c55e; border: 2px solid #16a34a; transform: translate(-50%, -50%);" />
  {/each}
</div>

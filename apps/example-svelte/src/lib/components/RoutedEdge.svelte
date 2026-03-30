<!--
  RoutedEdge — custom Svelte Flow edge with label support.
  Reads from the routing store for obstacle-avoiding paths.
-->
<script lang="ts">
  import { BaseEdge, EdgeLabel } from "@xyflow/svelte";
  import { edgeRoutingStore, computeRoutedEdgePath } from "svelteflow-edge-routing";

  let {
    id, source, target, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, selected = false, data = {} as any, markerEnd, markerStart,
  }: any = $props();

  const EDGE_STROKE_WIDTH = 1.5;
  const MIN_EDGE_LENGTH_FOR_LABEL_PX = 72;

  let result = $derived.by(() => {
    const store = $edgeRoutingStore;
    const [path, labelX, labelY, wasRouted] = computeRoutedEdgePath(
      { id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 8, connectorType: store.connectorType },
      store.routes, store.draggingNodeIds,
    );
    return { path, labelX, labelY, wasRouted };
  });

  let strokeColor = $derived(data?.strokeColor ?? "#94a3b8");
  let label = $derived(data?.label ?? "");
  let edgeLength = $derived(Math.hypot(targetX - sourceX, targetY - sourceY));
  let showLabel = $derived(label && result.wasRouted && edgeLength >= MIN_EDGE_LENGTH_FOR_LABEL_PX);
  let strokeDasharray = $derived(result.wasRouted ? (data?.strokeDasharray ?? undefined) : "12 4");
</script>

<BaseEdge
  {id}
  path={result.path}
  {markerEnd}
  {markerStart}
  style="stroke: {selected ? '#2563eb' : result.wasRouted ? strokeColor : '#94a3b8'}; stroke-width: {selected ? EDGE_STROKE_WIDTH + 1 : EDGE_STROKE_WIDTH}; stroke-linecap: round; stroke-linejoin: round; {strokeDasharray ? `stroke-dasharray: ${strokeDasharray};` : ''}"
/>

{#if showLabel}
  <EdgeLabel x={result.labelX} y={result.labelY} style="background: white; padding: 2px 10px; border-radius: 6px; font-size: 11px; font-weight: 500; font-family: sans-serif; border: 1px solid #e2e8f0; color: #475569; box-shadow: 0 1px 2px rgba(0,0,0,0.05); white-space: nowrap;" class="nodrag nopan">
    {label}
  </EdgeLabel>
{/if}

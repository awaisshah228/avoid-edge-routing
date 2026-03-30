<!--
  RoutedEdge — custom edge using the routing store for obstacle-avoiding paths.
  Matches the Next.js basic example RoutedEdge.
-->
<script lang="ts">
  import { BaseEdge } from "@xyflow/svelte";
  import { edgeRoutingStore, computeRoutedEdgePath } from "svelteflow-edge-routing";

  let {
    id, source, target, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, selected = false, markerEnd,
  }: any = $props();

  let result = $derived.by(() => {
    const store = $edgeRoutingStore;
    const [path, , , wasRouted] = computeRoutedEdgePath(
      { id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 8, connectorType: "orthogonal" },
      store.routes, store.draggingNodeIds,
    );
    return { path, wasRouted };
  });
</script>

<BaseEdge
  {id}
  path={result.path}
  {markerEnd}
  style="stroke: {selected ? '#2563eb' : '#94a3b8'}; stroke-width: {selected ? 2.5 : 1.5}; stroke-linecap: round; stroke-linejoin: round; {result.wasRouted ? '' : 'stroke-dasharray: 12 4;'}"
/>

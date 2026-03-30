<!--
  FlowCanvasInner — main Svelte Flow canvas wired up with svelteflow-edge-routing.
  Matches the Next.js basic example FlowCanvas exactly.
-->
<script lang="ts">
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    useSvelteFlow,
    type Node,
    type Edge,
    type NodeTypes,
    type EdgeTypes,
  } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import { onDestroy } from "svelte";
  import { createEdgeRouting, setDraggingNodeIds, type EdgeRoutingInstance } from "svelteflow-edge-routing";

  import BasicNode from "./BasicNode.svelte";
  import BlockerNode from "./BlockerNode.svelte";
  import RoutedEdge from "./RoutedEdge.svelte";
  import { createEnrichNode } from "./enrichNode";
  import { initialNodes, initialEdges } from "$lib/data/initialElements";

  const nodeTypes = { basic: BasicNode, blocker: BlockerNode } as unknown as NodeTypes;
  const edgeTypes = { routed: RoutedEdge } as unknown as EdgeTypes;

  let nodes: Node[] = $state.raw(initialNodes);
  let edges: Edge[] = $state.raw(initialEdges);

  const { getInternalNode } = useSvelteFlow();

  let _nodes = nodes;
  let _edges = edges;

  const routing: EdgeRoutingInstance = createEdgeRouting(
    () => _nodes,
    () => _edges,
    {
      edgeRounding: 12,
      edgeToEdgeSpacing: 4,
      edgeToNodeSpacing: 8,
      handleSpacing: 4,
      segmentPenalty: 10,
      autoBestSideConnection: false,
      enrichNode: createEnrichNode(getInternalNode as any),
    }
  );

  $effect(() => { _nodes = nodes; _edges = edges; });

  // Initial routing after SvelteFlow measures nodes
  setTimeout(() => routing.resetRouting(), 400);

  function handleNodeDragStart(event: any) {
    const node = event.detail?.node ?? event.targetNode;
    if (node) setDraggingNodeIds(new Set([node.id]));
  }

  function handleNodeDragStop() {
    setDraggingNodeIds(new Set());
    _nodes = nodes;
    _edges = edges;
    requestAnimationFrame(() => requestAnimationFrame(() => routing.resetRouting()));
  }

  onDestroy(() => { routing.destroy(); });
</script>

<div class="flow-container">
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    {edgeTypes}
    onnodedragstart={handleNodeDragStart}
    onnodedragstop={handleNodeDragStop}
    fitView
  >
    <Background />
    <Controls />
    <MiniMap />
  </SvelteFlow>
</div>

<style>
  .flow-container {
    width: 100vw;
    height: 100vh;
  }
</style>

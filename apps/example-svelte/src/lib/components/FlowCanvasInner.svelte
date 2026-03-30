<!--
  FlowCanvasInner — main Svelte Flow canvas with tabs, controls panel, and full routing.
  All defaults and routing logic match the React example exactly.
  Must be rendered inside <SvelteFlowProvider>.
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
    MarkerType,
  } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import { onDestroy, tick } from "svelte";
  import {
    createEdgeRouting,
    setDraggingNodeIds,
    setConnectorType,
    resolveCollisions,
    type EdgeRoutingInstance,
    type ConnectorType,
  } from "svelteflow-edge-routing";
  import { createEnrichNode } from "$lib/enrichNode";
  import { runAutoLayout, type LayoutDirection, type LayoutAlgorithmName, type ElkMode } from "$lib/auto-layout";
  import { expandGroups } from "$lib/expandGroups";

  import BasicNode from "./BasicNode.svelte";
  import BlockerNode from "./BlockerNode.svelte";
  import BasicMultiNode from "./BasicMultiNode.svelte";
  import SplitterNode from "./SplitterNode.svelte";
  import MergerNode from "./MergerNode.svelte";
  import ProcessNode from "./ProcessNode.svelte";
  import GroupNode from "./GroupNode.svelte";
  import RoutedEdge from "./RoutedEdge.svelte";
  import ControlsPanel from "./ControlsPanel.svelte";

  import { basicNodes, basicEdges } from "$lib/data/initialElementsBasic";
  import { nodes as groupNodes, edges as groupEdges } from "$lib/data/initialElements";
  import { subflowNodes, subflowEdges } from "$lib/data/initialElementsSubflows";
  import { dagNodes, dagEdges } from "$lib/data/initialElementsDAG";
  import { treeNodes, treeEdges } from "$lib/data/initialElementsTree";
  import { stressNodes, stressEdges } from "$lib/data/initialElementsStress";
  import { elkNodes, elkEdges } from "$lib/data/initialElementsElk";
  import { autoLayoutGroupNodes, autoLayoutGroupEdges } from "$lib/data/initialElementsAutoLayoutGroups";
  import { editableEdgeNodes, editableEdgeEdges } from "$lib/data/initialElementsEditableEdge";

  type ExampleKey = "basic" | "multi-handle" | "groups" | "subflows" | "dag" | "tree" | "auto-layout" | "auto-layout-groups" | "stress" | "editable-edge";

  interface ExampleDef {
    key: ExampleKey;
    label: string;
    nodes: Node[];
    edges: Edge[];
    layout?: { direction?: LayoutDirection; elkMode?: ElkMode; spacing?: number; algorithm?: LayoutAlgorithmName };
    skipLayout?: boolean;
  }

  const multiHandleEdges: Edge[] = [
    { id: "e-split-a", source: "split", sourceHandle: "out-0", target: "procA", targetHandle: "in-0", type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#3b82f6" }, data: { strokeColor: "#3b82f6" } },
    { id: "e-split-b", source: "split", sourceHandle: "out-1", target: "procB", targetHandle: "in-0", type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#f59e0b" }, data: { strokeColor: "#f59e0b" } },
    { id: "e-split-c", source: "split", sourceHandle: "out-2", target: "procC", targetHandle: "in-0", type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#ef4444" }, data: { strokeColor: "#ef4444" } },
    { id: "e-a-merge", source: "procA", sourceHandle: "out-0", target: "merge", targetHandle: "in-0", type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#3b82f6" }, data: { strokeColor: "#3b82f6" } },
    { id: "e-b-merge", source: "procB", sourceHandle: "out-0", target: "merge", targetHandle: "in-1", type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#f59e0b" }, data: { strokeColor: "#f59e0b" } },
    { id: "e-c-merge", source: "procC", sourceHandle: "out-0", target: "merge", targetHandle: "in-2", type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#ef4444" }, data: { strokeColor: "#ef4444" } },
    { id: "e-a-b", source: "procA", sourceHandle: "out-1", target: "procB", targetHandle: "in-1", type: "routed", markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#8b5cf6" }, data: { strokeColor: "#8b5cf6" } },
  ];

  const EXAMPLES: ExampleDef[] = [
    { key: "basic", label: "Basic", nodes: basicNodes, edges: basicEdges, skipLayout: false },
    { key: "multi-handle", label: "Multi-Handle", skipLayout: true, nodes: [
      { id: "split", type: "splitter", position: { x: 50, y: 100 }, data: {} },
      { id: "procA", type: "process", position: { x: 280, y: 30 }, data: { label: "Proc A" } },
      { id: "procB", type: "process", position: { x: 280, y: 180 }, data: { label: "Proc B" } },
      { id: "procC", type: "process", position: { x: 280, y: 330 }, data: { label: "Proc C" } },
      { id: "merge", type: "merger", position: { x: 520, y: 100 }, data: {} },
    ], edges: multiHandleEdges },
    { key: "groups", label: "Groups", nodes: groupNodes, edges: groupEdges, skipLayout: true },
    { key: "subflows", label: "Subflows", nodes: subflowNodes, edges: subflowEdges, skipLayout: true },
    { key: "dag", label: "DAG", nodes: dagNodes, edges: dagEdges, layout: { direction: "TB", elkMode: "layered", spacing: 30 } },
    { key: "tree", label: "Tree", nodes: treeNodes, edges: treeEdges, layout: { direction: "TB", elkMode: "mrtree", spacing: 20 } },
    { key: "auto-layout", label: "Auto Layout", nodes: elkNodes, edges: elkEdges, layout: { direction: "LR", elkMode: "mrtree", spacing: 30 } },
    { key: "auto-layout-groups", label: "Layout+Groups", nodes: autoLayoutGroupNodes, edges: autoLayoutGroupEdges, layout: { direction: "LR", elkMode: "layered", spacing: 30 } },
    { key: "stress", label: "Stress (200)", nodes: stressNodes, edges: stressEdges, skipLayout: true },
    { key: "editable-edge", label: "Editable Edge", nodes: editableEdgeNodes, edges: editableEdgeEdges, skipLayout: true },
  ];

  const nodeTypes = {
    basic: BasicNode, blocker: BlockerNode, basicMulti: BasicMultiNode,
    splitter: SplitterNode, merger: MergerNode, process: ProcessNode, group: GroupNode,
  } as unknown as NodeTypes;
  const edgeTypes = { routed: RoutedEdge } as unknown as EdgeTypes;

  let nodes: Node[] = $state.raw(EXAMPLES[0].nodes);
  let edges: Edge[] = $state.raw(EXAMPLES[0].edges);
  let activeExample: ExampleKey = $state("basic");

  // ---- Controls — ALL defaults match React Leva exactly ----
  let connectorType: ConnectorType = $state("orthogonal");
  let edgeRounding = $state(0);
  let edgeToEdgeSpacing = $state(6);
  let edgeToNodeSpacing = $state(8);
  let diagramGridSize = $state(0);
  let stubSize = $state(12);
  let shouldSplitEdgesNearHandle = $state(true);
  let autoBestSideConnection = $state(false);
  let hateCrossings = $state(false);
  let routeOnlyWhenBlocked = $state(false);
  let hideHandles = $state(true);
  let realTimeRouting = $state(false);
  let handleSpacing = $state(6);
  let pinInsideOffset = $state(0);
  let segmentPenalty = $state(10);
  let anglePenalty = $state(0);
  let reverseDirectionPenalty = $state(0);
  let crossingPenalty = $state(0);
  let nudgeOrthogonalSegmentsConnectedToShapes = $state(true);
  let nudgeSharedPathsWithCommonEndPoint = $state(true);
  let performUnifyingNudgingPreprocessingStep = $state(true);
  let nudgeOrthogonalTouchingColinearSegments = $state(false);
  let debounceMs = $state(0);
  let layoutAlgorithm = $state("elk");
  let elkMode = $state("mrtree");
  let layoutDirection = $state("LR");
  let layoutSpacing = $state(20);
  let resolveOverlaps = $state(true);

  const { getInternalNode, fitView } = useSvelteFlow();
  const enrichNode = createEnrichNode(getInternalNode as any);

  // Mutable refs — closures always read latest values
  let _nodes = nodes;
  let _edges = edges;

  // Build options object from current settings — matches React useEdgeRouting call
  function getOpts() {
    return {
      connectorType,
      edgeToEdgeSpacing,
      edgeToNodeSpacing,
      handleSpacing,
      edgeRounding,
      diagramGridSize,
      stubSize,
      shouldSplitEdgesNearHandle,
      segmentPenalty,
      anglePenalty,
      reverseDirectionPenalty,
      crossingPenalty,
      hateCrossings,
      pinInsideOffset,
      autoBestSideConnection,
      routeOnlyWhenBlocked,
      nudgeOrthogonalSegmentsConnectedToShapes,
      nudgeSharedPathsWithCommonEndPoint,
      performUnifyingNudgingPreprocessingStep,
      nudgeOrthogonalTouchingColinearSegments,
      debounceMs,
      realTimeRouting,
      enrichNode,
    };
  }

  let routing: EdgeRoutingInstance = createEdgeRouting(
    () => _nodes, () => _edges, getOpts(),
  );

  // Sync mutable refs when SvelteFlow updates nodes/edges via bind:
  $effect(() => { _nodes = nodes; _edges = edges; });

  // ---- React-equivalent: re-route when ANY setting changes ----
  // In React, useEdgeRouting re-runs on every render with new options.
  // In Svelte, we watch a serialized settings key and recreate routing.
  let settingsKey = $derived(
    JSON.stringify({
      connectorType, edgeRounding, edgeToEdgeSpacing, edgeToNodeSpacing,
      handleSpacing, pinInsideOffset, diagramGridSize, stubSize,
      shouldSplitEdgesNearHandle, segmentPenalty, anglePenalty,
      reverseDirectionPenalty, crossingPenalty, hateCrossings,
      autoBestSideConnection, routeOnlyWhenBlocked, realTimeRouting,
      nudgeOrthogonalSegmentsConnectedToShapes, nudgeSharedPathsWithCommonEndPoint,
      performUnifyingNudgingPreprocessingStep, nudgeOrthogonalTouchingColinearSegments,
      debounceMs,
    })
  );

  // React-equivalent: auto-adjust settings when connectorType changes
  // (matches React useEffect at App.tsx:352-359)
  let prevConnectorType = connectorType;
  $effect(() => {
    if (connectorType !== prevConnectorType) {
      prevConnectorType = connectorType;
      if (connectorType === "bezier") {
        edgeToEdgeSpacing = 0;
        edgeToNodeSpacing = 12;
        shouldSplitEdgesNearHandle = false;
        routeOnlyWhenBlocked = true;
      } else {
        edgeToEdgeSpacing = 6;
        edgeToNodeSpacing = 8;
        shouldSplitEdgesNearHandle = true;
        routeOnlyWhenBlocked = false;
      }
    }
  });

  let prevSettingsKey = "";
  $effect(() => {
    const key = settingsKey;
    if (key === prevSettingsKey) return;
    prevSettingsKey = key;

    // Sync connector type to store so RoutedEdge reads it
    setConnectorType(connectorType);

    // Destroy old routing, create new with updated options
    routing.destroy();
    routing = createEdgeRouting(() => _nodes, () => _edges, getOpts());
    setTimeout(() => routing.resetRouting(), 150);
  });

  // Initial routing after SvelteFlow measures nodes
  setTimeout(() => routing.resetRouting(), 400);

  // ---- Example switching ----
  async function switchExample(key: ExampleKey) {
    activeExample = key;
    const ex = EXAMPLES.find((e) => e.key === key)!;
    let prepared = expandGroups(ex.nodes);
    if (!ex.skipLayout && ex.layout) {
      prepared = await runAutoLayout(prepared, ex.edges, {
        algorithm: ex.layout.algorithm ?? "elk",
        direction: ex.layout.direction ?? "LR",
        spacing: ex.layout.spacing ?? 20,
        elkMode: ex.layout.elkMode ?? "mrtree",
      });
      prepared = expandGroups(prepared);
      if (resolveOverlaps) {
        prepared = resolveCollisions(prepared as any, { maxIterations: 50, overlapThreshold: 0.5, margin: 20 }) as Node[];
      }
    }
    nodes = prepared;
    edges = ex.edges;
    _nodes = prepared;
    _edges = ex.edges;
    await tick();
    setTimeout(() => { routing.resetRouting(); fitView({ padding: 0.15 }); }, 300);
  }

  // ---- Drag handlers — matches React onNodesChange + onNodeDragStop ----
  function handleNodeDragStart(event: any) {
    const node = event.detail?.node ?? event.targetNode;
    if (node) setDraggingNodeIds(new Set([node.id]));
  }

  function handleNodeDrag(event: any) {
    const node = event.detail?.node ?? event.targetNode;
    if (node) setDraggingNodeIds(new Set([node.id]));
  }

  function handleNodeDragStop() {
    setDraggingNodeIds(new Set());
    // Resolve collisions on drag stop (matches React onNodeDragStop)
    if (resolveOverlaps) {
      nodes = resolveCollisions(nodes as any, { maxIterations: 50, overlapThreshold: 0.5, margin: 20 }) as Node[];
    }
    _nodes = nodes;
    _edges = edges;
    // Wait for React Flow to internalize positions, then re-route
    // (matches React: requestAnimationFrame(() => requestAnimationFrame(() => resetRouting())))
    requestAnimationFrame(() => requestAnimationFrame(() => routing.resetRouting()));
  }

  // ---- Layout ----
  async function handleRunLayout() {
    let laid = await runAutoLayout(nodes, edges, {
      algorithm: layoutAlgorithm as LayoutAlgorithmName,
      direction: layoutDirection as LayoutDirection,
      spacing: layoutSpacing,
      elkMode: elkMode as ElkMode,
    });
    laid = expandGroups(laid);
    if (resolveOverlaps) {
      laid = resolveCollisions(laid as any, { maxIterations: 50, overlapThreshold: 0.5, margin: 20 }) as Node[];
    }
    nodes = laid;
    _nodes = laid;
    await tick();
    setTimeout(() => { routing.resetRouting(); fitView({ padding: 0.15 }); }, 300);
  }

  onDestroy(() => { routing.destroy(); });
</script>

<div class="flow-wrapper">
  <div class="tab-bar">
    {#each EXAMPLES as ex}
      <button class="tab" class:active={activeExample === ex.key} onclick={() => switchExample(ex.key)}>
        {ex.label}
      </button>
    {/each}
  </div>

  <div class="canvas" class:hide-handles={hideHandles}>
    <SvelteFlow
      bind:nodes
      bind:edges
      {nodeTypes}
      {edgeTypes}
      onnodedragstart={handleNodeDragStart}
      onnodedrag={handleNodeDrag}
      onnodedragstop={handleNodeDragStop}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </SvelteFlow>

    <ControlsPanel
      bind:connectorType bind:edgeRounding bind:edgeToEdgeSpacing bind:edgeToNodeSpacing
      bind:diagramGridSize bind:stubSize bind:shouldSplitEdgesNearHandle bind:autoBestSideConnection
      bind:hateCrossings bind:routeOnlyWhenBlocked bind:hideHandles bind:realTimeRouting
      bind:handleSpacing bind:pinInsideOffset bind:segmentPenalty bind:anglePenalty
      bind:reverseDirectionPenalty bind:crossingPenalty
      bind:nudgeOrthogonalSegmentsConnectedToShapes bind:nudgeSharedPathsWithCommonEndPoint
      bind:performUnifyingNudgingPreprocessingStep bind:nudgeOrthogonalTouchingColinearSegments
      bind:debounceMs bind:layoutAlgorithm bind:elkMode bind:layoutDirection
      bind:layoutSpacing bind:resolveOverlaps
      on:runlayout={handleRunLayout}
    />
  </div>
</div>

<style>
  .flow-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; }
  .tab-bar { display: flex; gap: 2px; padding: 6px 10px; background: #1e293b; flex-shrink: 0; overflow-x: auto; }
  .tab { padding: 5px 12px; font-size: 12px; font-family: sans-serif; font-weight: 400; border: none; border-radius: 6px; cursor: pointer; background: transparent; color: #94a3b8; white-space: nowrap; transition: all 0.15s; }
  .tab.active { font-weight: 600; background: #3b82f6; color: #fff; }
  .canvas { flex: 1; position: relative; }
  .canvas :global(.svelte-flow__handle) { opacity: 1; }
  .canvas.hide-handles :global(.svelte-flow__handle) { visibility: hidden; }
</style>

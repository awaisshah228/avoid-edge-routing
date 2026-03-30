/**
 * createEdgeRouting
 * ---------------------------------------------------------------------------
 * Svelte equivalent of useEdgeRouting (React hook).
 *
 * Routes edges around nodes using a Web Worker running the routing engine.
 * Pins stay fixed at their exact SVG anchor positions. Routes go around nodes.
 *
 * Usage in a Svelte component:
 *   const routing = createEdgeRouting(() => nodes, () => edges, options);
 *   onDestroy(() => routing.destroy());
 *
 * Then call routing.updateRoutingOnNodesChange(changes) from onnodechange.
 */

import { get } from "svelte/store";
import {
  setRoutes,
  setConnectorType,
  setStubSize,
  setDraggingNodeIds,
  setActions,
} from "./edge-routing-store";
import { DEBOUNCE_ROUTING_MS } from "./constants";
import type { AvoidRouterOptions, FlowNode, FlowEdge, ConnectorType } from "./routing-core";
import { createRoutingWorker } from "./create-routing-worker";
import type { EdgeRoutingWorkerCommand } from "./worker-messages";

export interface EdgeRoutingOptions {
  edgeToEdgeSpacing?: number;
  edgeToNodeSpacing?: number;
  handleSpacing?: number;
  segmentPenalty?: number;
  anglePenalty?: number;
  crossingPenalty?: number;
  clusterCrossingPenalty?: number;
  fixedSharedPathPenalty?: number;
  portDirectionPenalty?: number;
  reverseDirectionPenalty?: number;
  nudgeOrthogonalSegmentsConnectedToShapes?: boolean;
  nudgeSharedPathsWithCommonEndPoint?: boolean;
  performUnifyingNudgingPreprocessingStep?: boolean;
  nudgeOrthogonalTouchingColinearSegments?: boolean;
  improveHyperedgeRoutesMovingJunctions?: boolean;
  penaliseOrthogonalSharedPathsAtConnEnds?: boolean;
  improveHyperedgeRoutesMovingAddingAndDeletingJunctions?: boolean;
  connectorType?: ConnectorType;
  hateCrossings?: boolean;
  pinInsideOffset?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  stubSize?: number;
  shouldSplitEdgesNearHandle?: boolean;
  autoBestSideConnection?: boolean;
  routeOnlyWhenBlocked?: boolean;
  debounceMs?: number;
  realTimeRouting?: boolean;
  /** Enrich a node with _handlePins and _extraHeight before sending to worker */
  enrichNode?: (node: SvelteFlowNode) => SvelteFlowNode;
}

// Svelte Flow node/edge types — keep loose to work with @xyflow/svelte types
export type SvelteFlowNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
  style?: string | Record<string, unknown>;
  parentId?: string;
  [key: string]: unknown;
};

export type SvelteFlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  [key: string]: unknown;
};

export type SvelteNodeChange =
  | { type: "position"; id: string; dragging?: boolean; position?: { x: number; y: number } }
  | { type: "dimensions"; id: string }
  | { type: "add"; item: SvelteFlowNode }
  | { type: "remove"; id: string }
  | { type: "select"; id: string }
  | { type: string; id: string; [key: string]: unknown };

export interface EdgeRoutingInstance {
  updateRoutingOnNodesChange: (changes: SvelteNodeChange[]) => void;
  resetRouting: () => void;
  refreshRouting: () => void;
  updateRoutingForNodeIds: (nodeIds: string[]) => void;
  destroy: () => void;
}

const DEFAULT_OPTIONS: EdgeRoutingOptions = {
  edgeRounding: 8,
  edgeToEdgeSpacing: 10,
  edgeToNodeSpacing: 8,
  handleSpacing: 2,
  diagramGridSize: 0,
  autoBestSideConnection: false,
  debounceMs: 0,
};

function toRouterOptions(opts?: EdgeRoutingOptions): AvoidRouterOptions {
  return {
    idealNudgingDistance: opts?.edgeToEdgeSpacing ?? DEFAULT_OPTIONS.edgeToEdgeSpacing,
    shapeBufferDistance: opts?.edgeToNodeSpacing ?? DEFAULT_OPTIONS.edgeToNodeSpacing,
    handleNudgingDistance: opts?.handleSpacing ?? opts?.edgeToEdgeSpacing ?? DEFAULT_OPTIONS.edgeToEdgeSpacing,
    segmentPenalty: opts?.segmentPenalty,
    anglePenalty: opts?.anglePenalty,
    crossingPenalty: opts?.crossingPenalty,
    clusterCrossingPenalty: opts?.clusterCrossingPenalty,
    fixedSharedPathPenalty: opts?.fixedSharedPathPenalty,
    portDirectionPenalty: opts?.portDirectionPenalty,
    reverseDirectionPenalty: opts?.reverseDirectionPenalty,
    nudgeOrthogonalSegmentsConnectedToShapes: opts?.nudgeOrthogonalSegmentsConnectedToShapes,
    nudgeSharedPathsWithCommonEndPoint: opts?.nudgeSharedPathsWithCommonEndPoint,
    performUnifyingNudgingPreprocessingStep: opts?.performUnifyingNudgingPreprocessingStep,
    nudgeOrthogonalTouchingColinearSegments: opts?.nudgeOrthogonalTouchingColinearSegments,
    improveHyperedgeRoutesMovingJunctions: opts?.improveHyperedgeRoutesMovingJunctions,
    penaliseOrthogonalSharedPathsAtConnEnds: opts?.penaliseOrthogonalSharedPathsAtConnEnds,
    improveHyperedgeRoutesMovingAddingAndDeletingJunctions: opts?.improveHyperedgeRoutesMovingAddingAndDeletingJunctions,
    connectorType: opts?.connectorType ?? "orthogonal",
    hateCrossings: opts?.hateCrossings,
    pinInsideOffset: opts?.pinInsideOffset,
    edgeRounding: opts?.edgeRounding ?? DEFAULT_OPTIONS.edgeRounding,
    diagramGridSize: opts?.diagramGridSize ?? DEFAULT_OPTIONS.diagramGridSize,
    stubSize: opts?.stubSize ?? opts?.edgeToEdgeSpacing ?? DEFAULT_OPTIONS.edgeToEdgeSpacing,
    shouldSplitEdgesNearHandle: opts?.shouldSplitEdgesNearHandle ?? true,
    autoBestSideConnection: opts?.autoBestSideConnection ?? (opts?.connectorType === "bezier" ? true : DEFAULT_OPTIONS.autoBestSideConnection),
    routeOnlyWhenBlocked: opts?.routeOnlyWhenBlocked ?? true,
    debounceMs: opts?.debounceMs ?? DEFAULT_OPTIONS.debounceMs,
  };
}

export function createEdgeRouting(
  getNodes: () => SvelteFlowNode[],
  getEdges: () => SvelteFlowEdge[],
  options?: EdgeRoutingOptions
): EdgeRoutingInstance {
  const opts = toRouterOptions(options);
  const enrichNode = options?.enrichNode;
  const realTimeRouting = options?.realTimeRouting ?? false;

  const connType = opts.connectorType ?? "orthogonal";
  setConnectorType(connType);
  setStubSize(opts.stubSize ?? 20);

  const workerInstance = createRoutingWorker();
  const { workerLoaded, post, destroy: destroyWorker } = workerInstance;

  let didReset = false;
  let nodesMeasured = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingChangeIds = new Set<string>();

  // Subscribe to workerLoaded to trigger initial routing
  let isLoaded = false;
  const unsubLoaded = workerLoaded.subscribe((loaded) => {
    isLoaded = loaded;
    if (loaded) {
      sendReset();
    }
  });

  function sendReset() {
    if (!isLoaded) return;
    const nodes = getNodes();
    if (nodes.length === 0) return;
    nodesMeasured = true;
    const edges = getEdges();
    if (edges.length === 0) {
      setRoutes({});
      return;
    }
    const enrichedNodes = enrichNode ? nodes.map(enrichNode) : nodes;
    console.log("[svelte-edge-routing] sendReset: posting to worker with", enrichedNodes.length, "nodes,", edges.length, "edges");
    post({
      command: "reset",
      nodes: enrichedNodes as unknown as FlowNode[],
      edges: edges as unknown as FlowEdge[],
      options: opts,
    });
    didReset = true;
  }

  function sendIncrementalChanges(nodeIds: string[]) {
    if (opts.connectorType !== "bezier" || nodeIds.length === 0) {
      sendReset();
      return;
    }
    const changedSet = new Set(nodeIds);
    const allEdges = getEdges();
    const affectedEdges = allEdges.filter(
      (e) => changedSet.has(e.source) || changedSet.has(e.target)
    );
    if (affectedEdges.length === 0 || affectedEdges.length === allEdges.length) {
      sendReset();
      return;
    }
    if (!isLoaded) return;
    const nodes = getNodes();
    const enrichedNodes = enrichNode ? nodes.map(enrichNode) : nodes;
    post({
      command: "route",
      nodes: enrichedNodes as unknown as FlowNode[],
      edges: affectedEdges as unknown as FlowEdge[],
      options: opts,
    });
  }

  function resetRouting() { sendReset(); }
  function refreshRouting() { sendReset(); }
  function updateRoutingForNodeIds(nodeIds: string[]) { sendIncrementalChanges(nodeIds); }

  function updateRoutingOnNodesChange(changes: SvelteNodeChange[]) {
    if (!isLoaded) return;

    let hasPosition = false;
    let hasDimensions = false;
    let hasAddOrRemove = false;
    let isDragging = false;
    const draggingNodeIds: string[] = [];

    for (const c of changes) {
      if (c.type === "position") {
        hasPosition = true;
        pendingChangeIds.add(c.id);
        if (c.dragging) {
          isDragging = true;
          draggingNodeIds.push(c.id);
        }
      } else if (c.type === "dimensions") {
        hasDimensions = true;
        pendingChangeIds.add(c.id);
      } else if (c.type === "add" || c.type === "remove") {
        hasAddOrRemove = true;
      }
    }

    if (!hasPosition && !hasDimensions && !hasAddOrRemove) return;

    if (isDragging) {
      setDraggingNodeIds(new Set(draggingNodeIds));
    } else if (hasPosition) {
      setDraggingNodeIds(new Set());
    }

    const needsFullReset = hasAddOrRemove || (hasDimensions && !nodesMeasured);

    if (needsFullReset) {
      if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
      pendingChangeIds.clear();
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        requestAnimationFrame(() => sendReset());
      }, DEBOUNCE_ROUTING_MS);
      return;
    }

    if (!didReset) return;
    if (isDragging && !realTimeRouting) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      requestAnimationFrame(() => {
        const ids = Array.from(pendingChangeIds);
        pendingChangeIds.clear();
        if (ids.length > 0) {
          sendIncrementalChanges(ids);
        }
      });
    }, DEBOUNCE_ROUTING_MS);
  }

  setActions({
    resetRouting,
    updateRoutesForNodeId: (nodeId) => updateRoutingForNodeIds([nodeId]),
  });

  function destroy() {
    unsubLoaded();
    if (debounceTimer) clearTimeout(debounceTimer);
    setActions({ resetRouting: () => {}, updateRoutesForNodeId: () => {} });
    destroyWorker();
  }

  return {
    updateRoutingOnNodesChange,
    resetRouting,
    refreshRouting,
    updateRoutingForNodeIds,
    destroy,
  };
}

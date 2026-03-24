/**
 * useEdgeRouting
 * ---------------------------------------------------------------------------
 * Routes edges around nodes using a Web Worker running libavoid WASM.
 *
 * Pins stay fixed at their exact SVG anchor positions. Routes go around nodes.
 * Each node is enriched with _handlePins before sending to the worker.
 */

import { useCallback, useEffect, useRef } from "react";
import type { Node, NodeChange, Edge } from "@xyflow/react";
import { useEdgeRoutingStore, useEdgeRoutingActionsStore } from "./edge-routing-store";
import { DEBOUNCE_ROUTING_MS } from "./constants";
import type { AvoidRouterOptions, FlowNode, FlowEdge, ConnectorType } from "./routing-core";
import { useRoutingWorker } from "./use-routing-worker";

export interface UseEdgeRoutingOptions {
  // --- Core spacing ---
  edgeToEdgeSpacing?: number;
  edgeToNodeSpacing?: number;
  /** Spacing (px) between edges at shared handles. Should be >= edgeToEdgeSpacing for a fan-out effect. */
  handleSpacing?: number;

  // --- libavoid routing parameters ---
  /** Penalty for each segment beyond the first. MUST be >0 for nudging. Default: 10 */
  segmentPenalty?: number;
  /** Penalty for tight bends (polyline routing). Default: 0 */
  anglePenalty?: number;
  /** Penalty for crossing other connectors. EXPERIMENTAL. Default: 0 */
  crossingPenalty?: number;
  /** Penalty for crossing cluster boundaries. EXPERIMENTAL. Default: 0 */
  clusterCrossingPenalty?: number;
  /** Penalty for shared paths with fixed connectors. EXPERIMENTAL. Default: 0 */
  fixedSharedPathPenalty?: number;
  /** Penalty for port selection outside visibility cone. EXPERIMENTAL. Default: 0 */
  portDirectionPenalty?: number;
  /** Penalty when connector travels opposite from destination. Default: 0 */
  reverseDirectionPenalty?: number;

  // --- libavoid routing options ---
  /** Nudge final segments attached to shapes. Default: true */
  nudgeOrthogonalSegmentsConnectedToShapes?: boolean;
  /** Nudge intermediate segments at common endpoints. Default: true */
  nudgeSharedPathsWithCommonEndPoint?: boolean;
  /** Unify/center segments before nudging (better quality, slower). Default: true */
  performUnifyingNudgingPreprocessingStep?: boolean;
  /** Nudge colinear segments touching at ends apart. Default: false */
  nudgeOrthogonalTouchingColinearSegments?: boolean;
  /** Improve hyperedge routes by moving junctions. Default: true */
  improveHyperedgeRoutesMovingJunctions?: boolean;
  /** Penalize shared orthogonal paths at junctions/pins. EXPERIMENTAL. Default: false */
  penaliseOrthogonalSharedPathsAtConnEnds?: boolean;
  /** Improve hyperedges by adding/removing junctions. Default: false */
  improveHyperedgeRoutesMovingAddingAndDeletingJunctions?: boolean;

  // --- Connector settings ---
  /** Edge path style: "orthogonal" (default), "polyline", or "bezier". */
  connectorType?: ConnectorType;
  /** If true, connectors try to avoid crossings (longer paths). Default: false */
  hateCrossings?: boolean;
  /** Inside offset (px) for pins — pushes connector start inside shape boundary. Default: 0 */
  pinInsideOffset?: number;

  // --- Rendering / layout ---
  edgeRounding?: number;
  diagramGridSize?: number;
  autoBestSideConnection?: boolean;
  debounceMs?: number;

  /** Enrich a node with _handlePins and _extraHeight before sending to worker */
  enrichNode?: (node: Node) => Node;
}

export interface UseEdgeRoutingResult {
  updateRoutingOnNodesChange: (changes: NodeChange<Node>[]) => void;
  resetRouting: () => void;
  refreshRouting: () => void;
  updateRoutingForNodeIds: (nodeIds: string[]) => void;
}

const DEFAULT_OPTIONS: UseEdgeRoutingOptions = {
  edgeRounding: 8,
  edgeToEdgeSpacing: 10,
  edgeToNodeSpacing: 12,
  handleSpacing: 20,
  diagramGridSize: 0,
  autoBestSideConnection: false,
  debounceMs: 0,
};

function toRouterOptions(opts?: UseEdgeRoutingOptions): AvoidRouterOptions {
  return {
    // Core spacing
    idealNudgingDistance: opts?.edgeToEdgeSpacing ?? DEFAULT_OPTIONS.edgeToEdgeSpacing,
    shapeBufferDistance: opts?.edgeToNodeSpacing ?? DEFAULT_OPTIONS.edgeToNodeSpacing,
    handleNudgingDistance: opts?.handleSpacing ?? DEFAULT_OPTIONS.handleSpacing,

    // Routing parameters
    segmentPenalty: opts?.segmentPenalty,
    anglePenalty: opts?.anglePenalty,
    crossingPenalty: opts?.crossingPenalty,
    clusterCrossingPenalty: opts?.clusterCrossingPenalty,
    fixedSharedPathPenalty: opts?.fixedSharedPathPenalty,
    portDirectionPenalty: opts?.portDirectionPenalty,
    reverseDirectionPenalty: opts?.reverseDirectionPenalty,

    // Routing options
    nudgeOrthogonalSegmentsConnectedToShapes: opts?.nudgeOrthogonalSegmentsConnectedToShapes,
    nudgeSharedPathsWithCommonEndPoint: opts?.nudgeSharedPathsWithCommonEndPoint,
    performUnifyingNudgingPreprocessingStep: opts?.performUnifyingNudgingPreprocessingStep,
    nudgeOrthogonalTouchingColinearSegments: opts?.nudgeOrthogonalTouchingColinearSegments,
    improveHyperedgeRoutesMovingJunctions: opts?.improveHyperedgeRoutesMovingJunctions,
    penaliseOrthogonalSharedPathsAtConnEnds: opts?.penaliseOrthogonalSharedPathsAtConnEnds,
    improveHyperedgeRoutesMovingAddingAndDeletingJunctions: opts?.improveHyperedgeRoutesMovingAddingAndDeletingJunctions,

    // Connector settings
    connectorType: opts?.connectorType ?? "orthogonal",
    hateCrossings: opts?.hateCrossings,
    pinInsideOffset: opts?.pinInsideOffset,

    // Rendering
    edgeRounding: opts?.edgeRounding ?? DEFAULT_OPTIONS.edgeRounding,
    diagramGridSize: opts?.diagramGridSize ?? DEFAULT_OPTIONS.diagramGridSize,
    autoBestSideConnection: opts?.autoBestSideConnection ?? DEFAULT_OPTIONS.autoBestSideConnection,
    debounceMs: opts?.debounceMs ?? DEFAULT_OPTIONS.debounceMs,
  };
}

export function useEdgeRouting(
  nodes: Node[],
  edges: Edge[],
  options?: UseEdgeRoutingOptions
): UseEdgeRoutingResult {
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const opts = toRouterOptions(options);
  const optsRef = useRef<AvoidRouterOptions>(opts);
  const enrichNodeRef = useRef(options?.enrichNode);

  nodesRef.current = nodes;
  edgesRef.current = edges;
  optsRef.current = opts;
  enrichNodeRef.current = options?.enrichNode;

  const setRoutes = useEdgeRoutingStore((s) => s.setRoutes);
  const invalidateRoutesForNodes = useEdgeRoutingStore((s) => s.invalidateRoutesForNodes);
  const setActions = useEdgeRoutingActionsStore((s) => s.setActions);

  const { post, workerLoaded } = useRoutingWorker({ create: true });

  const didResetRef = useRef(false);
  const nodesMeasuredRef = useRef(false);

  const sendReset = useCallback(() => {
    if (!workerLoaded) return;
    const nodes = nodesRef.current;
    const hasMeasured = nodes.length === 0 || nodes.some((n) => n.measured?.width != null);
    if (!hasMeasured) return;
    nodesMeasuredRef.current = true;
    const edges = edgesRef.current;
    if (edges.length === 0) {
      setRoutes({});
      return;
    }
    // Enrich nodes with _handlePins and _extraHeight on main thread
    const enrich = enrichNodeRef.current;
    const enrichedNodes = enrich ? nodes.map(enrich) : nodes;
    post({
      command: "reset",
      nodes: enrichedNodes as unknown as FlowNode[],
      edges: edges as unknown as FlowEdge[],
      options: optsRef.current,
    });
    didResetRef.current = true;
  }, [post, setRoutes, workerLoaded]);

  // Full reset on position changes — nodesRef.current must have updated positions
  // by the time this fires (ensured by the debounce + rAF delay).
  const sendIncrementalChanges = useCallback(
    (_nodeIds: string[]) => { sendReset(); },
    [sendReset]
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChangeIdsRef = useRef<Set<string>>(new Set());

  const resetRouting = useCallback(() => { sendReset(); }, [sendReset]);
  const refreshRouting = useCallback(() => { sendReset(); }, [sendReset]);
  const updateRoutingForNodeIds = useCallback(
    (nodeIds: string[]) => { sendIncrementalChanges(nodeIds); },
    [sendIncrementalChanges]
  );

  const updateRoutingOnNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      if (!workerLoaded) return;

      let hasPosition = false;
      let hasDimensions = false;
      let hasAddOrRemove = false;
      let isDragging = false;
      const draggingNodeIds: string[] = [];

      for (const c of changes) {
        if (c.type === "position") {
          hasPosition = true;
          pendingChangeIdsRef.current.add(c.id);
          if ((c as { dragging?: boolean }).dragging) {
            isDragging = true;
            draggingNodeIds.push(c.id);
          }
        } else if (c.type === "dimensions") {
          hasDimensions = true;
          pendingChangeIdsRef.current.add(c.id);
        } else if (c.type === "add" || c.type === "remove") {
          hasAddOrRemove = true;
        }
      }

      if (!hasPosition && !hasDimensions && !hasAddOrRemove) return;

      // While dragging: immediately invalidate routes for affected edges
      // so useRoutedEdgePath falls back to React Flow's smooth-step path.
      // This gives instant visual feedback without waiting for the worker.
      if (isDragging && draggingNodeIds.length > 0) {
        const edges = edgesRef.current;
        invalidateRoutesForNodes(
          draggingNodeIds,
          edges.map(e => ({ id: e.id, source: (e as any).source, target: (e as any).target }))
        );
      }

      const needsFullReset = hasAddOrRemove || (hasDimensions && !nodesMeasuredRef.current);

      if (needsFullReset) {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
        pendingChangeIdsRef.current.clear();
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
          requestAnimationFrame(() => sendReset());
        }, DEBOUNCE_ROUTING_MS);
        return;
      }

      if (!didResetRef.current) return;

      // Only re-route when drag ends (not while dragging)
      if (isDragging) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        requestAnimationFrame(() => {
          const ids = Array.from(pendingChangeIdsRef.current);
          pendingChangeIdsRef.current.clear();
          if (ids.length > 0) {
            sendIncrementalChanges(ids);
          }
        });
      }, DEBOUNCE_ROUTING_MS);
    },
    [workerLoaded, sendReset, sendIncrementalChanges, invalidateRoutesForNodes]
  );

  useEffect(() => {
    setActions({
      resetRouting,
      updateRoutesForNodeId: (nodeId) => updateRoutingForNodeIds([nodeId]),
    });
    return () => setActions({ resetRouting: () => {}, updateRoutesForNodeId: () => {} });
  }, [resetRouting, updateRoutingForNodeIds, setActions]);

  // Re-route when options change. We serialize to JSON for stable comparison.
  const optsJson = JSON.stringify(opts);
  useEffect(() => {
    if (workerLoaded) sendReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerLoaded, nodes.length, edges.length, optsJson, sendReset]);

  return {
    updateRoutingOnNodesChange,
    resetRouting,
    refreshRouting,
    updateRoutingForNodeIds,
  };
}

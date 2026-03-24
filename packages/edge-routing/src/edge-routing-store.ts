import { create } from "zustand";
import type { AvoidRoute } from "./routing-core";

export interface EdgeRoutingState {
  loaded: boolean;
  routes: Record<string, AvoidRoute>;
  setLoaded: (loaded: boolean) => void;
  setRoutes: (routes: Record<string, AvoidRoute>) => void;
  /** Clear routes for edges connected to the given node IDs (forces fallback path) */
  invalidateRoutesForNodes: (nodeIds: string[], edges: { id: string; source: string; target: string }[]) => void;
}

export const useEdgeRoutingStore = create<EdgeRoutingState>((set) => ({
  loaded: false,
  routes: {},
  setLoaded: (loaded) => set({ loaded }),
  setRoutes: (routes) => set({ routes }),
  invalidateRoutesForNodes: (nodeIds, edges) => set((state) => {
    const nodeSet = new Set(nodeIds);
    const edgeIdsToRemove = new Set<string>();
    for (const edge of edges) {
      if (nodeSet.has(edge.source) || nodeSet.has(edge.target)) {
        edgeIdsToRemove.add(edge.id);
      }
    }
    if (edgeIdsToRemove.size === 0) return state;
    const newRoutes = { ...state.routes };
    for (const edgeId of edgeIdsToRemove) {
      delete newRoutes[edgeId];
    }
    return { routes: newRoutes };
  }),
}));

export interface EdgeRoutingActions {
  resetRouting: () => void;
  updateRoutesForNodeId: (nodeId: string) => void;
}

export const useEdgeRoutingActionsStore = create<{
  actions: EdgeRoutingActions;
  setActions: (a: EdgeRoutingActions) => void;
}>((set) => ({
  actions: { resetRouting: () => {}, updateRoutesForNodeId: () => {} },
  setActions: (actions) => set({ actions }),
}));

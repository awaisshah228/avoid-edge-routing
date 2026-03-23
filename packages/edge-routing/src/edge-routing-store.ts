import { create } from "zustand";
import type { AvoidRoute } from "./routing-core";

export interface EdgeRoutingState {
  loaded: boolean;
  routes: Record<string, AvoidRoute>;
  setLoaded: (loaded: boolean) => void;
  setRoutes: (routes: Record<string, AvoidRoute>) => void;
}

export const useEdgeRoutingStore = create<EdgeRoutingState>((set) => ({
  loaded: false,
  routes: {},
  setLoaded: (loaded) => set({ loaded }),
  setRoutes: (routes) => set({ routes }),
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

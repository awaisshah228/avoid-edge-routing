import { create } from "zustand";
import type { AvoidRoute, ConnectorType } from "./routing-core";

export interface EdgeRoutingState {
  loaded: boolean;
  routes: Record<string, AvoidRoute>;
  connectorType: ConnectorType;
  setLoaded: (loaded: boolean) => void;
  setRoutes: (routes: Record<string, AvoidRoute>) => void;
  setConnectorType: (type: ConnectorType) => void;
}

export const useEdgeRoutingStore = create<EdgeRoutingState>((set) => ({
  loaded: false,
  routes: {},
  connectorType: "orthogonal",
  setLoaded: (loaded) => set({ loaded }),
  setRoutes: (routes) => set({ routes }),
  setConnectorType: (connectorType) => set({ connectorType }),
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

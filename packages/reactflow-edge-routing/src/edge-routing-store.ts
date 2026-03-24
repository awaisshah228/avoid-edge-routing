import { create } from "zustand";
import type { AvoidRoute, ConnectorType } from "./routing-core";

export interface EdgeRoutingState {
  loaded: boolean;
  routes: Record<string, AvoidRoute>;
  connectorType: ConnectorType;
  /** Node IDs currently being dragged — edges connected to these show fallback */
  draggingNodeIds: Set<string>;
  setLoaded: (loaded: boolean) => void;
  setRoutes: (routes: Record<string, AvoidRoute>) => void;
  setConnectorType: (type: ConnectorType) => void;
  setDraggingNodeIds: (ids: Set<string>) => void;
}

export const useEdgeRoutingStore = create<EdgeRoutingState>((set) => ({
  loaded: false,
  routes: {},
  connectorType: "orthogonal",
  draggingNodeIds: new Set(),
  setLoaded: (loaded) => set({ loaded }),
  setRoutes: (routes) => set({ routes }),
  setConnectorType: (connectorType) => set({ connectorType }),
  setDraggingNodeIds: (draggingNodeIds) => set({ draggingNodeIds }),
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

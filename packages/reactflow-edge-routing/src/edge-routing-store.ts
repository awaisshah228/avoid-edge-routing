import { create } from "zustand";
import type { AvoidRoute, ConnectorType } from "./routing-core";

export interface EdgeRoutingState {
  loaded: boolean;
  routes: Record<string, AvoidRoute>;
  connectorType: ConnectorType;
  /** Length (px) of the perpendicular stub exit segment from the node border */
  stubSize: number;
  /** Node IDs currently being dragged — edges connected to these show fallback */
  draggingNodeIds: Set<string>;
  setLoaded: (loaded: boolean) => void;
  setRoutes: (routes: Record<string, AvoidRoute>) => void;
  setConnectorType: (type: ConnectorType) => void;
  setStubSize: (size: number) => void;
  setDraggingNodeIds: (ids: Set<string>) => void;
}

export const useEdgeRoutingStore = create<EdgeRoutingState>((set) => ({
  loaded: false,
  routes: {},
  connectorType: "orthogonal",
  stubSize: 20,
  draggingNodeIds: new Set(),
  setLoaded: (loaded) => set({ loaded }),
  setRoutes: (routes) => set({ routes }),
  setConnectorType: (connectorType) => set({ connectorType }),
  setStubSize: (stubSize) => set({ stubSize }),
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

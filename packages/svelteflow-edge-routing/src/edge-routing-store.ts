/**
 * Svelte writable stores for edge routing state.
 * Replaces the React/zustand store with native Svelte stores.
 */

import { writable, derived, get } from "svelte/store";
import type { AvoidRoute, ConnectorType } from "./routing-core";

export interface EdgeRoutingState {
  loaded: boolean;
  routes: Record<string, AvoidRoute>;
  connectorType: ConnectorType;
  stubSize: number;
  draggingNodeIds: Set<string>;
}

export interface EdgeRoutingActions {
  resetRouting: () => void;
  updateRoutesForNodeId: (nodeId: string) => void;
}

const initialState: EdgeRoutingState = {
  loaded: false,
  routes: {},
  connectorType: "orthogonal",
  stubSize: 20,
  draggingNodeIds: new Set(),
};

export const edgeRoutingStore = writable<EdgeRoutingState>({ ...initialState });

export const edgeRoutingActionsStore = writable<EdgeRoutingActions>({
  resetRouting: () => {},
  updateRoutesForNodeId: () => {},
});

// Convenience accessors
export const routesStore = derived(edgeRoutingStore, ($s) => $s.routes);
export const loadedStore = derived(edgeRoutingStore, ($s) => $s.loaded);
export const connectorTypeStore = derived(edgeRoutingStore, ($s) => $s.connectorType);
export const stubSizeStore = derived(edgeRoutingStore, ($s) => $s.stubSize);
export const draggingNodeIdsStore = derived(edgeRoutingStore, ($s) => $s.draggingNodeIds);

// Mutation helpers
export function setLoaded(loaded: boolean) {
  edgeRoutingStore.update((s) => ({ ...s, loaded }));
}

export function setRoutes(routes: Record<string, AvoidRoute>) {
  edgeRoutingStore.update((s) => ({ ...s, routes }));
}

export function setConnectorType(connectorType: ConnectorType) {
  edgeRoutingStore.update((s) => ({ ...s, connectorType }));
}

export function setStubSize(stubSize: number) {
  edgeRoutingStore.update((s) => ({ ...s, stubSize }));
}

export function setDraggingNodeIds(draggingNodeIds: Set<string>) {
  edgeRoutingStore.update((s) => ({ ...s, draggingNodeIds }));
}

export function setActions(actions: EdgeRoutingActions) {
  edgeRoutingActionsStore.set(actions);
}

export function getEdgeRoutingState(): EdgeRoutingState {
  return get(edgeRoutingStore);
}

// Core routing (re-exported from shared engine)
export {
  Geometry,
  PathBuilder,
  HandleSpacing,
  RoutingEngine,
  PersistentRouter,
} from "./routing-core";
export type {
  AvoidRoute,
  AvoidRouterOptions,
  HandlePosition,
  FlowNode,
  FlowEdge,
  HandlePin,
  ConnectorType,
} from "./routing-core";

// Store
export {
  edgeRoutingStore,
  edgeRoutingActionsStore,
  routesStore,
  loadedStore,
  connectorTypeStore,
  stubSizeStore,
  draggingNodeIdsStore,
  setLoaded,
  setRoutes,
  setConnectorType,
  setStubSize,
  setDraggingNodeIds,
  setActions,
  getEdgeRoutingState,
} from "./edge-routing-store";
export type { EdgeRoutingState, EdgeRoutingActions } from "./edge-routing-store";

// Worker messages
export type { EdgeRoutingWorkerCommand, EdgeRoutingWorkerResponse } from "./worker-messages";

// Worker listener
export { attachWorkerListener } from "./worker-listener";

// Worker management
export { createRoutingWorker } from "./create-routing-worker";
export type { CreateRoutingWorkerOptions, RoutingWorkerInstance } from "./create-routing-worker";

// Edge routing (main API)
export { createEdgeRouting } from "./create-edge-routing";
export type {
  EdgeRoutingOptions,
  EdgeRoutingInstance,
  SvelteFlowNode,
  SvelteFlowEdge,
  SvelteNodeChange,
} from "./create-edge-routing";

// Routed edge path
export { computeRoutedEdgePath, getRoutedEdgePathStore } from "./get-routed-edge-path";
export type {
  GetRoutedEdgePathParams,
  RoutedEdgePathResult,
  RoutePinPoints,
  Position,
} from "./get-routed-edge-path";

// Collision resolution
export { resolveCollisions } from "./resolve-collisions";
export type { CollisionAlgorithmOptions } from "./resolve-collisions";

// Constants
export { DEBOUNCE_ROUTING_MS, EDGE_BORDER_RADIUS } from "./constants";

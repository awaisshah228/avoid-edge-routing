/**
 * Message types for the edge-routing Web Worker.
 * Main thread posts commands; worker posts back 'loaded' and 'routed'.
 */

import type { AvoidRoute, AvoidRouterOptions, FlowNode, FlowEdge } from "./routing-core";

/** Commands the main thread can send to the worker */
export type EdgeRoutingWorkerCommand =
  | { command: "reset"; nodes: FlowNode[]; edges: FlowEdge[]; options?: AvoidRouterOptions }
  | { command: "change"; cell: FlowNode | FlowEdge }
  | { command: "remove"; id: string }
  | { command: "add"; cell: FlowNode | FlowEdge }
  | { command: "route"; nodes: FlowNode[]; edges: FlowEdge[]; options?: AvoidRouterOptions }
  | { command: "updateNodes"; nodes: FlowNode[] }
  | { command: "close" };

/** Messages the worker sends back to the main thread */
export type EdgeRoutingWorkerResponse =
  | { command: "loaded"; success: boolean }
  | { command: "routed"; routes: Record<string, AvoidRoute> };

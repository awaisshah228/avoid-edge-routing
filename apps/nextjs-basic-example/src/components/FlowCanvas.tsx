"use client";

/**
 * FlowCanvas — main React Flow canvas wired up with reactflow-edge-routing.
 *
 * Key points:
 * - enrichNode reads handle positions from React Flow's DOM measurements
 *   so the router knows the exact pin locations on each node.
 * - autoBestSideConnection is off — edges use the explicit sourceHandle /
 *   targetHandle ids defined in initialEdges.
 * - shouldSplitEdgesNearHandle fans out parallel edges at shared handles.
 */

import { useState, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEdgeRouting } from "reactflow-edge-routing";

import { BasicNode }   from "./BasicNode";
import { BlockerNode } from "./BlockerNode";
import { RoutedEdge }  from "./RoutedEdge";
// enrichNode reads React Flow's internal DOM measurements for each node and
// converts the handle positions into _handlePins that the routing engine
// understands. Without it, the router has no idea where "left", "right" etc.
// physically are on a node, so it can't resolve explicit sourceHandle /
// targetHandle ids and routing fails with "no pins with class id" errors.
import { createEnrichNode } from "./enrichNode";
import { initialNodes, initialEdges } from "../data/initialElements";

// Node and edge type registries — defined outside the component to avoid
// unnecessary re-renders caused by new object references on every render.
const nodeTypes = { basic: BasicNode, blocker: BlockerNode };
const edgeTypes = { routed: RoutedEdge };

function Flow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // getInternalNode gives access to React Flow's measured handle bounds,
  // which enrichNode uses to build _handlePins for the routing engine.
  const { getInternalNode } = useReactFlow();

  const { updateRoutingOnNodesChange, resetRouting } = useEdgeRouting(nodes, edges, {
    edgeRounding: 12,           // corner radius on orthogonal bends
    edgeToEdgeSpacing: 4,       // min gap between parallel edge segments
    edgeToNodeSpacing: 8,       // min gap between an edge and a node boundary
    handleSpacing: 4,           // spread between edges sharing the same handle
    segmentPenalty: 10,         // cost per extra segment (keeps paths short)
    shouldSplitEdgesNearHandle: true,  // fan edges out at handles instead of converging to a single point
    autoBestSideConnection: false,     // honour explicit sourceHandle/targetHandle ids; don't auto-pick sides
    // enrichNode is called for every node before routing — it reads the DOM-measured
    // handle bounds via getInternalNode and attaches _handlePins so the router can
    // locate "left", "right", "top", "bottom" as exact coordinates on each shape.
    enrichNode: createEnrichNode(getInternalNode),
  });

  // Propagate node changes to both React Flow state and the routing engine
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      updateRoutingOnNodesChange(changes);
    },
    [updateRoutingOnNodesChange]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // New connections are added as routed edges
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, type: "routed" }, eds)),
    []
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={() => resetRouting()} // re-route after drag ends
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}

// ReactFlowProvider must wrap any component that uses useReactFlow()
export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}

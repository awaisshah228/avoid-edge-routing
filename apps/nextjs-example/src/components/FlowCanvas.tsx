"use client";

import { useState, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
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
import { RoutedEdge } from "./RoutedEdge";

const edgeTypes = { routed: RoutedEdge };

const initialNodes: Node[] = [
  { id: "1", position: { x: 50,  y: 200 }, data: { label: "Node A" }, style: { width: 120, height: 40 } },
  { id: "2", position: { x: 300, y: 80  }, data: { label: "Node B" }, style: { width: 120, height: 40 } },
  { id: "3", position: { x: 300, y: 320 }, data: { label: "Node C" }, style: { width: 120, height: 40 } },
  { id: "4", position: { x: 550, y: 200 }, data: { label: "Node D" }, style: { width: 120, height: 40 } },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", type: "routed" },
  { id: "e1-3", source: "1", target: "3", type: "routed" },
  { id: "e2-4", source: "2", target: "4", type: "routed" },
  { id: "e3-4", source: "3", target: "4", type: "routed" },
];

function Flow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const { updateRoutingOnNodesChange, resetRouting } = useEdgeRouting(nodes, edges, {
    edgeRounding: 8,
    edgeToEdgeSpacing: 6,
    edgeToNodeSpacing: 10,
    autoBestSideConnection: true,
  });

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
      onNodeDragStop={() => resetRouting()}
      edgeTypes={edgeTypes}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}

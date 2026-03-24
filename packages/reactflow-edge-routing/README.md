# reactflow-edge-routing

Obstacle-aware edge routing for [React Flow](https://reactflow.dev/). Edges automatically route around nodes using orthogonal, polyline, or bezier paths.

Powered by [`obstacle-router`](../obstacle-router) (TypeScript port of libavoid).

## Installation

```bash
npm install reactflow-edge-routing obstacle-router
# or
yarn add reactflow-edge-routing obstacle-router
```

**Peer dependencies:** `@xyflow/react ^12.0.0`, `react ^18.0.0 || ^19.0.0`

## Quick Start

```tsx
import { ReactFlow, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { useEdgeRouting } from "reactflow-edge-routing";
import { RoutedEdge } from "./RoutedEdge"; // your custom edge component

const edgeTypes = { routed: RoutedEdge };

function Flow() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges); // edges should have type: "routed"

  const { updateRoutingOnNodesChange, resetRouting } = useEdgeRouting(nodes, edges, {
    edgeRounding: 12,
    edgeToEdgeSpacing: 4,
    edgeToNodeSpacing: 8,
    autoBestSideConnection: true,
  });

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    updateRoutingOnNodesChange(changes);
  }, [updateRoutingOnNodesChange]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onNodeDragStop={() => resetRouting()}
      edgeTypes={edgeTypes}
    />
  );
}
```

### Custom Edge Component

```tsx
import { useRoutedEdgePath } from "reactflow-edge-routing";
import { BaseEdge, type EdgeProps } from "@xyflow/react";

export function RoutedEdge({ id, sourceX, sourceY, targetX, targetY, ...props }: EdgeProps) {
  const [path, labelX, labelY] = useRoutedEdgePath({
    id, sourceX, sourceY, targetX, targetY,
  });

  return <BaseEdge id={id} path={path} labelX={labelX} labelY={labelY} {...props} />;
}
```

## Architecture

```
FlowCanvas (React)
  useEdgeRouting(nodes, edges, options)
    enrichNode -> adds _handlePins, _extraHeight
    RoutingEngine / PersistentRouter -> obstacle-router
    store -> routes: { [edgeId]: AvoidRoute }

  Edge Components
    useRoutedEdgePath(id, sourceX, ...)
      routed path (from store)
      fallback: getSmoothStepPath

  onNodeDragStop -> resolveCollisions + resetRouting
```

## API

### `useEdgeRouting(nodes, edges, options?)`

Main hook. Computes routed paths for all edges and stores them in a Zustand store.

**Returns:**

| Property | Description |
|---|---|
| `updateRoutingOnNodesChange(changes)` | Call from `onNodesChange` to trigger re-routing |
| `resetRouting()` | Full re-route (call after drag stop, layout changes) |
| `refreshRouting()` | Re-route without rebuilding the router |
| `updateRoutingForNodeIds(ids)` | Re-route only edges connected to specific nodes |

### `useRoutedEdgePath(params)`

Returns the routed SVG path for a single edge.

```typescript
const [path, labelX, labelY] = useRoutedEdgePath({
  id, sourceX, sourceY, targetX, targetY,
});
```

Falls back to a smooth step path if no routed path is available yet.

### `resolveCollisions(nodes, options?)`

Pushes overlapping nodes apart after layout or drag.

```typescript
import { resolveCollisions } from "reactflow-edge-routing";

const fixed = resolveCollisions(nodes, {
  maxIterations: 50,
  overlapThreshold: 0.5,
  margin: 20,
});
```

## Options

### Core Spacing

| Option | Default | Description |
|---|---|---|
| `edgeToEdgeSpacing` | 10 | Distance (px) between parallel edge segments |
| `edgeToNodeSpacing` | 8 | Buffer distance (px) between edges and node boundaries |
| `handleSpacing` | 2 | Spacing (px) between edges at shared handles |

### Connector Settings

| Option | Default | Description |
|---|---|---|
| `connectorType` | `"orthogonal"` | Edge style: `"orthogonal"`, `"polyline"`, or `"bezier"` |
| `hateCrossings` | `false` | If true, connectors prefer longer paths to avoid crossings |
| `pinInsideOffset` | 0 | Offset (px) pushing connector start inside shape boundary |

### Rendering

| Option | Default | Description |
|---|---|---|
| `edgeRounding` | 8 | Corner radius (px) for orthogonal bends |
| `diagramGridSize` | 0 | Snap waypoints to grid (0 = no grid) |
| `shouldSplitEdgesNearHandle` | `true` | When true, edges fan out at handles. When false, edges converge to a single point |
| `stubSize` | 20 | Length (px) of stub segment when `shouldSplitEdgesNearHandle` is off |
| `autoBestSideConnection` | `true` | Auto-detect best handle side based on relative node positions |
| `debounceMs` | 0 | Debounce delay (ms) for routing updates |

### Routing Penalties

| Option | Default | Description |
|---|---|---|
| `segmentPenalty` | 10 | Penalty per path segment. Must be >0 for nudging |
| `anglePenalty` | 0 | Penalty for non-straight bends |
| `crossingPenalty` | 0 | Penalty for crossing other connectors |
| `reverseDirectionPenalty` | 0 | Penalty for routing away from destination |

### Nudging Options

| Option | Default | Description |
|---|---|---|
| `nudgeOrthogonalSegmentsConnectedToShapes` | `true` | Nudge final segments at shape boundaries |
| `nudgeSharedPathsWithCommonEndPoint` | `true` | Nudge segments sharing an endpoint |
| `performUnifyingNudgingPreprocessingStep` | `true` | Unify segments before nudging |
| `nudgeOrthogonalTouchingColinearSegments` | `false` | Nudge colinear touching segments apart |

### Other

| Option | Default | Description |
|---|---|---|
| `realTimeRouting` | `false` | Re-route in real time while dragging |
| `enrichNode` | - | Function to add `_handlePins` and `_extraHeight` to nodes |

## Multi-Handle Nodes

For nodes with multiple handles, provide an `enrichNode` function that computes pin positions:

```tsx
const enrichNode = useCallback((node) => {
  const internal = getInternalNode(node.id);
  if (!internal) return node;
  // compute _handlePins from DOM handle positions
  return { ...node, _handlePins: computePins(internal) };
}, [getInternalNode]);

useEdgeRouting(nodes, edges, { enrichNode });
```

Each pin describes a handle's proportional position on the node:

```typescript
type HandlePin = {
  handleId: string;  // matches edge.sourceHandle / edge.targetHandle
  xPct: number;      // 0-1 from left edge
  yPct: number;      // 0-1 from top edge
  side: "left" | "right" | "top" | "bottom";
};
```

## Exports

### Classes

- `RoutingEngine` - One-shot routing (builds router, routes, disposes)
- `PersistentRouter` - Incremental routing (reuses router across updates)
- `Geometry` - Node bounds, handle positions, best-side detection
- `PathBuilder` - SVG path generation (orthogonal, bezier, polyline)
- `HandleSpacing` - Fan-out spacing adjustment at shared handles

### Hooks

- `useEdgeRouting` - Main routing hook
- `useRoutedEdgePath` - Per-edge path hook
- `useRoutingWorker` - Low-level worker management

### Stores

- `useEdgeRoutingStore` - Zustand store for routed paths
- `useEdgeRoutingActionsStore` - Zustand store for routing actions

### Functions

- `resolveCollisions` - Push overlapping nodes apart
- `attachWorkerListener` - Wire up a Web Worker for background routing

### Types

- `AvoidRoute`, `AvoidRouterOptions`, `FlowNode`, `FlowEdge`
- `HandlePin`, `HandlePosition`, `ConnectorType`
- `UseEdgeRoutingOptions`, `UseEdgeRoutingResult`
- `CollisionAlgorithmOptions`, `CollisionAlgorithm`

## License

MIT

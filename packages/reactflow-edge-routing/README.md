# @biocon/edge-routing

Edge routing package for Biocon — routes edges around nodes using libavoid WASM, with collision resolution and auto-layout support.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  FlowCanvas (React)                                  │
│  ├── useEdgeRouting(nodes, edges, options)           │
│  │   ├── enrichNode → adds _handlePins, _extraHeight│
│  │   ├── Web Worker (edge-routing.worker.ts)        │
│  │   │   └── PersistentRouter → libavoid WASM       │
│  │   └── store → routes: { [edgeId]: AvoidRoute }   │
│  │                                                   │
│  ├── Edge Components (Material/Energy/Signal)        │
│  │   └── useRoutedEdgePath(id, sourceX, ...)        │
│  │       ├── routed path (from store, if fresh)     │
│  │       └── fallback: getSmoothStepPath            │
│  │                                                   │
│  └── onNodeDragStop → resolveCollisions + reset     │
└─────────────────────────────────────────────────────┘
```

## Handle Positions

Biocon uses **fixed handle positions per node** — each node's handles are defined in its `ProcessNodeData` (`inputs`/`outputs` arrays with `position: "left" | "right" | "top" | "bottom"`).

**Important:** The layout engine must NOT override `sourcePosition` / `targetPosition` on nodes. These are determined by the node's shape and handle definitions, not by the layout direction.

### Handle Pin Computation

The `enrichNodeForRouting()` function (in `resolve-handle-point.ts`) converts handle definitions to proportional pin positions for libavoid:

```typescript
// Pin positions are proportional (0-1) within the TOTAL obstacle bounds
// Total obstacle height = nodeH + _extraHeight (DATA_AREA_H = 40px)
const totalH = nodeH + DATA_AREA_H;
yPct = (sideAnchors[index].yPct / 100) * shapeH / totalH;
```

Key formula: `pin absolute Y = nodeY + yPct * totalH`

The `_extraHeight` accounts for the label and data area below the shape that is part of the obstacle but not part of the shape SVG.

### Handle Offset

React Flow reports handle positions as the **center of the handle DOM element**, which is ~6px inward from the node boundary. The routing store's paths start/end at the node boundary (pin at `xPct=0` or `xPct=1`). This creates a consistent ~6px offset that is within the `STALE_THRESHOLD_PX = 10` tolerance.

## Stale Route Detection

When nodes move (e.g. during drag), the WASM worker re-routes asynchronously. Between updates, the stored route may be stale. `useRoutedEdgePath` checks if the route's start/end points have drifted more than 10px from the current React Flow anchors:

```typescript
if (loaded && route && !isRouteStale(route.path, sourceX, sourceY, targetX, targetY)) {
  return [route.path, ...];  // use routed path
}
// fallback to getSmoothStepPath
```

## Route Merging

When the worker returns routes, they are **merged** with existing routes (not replaced). This ensures edges that failed to route in a given cycle keep their last good path:

```typescript
const merged = { ...prev, ...msg.routes };
setRoutes(merged);
```

## Collision Resolution

`resolveCollisions()` pushes overlapping nodes apart. It accounts for the full visual height of nodes (shape + label + data area = `LABEL_H + DATA_AREA_H = 60px` extra).

Usage:
```typescript
const resolved = resolveCollisions(nodes, {
  maxIterations: Infinity,
  overlapThreshold: 0.5,
  margin: 15,
});
```

Call after:
- **Node drag stop** — prevents overlapping after manual positioning
- **Auto layout** — resolves any remaining overlaps from ELK/dagre

## Debouncing

`DEBOUNCE_ROUTING_MS = 80` — the worker waits 80ms after the last change before routing, so rapid events (drag, layout) are batched.

## API

### Hooks

| Hook | Description |
|------|-------------|
| `useEdgeRouting(nodes, edges, options)` | Main hook — creates worker, sends routing commands |
| `useRoutedEdgePath(params)` | Returns `[path, labelX, labelY, wasRouted]` for an edge |
| `useRoutingWorker(options)` | Low-level worker management |

### Functions

| Function | Description |
|----------|-------------|
| `resolveCollisions(nodes, options)` | Push overlapping nodes apart |
| `enrichNodeForRouting(node)` | Add `_handlePins` and `_extraHeight` to a node |

### Options for `useEdgeRouting`

```typescript
{
  edgeRounding: 8,        // corner radius on routed paths
  edgeToEdgeSpacing: 10,  // gap between parallel edges
  edgeToNodeSpacing: 12,  // gap between edges and node boundaries
  autoBestSideConnection: false,
  enrichNode: enrichNodeForRouting,
}
```

## Edge Types

Each edge type has its own color from the theme and animation style:

| Type | Color Key | Animation |
|------|-----------|-----------|
| `materialFlow` | `colors.edgeMaterial` | Flowing particles |
| `energyFlow` | `colors.edgeEnergy` | Pulsing glow |
| `signalFlow` | `colors.edgeSignal` | Fast dashes |

Edges support `customColor` override via the inline `EdgeToolbar` (uses React Flow's built-in `EdgeToolbar` component for proper z-index above nodes).

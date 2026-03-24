# obstacle-router

A pure TypeScript port of [libavoid](https://www.adaptagrams.org/documentation/libavoid.html) - a fast, incremental, object-avoiding line router for diagrams and graph editors.

Originally developed by Michael Wybrow at Monash University as part of the [Adaptagrams](https://www.adaptagrams.org/) project (C++). This package is a complete TypeScript rewrite with zero dependencies.

## Features

- **Orthogonal routing** - rectilinear (right-angle) connector paths
- **Polyline routing** - shortest-path connectors with configurable bend penalties
- **Obstacle avoidance** - connectors route around rectangular shapes
- **Incremental updates** - move shapes and re-route without rebuilding from scratch
- **Nudging** - parallel segments are automatically spaced apart
- **Crossing minimization** - optional penalty to reduce edge crossings
- **Shape connection pins** - attach connectors to specific points on shapes
- **Checkpoints** - force connectors through intermediate waypoints
- **Hyperedge routing** - route edges with shared segments and junctions
- **Cluster support** - route around grouped regions

## Installation

```bash
npm install obstacle-router
# or
yarn add obstacle-router
```

## Quick Start

```typescript
import {
  Router,
  Rectangle,
  ShapeRef,
  ConnRef,
  ConnEnd,
  ShapeConnectionPin,
  Point,
  OrthogonalRouting,
  ConnDirRight,
  ConnDirLeft,
  shapeBufferDistance,
  idealNudgingDistance,
} from "obstacle-router";

// Create a router with orthogonal routing
const router = new Router(OrthogonalRouting);
router.setRoutingParameter(shapeBufferDistance, 8);
router.setRoutingParameter(idealNudgingDistance, 10);

// Add obstacle shapes
const rectA = new Rectangle(new Point(0, 0), new Point(100, 50));
const shapeA = new ShapeRef(router, rectA);

const rectB = new Rectangle(new Point(250, 0), new Point(350, 50));
const shapeB = new ShapeRef(router, rectB);

// Add connection pins on shapes
// Pin on right side of shape A (x=1.0, y=0.5 proportional)
new ShapeConnectionPin(shapeA, 1, 1.0, 0.5, true, 0, ConnDirRight);
// Pin on left side of shape B
new ShapeConnectionPin(shapeB, 2, 0.0, 0.5, true, 0, ConnDirLeft);

// Create a connector between pins
const srcEnd = ConnEnd.fromShapePin(shapeA, 1);
const tgtEnd = ConnEnd.fromShapePin(shapeB, 2);
const connRef = new ConnRef(router, srcEnd, tgtEnd);

// Process and read the route
router.processTransaction();

const route = connRef.displayRoute();
for (let i = 0; i < route.size(); i++) {
  const pt = route.at(i);
  console.log(`Point ${i}: (${pt.x}, ${pt.y})`);
}
```

## API Reference

### Router

The main routing engine. Manages shapes, connectors, and performs route computation.

```typescript
const router = new Router(OrthogonalRouting);

// Configure parameters
router.setRoutingParameter(shapeBufferDistance, 12);    // gap between edges and shapes
router.setRoutingParameter(idealNudgingDistance, 10);   // gap between parallel edges
router.setRoutingParameter(segmentPenalty, 10);         // penalty per segment (must be >0 for nudging)

// Configure options
router.setRoutingOption(nudgeOrthogonalSegmentsConnectedToShapes, true);
router.setRoutingOption(nudgeSharedPathsWithCommonEndPoint, true);

// Process all pending changes
router.processTransaction();
```

### Routing Parameters

| Parameter | Default | Description |
|---|---|---|
| `shapeBufferDistance` | 0 | Buffer distance (px) between edges and shape boundaries |
| `idealNudgingDistance` | 0 | Distance (px) between parallel edge segments |
| `segmentPenalty` | 0 | Penalty per path segment. Must be >0 for nudging to work |
| `anglePenalty` | 0 | Penalty for non-straight bends (polyline routing) |
| `crossingPenalty` | 0 | Penalty for crossing other connectors |
| `reverseDirectionPenalty` | 0 | Penalty when connector travels away from destination |
| `clusterCrossingPenalty` | 0 | Penalty for crossing cluster boundaries |
| `fixedSharedPathPenalty` | 0 | Penalty for shared paths with fixed connectors |
| `portDirectionPenalty` | 0 | Penalty for port selection outside visibility cone |

### Routing Options

| Option | Default | Description |
|---|---|---|
| `nudgeOrthogonalSegmentsConnectedToShapes` | true | Nudge final segments at shape boundaries |
| `nudgeSharedPathsWithCommonEndPoint` | true | Nudge segments sharing an endpoint |
| `performUnifyingNudgingPreprocessingStep` | true | Unify segments before nudging (better quality) |
| `nudgeOrthogonalTouchingColinearSegments` | false | Nudge colinear touching segments apart |
| `improveHyperedgeRoutesMovingJunctions` | true | Optimize hyperedge junction positions |
| `penaliseOrthogonalSharedPathsAtConnEnds` | false | Penalize shared paths at connector ends |
| `improveHyperedgeRoutesMovingAddingAndDeletingJunctions` | false | Full hyperedge optimization |

### Shapes

```typescript
// Create a rectangular obstacle
const rect = new Rectangle(new Point(x1, y1), new Point(x2, y2));
const shape = new ShapeRef(router, rect);

// Move a shape (incremental update)
const newRect = new Rectangle(new Point(newX1, newY1), new Point(newX2, newY2));
router.moveShape(shape, newRect);

// Remove a shape
router.deleteShape(shape);
```

### Connection Pins

```typescript
// Pin at proportional position on shape
// Args: shape, pinClassId, xProportion, yProportion, proportional, insideOffset, directions
new ShapeConnectionPin(shape, pinId, 1.0, 0.5, true, 0, ConnDirRight);

// Common positions:
// Right center:  (1.0, 0.5, ConnDirRight)
// Left center:   (0.0, 0.5, ConnDirLeft)
// Top center:    (0.5, 0.0, ConnDirUp)
// Bottom center: (0.5, 1.0, ConnDirDown)
```

### Connectors

```typescript
// Connect via shape pins
const srcEnd = ConnEnd.fromShapePin(shapeA, pinId);
const tgtEnd = ConnEnd.fromShapePin(shapeB, pinId);
const conn = new ConnRef(router, srcEnd, tgtEnd);

// Connect to a point
const ptEnd = ConnEnd.fromPoint(new Point(x, y));

// Set routing type
conn.setRoutingType(ConnType_Orthogonal);  // or ConnType_PolyLine

// Avoid crossings
conn.setHateCrossings(true);

// Add checkpoints (waypoints)
conn.setRoutingCheckpoints([
  new Checkpoint(new Point(150, 100)),
]);

// Read the computed route
const route = conn.displayRoute();
```

## Incremental Updates

The router supports incremental updates for performance. Move shapes and re-process without rebuilding:

```typescript
// Move a shape
router.moveShape(shapeRef, newRectangle);
router.processTransaction();  // only re-routes affected connectors

// Add/remove shapes
router.deleteShape(oldShape);
const newShape = new ShapeRef(router, newRect);
router.processTransaction();
```

## License

LGPL-2.1

Based on [libavoid](https://www.adaptagrams.org/documentation/libavoid.html) by Michael Wybrow, Monash University.

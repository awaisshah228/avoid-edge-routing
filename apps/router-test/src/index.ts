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
  ConnDirDown,
  shapeBufferDistance,
  idealNudgingDistance,
  segmentPenalty,
  AStarPath,
  ConnectorCrossings,
  generateStaticOrthogonalVisGraph,
  improveOrthogonalRoutes,
  vertexVisibility,
} from "obstacle-router";

// ---------------------------------------------------------------------------
// 1. Create the router
// ---------------------------------------------------------------------------
const router = new Router(OrthogonalRouting);

// Wire up internal helpers (the package exposes them as separate exports).
(router as any)._generateStaticOrthogonalVisGraph = generateStaticOrthogonalVisGraph;
(router as any)._improveOrthogonalRoutes = improveOrthogonalRoutes;
(router as any)._ConnectorCrossings = ConnectorCrossings;
(router as any)._AStarPath = AStarPath;
(router as any)._vertexVisibility = vertexVisibility;

// Tune routing behaviour.
router.setRoutingParameter(shapeBufferDistance, 8);   // gap around shapes
router.setRoutingParameter(idealNudgingDistance, 10); // gap between parallel edges
router.setRoutingParameter(segmentPenalty, 10);       // must be > 0 for nudging

// ---------------------------------------------------------------------------
// 2. Define obstacle shapes (rectangles)
// ---------------------------------------------------------------------------
//
//   shapeA           [obstacle]            shapeB
//   (0,0)─(100,50)   (150,-30)─(220,80)    (300,0)─(400,50)
//
const rectA = new Rectangle(new Point(0, 0), new Point(100, 50));
const shapeA = new ShapeRef(router as any, rectA);

const rectObstacle = new Rectangle(new Point(150, -30), new Point(220, 80));
const shapeObstacle = new ShapeRef(router as any, rectObstacle);

const rectB = new Rectangle(new Point(300, 0), new Point(400, 50));
const shapeB = new ShapeRef(router as any, rectB);

// ---------------------------------------------------------------------------
// 3. Attach connection pins to the source/target shapes
// ---------------------------------------------------------------------------
// ShapeConnectionPin.createForShape args:
//   (shape, classId, xOffset, yOffset, proportional, insideOffset, visDirs)
//
// Pin id 1 on the right-middle of shapeA, pointing right.
ShapeConnectionPin.createForShape(shapeA as any, 1, 1.0, 0.5, true, 0, ConnDirRight);
// Pin id 2 on the left-middle of shapeB, pointing left.
ShapeConnectionPin.createForShape(shapeB as any, 2, 0.0, 0.5, true, 0, ConnDirLeft);

// ---------------------------------------------------------------------------
// 4. Create a connector between the two pins
// ---------------------------------------------------------------------------
const srcEnd = ConnEnd.fromShapePin(shapeA as any, 1);
const tgtEnd = ConnEnd.fromShapePin(shapeB as any, 2);
const conn = new ConnRef(router as any, srcEnd, tgtEnd);

// ---------------------------------------------------------------------------
// 5. (Optional) A second connector that shows nudging in action
// ---------------------------------------------------------------------------
ShapeConnectionPin.createForShape(shapeA as any, 3, 0.5, 1.0, true, 0, ConnDirDown);
ShapeConnectionPin.createForShape(shapeB as any, 4, 0.5, 1.0, true, 0, ConnDirDown);
const conn2 = new ConnRef(
  router as any,
  ConnEnd.fromShapePin(shapeA as any, 3),
  ConnEnd.fromShapePin(shapeB as any, 4),
);

// ---------------------------------------------------------------------------
// 6. Run the router and print the resulting polylines
// ---------------------------------------------------------------------------
router.processTransaction();

function printRoute(label: string, c: ConnRef) {
  const route = c.displayRoute();
  console.log(`\n${label} — ${route.size()} points`);
  for (let i = 0; i < route.size(); i++) {
    const p = route.at(i);
    console.log(`  ${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
  }
}

printRoute("conn  (A.right -> B.left, around obstacle)", conn);
printRoute("conn2 (A.bottom -> B.bottom)", conn2);

// ---------------------------------------------------------------------------
// 7. Incremental update — move the obstacle, re-route only what's affected
// ---------------------------------------------------------------------------
router.moveShape(
  shapeObstacle as any,
  new Rectangle(new Point(150, 60), new Point(220, 170)),
);
router.processTransaction();

console.log("\n--- after moving the obstacle down ---");
printRoute("conn", conn);
printRoute("conn2", conn2);

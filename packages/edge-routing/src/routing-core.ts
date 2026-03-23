/**
 * Core edge routing engine using libavoid-js (pure TypeScript).
 *
 * Pins are placed at exact SVG-computed anchor positions per handle.
 * Edges use pin-based ConnEnd(shapeRef, pinId) so libavoid knows which
 * shape an edge belongs to and won't route through it.
 */

import {
  Router as AvoidRouter,
  Point as AvoidPoint,
  Rectangle as AvoidRectangle,
  ShapeRef as AvoidShapeRef,
  ShapeConnectionPin as AvoidShapeConnectionPin,
  ConnEnd as AvoidConnEnd,
  ConnRef as AvoidConnRef,
  ConnectorCrossings,
  AStarPath,
  OrthogonalRouting,
  ConnType_Orthogonal,
  ConnDirUp,
  ConnDirDown,
  ConnDirLeft,
  ConnDirRight,
  shapeBufferDistance as shapeBufferDistanceParam,
  idealNudgingDistance as idealNudgingDistanceParam,
  nudgeOrthogonalSegmentsConnectedToShapes as nudgeOrthogonalSegmentsConnectedToShapesOpt,
  nudgeSharedPathsWithCommonEndPoint as nudgeSharedPathsWithCommonEndPointOpt,
  performUnifyingNudgingPreprocessingStep as performUnifyingNudgingPreprocessingStepOpt,
  generateStaticOrthogonalVisGraph,
  improveOrthogonalRoutes,
  vertexVisibility,
} from "libavoid-js";

// ---- Types ----

export type AvoidRoute = {
  path: string;
  labelX: number;
  labelY: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
};

export type AvoidRouterOptions = {
  shapeBufferDistance?: number;
  idealNudgingDistance?: number;
  handleNudgingDistance?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  autoBestSideConnection?: boolean;
  debounceMs?: number;
};

export type HandlePosition = "left" | "right" | "top" | "bottom";

/** Pin at exact SVG anchor position (proportional 0-1 within the node) */
export type HandlePin = {
  handleId: string;
  /** 0-1 proportion from left edge of node */
  xPct: number;
  /** 0-1 proportion from top edge of node */
  yPct: number;
  /** Which side the handle is on — determines connection direction */
  side: HandlePosition;
};

export type FlowNode = {
  id: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
  style?: { width?: number; height?: number };
  type?: string;
  parentId?: string;
  sourcePosition?: string;
  targetPosition?: string;
  data?: Record<string, unknown>;
  /** Pre-computed handle pins at exact SVG anchor positions (set by main thread) */
  _handlePins?: HandlePin[];
  /** Extra height to add to obstacle (for label + data area below shape) */
  _extraHeight?: number;
  [key: string]: unknown;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  [key: string]: unknown;
};

/** Create a Router with late-bound helpers wired up (breaks circular deps in libavoid-js). */
function createRouter(flags: number): AvoidRouter {
  const router = new AvoidRouter(flags);
  (router as any)._generateStaticOrthogonalVisGraph = generateStaticOrthogonalVisGraph;
  (router as any)._improveOrthogonalRoutes = improveOrthogonalRoutes;
  (router as any)._ConnectorCrossings = ConnectorCrossings;
  (router as any)._AStarPath = AStarPath;
  (router as any)._vertexVisibility = vertexVisibility;
  return router;
}

// ---- Geometry ----

export class Geometry {
  static getNodeBounds(node: FlowNode): { x: number; y: number; w: number; h: number } {
    const x = node.position?.x ?? 0;
    const y = node.position?.y ?? 0;
    const w = Number((node.measured?.width ?? node.width ?? (node.style as { width?: number })?.width) ?? 150);
    const h = Number((node.measured?.height ?? node.height ?? (node.style as { height?: number })?.height) ?? 50);
    const extra = (node._extraHeight as number) ?? 0;
    return { x, y, w, h: h + extra };
  }

  static getNodeBoundsAbsolute(
    node: FlowNode,
    nodeById: Map<string, FlowNode>
  ): { x: number; y: number; w: number; h: number } {
    const b = Geometry.getNodeBounds(node);
    let current: FlowNode | undefined = node;
    while (current?.parentId) {
      const parent = nodeById.get(current.parentId);
      if (!parent) break;
      b.x += parent.position?.x ?? 0;
      b.y += parent.position?.y ?? 0;
      current = parent;
    }
    return b;
  }

  static getHandlePosition(node: FlowNode, kind: "source" | "target"): HandlePosition {
    const raw =
      kind === "source"
        ? (node.sourcePosition as string | undefined) ?? (node as { data?: { sourcePosition?: string } }).data?.sourcePosition
        : (node.targetPosition as string | undefined) ?? (node as { data?: { targetPosition?: string } }).data?.targetPosition;
    const s = String(raw ?? "").toLowerCase();
    if (s === "left" || s === "right" || s === "top" || s === "bottom") return s;
    return kind === "source" ? "right" : "left";
  }

  static getHandlePoint(
    bounds: { x: number; y: number; w: number; h: number },
    position: HandlePosition
  ): { x: number; y: number } {
    const { x, y, w, h } = bounds;
    const cx = x + w / 2;
    const cy = y + h / 2;
    switch (position) {
      case "left": return { x, y: cy };
      case "right": return { x: x + w, y: cy };
      case "top": return { x: cx, y };
      case "bottom": return { x: cx, y: y + h };
      default: return { x: x + w, y: cy };
    }
  }

  static snapToGrid(x: number, y: number, gridSize: number): { x: number; y: number } {
    if (gridSize <= 0) return { x, y };
    return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
  }

  static getBestSides(
    srcBounds: { x: number; y: number; w: number; h: number },
    tgtBounds: { x: number; y: number; w: number; h: number }
  ): { sourcePos: HandlePosition; targetPos: HandlePosition } {
    const dx = (tgtBounds.x + tgtBounds.w / 2) - (srcBounds.x + srcBounds.w / 2);
    const dy = (tgtBounds.y + tgtBounds.h / 2) - (srcBounds.y + srcBounds.h / 2);
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? { sourcePos: "right", targetPos: "left" } : { sourcePos: "left", targetPos: "right" };
    }
    return dy >= 0 ? { sourcePos: "bottom", targetPos: "top" } : { sourcePos: "top", targetPos: "bottom" };
  }

  /** Get ConnDir constant for a side */
  static sideToDir(side: HandlePosition): number {
    switch (side) {
      case "top": return ConnDirUp;
      case "bottom": return ConnDirDown;
      case "left": return ConnDirLeft;
      case "right": return ConnDirRight;
    }
  }
}

// ---- SVG Path Builder ----

export class PathBuilder {
  static polylineToPath(
    size: number,
    getPoint: (i: number) => { x: number; y: number },
    options: { gridSize?: number; cornerRadius?: number } = {}
  ): string {
    if (size < 2) return "";
    const gridSize = options.gridSize ?? 0;
    const r = Math.max(0, options.cornerRadius ?? 0);
    const pt = (i: number) => {
      const p = getPoint(i);
      return gridSize > 0 ? Geometry.snapToGrid(p.x, p.y, gridSize) : p;
    };
    if (r <= 0) {
      let d = `M ${pt(0).x} ${pt(0).y}`;
      for (let i = 1; i < size; i++) { const p = pt(i); d += ` L ${p.x} ${p.y}`; }
      return d;
    }
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);
    const unit = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const d = dist(a, b); if (d < 1e-6) return { x: 0, y: 0 };
      return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
    };
    let d = `M ${pt(0).x} ${pt(0).y}`;
    for (let i = 1; i < size - 1; i++) {
      const prev = pt(i - 1), curr = pt(i), next = pt(i + 1);
      const dirIn = unit(curr, prev), dirOut = unit(curr, next);
      const rr = Math.min(r, dist(curr, prev) / 2, dist(curr, next) / 2);
      const endPrev = { x: curr.x + dirIn.x * rr, y: curr.y + dirIn.y * rr };
      const startNext = { x: curr.x + dirOut.x * rr, y: curr.y + dirOut.y * rr };
      d += ` L ${endPrev.x} ${endPrev.y} Q ${curr.x} ${curr.y} ${startNext.x} ${startNext.y}`;
    }
    d += ` L ${pt(size - 1).x} ${pt(size - 1).y}`;
    return d;
  }
}

// ---- Handle Spacing ----

export class HandleSpacing {
  static adjust(
    edges: FlowEdge[],
    edgePoints: Map<string, { x: number; y: number }[]>,
    handleNudging: number,
    idealNudging: number
  ): void {
    const ratio = handleNudging / idealNudging;
    const bySource = new Map<string, string[]>();
    const byTarget = new Map<string, string[]>();
    for (const edge of edges) {
      if (!edgePoints.has(edge.id)) continue;
      if (!bySource.has(edge.source)) bySource.set(edge.source, []);
      bySource.get(edge.source)!.push(edge.id);
      if (!byTarget.has(edge.target)) byTarget.set(edge.target, []);
      byTarget.get(edge.target)!.push(edge.id);
    }
    for (const [, ids] of bySource) { if (ids.length >= 2) HandleSpacing.rescale(ids, edgePoints, "source", ratio); }
    for (const [, ids] of byTarget) { if (ids.length >= 2) HandleSpacing.rescale(ids, edgePoints, "target", ratio); }
  }

  private static rescale(edgeIds: string[], edgePoints: Map<string, { x: number; y: number }[]>, end: "source" | "target", ratio: number) {
    const positions: { edgeId: string; pt: { x: number; y: number } }[] = [];
    for (const edgeId of edgeIds) {
      const pts = edgePoints.get(edgeId);
      if (!pts || pts.length < 2) continue;
      positions.push({ edgeId, pt: pts[end === "source" ? 0 : pts.length - 1] });
    }
    if (positions.length < 2) return;
    const firstPts = edgePoints.get(positions[0].edgeId)!;
    const segStart = end === "source" ? 0 : firstPts.length - 2;
    const isHorizontal = Math.abs(firstPts[segStart + 1].x - firstPts[segStart].x) > Math.abs(firstPts[segStart + 1].y - firstPts[segStart].y);
    const axis = isHorizontal ? "y" : "x";
    const center = positions.map((p) => p.pt[axis]).reduce((a, b) => a + b, 0) / positions.length;
    for (const edgeId of edgeIds) {
      const pts = edgePoints.get(edgeId);
      if (!pts || pts.length < 2) continue;
      for (const idx of (end === "source" ? [0, 1] : [pts.length - 1, pts.length - 2])) {
        pts[idx][axis] = center + (pts[idx][axis] - center) * ratio;
      }
    }
  }
}

// ---- Pin Registry (assigns stable numeric IDs to handle pins) ----

class PinRegistry {
  private nextId = 1;
  /** nodeId:handleId → pinClassId */
  private map = new Map<string, number>();

  getOrCreate(nodeId: string, handleId: string): number {
    const key = `${nodeId}:${handleId}`;
    let id = this.map.get(key);
    if (id == null) { id = this.nextId++; this.map.set(key, id); }
    return id;
  }

  clear() { this.map.clear(); this.nextId = 1; }
}

// ---- Routing helpers ----

function createObstacles(
  router: AvoidRouter,
  nodes: FlowNode[],
  nodeById: Map<string, FlowNode>,
  pinRegistry: PinRegistry
): { shapeRefMap: Map<string, AvoidShapeRef>; shapeRefList: AvoidShapeRef[] } {
  const shapeRefMap = new Map<string, AvoidShapeRef>();
  const shapeRefList: AvoidShapeRef[] = [];
  const obstacleNodes = nodes.filter((n) => n.type !== "group");

  for (const node of obstacleNodes) {
    const b = Geometry.getNodeBoundsAbsolute(node, nodeById);
    const topLeft = new AvoidPoint(b.x, b.y);
    const bottomRight = new AvoidPoint(b.x + b.w, b.y + b.h);
    const rect = new AvoidRectangle(topLeft, bottomRight);
    const shapeRef = new AvoidShapeRef(router as any, rect);
    shapeRefList.push(shapeRef);
    shapeRefMap.set(node.id, shapeRef);

    // Create pins at exact SVG anchor positions for each handle
    const pins = (node._handlePins as HandlePin[] | undefined) ?? [];
    for (const pin of pins) {
      const pinId = pinRegistry.getOrCreate(node.id, pin.handleId);
      const dir = Geometry.sideToDir(pin.side);
      const sp = AvoidShapeConnectionPin.createForShape(
        shapeRef as any, pinId, pin.xPct, pin.yPct, true, 0, dir
      );
      sp.setExclusive(false);
    }
  }

  return { shapeRefMap, shapeRefList };
}

function ensureAutoPin(
  node: FlowNode,
  shapeRef: AvoidShapeRef,
  side: HandlePosition,
  pinRegistry: PinRegistry
): number {
  const autoHandleId = `__auto_${side}`;
  const pinId = pinRegistry.getOrCreate(node.id, autoHandleId);

  // Compute proportional position for center of the given side
  let xPct: number, yPct: number;
  switch (side) {
    case "left":   xPct = 0;   yPct = 0.5; break;
    case "right":  xPct = 1;   yPct = 0.5; break;
    case "top":    xPct = 0.5; yPct = 0;   break;
    case "bottom": xPct = 0.5; yPct = 1;   break;
  }

  const dir = Geometry.sideToDir(side);
  const sp = AvoidShapeConnectionPin.createForShape(
    shapeRef as any, pinId, xPct, yPct, true, 0, dir
  );
  sp.setExclusive(false);
  return pinId;
}

function createConnections(
  router: AvoidRouter,
  edges: FlowEdge[],
  nodeById: Map<string, FlowNode>,
  shapeRefMap: Map<string, AvoidShapeRef>,
  pinRegistry: PinRegistry,
  autoBestSide: boolean
): { edgeId: string; connRef: AvoidConnRef }[] {
  const connRefs: { edgeId: string; connRef: AvoidConnRef }[] = [];
  // Track which auto-pins have already been created: "nodeId:side"
  const createdAutoPins = new Set<string>();

  for (const edge of edges) {
    const src = nodeById.get(edge.source);
    const tgt = nodeById.get(edge.target);
    if (!src || !tgt) continue;

    const srcShapeRef = shapeRefMap.get(edge.source);
    const tgtShapeRef = shapeRefMap.get(edge.target);

    // Determine best sides when handles aren't provided
    const srcBounds = Geometry.getNodeBoundsAbsolute(src, nodeById);
    const tgtBounds = Geometry.getNodeBoundsAbsolute(tgt, nodeById);
    const bestSides = autoBestSide
      ? Geometry.getBestSides(srcBounds, tgtBounds)
      : {
          sourcePos: Geometry.getHandlePosition(src, "source"),
          targetPos: Geometry.getHandlePosition(tgt, "target"),
        };

    // Source end — use explicit handle pin, or create an auto-pin on best side
    let srcEnd: AvoidConnEnd;
    if (srcShapeRef && edge.sourceHandle) {
      const pinId = pinRegistry.getOrCreate(edge.source, edge.sourceHandle);
      srcEnd = AvoidConnEnd.fromShapePin(srcShapeRef as any, pinId);
    } else if (srcShapeRef) {
      const side = bestSides.sourcePos;
      const autoKey = `${edge.source}:${side}`;
      if (!createdAutoPins.has(autoKey)) {
        ensureAutoPin(src, srcShapeRef, side, pinRegistry);
        createdAutoPins.add(autoKey);
      }
      const pinId = pinRegistry.getOrCreate(edge.source, `__auto_${side}`);
      srcEnd = AvoidConnEnd.fromShapePin(srcShapeRef as any, pinId);
    } else {
      const pos = bestSides.sourcePos;
      const pt = Geometry.getHandlePoint(srcBounds, pos);
      srcEnd = AvoidConnEnd.fromPoint(new AvoidPoint(pt.x, pt.y));
    }

    // Target end — use explicit handle pin, or create an auto-pin on best side
    let tgtEnd: AvoidConnEnd;
    if (tgtShapeRef && edge.targetHandle) {
      const pinId = pinRegistry.getOrCreate(edge.target, edge.targetHandle);
      tgtEnd = AvoidConnEnd.fromShapePin(tgtShapeRef as any, pinId);
    } else if (tgtShapeRef) {
      const side = bestSides.targetPos;
      const autoKey = `${edge.target}:${side}`;
      if (!createdAutoPins.has(autoKey)) {
        ensureAutoPin(tgt, tgtShapeRef, side, pinRegistry);
        createdAutoPins.add(autoKey);
      }
      const pinId = pinRegistry.getOrCreate(edge.target, `__auto_${side}`);
      tgtEnd = AvoidConnEnd.fromShapePin(tgtShapeRef as any, pinId);
    } else {
      const pos = bestSides.targetPos;
      const pt = Geometry.getHandlePoint(tgtBounds, pos);
      tgtEnd = AvoidConnEnd.fromPoint(new AvoidPoint(pt.x, pt.y));
    }

    const connRef = new AvoidConnRef(router as any, srcEnd, tgtEnd);
    connRef.setRoutingType(ConnType_Orthogonal);
    connRefs.push({ edgeId: edge.id, connRef });
  }

  return connRefs;
}

// ---- Routing Engine ----

export class RoutingEngine {
  static routeAll(
    nodes: FlowNode[],
    edges: FlowEdge[],
    options?: AvoidRouterOptions
  ): Record<string, AvoidRoute> {
    const shapeBuffer = options?.shapeBufferDistance ?? 8;
    const idealNudging = options?.idealNudgingDistance ?? 10;
    const handleNudging = options?.handleNudgingDistance ?? idealNudging;
    const cornerRadius = options?.edgeRounding ?? 0;
    const gridSize = options?.diagramGridSize ?? 0;
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const pinRegistry = new PinRegistry();

    const router = createRouter(OrthogonalRouting);
    router.setRoutingParameter(shapeBufferDistanceParam, shapeBuffer);
    router.setRoutingParameter(idealNudgingDistanceParam, idealNudging);
    router.setRoutingOption(nudgeOrthogonalSegmentsConnectedToShapesOpt, true);
    router.setRoutingOption(nudgeSharedPathsWithCommonEndPointOpt, true);
    router.setRoutingOption(performUnifyingNudgingPreprocessingStepOpt, true);

    const autoBestSide = options?.autoBestSideConnection ?? true;
    const { shapeRefMap, shapeRefList } = createObstacles(router, nodes, nodeById, pinRegistry);
    const connRefs = createConnections(router, edges, nodeById, shapeRefMap, pinRegistry, autoBestSide);

    const result: Record<string, AvoidRoute> = {};
    try { router.processTransaction(); } catch { RoutingEngine.cleanup(router, connRefs, shapeRefList); return result; }

    const edgePoints = RoutingEngine.extractRoutePoints(connRefs);
    if (handleNudging !== idealNudging && edgePoints.size > 0) {
      HandleSpacing.adjust(edges, edgePoints, handleNudging, idealNudging);
    }
    for (const [edgeId, points] of edgePoints) {
      const path = PathBuilder.polylineToPath(points.length, (i) => points[i], { gridSize: gridSize || undefined, cornerRadius });
      const mid = Math.floor(points.length / 2);
      const midP = points[mid];
      const labelP = gridSize > 0 ? Geometry.snapToGrid(midP.x, midP.y, gridSize) : midP;
      const first = points[0];
      const last = points[points.length - 1];
      result[edgeId] = { path, labelX: labelP.x, labelY: labelP.y, sourceX: first.x, sourceY: first.y, targetX: last.x, targetY: last.y };
    }

    RoutingEngine.cleanup(router, connRefs, shapeRefList);
    return result;
  }

  static extractRoutePoints(connRefs: { edgeId: string; connRef: AvoidConnRef }[]): Map<string, { x: number; y: number }[]> {
    const edgePoints = new Map<string, { x: number; y: number }[]>();
    for (const { edgeId, connRef } of connRefs) {
      try {
        const route = connRef.displayRoute();
        const size = route.size();
        if (size < 2) continue;
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < size; i++) { const p = route.at(i); points.push({ x: p.x, y: p.y }); }
        edgePoints.set(edgeId, points);
      } catch { /* skip */ }
    }
    return edgePoints;
  }

  static cleanup(
    router: AvoidRouter,
    connRefs: { connRef: AvoidConnRef }[],
    shapeRefs: AvoidShapeRef[]
  ) {
    try {
      for (const { connRef } of connRefs) router.deleteConnector(connRef as any);
      for (const ref of shapeRefs) router.deleteShape(ref);
    } catch { /* ignore */ }
  }
}

// ---- Persistent Router ----

export class PersistentRouter {
  private router: AvoidRouter | null = null;
  private shapeRefMap = new Map<string, AvoidShapeRef>();
  private shapeRefList: AvoidShapeRef[] = [];
  private connRefList: { edgeId: string; connRef: AvoidConnRef }[] = [];
  private prevNodes: FlowNode[] = [];
  private prevEdges: FlowEdge[] = [];
  private prevOptions: AvoidRouterOptions = {};
  private nodeById = new Map<string, FlowNode>();
  private pinRegistry = new PinRegistry();

  reset(nodes: FlowNode[], edges: FlowEdge[], options?: AvoidRouterOptions): Record<string, AvoidRoute> {
    this.prevNodes = nodes;
    this.prevEdges = edges;
    if (options) this.prevOptions = options;
    this.nodeById = new Map(nodes.map((n) => [n.id, n]));
    return this.buildRouter();
  }

  updateNodes(updatedNodes: FlowNode[]): Record<string, AvoidRoute> {
    if (!this.router) {
      for (const updated of updatedNodes) this.upsertNode(updated);
      this.nodeById = new Map(this.prevNodes.map((n) => [n.id, n]));
      return this.buildRouter();
    }
    for (const updated of updatedNodes) {
      this.upsertNode(updated);
      const shapeRef = this.shapeRefMap.get(updated.id);
      if (shapeRef && updated.position) {
        const b = Geometry.getNodeBoundsAbsolute(this.nodeById.get(updated.id)!, this.nodeById);
        const topLeft = new AvoidPoint(b.x, b.y);
        const bottomRight = new AvoidPoint(b.x + b.w, b.y + b.h);
        this.router.moveShape(shapeRef, new AvoidRectangle(topLeft, bottomRight));
      }
    }
    try { this.router.processTransaction(); }
    catch { return this.reset(this.prevNodes, this.prevEdges, this.prevOptions); }
    return this.readRoutes();
  }

  destroy(): void {
    if (this.router) {
      RoutingEngine.cleanup(this.router, this.connRefList, this.shapeRefList);
      this.router = null;
    }
    this.shapeRefMap.clear();
    this.shapeRefList = [];
    this.connRefList = [];
    this.pinRegistry.clear();
  }

  private upsertNode(updated: FlowNode) {
    const existing = this.nodeById.get(updated.id);
    if (existing) {
      const merged = { ...existing, ...updated };
      const i = this.prevNodes.indexOf(existing);
      if (i >= 0) this.prevNodes[i] = merged;
      this.nodeById.set(updated.id, merged);
    } else {
      this.prevNodes.push(updated);
      this.nodeById.set(updated.id, updated);
    }
  }

  private buildRouter(): Record<string, AvoidRoute> {
    const opts = this.prevOptions;
    const shapeBuffer = opts.shapeBufferDistance ?? 8;
    const idealNudging = opts.idealNudgingDistance ?? 10;

    // Clean up previous
    if (this.router) {
      try {
        RoutingEngine.cleanup(this.router, this.connRefList, this.shapeRefList);
      } catch { /* ok */ }
    }

    this.pinRegistry.clear();
    this.router = createRouter(OrthogonalRouting);
    this.router.setRoutingParameter(shapeBufferDistanceParam, shapeBuffer);
    this.router.setRoutingParameter(idealNudgingDistanceParam, idealNudging);
    this.router.setRoutingOption(nudgeOrthogonalSegmentsConnectedToShapesOpt, true);
    this.router.setRoutingOption(nudgeSharedPathsWithCommonEndPointOpt, true);
    this.router.setRoutingOption(performUnifyingNudgingPreprocessingStepOpt, true);

    const result = createObstacles(this.router, this.prevNodes, this.nodeById, this.pinRegistry);
    this.shapeRefMap = result.shapeRefMap;
    this.shapeRefList = result.shapeRefList;
    const autoBestSide = opts.autoBestSideConnection ?? true;
    this.connRefList = createConnections(this.router, this.prevEdges, this.nodeById, this.shapeRefMap, this.pinRegistry, autoBestSide);

    try { this.router.processTransaction(); }
    catch { this.destroy(); return {}; }

    return this.readRoutes();
  }

  private readRoutes(): Record<string, AvoidRoute> {
    const opts = this.prevOptions;
    const idealNudging = opts.idealNudgingDistance ?? 10;
    const handleNudging = opts.handleNudgingDistance ?? idealNudging;
    const cornerRadius = opts.edgeRounding ?? 0;
    const gridSize = opts.diagramGridSize ?? 0;
    const result: Record<string, AvoidRoute> = {};

    const edgePoints = RoutingEngine.extractRoutePoints(this.connRefList);
    if (handleNudging !== idealNudging && edgePoints.size > 0) {
      HandleSpacing.adjust(this.prevEdges, edgePoints, handleNudging, idealNudging);
    }
    for (const [edgeId, points] of edgePoints) {
      const path = PathBuilder.polylineToPath(points.length, (i) => points[i], { gridSize: gridSize || undefined, cornerRadius });
      const mid = Math.floor(points.length / 2);
      const midP = points[mid];
      const labelP = gridSize > 0 ? Geometry.snapToGrid(midP.x, midP.y, gridSize) : midP;
      const first = points[0];
      const last = points[points.length - 1];
      result[edgeId] = { path, labelX: labelP.x, labelY: labelP.y, sourceX: first.x, sourceY: first.y, targetX: last.x, targetY: last.y };
    }
    return result;
  }
}

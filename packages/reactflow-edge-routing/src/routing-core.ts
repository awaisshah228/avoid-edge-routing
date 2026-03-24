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
  Checkpoint as AvoidCheckpoint,
  ConnectorCrossings,
  AStarPath,
  OrthogonalRouting,
  PolyLineRouting,
  ConnType_Orthogonal,
  ConnType_PolyLine,
  ConnDirUp,
  ConnDirDown,
  ConnDirLeft,
  ConnDirRight,
  // Routing parameters (all 9 from libavoid C++)
  segmentPenalty as segmentPenaltyParam,
  anglePenalty as anglePenaltyParam,
  crossingPenalty as crossingPenaltyParam,
  clusterCrossingPenalty as clusterCrossingPenaltyParam,
  fixedSharedPathPenalty as fixedSharedPathPenaltyParam,
  portDirectionPenalty as portDirectionPenaltyParam,
  shapeBufferDistance as shapeBufferDistanceParam,
  idealNudgingDistance as idealNudgingDistanceParam,
  reverseDirectionPenalty as reverseDirectionPenaltyParam,
  // Routing options (all 7 from libavoid C++)
  nudgeOrthogonalSegmentsConnectedToShapes as nudgeOrthogonalSegmentsConnectedToShapesOpt,
  nudgeSharedPathsWithCommonEndPoint as nudgeSharedPathsWithCommonEndPointOpt,
  performUnifyingNudgingPreprocessingStep as performUnifyingNudgingPreprocessingStepOpt,
  nudgeOrthogonalTouchingColinearSegments as nudgeOrthogonalTouchingColinearSegmentsOpt,
  improveHyperedgeRoutesMovingJunctions as improveHyperedgeRoutesMovingJunctionsOpt,
  penaliseOrthogonalSharedPathsAtConnEnds as penaliseOrthogonalSharedPathsAtConnEndsOpt,
  improveHyperedgeRoutesMovingAddingAndDeletingJunctions as improveHyperedgeRoutesMovingAddingAndDeletingJunctionsOpt,
  generateStaticOrthogonalVisGraph,
  improveOrthogonalRoutes,
  vertexVisibility,
} from "obstacle-router";

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

export type ConnectorType = "orthogonal" | "polyline" | "bezier";

export type AvoidRouterOptions = {
  // --- libavoid routing parameters (numeric penalties/distances) ---
  /** Distance buffer added around shapes when routing. Default: 8 */
  shapeBufferDistance?: number;
  /** Ideal distance for nudging apart overlapping segments. Default: 10 */
  idealNudgingDistance?: number;
  /** Penalty for each segment beyond the first. MUST be >0 for nudging to work. Default: 10 */
  segmentPenalty?: number;
  /** Penalty for tight bends (polyline routing). Default: 0 */
  anglePenalty?: number;
  /** Penalty for crossing other connectors. EXPERIMENTAL. Default: 0 */
  crossingPenalty?: number;
  /** Penalty for crossing cluster boundaries. EXPERIMENTAL. Default: 0 */
  clusterCrossingPenalty?: number;
  /** Penalty for shared paths with fixed connectors. EXPERIMENTAL. Default: 0 */
  fixedSharedPathPenalty?: number;
  /** Penalty for port selection when other end isn't in visibility cone. EXPERIMENTAL. Default: 0 */
  portDirectionPenalty?: number;
  /** Penalty when connector travels opposite direction from destination. Default: 0 */
  reverseDirectionPenalty?: number;

  // --- libavoid routing options (boolean flags) ---
  /** Nudge final segments attached to shapes. Default: true */
  nudgeOrthogonalSegmentsConnectedToShapes?: boolean;
  /** Nudge intermediate segments at common endpoints. Default: true */
  nudgeSharedPathsWithCommonEndPoint?: boolean;
  /** Unify and center segments before nudging (better quality, slower). Default: true */
  performUnifyingNudgingPreprocessingStep?: boolean;
  /** Nudge colinear segments touching at ends apart. Default: false */
  nudgeOrthogonalTouchingColinearSegments?: boolean;
  /** Improve hyperedge routes by moving junctions. Default: true */
  improveHyperedgeRoutesMovingJunctions?: boolean;
  /** Penalize shared orthogonal paths at common junctions/pins. EXPERIMENTAL. Default: false */
  penaliseOrthogonalSharedPathsAtConnEnds?: boolean;
  /** Improve hyperedges by adding/removing junctions. Default: false */
  improveHyperedgeRoutesMovingAddingAndDeletingJunctions?: boolean;

  // --- Connector settings ---
  /** Connector routing type: "orthogonal" (default), "polyline", or "bezier". */
  connectorType?: ConnectorType;
  /** If true, connectors try to avoid crossings (longer paths). Default: false */
  hateCrossings?: boolean;
  /** Inside offset (px) for pins — pushes connector start inside shape boundary. Default: 0 */
  pinInsideOffset?: number;

  // --- Custom post-processing options ---
  /** Spacing (px) between edges at shared handles. Default: same as idealNudgingDistance */
  handleNudgingDistance?: number;
  /** Corner radius for orthogonal path rendering. Default: 0 */
  edgeRounding?: number;
  /** Snap waypoints to grid. Default: 0 (no grid) */
  diagramGridSize?: number;
  /** When true, edges spread out along the node border near handles (pin-based). When false, edges converge to exact handle point. Default: true */
  shouldSplitEdgesNearHandle?: boolean;
  /** Auto-select best connection side based on relative node positions. Default: true */
  autoBestSideConnection?: boolean;
  /** Debounce delay for routing updates (ms). Default: 0 */
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
  /** Optional connection cost for this pin. Lower cost pins are preferred. */
  cost?: number;
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
  /** Optional checkpoints (waypoints) the edge must pass through */
  checkpoints?: { x: number; y: number }[];
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

/** Get the libavoid ConnType for a connector type string. */
function getConnType(connectorType: ConnectorType | undefined): number {
  switch (connectorType) {
    case "polyline": return ConnType_PolyLine;
    case "orthogonal":
    case "bezier": // bezier uses orthogonal routing, then post-processes to curves
    default: return ConnType_Orthogonal;
  }
}

/** Get the Router flags for the connector type. */
function getRouterFlags(connectorType: ConnectorType | undefined): number {
  switch (connectorType) {
    case "polyline": return PolyLineRouting | OrthogonalRouting;
    default: return OrthogonalRouting;
  }
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

  /**
   * Pre-compute group bounds from children.
   * For groups with expandParent or small initial size, compute the actual
   * bounding box from children positions + sizes and update the group's
   * style.width/height so the router sees correct dimensions.
   */
  static computeGroupBounds(nodes: FlowNode[], padding = 20): FlowNode[] {
    const childrenByParent = new Map<string, FlowNode[]>();
    for (const node of nodes) {
      if (node.parentId) {
        if (!childrenByParent.has(node.parentId)) childrenByParent.set(node.parentId, []);
        childrenByParent.get(node.parentId)!.push(node);
      }
    }

    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const computedSizes = new Map<string, { width: number; height: number }>();

    // Bottom-up: compute sizes for deepest groups first
    function computeSize(groupId: string): { width: number; height: number } {
      const cached = computedSizes.get(groupId);
      if (cached) return cached;

      const children = childrenByParent.get(groupId) ?? [];
      if (children.length === 0) {
        const node = nodeById.get(groupId);
        return node ? { width: Geometry.getNodeBounds(node).w, height: Geometry.getNodeBounds(node).h } : { width: 150, height: 50 };
      }

      let maxRight = 0;
      let maxBottom = 0;

      for (const child of children) {
        // Recursively compute if child is also a group
        if (child.type === "group" && childrenByParent.has(child.id)) {
          const childSize = computeSize(child.id);
          computedSizes.set(child.id, childSize);
        }
        const childBounds = Geometry.getNodeBounds(child);
        const childSize = computedSizes.get(child.id);
        const w = childSize?.width ?? childBounds.w;
        const h = childSize?.height ?? childBounds.h;
        maxRight = Math.max(maxRight, childBounds.x + w);
        maxBottom = Math.max(maxBottom, childBounds.y + h);
      }

      const size = {
        width: maxRight + padding,
        height: maxBottom + padding,
      };
      computedSizes.set(groupId, size);
      return size;
    }

    // Compute all groups
    for (const node of nodes) {
      if (node.type === "group" && childrenByParent.has(node.id)) {
        computeSize(node.id);
      }
    }

    // Apply computed sizes to group nodes
    if (computedSizes.size === 0) return nodes;

    return nodes.map((node) => {
      const size = computedSizes.get(node.id);
      if (!size) return node;
      const currentBounds = Geometry.getNodeBounds(node);
      // Only override if computed is larger than current
      if (size.width > currentBounds.w || size.height > currentBounds.h) {
        return {
          ...node,
          style: {
            ...((node.style ?? {}) as Record<string, unknown>),
            width: Math.max(size.width, currentBounds.w),
            height: Math.max(size.height, currentBounds.h),
          },
        };
      }
      return node;
    });
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

  /**
   * Convert routed waypoints directly to an SVG path string.
   * No modifications — just M + L. libavoid already computed the correct positions.
   */
  static pointsToSvgPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }

  /**
   * Convert routed waypoints to a smooth bezier spline.
   *
   * Takes the orthogonal waypoints from libavoid, keeps only corners
   * (where direction changes), then draws a smooth cubic bezier spline
   * through them. The result is a flowing curve — not orthogonal at all —
   * that still follows the obstacle-avoiding route.
   */
  static routedBezierPath(
    points: { x: number; y: number }[],
    options: { gridSize?: number } = {}
  ): string {
    if (points.length < 2) return "";
    const gridSize = options.gridSize ?? 0;
    const snap = (p: { x: number; y: number }) =>
      gridSize > 0 ? Geometry.snapToGrid(p.x, p.y, gridSize) : p;

    const raw = points.map(snap);

    // Deduplicate
    const deduped: { x: number; y: number }[] = [raw[0]];
    for (let i = 1; i < raw.length; i++) {
      const prev = deduped[deduped.length - 1];
      if (Math.abs(raw[i].x - prev.x) > 0.5 || Math.abs(raw[i].y - prev.y) > 0.5) {
        deduped.push(raw[i]);
      }
    }

    // Remove collinear midpoints — keep only corners + endpoints
    const pts: { x: number; y: number }[] = [deduped[0]];
    for (let i = 1; i < deduped.length - 1; i++) {
      const prev = deduped[i - 1];
      const curr = deduped[i];
      const next = deduped[i + 1];
      const sameX = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;
      const sameY = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
      if (!sameX || !sameY) pts.push(curr);
    }
    pts.push(deduped[deduped.length - 1]);

    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;

    // 2 points: simple bezier with offset control points
    if (pts.length === 2) {
      const [s, t] = pts;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const offset = Math.max(50, Math.max(Math.abs(dx), Math.abs(dy)) * 0.5);
      if (Math.abs(dx) >= Math.abs(dy)) {
        const sign = dx >= 0 ? 1 : -1;
        return `M ${s.x} ${s.y} C ${s.x + offset * sign} ${s.y}, ${t.x - offset * sign} ${t.y}, ${t.x} ${t.y}`;
      }
      const sign = dy >= 0 ? 1 : -1;
      return `M ${s.x} ${s.y} C ${s.x} ${s.y + offset * sign}, ${t.x} ${t.y - offset * sign}, ${t.x} ${t.y}`;
    }

    // 3+ points: smooth cubic bezier spline through all corner points.
    // For each segment i→i+1, compute tangent-based control points using
    // neighbors (Catmull-Rom style, tension 0.3).
    const tension = 0.3;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(b.x - a.x, b.y - a.y);

    let d = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const segLen = dist(p1, p2);

      // Tangent at p1: direction from p0 to p2
      let cp1x = p1.x + (p2.x - p0.x) * tension;
      let cp1y = p1.y + (p2.y - p0.y) * tension;
      // Tangent at p2: direction from p1 to p3
      let cp2x = p2.x - (p3.x - p1.x) * tension;
      let cp2y = p2.y - (p3.y - p1.y) * tension;

      // Clamp control points — don't extend past 40% of segment length
      const maxReach = segLen * 0.4;
      const cp1d = dist(p1, { x: cp1x, y: cp1y });
      if (cp1d > maxReach && cp1d > 0) {
        const s = maxReach / cp1d;
        cp1x = p1.x + (cp1x - p1.x) * s;
        cp1y = p1.y + (cp1y - p1.y) * s;
      }
      const cp2d = dist(p2, { x: cp2x, y: cp2y });
      if (cp2d > maxReach && cp2d > 0) {
        const s = maxReach / cp2d;
        cp2x = p2.x + (cp2x - p2.x) * s;
        cp2y = p2.y + (cp2y - p2.y) * s;
      }

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

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
    const values = positions.map((p) => p.pt[axis]);
    const center = values.reduce((a, b) => a + b, 0) / values.length;
    const spread = Math.max(...values) - Math.min(...values);

    if (spread > 0.5) {
      for (const edgeId of edgeIds) {
        const pts = edgePoints.get(edgeId);
        if (!pts || pts.length < 2) continue;
        for (const idx of (end === "source" ? [0, 1] : [pts.length - 1, pts.length - 2])) {
          pts[idx][axis] = center + (pts[idx][axis] - center) * ratio;
        }
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

// ---- Router configuration ----

function configureRouter(router: AvoidRouter, options: AvoidRouterOptions): void {
  // --- Routing parameters ---
  router.setRoutingParameter(shapeBufferDistanceParam, options.shapeBufferDistance ?? 8);
  router.setRoutingParameter(idealNudgingDistanceParam, options.idealNudgingDistance ?? 10);
  // segmentPenalty MUST be >0 for orthogonal nudging to work (libavoid C++ docs)
  router.setRoutingParameter(segmentPenaltyParam, options.segmentPenalty ?? 10);
  if (options.anglePenalty != null && options.anglePenalty > 0) {
    router.setRoutingParameter(anglePenaltyParam, options.anglePenalty);
  }
  if (options.crossingPenalty != null && options.crossingPenalty > 0) {
    router.setRoutingParameter(crossingPenaltyParam, options.crossingPenalty);
  }
  if (options.clusterCrossingPenalty != null && options.clusterCrossingPenalty > 0) {
    router.setRoutingParameter(clusterCrossingPenaltyParam, options.clusterCrossingPenalty);
  }
  if (options.fixedSharedPathPenalty != null && options.fixedSharedPathPenalty > 0) {
    router.setRoutingParameter(fixedSharedPathPenaltyParam, options.fixedSharedPathPenalty);
  }
  if (options.portDirectionPenalty != null && options.portDirectionPenalty > 0) {
    router.setRoutingParameter(portDirectionPenaltyParam, options.portDirectionPenalty);
  }
  if (options.reverseDirectionPenalty != null && options.reverseDirectionPenalty > 0) {
    router.setRoutingParameter(reverseDirectionPenaltyParam, options.reverseDirectionPenalty);
  }

  // --- Routing options ---
  const splitNearHandle = options.shouldSplitEdgesNearHandle ?? true;
  // When splitNearHandle is off, disable nudging at shapes so edges converge to exact handle point
  router.setRoutingOption(nudgeOrthogonalSegmentsConnectedToShapesOpt, splitNearHandle ? (options.nudgeOrthogonalSegmentsConnectedToShapes ?? true) : false);
  router.setRoutingOption(nudgeSharedPathsWithCommonEndPointOpt, splitNearHandle ? (options.nudgeSharedPathsWithCommonEndPoint ?? true) : false);
  router.setRoutingOption(performUnifyingNudgingPreprocessingStepOpt, options.performUnifyingNudgingPreprocessingStep ?? true);
  router.setRoutingOption(nudgeOrthogonalTouchingColinearSegmentsOpt, options.nudgeOrthogonalTouchingColinearSegments ?? false);
  router.setRoutingOption(improveHyperedgeRoutesMovingJunctionsOpt, options.improveHyperedgeRoutesMovingJunctions ?? true);
  router.setRoutingOption(penaliseOrthogonalSharedPathsAtConnEndsOpt, options.penaliseOrthogonalSharedPathsAtConnEnds ?? false);
  router.setRoutingOption(improveHyperedgeRoutesMovingAddingAndDeletingJunctionsOpt, options.improveHyperedgeRoutesMovingAddingAndDeletingJunctions ?? false);
}

// ---- Routing helpers ----

function createObstacles(
  router: AvoidRouter,
  nodes: FlowNode[],
  nodeById: Map<string, FlowNode>,
  pinRegistry: PinRegistry,
  options: AvoidRouterOptions
): { shapeRefMap: Map<string, AvoidShapeRef>; shapeRefList: AvoidShapeRef[] } {
  const shapeRefMap = new Map<string, AvoidShapeRef>();
  const shapeRefList: AvoidShapeRef[] = [];
  const obstacleNodes = nodes.filter((n) => n.type !== "group");
  const insideOffset = options.pinInsideOffset ?? 0;

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
        shapeRef as any, pinId, pin.xPct, pin.yPct, true, insideOffset, dir
      );
      sp.setExclusive(false);
      if (pin.cost != null && pin.cost > 0) {
        sp.setConnectionCost(pin.cost);
      }
    }

    // Pre-create auto pins on all 4 sides sharing the SAME pinClassId.
    // This lets libavoid choose the best side during routing instead of
    // us pre-selecting one side with a naive heuristic.
    const autoId = pinRegistry.getOrCreate(node.id, `__auto_best`);
    const sides: HandlePosition[] = ["top", "bottom", "left", "right"];
    for (const side of sides) {
      let xPct: number, yPct: number;
      switch (side) {
        case "left":   xPct = 0;   yPct = 0.5; break;
        case "right":  xPct = 1;   yPct = 0.5; break;
        case "top":    xPct = 0.5; yPct = 0;   break;
        case "bottom": xPct = 0.5; yPct = 1;   break;
      }
      const dir = Geometry.sideToDir(side);
      const autoSp = AvoidShapeConnectionPin.createForShape(
        shapeRef as any, autoId, xPct, yPct, true, insideOffset, dir
      );
      autoSp.setExclusive(false);
    }
  }

  return { shapeRefMap, shapeRefList };
}


/**
 * Find the first enriched pin matching a handle type (source/target).
 * Used when edge.sourceHandle/targetHandle is null (default handles).
 */
function findDefaultHandle(node: FlowNode, kind: "source" | "target"): string | null {
  const pins = (node._handlePins as HandlePin[] | undefined) ?? [];
  // Enriched pins from default handles are named __source_N or __target_N
  const prefix = `__${kind}_`;
  const pin = pins.find((p) => p.handleId.startsWith(prefix));
  return pin?.handleId ?? null;
}


/** Offset a point away from the node border by stubLength in the direction of the side */
function offsetFromSide(pt: { x: number; y: number }, side: HandlePosition, stubLength: number): { x: number; y: number } {
  switch (side) {
    case "left": return { x: pt.x - stubLength, y: pt.y };
    case "right": return { x: pt.x + stubLength, y: pt.y };
    case "top": return { x: pt.x, y: pt.y - stubLength };
    case "bottom": return { x: pt.x, y: pt.y + stubLength };
  }
}

/** Info needed to add stubs after routing when splitNearHandle is off */
type StubInfo = {
  edgeId: string;
  srcHandlePt: { x: number; y: number };
  tgtHandlePt: { x: number; y: number };
};

function createConnections(
  router: AvoidRouter,
  edges: FlowEdge[],
  nodeById: Map<string, FlowNode>,
  shapeRefMap: Map<string, AvoidShapeRef>,
  pinRegistry: PinRegistry,
  options: AvoidRouterOptions
): { connRefs: { edgeId: string; connRef: AvoidConnRef }[]; stubs: StubInfo[] } {
  const connRefs: { edgeId: string; connRef: AvoidConnRef }[] = [];
  const stubs: StubInfo[] = [];
  const autoBestSide = options.autoBestSideConnection ?? true;
  const splitNearHandle = options.shouldSplitEdgesNearHandle ?? true;
  const stubLength = options.shapeBufferDistance ?? 8;
  const connType = getConnType(options.connectorType);
  const hateCrossings = options.hateCrossings ?? false;

  for (const edge of edges) {
    const src = nodeById.get(edge.source);
    const tgt = nodeById.get(edge.target);
    if (!src || !tgt) continue;

    const srcShapeRef = shapeRefMap.get(edge.source);
    const tgtShapeRef = shapeRefMap.get(edge.target);

    const srcBounds = Geometry.getNodeBoundsAbsolute(src, nodeById);
    const tgtBounds = Geometry.getNodeBoundsAbsolute(tgt, nodeById);

    let srcEnd: AvoidConnEnd;
    let tgtEnd: AvoidConnEnd;

    if (splitNearHandle) {
      // Pin-based: edges spread out along the node border near handles
      const srcHandle = edge.sourceHandle ?? (autoBestSide ? null : findDefaultHandle(src, "source"));
      if (srcShapeRef && srcHandle) {
        const pinId = pinRegistry.getOrCreate(edge.source, srcHandle);
        srcEnd = AvoidConnEnd.fromShapePin(srcShapeRef as any, pinId);
      } else if (srcShapeRef) {
        srcEnd = AvoidConnEnd.fromShapePin(srcShapeRef as any, pinRegistry.getOrCreate(edge.source, `__auto_best`));
      } else {
        const side = autoBestSide ? Geometry.getBestSides(srcBounds, tgtBounds).sourcePos : Geometry.getHandlePosition(src, "source");
        srcEnd = (() => { const pt = Geometry.getHandlePoint(srcBounds, side); return AvoidConnEnd.fromPoint(new AvoidPoint(pt.x, pt.y)); })();
      }

      const tgtHandle = edge.targetHandle ?? (autoBestSide ? null : findDefaultHandle(tgt, "target"));
      if (tgtShapeRef && tgtHandle) {
        const pinId = pinRegistry.getOrCreate(edge.target, tgtHandle);
        tgtEnd = AvoidConnEnd.fromShapePin(tgtShapeRef as any, pinId);
      } else if (tgtShapeRef) {
        tgtEnd = AvoidConnEnd.fromShapePin(tgtShapeRef as any, pinRegistry.getOrCreate(edge.target, `__auto_best`));
      } else {
        const side = autoBestSide ? Geometry.getBestSides(srcBounds, tgtBounds).targetPos : Geometry.getHandlePosition(tgt, "target");
        tgtEnd = (() => { const pt = Geometry.getHandlePoint(tgtBounds, side); return AvoidConnEnd.fromPoint(new AvoidPoint(pt.x, pt.y)); })();
      }
    } else {
      // Point-based with stubs: all edges from the same side converge to center of side,
      // then route from a stub point offset outward
      const srcSide = autoBestSide ? Geometry.getBestSides(srcBounds, tgtBounds).sourcePos : Geometry.getHandlePosition(src, "source");
      const tgtSide = autoBestSide ? Geometry.getBestSides(srcBounds, tgtBounds).targetPos : Geometry.getHandlePosition(tgt, "target");

      // Use center of the side (ignore individual handle positions)
      const srcHandlePt = Geometry.getHandlePoint(srcBounds, srcSide);
      const tgtHandlePt = Geometry.getHandlePoint(tgtBounds, tgtSide);

      // Route from stub endpoints (offset from center of side)
      const srcStubPt = offsetFromSide(srcHandlePt, srcSide, stubLength);
      const tgtStubPt = offsetFromSide(tgtHandlePt, tgtSide, stubLength);

      srcEnd = AvoidConnEnd.fromPoint(new AvoidPoint(srcStubPt.x, srcStubPt.y));
      tgtEnd = AvoidConnEnd.fromPoint(new AvoidPoint(tgtStubPt.x, tgtStubPt.y));

      stubs.push({ edgeId: edge.id, srcHandlePt, tgtHandlePt });
    }

    const connRef = new AvoidConnRef(router as any, srcEnd, tgtEnd);
    connRef.setRoutingType(connType);

    if (hateCrossings) {
      connRef.setHateCrossings(true);
    }

    // Set checkpoints if provided
    if (edge.checkpoints && edge.checkpoints.length > 0) {
      const checkpoints = edge.checkpoints.map(
        (cp) => new AvoidCheckpoint(new AvoidPoint(cp.x, cp.y))
      );
      connRef.setRoutingCheckpoints(checkpoints);
    }

    connRefs.push({ edgeId: edge.id, connRef });
  }

  return { connRefs, stubs };
}

// ---- Routing Engine ----

export class RoutingEngine {
  static routeAll(
    rawNodes: FlowNode[],
    edges: FlowEdge[],
    options?: AvoidRouterOptions
  ): Record<string, AvoidRoute> {
    const opts = options ?? {};
    const gridSize = opts.diagramGridSize ?? 0;
    // Pre-compute group bounds so groups with expandParent have correct sizes
    const nodes = Geometry.computeGroupBounds(rawNodes);
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const pinRegistry = new PinRegistry();

    const routerFlags = getRouterFlags(opts.connectorType);
    const router = createRouter(routerFlags);
    configureRouter(router, opts);

    const { shapeRefMap, shapeRefList } = createObstacles(router, nodes, nodeById, pinRegistry, opts);
    const { connRefs, stubs } = createConnections(router, edges, nodeById, shapeRefMap, pinRegistry, opts);

    const result: Record<string, AvoidRoute> = {};
    try { router.processTransaction(); } catch (e) { console.error("[edge-routing] processTransaction failed:", e); RoutingEngine.cleanup(router, connRefs, shapeRefList); return result; }

    // Read routed points directly from libavoid
    const edgePoints = RoutingEngine.extractRoutePoints(connRefs);

    // Prepend/append stub handle points for non-split mode
    const stubMap = new Map(stubs.map((s) => [s.edgeId, s]));
    for (const [edgeId, points] of edgePoints) {
      const stub = stubMap.get(edgeId);
      if (stub) {
        points.unshift(stub.srcHandlePt);
        points.push(stub.tgtHandlePt);
      }
    }

    // Adjust spacing at shared handles (fan-out effect) — skip when splitNearHandle is off
    const splitNearHandle = opts.shouldSplitEdgesNearHandle ?? true;
    if (splitNearHandle) {
      const idealNudging = opts.idealNudgingDistance ?? 10;
      const handleNudging = opts.handleNudgingDistance ?? idealNudging;
      if (handleNudging !== idealNudging && edgePoints.size > 0) {
        HandleSpacing.adjust(edges, edgePoints, handleNudging, idealNudging);
      }
    }

    const connType = opts.connectorType ?? "orthogonal";
    for (const [edgeId, points] of edgePoints) {
      const edgeRounding = opts.edgeRounding ?? 0;
      const path = connType === "bezier"
        ? PathBuilder.routedBezierPath(points)
        : edgeRounding > 0
          ? PathBuilder.polylineToPath(points.length, (i) => points[i], { cornerRadius: edgeRounding })
          : PathBuilder.pointsToSvgPath(points);
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
  private stubList: StubInfo[] = [];
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

    // Pre-compute group bounds so groups with expandParent have correct sizes
    this.prevNodes = Geometry.computeGroupBounds(this.prevNodes);
    this.nodeById = new Map(this.prevNodes.map((n) => [n.id, n]));

    // Clean up previous
    if (this.router) {
      try { RoutingEngine.cleanup(this.router, this.connRefList, this.shapeRefList); } catch { /* ok */ }
    }

    this.pinRegistry.clear();
    const routerFlags = getRouterFlags(opts.connectorType);
    this.router = createRouter(routerFlags);
    configureRouter(this.router, opts);

    const result = createObstacles(this.router, this.prevNodes, this.nodeById, this.pinRegistry, opts);
    this.shapeRefMap = result.shapeRefMap;
    this.shapeRefList = result.shapeRefList;
    const conn = createConnections(this.router, this.prevEdges, this.nodeById, this.shapeRefMap, this.pinRegistry, opts);
    this.connRefList = conn.connRefs;
    this.stubList = conn.stubs;

    try { this.router.processTransaction(); }
    catch { this.destroy(); return {}; }

    return this.readRoutes();
  }

  private readRoutes(): Record<string, AvoidRoute> {
    const opts = this.prevOptions;
    const idealNudging = opts.idealNudgingDistance ?? 10;
    const handleNudging = opts.handleNudgingDistance ?? idealNudging;
    const gridSize = opts.diagramGridSize ?? 0;
    const result: Record<string, AvoidRoute> = {};

    // Read routed points directly from libavoid
    const edgePoints = RoutingEngine.extractRoutePoints(this.connRefList);

    // Prepend/append stub handle points for non-split mode
    const stubMap = new Map(this.stubList.map((s) => [s.edgeId, s]));
    for (const [edgeId, points] of edgePoints) {
      const stub = stubMap.get(edgeId);
      if (stub) {
        points.unshift(stub.srcHandlePt);
        points.push(stub.tgtHandlePt);
      }
    }

    // Adjust spacing at shared handles (fan-out effect) — skip when splitNearHandle is off
    const splitNearHandle = opts.shouldSplitEdgesNearHandle ?? true;
    if (splitNearHandle && handleNudging !== idealNudging && edgePoints.size > 0) {
      HandleSpacing.adjust(this.prevEdges, edgePoints, handleNudging, idealNudging);
    }

    const connType = opts.connectorType ?? "orthogonal";
    for (const [edgeId, points] of edgePoints) {
      const edgeRounding = opts.edgeRounding ?? 0;
      const path = connType === "bezier"
        ? PathBuilder.routedBezierPath(points)
        : edgeRounding > 0
          ? PathBuilder.polylineToPath(points.length, (i) => points[i], { cornerRadius: edgeRounding })
          : PathBuilder.pointsToSvgPath(points);


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

/**
 * Core edge routing engine using libavoid-js (pure TypeScript).
 *
 * Pins are placed at exact SVG-computed anchor positions per handle.
 * Edges use pin-based ConnEnd(shapeRef, pinId) so libavoid knows which
 * shape an edge belongs to and won't route through it.
 */

import { getBezierPath, getSmoothStepPath, getStraightPath, Position } from "@xyflow/system";

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
  /** Raw routed waypoints (including handle stubs). Use slice(1,-1) for editable edge control points. */
  points?: { x: number; y: number }[];
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
  /** Length (px) of the stub exit segment from the node border. Default: 20 */
  stubSize?: number;
  /** When true, each edge gets its own stub spread laterally by handleSpacing (fan-out at handle). When false, all edges share one stub exit point and libavoid routes them apart after. Default: true */
  shouldSplitEdgesNearHandle?: boolean;
  /** Auto-select best connection side based on relative node positions. Default: true */
  autoBestSideConnection?: boolean;
  /** When true, only route edges whose direct path is blocked by an obstacle. Unblocked edges get a straight line. Default: true */
  routeOnlyWhenBlocked?: boolean;
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
    case "polyline": return PolyLineRouting;
    default: return OrthogonalRouting;
  }
}

// ---- Label Positioning Helpers ----

/** Walk path points and return the point at fraction t (0–1) of total arc length. */
function pointAtFraction(points: { x: number; y: number }[], t: number): { x: number; y: number } {
  if (points.length === 1) return points[0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  const target = total * Math.max(0, Math.min(1, t));
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (walked + segLen >= target) {
      const frac = segLen > 0 ? (target - walked) / segLen : 0;
      return { x: points[i - 1].x + dx * frac, y: points[i - 1].y + dy * frac };
    }
    walked += segLen;
  }
  return points[points.length - 1];
}

/**
 * For each edge that has routed points, compute the fraction t (0–1) along
 * the path where its label should sit. Edges sharing the same source handle
 * are staggered so their labels don't overlap.
 */
function buildLabelFractions(
  edges: FlowEdge[],
  edgePoints: Map<string, { x: number; y: number }[]>
): Map<string, number> {
  const groups = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edgePoints.has(edge.id)) continue;
    const key = `${edge.source}|${edge.sourceHandle ?? ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(edge.id);
  }
  const fractions = new Map<string, number>();
  for (const group of groups.values()) {
    const n = group.length;
    const step = Math.min(0.12, 0.4 / Math.max(1, n - 1));
    for (let i = 0; i < n; i++) {
      fractions.set(group[i], 0.5 + (i - (n - 1) / 2) * step);
    }
  }
  return fractions;
}

/** Derive the React Flow Position (Left/Right/Top/Bottom) from a handle point and its stub point. */
function sideFromStub(
  handlePt: { x: number; y: number },
  stubPt: { x: number; y: number }
): Position {
  const dx = stubPt.x - handlePt.x;
  const dy = stubPt.y - handlePt.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? Position.Right : Position.Left;
  return dy >= 0 ? Position.Bottom : Position.Top;
}

/** Returns true if the segment p1→p2 passes through the rectangle (with optional buffer). Uses slab method. */
function segmentIntersectsRect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  rect: { x: number; y: number; w: number; h: number },
  buffer = 0
): boolean {
  const rx = rect.x - buffer, ry = rect.y - buffer;
  const rw = rect.w + buffer * 2, rh = rect.h + buffer * 2;
  const inside = (p: { x: number; y: number }) => p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh;
  if (inside(p1) || inside(p2)) return true;
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  let tMin = 0, tMax = 1;
  if (Math.abs(dx) < 1e-10) { if (p1.x < rx || p1.x > rx + rw) return false; }
  else { const t1 = (rx - p1.x) / dx, t2 = (rx + rw - p1.x) / dx; tMin = Math.max(tMin, Math.min(t1, t2)); tMax = Math.min(tMax, Math.max(t1, t2)); }
  if (Math.abs(dy) < 1e-10) { if (p1.y < ry || p1.y > ry + rh) return false; }
  else { const t1 = (ry - p1.y) / dy, t2 = (ry + rh - p1.y) / dy; tMin = Math.max(tMin, Math.min(t1, t2)); tMax = Math.min(tMax, Math.max(t1, t2)); }
  return tMin <= tMax;
}

/** Returns true if the direct line from srcPt to tgtPt is blocked by any node except the source/target nodes. */
function isEdgeDirectPathBlocked(
  srcPt: { x: number; y: number },
  tgtPt: { x: number; y: number },
  srcNodeId: string,
  tgtNodeId: string,
  nodes: FlowNode[],
  nodeById: Map<string, FlowNode>,
  buffer: number
): boolean {
  for (const node of nodes) {
    const bounds = Geometry.getNodeBoundsAbsolute(node, nodeById);
    if (node.id === srcNodeId || node.id === tgtNodeId) continue;
    if (segmentIntersectsRect(srcPt, tgtPt, bounds, buffer)) return true;
  }
  return false;
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
   * Convert routed waypoints to a smooth cubic Bezier spline using
   * Catmull-Rom → Bezier conversion with adaptive tension.
   *
   * Steps:
   * 1. Deduplicate and remove collinear intermediate points (keep corners only).
   * 2. For each segment, compute control points from neighboring points.
   * 3. Clamp control-point reach to prevent overshooting / edge crossings.
   * 4. Adapt tension based on segment length — short segments get less curvature.
   */
  static routedBezierPath(
    points: { x: number; y: number }[],
    options: { gridSize?: number; baseTension?: number } = {}
  ): string {
    if (points.length < 2) return "";
    const gridSize = options.gridSize ?? 0;
    const baseTension = options.baseTension ?? 0.2;
    const snap = (p: { x: number; y: number }) =>
      gridSize > 0 ? Geometry.snapToGrid(p.x, p.y, gridSize) : p;

    const raw = points.map(snap);

    // Deduplicate near-identical consecutive points
    const deduped: { x: number; y: number }[] = [raw[0]];
    for (let i = 1; i < raw.length; i++) {
      const prev = deduped[deduped.length - 1];
      if (Math.abs(raw[i].x - prev.x) > 1 || Math.abs(raw[i].y - prev.y) > 1) {
        deduped.push(raw[i]);
      }
    }

    // Remove collinear midpoints — keep only corners + endpoints
    let pts: { x: number; y: number }[];
    if (deduped.length <= 2) {
      pts = deduped;
    } else {
      pts = [deduped[0]];
      for (let i = 1; i < deduped.length - 1; i++) {
        const prev = deduped[i - 1];
        const curr = deduped[i];
        const next = deduped[i + 1];
        const sameX = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;
        const sameY = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
        if (!sameX || !sameY) pts.push(curr);
      }
      pts.push(deduped[deduped.length - 1]);
    }

    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    // 2 points: simple bezier with offset control points scaled to distance
    if (pts.length === 2) {
      const [s, t] = pts;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const offset = Math.max(30, Math.max(Math.abs(dx), Math.abs(dy)) * 0.4);
      if (Math.abs(dx) >= Math.abs(dy)) {
        const sign = dx >= 0 ? 1 : -1;
        return `M ${s.x} ${s.y} C ${s.x + offset * sign} ${s.y}, ${t.x - offset * sign} ${t.y}, ${t.x} ${t.y}`;
      }
      const sign = dy >= 0 ? 1 : -1;
      return `M ${s.x} ${s.y} C ${s.x} ${s.y + offset * sign}, ${t.x} ${t.y - offset * sign}, ${t.x} ${t.y}`;
    }

    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(b.x - a.x, b.y - a.y);

    let d = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const segLen = dist(p1, p2);

      // Skip curvature for very short segments
      if (segLen < 5) {
        d += ` L ${p2.x} ${p2.y}`;
        continue;
      }

      // Adaptive tension: shorter segments get less curvature to avoid overshooting
      const tension =
        segLen < 40 ? baseTension * 0.3 :
        segLen < 80 ? baseTension * 0.6 :
        baseTension;

      // Catmull-Rom to cubic bezier control points
      let cp1x = p1.x + (p2.x - p0.x) * tension;
      let cp1y = p1.y + (p2.y - p0.y) * tension;
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
  // Orthogonal nudging options only apply to orthogonal/bezier routing.
  // Enabling them for polyline connectors corrupts the routed paths.
  const isPolyline = options.connectorType === "polyline";
  router.setRoutingOption(nudgeOrthogonalSegmentsConnectedToShapesOpt, isPolyline ? false : (options.nudgeOrthogonalSegmentsConnectedToShapes ?? true));
  router.setRoutingOption(nudgeSharedPathsWithCommonEndPointOpt, isPolyline ? false : (options.nudgeSharedPathsWithCommonEndPoint ?? true));
  router.setRoutingOption(performUnifyingNudgingPreprocessingStepOpt, isPolyline ? false : (options.performUnifyingNudgingPreprocessingStep ?? true));
  router.setRoutingOption(nudgeOrthogonalTouchingColinearSegmentsOpt, isPolyline ? false : (options.nudgeOrthogonalTouchingColinearSegments ?? false));
  router.setRoutingOption(improveHyperedgeRoutesMovingJunctionsOpt, isPolyline ? false : (options.improveHyperedgeRoutesMovingJunctions ?? true));
  router.setRoutingOption(penaliseOrthogonalSharedPathsAtConnEndsOpt, isPolyline ? false : (options.penaliseOrthogonalSharedPathsAtConnEnds ?? false));
  router.setRoutingOption(improveHyperedgeRoutesMovingAddingAndDeletingJunctionsOpt, isPolyline ? false : (options.improveHyperedgeRoutesMovingAddingAndDeletingJunctions ?? false));
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




/** Offset a point away from the node border by stubLength in the direction of the side */
function offsetFromSide(pt: { x: number; y: number }, side: HandlePosition, stubLength: number): { x: number; y: number } {
  switch (side) {
    case "left": return { x: pt.x - stubLength, y: pt.y };
    case "right": return { x: pt.x + stubLength, y: pt.y };
    case "top": return { x: pt.x, y: pt.y - stubLength };
    case "bottom": return { x: pt.x, y: pt.y + stubLength };
  }
}

/** Shift a point laterally along a node border (perpendicular to the exit direction) */
function applyLateralOffset(pt: { x: number; y: number }, side: HandlePosition, offset: number): { x: number; y: number } {
  switch (side) {
    case "left":
    case "right": return { x: pt.x, y: pt.y + offset };
    case "top":
    case "bottom": return { x: pt.x + offset, y: pt.y };
  }
}


/** Info needed to add stubs after routing */
type StubInfo = {
  edgeId: string;
  srcHandlePt: { x: number; y: number };
  tgtHandlePt: { x: number; y: number };
  srcStubPt: { x: number; y: number };
  tgtStubPt: { x: number; y: number };
  merged: boolean; // true = shared stub mode (splitNearHandle=false)
};

function createConnections(
  router: AvoidRouter,
  edges: FlowEdge[],
  nodeById: Map<string, FlowNode>,
  options: AvoidRouterOptions
): { connRefs: { edgeId: string; connRef: AvoidConnRef }[]; stubs: StubInfo[] } {
  const connRefs: { edgeId: string; connRef: AvoidConnRef }[] = [];
  const stubs: StubInfo[] = [];
  const autoBestSide = options.autoBestSideConnection ?? true;
  const stubLength = options.stubSize ?? 20;
  const handleSpacing = options.handleNudgingDistance ?? 0;
  const connType = getConnType(options.connectorType);
  const hateCrossings = options.hateCrossings ?? false;

  // Pre-pass: group edges by node+side and compute lateral fan-out offsets so each edge
  // gets its own stub spread by handleSpacing pixels along the node border.
  const stubLateralOffsets = new Map<string, { srcOffset: number; tgtOffset: number }>();
  const splitNearHandle = options.shouldSplitEdgesNearHandle ?? true;
  if (splitNearHandle && handleSpacing > 0) {
    const srcGroups = new Map<string, string[]>();
    const tgtGroups = new Map<string, string[]>();
    for (const edge of edges) {
      const src = nodeById.get(edge.source);
      const tgt = nodeById.get(edge.target);
      if (!src || !tgt) continue;
      const sb = Geometry.getNodeBoundsAbsolute(src, nodeById);
      const tb = Geometry.getNodeBoundsAbsolute(tgt, nodeById);
      const srcSide = autoBestSide ? Geometry.getBestSides(sb, tb).sourcePos : Geometry.getHandlePosition(src, "source");
      const tgtSide = autoBestSide ? Geometry.getBestSides(sb, tb).targetPos : Geometry.getHandlePosition(tgt, "target");
      const sk = `${edge.source}:${srcSide}`;
      const tk = `${edge.target}:${tgtSide}`;
      if (!srcGroups.has(sk)) srcGroups.set(sk, []);
      srcGroups.get(sk)!.push(edge.id);
      if (!tgtGroups.has(tk)) tgtGroups.set(tk, []);
      tgtGroups.get(tk)!.push(edge.id);
    }
    for (const [, ids] of srcGroups) {
      const n = ids.length;
      ids.forEach((id, i) => {
        const prev = stubLateralOffsets.get(id) ?? { srcOffset: 0, tgtOffset: 0 };
        prev.srcOffset = (i - (n - 1) / 2) * handleSpacing;
        stubLateralOffsets.set(id, prev);
      });
    }
    for (const [, ids] of tgtGroups) {
      const n = ids.length;
      ids.forEach((id, i) => {
        const prev = stubLateralOffsets.get(id) ?? { srcOffset: 0, tgtOffset: 0 };
        prev.tgtOffset = (i - (n - 1) / 2) * handleSpacing;
        stubLateralOffsets.set(id, prev);
      });
    }
  }

  for (const edge of edges) {
    const src = nodeById.get(edge.source);
    const tgt = nodeById.get(edge.target);
    if (!src || !tgt) continue;

    const srcBounds = Geometry.getNodeBoundsAbsolute(src, nodeById);
    const tgtBounds = Geometry.getNodeBoundsAbsolute(tgt, nodeById);

    let srcEnd: AvoidConnEnd;
    let tgtEnd: AvoidConnEnd;

    {
      // Each edge fans out laterally from its side center by handleSpacing,
      // then exits outward via a stub of stubLength before libavoid routes the middle.
      const srcSide = autoBestSide ? Geometry.getBestSides(srcBounds, tgtBounds).sourcePos : Geometry.getHandlePosition(src, "source");
      const tgtSide = autoBestSide ? Geometry.getBestSides(srcBounds, tgtBounds).targetPos : Geometry.getHandlePosition(tgt, "target");

      const lateral = stubLateralOffsets.get(edge.id) ?? { srcOffset: 0, tgtOffset: 0 };
      const srcHandlePt = applyLateralOffset(Geometry.getHandlePoint(srcBounds, srcSide), srcSide, lateral.srcOffset);
      const tgtHandlePt = applyLateralOffset(Geometry.getHandlePoint(tgtBounds, tgtSide), tgtSide, lateral.tgtOffset);

      const srcStubPt = offsetFromSide(srcHandlePt, srcSide, stubLength);
      const tgtStubPt = offsetFromSide(tgtHandlePt, tgtSide, stubLength);

      srcEnd = AvoidConnEnd.fromPoint(new AvoidPoint(srcStubPt.x, srcStubPt.y));
      tgtEnd = AvoidConnEnd.fromPoint(new AvoidPoint(tgtStubPt.x, tgtStubPt.y));

      stubs.push({ edgeId: edge.id, srcHandlePt, tgtHandlePt, srcStubPt, tgtStubPt, merged: !splitNearHandle });
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

    const { shapeRefList } = createObstacles(router, nodes, nodeById, pinRegistry, opts);
    const { connRefs, stubs } = createConnections(router, edges, nodeById, opts);

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
        // In merged mode (splitNearHandle=false), force the adjacent stub waypoints
        // back to the exact stub endpoints so libavoid's nudging doesn't spread the
        // entry/exit segments — all edges share one visible trunk line to the stub point.
        if (stub.merged && points.length >= 3) {
          points[1] = { ...stub.srcStubPt };
          points[points.length - 2] = { ...stub.tgtStubPt };
        }
      }
    }

    // For unblocked edges, generate the React Flow fallback path directly.
    const connType = opts.connectorType ?? "orthogonal";
    const borderRadius = opts.edgeRounding ?? 0;
    const directRoutes = new Map<string, { path: string; labelX: number; labelY: number; srcPt: { x: number; y: number }; tgtPt: { x: number; y: number } }>();
    if (opts.routeOnlyWhenBlocked !== false) {
      const edgeById = new Map(edges.map((e) => [e.id, e]));
      const buffer = opts.shapeBufferDistance ?? 8;
      for (const [edgeId, points] of edgePoints) {
        const edge = edgeById.get(edgeId);
        if (!edge) continue;
        const src = points[0], tgt = points[points.length - 1];
        if (!isEdgeDirectPathBlocked(src, tgt, edge.source, edge.target, nodes, nodeById, buffer)) {
          const stub = stubMap.get(edgeId);
          if (stub) {
            const srcPos = sideFromStub(stub.srcHandlePt, stub.srcStubPt);
            const tgtPos = sideFromStub(stub.tgtHandlePt, stub.tgtStubPt);
            const { x: sx, y: sy } = stub.srcHandlePt;
            const { x: tx, y: ty } = stub.tgtHandlePt;
            let path: string; let labelX: number; let labelY: number;
            if (connType === "bezier") {
              [path, labelX, labelY] = getBezierPath({ sourceX: sx, sourceY: sy, sourcePosition: srcPos, targetX: tx, targetY: ty, targetPosition: tgtPos });
            } else if (connType === "polyline") {
              [path, labelX, labelY] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });
            } else {
              [path, labelX, labelY] = getSmoothStepPath({ sourceX: sx, sourceY: sy, sourcePosition: srcPos, targetX: tx, targetY: ty, targetPosition: tgtPos, borderRadius });
            }
            directRoutes.set(edgeId, { path, labelX, labelY, srcPt: stub.srcHandlePt, tgtPt: stub.tgtHandlePt });
          }
        }
      }
    }

    const labelFractions = buildLabelFractions(edges, edgePoints);
    for (const [edgeId, points] of edgePoints) {
      const direct = directRoutes.get(edgeId);
      if (direct) {
        result[edgeId] = { path: direct.path, labelX: direct.labelX, labelY: direct.labelY, sourceX: direct.srcPt.x, sourceY: direct.srcPt.y, targetX: direct.tgtPt.x, targetY: direct.tgtPt.y };
        continue;
      }
      const edgeRounding = opts.edgeRounding ?? 0;
      const path = connType === "bezier"
        ? PathBuilder.routedBezierPath(points)
        : edgeRounding > 0
          ? PathBuilder.polylineToPath(points.length, (i) => points[i], { cornerRadius: edgeRounding })
          : PathBuilder.pointsToSvgPath(points);
      const t = labelFractions.get(edgeId) ?? 0.5;
      const midP = pointAtFraction(points, t);
      const labelP = gridSize > 0 ? Geometry.snapToGrid(midP.x, midP.y, gridSize) : midP;
      const first = points[0];
      const last = points[points.length - 1];
      result[edgeId] = { path, labelX: labelP.x, labelY: labelP.y, sourceX: first.x, sourceY: first.y, targetX: last.x, targetY: last.y, points };
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
    const conn = createConnections(this.router, this.prevEdges, this.nodeById, opts);
    this.connRefList = conn.connRefs;
    this.stubList = conn.stubs;

    try { this.router.processTransaction(); }
    catch { this.destroy(); return {}; }

    return this.readRoutes();
  }

  private readRoutes(): Record<string, AvoidRoute> {
    const opts = this.prevOptions;
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
        // In merged mode (splitNearHandle=false), force the adjacent stub waypoints
        // back to the exact stub endpoints so libavoid's nudging doesn't spread the
        // entry/exit segments — all edges share one visible trunk line to the stub point.
        if (stub.merged && points.length >= 3) {
          points[1] = { ...stub.srcStubPt };
          points[points.length - 2] = { ...stub.tgtStubPt };
        }
      }
    }

    // For unblocked edges, generate the React Flow fallback path directly.
    const connType = opts.connectorType ?? "orthogonal";
    const borderRadius = opts.edgeRounding ?? 0;
    const directRoutes = new Map<string, { path: string; labelX: number; labelY: number; srcPt: { x: number; y: number }; tgtPt: { x: number; y: number } }>();
    if (opts.routeOnlyWhenBlocked !== false) {
      const edgeById = new Map(this.prevEdges.map((e) => [e.id, e]));
      const buffer = opts.shapeBufferDistance ?? 8;
      for (const [edgeId, points] of edgePoints) {
        const edge = edgeById.get(edgeId);
        if (!edge) continue;
        const src = points[0], tgt = points[points.length - 1];
        if (!isEdgeDirectPathBlocked(src, tgt, edge.source, edge.target, this.prevNodes, this.nodeById, buffer)) {
          const stub = stubMap.get(edgeId);
          if (stub) {
            const srcPos = sideFromStub(stub.srcHandlePt, stub.srcStubPt);
            const tgtPos = sideFromStub(stub.tgtHandlePt, stub.tgtStubPt);
            const { x: sx, y: sy } = stub.srcHandlePt;
            const { x: tx, y: ty } = stub.tgtHandlePt;
            let path: string; let labelX: number; let labelY: number;
            if (connType === "bezier") {
              [path, labelX, labelY] = getBezierPath({ sourceX: sx, sourceY: sy, sourcePosition: srcPos, targetX: tx, targetY: ty, targetPosition: tgtPos });
            } else if (connType === "polyline") {
              [path, labelX, labelY] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });
            } else {
              [path, labelX, labelY] = getSmoothStepPath({ sourceX: sx, sourceY: sy, sourcePosition: srcPos, targetX: tx, targetY: ty, targetPosition: tgtPos, borderRadius });
            }
            directRoutes.set(edgeId, { path, labelX, labelY, srcPt: stub.srcHandlePt, tgtPt: stub.tgtHandlePt });
          }
        }
      }
    }

    const labelFractions = buildLabelFractions(this.prevEdges, edgePoints);
    for (const [edgeId, points] of edgePoints) {
      const direct = directRoutes.get(edgeId);
      if (direct) {
        result[edgeId] = { path: direct.path, labelX: direct.labelX, labelY: direct.labelY, sourceX: direct.srcPt.x, sourceY: direct.srcPt.y, targetX: direct.tgtPt.x, targetY: direct.tgtPt.y };
        continue;
      }
      const edgeRounding = opts.edgeRounding ?? 0;
      const path = connType === "bezier"
        ? PathBuilder.routedBezierPath(points)
        : edgeRounding > 0
          ? PathBuilder.polylineToPath(points.length, (i) => points[i], { cornerRadius: edgeRounding })
          : PathBuilder.pointsToSvgPath(points);
      const t = labelFractions.get(edgeId) ?? 0.5;
      const midP = pointAtFraction(points, t);
      const labelP = gridSize > 0 ? Geometry.snapToGrid(midP.x, midP.y, gridSize) : midP;
      const first = points[0];
      const last = points[points.length - 1];
      result[edgeId] = { path, labelX: labelP.x, labelY: labelP.y, sourceX: first.x, sourceY: first.y, targetX: last.x, targetY: last.y, points };
    }
    return result;
  }
}

import { getStroke } from "perfect-freehand";
import type { Coordinate, Point, Stroke } from "../shared/types";
import { SELECTION_BOUNDS_PADDING, ERASER_HITBOX_PADDING } from "./State-const";

export function pointInPolygon(A: Coordinate, points: Coordinate[]): boolean {
  let windingNumber = 0;
  let a: Coordinate;
  let b: Coordinate;

  for (let i = 0; i < points.length; i++) {
    a = points[i];
    if (a.x === A.x && a.y === A.y) return true;

    b = points[(i + 1) % points.length];

    if (a.y <= A.y) {
      if (
        b.y > A.y &&
        (b.x - a.x) * (A.y - a.y) - (A.x - a.x) * (b.y - a.y) > 0
      ) {
        windingNumber += 1;
      }
    } else if (
      b.y <= A.y &&
      (b.x - a.x) * (A.y - a.y) - (A.x - a.x) * (b.y - a.y) < 0
    ) {
      windingNumber -= 1;
    }
  }

  return windingNumber !== 0;
}

export function getSelectionBounds(strokes: Set<Stroke> | Stroke[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let hasPoints = false;

  for (const stroke of strokes) {
    if (stroke.bounds) {
      hasPoints = true;
      if (stroke.bounds.minX < minX) minX = stroke.bounds.minX;
      if (stroke.bounds.minY < minY) minY = stroke.bounds.minY;
      if (stroke.bounds.maxX > maxX) maxX = stroke.bounds.maxX;
      if (stroke.bounds.maxY > maxY) maxY = stroke.bounds.maxY;
      continue;
    }

    const padding = stroke.pen.size / 2 + SELECTION_BOUNDS_PADDING;
    for (const p of stroke.points) {
      hasPoints = true;
      if (p.x - padding < minX) minX = p.x - padding;
      if (p.y - padding < minY) minY = p.y - padding;
      if (p.x + padding > maxX) maxX = p.x + padding;
      if (p.y + padding > maxY) maxY = p.y + padding;
    }
  }
  return hasPoints ? { minX, minY, maxX, maxY } : null;
}

export function isPointInBounds(
  pt: Coordinate,
  bounds: ReturnType<typeof getSelectionBounds>,
): boolean {
  if (!bounds) return false;
  return (
    pt.x >= bounds.minX &&
    pt.x <= bounds.maxX &&
    pt.y >= bounds.minY &&
    pt.y <= bounds.maxY
  );
}

export function doBoundsIntersect(
  b1: { minX: number; minY: number; maxX: number; maxY: number },
  b2: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  return (
    b1.minX <= b2.maxX &&
    b1.maxX >= b2.minX &&
    b1.minY <= b2.maxY &&
    b1.maxY >= b2.minY
  );
}

export function segmentsIntersect(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
  precision = 1e-10,
): boolean {
  const ABx = a1.x - b1.x;
  const ABy = a1.y - b1.y;
  const BVx = b2.x - b1.x;
  const BVy = b2.y - b1.y;
  const AVx = a2.x - a1.x;
  const AVy = a2.y - a1.y;
  const ua_t = BVx * ABy - BVy * ABx;
  const ub_t = AVx * ABy - AVy * ABx;
  const u_b = BVy * AVx - BVx * AVy;

  if (Math.abs(ua_t) <= precision || Math.abs(ub_t) <= precision) return false; // Совпадают
  if (Math.abs(u_b) <= precision) return false; // Параллельны

  const ua = ua_t / u_b;
  const ub = ub_t / u_b;

  return (
    ua >= -precision &&
    ua <= 1 + precision &&
    ub >= -precision &&
    ub <= 1 + precision
  );
}

export function isEraserIntersectingStroke(
  eraserP1: Point,
  eraserP2: Point,
  stroke: Stroke,
  zoom: number,
): boolean {
  if (!stroke.bounds) {
    const b = getSelectionBounds([stroke]);
    if (!b) return false;
    stroke.bounds = b;
  }

  if (!stroke.outlinePolygon) {
    if (stroke.points.length === 0) return false;
    const rawPolygon = getStroke(stroke.points, {
      ...stroke.pen,
      simulatePressure: false,
    });
    stroke.outlinePolygon = rawPolygon.map((pt) => ({ x: pt[0], y: pt[1] }));
  }

  const padding = ERASER_HITBOX_PADDING / zoom;
  const eraserBounds = {
    minX: Math.min(eraserP1.x, eraserP2.x) - padding,
    minY: Math.min(eraserP1.y, eraserP2.y) - padding,
    maxX: Math.max(eraserP1.x, eraserP2.x) + padding,
    maxY: Math.max(eraserP1.y, eraserP2.y) + padding,
  };

  if (!doBoundsIntersect(eraserBounds, stroke.bounds)) return false;

  if (pointInPolygon(eraserP2, stroke.outlinePolygon)) return true;

  if (eraserP1.x !== eraserP2.x || eraserP1.y !== eraserP2.y) {
    const pts = stroke.outlinePolygon;
    for (let i = 0; i < pts.length - 1; i++) {
      if (segmentsIntersect(eraserP1, eraserP2, pts[i], pts[i + 1])) {
        return true;
      }
    }
  }

  return false;
}

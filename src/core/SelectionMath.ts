import type { Coordinate, Stroke } from "../shared/types";

export function pointInPolygon(pt: Coordinate, polygon: Coordinate[]) {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

export function getSelectionBounds(strokes: Set<Stroke> | Stroke[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let hasPoints = false;

  for (const stroke of strokes) {
    const padding = stroke.pen.size / 2 + 5;
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

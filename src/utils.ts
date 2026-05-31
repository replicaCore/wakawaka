// src/utils.ts
import type { Coordinate } from "./type";

export const average = (a: number, b: number) => (a + b) / 2;

export function getSvgPathFromStroke(points: number[][], closed = true) {
  const len = points.length;
  if (len < 4) return ``;

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2,
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1],
  ).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2,
    )} `;
  }

  if (closed) result += "Z";
  return result;
}

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

import {
  createIcons,
  Download,
  Plus,
  ArrowLeft,
  Undo,
  Redo,
  Settings,
  X,
  PenTool,
  Pencil,
  Lasso,
  Link,
  Unlink,
  Hand,
  Maximize,
  Palette,
  Trash2,
  FileJson,
  FileCode,
  Image as ImageIcon,
  ArrowUpToLine, // НОВОЕ
  ArrowDownToLine, // НОВОЕ
} from "lucide";

export function refreshIcons() {
  createIcons({
    icons: {
      Download,
      Plus,
      ArrowLeft,
      Undo,
      Redo,
      Pencil,
      Settings,
      X,
      PenTool,
      Lasso,
      Link,
      Unlink,
      Hand,
      Maximize,
      Palette,
      Trash2,
      FileJson,
      FileCode,
      Image: ImageIcon,
      ArrowUpToLine, // НОВОЕ
      ArrowDownToLine, // НОВОЕ
    },
  });
}

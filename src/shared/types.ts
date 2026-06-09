// src/shared/types.ts
export type Coordinate = { x: number; y: number };

export type Point = Coordinate;

export type Camera = { x: number; y: number; zoom: number };

export type Stroke = {
  id: string;
  type?: "text";
  text?: string;
  points: Point[];
  color: string;
  pen: PenOptions;
  groupIds?: string[];
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  outlinePolygon?: Point[];
  _pathDirty?: boolean; // <-- НОВОЕ: Флаг инвалидации кэша отрисовки
};

export type HistoryAction = "ADD" | "DELETE" | "UPDATE";

export type HistoryStep =
  | { action: "ADD"; strokes: Stroke[] }
  | { action: "DELETE"; strokes: Stroke[]; indices?: number[] }
  | { action: "UPDATE"; before: Stroke[]; after: Stroke[] };

export type Project = {
  id: string;
  name: string;
  thumbnail: string;
  updatedAt: number;
  strokes: Stroke[];
  backgroundColor: string;
  camera: Camera;
  penSizes?: [number, number, number];
  activeSizeIndex?: number;
  penOptions?: PenOptions;
  history?: HistoryStep[];
  redoHistory?: HistoryStep[];
  selectionDragAnywhere?: boolean;
};

export type PenOptions = {
  icon: string;
  size: number;
  isText?: boolean;
  thinning: number;
  smoothing: number;
  streamline: number;
  isMarker?: boolean;
  isSelector?: boolean;
  isEraser?: boolean;
};

export type LibraryItem = {
  id: string;
  strokes: Stroke[];
  thumbnail: string;
};

export interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  stroke: Stroke;
}

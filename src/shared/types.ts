export type Coordinate = { x: number; y: number };

export type Point = Coordinate;

export type Camera = { x: number; y: number; zoom: number };

export type Stroke = {
  points: Point[];
  color: string;
  pen: PenOptions;
  groupIds?: string[];
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };

  outlinePolygon?: Point[];
};

export type PenOptions = {
  icon: string;
  size: number;
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

  history?: Stroke[][];
  redoHistory?: Stroke[][];

  selectionDragAnywhere?: boolean;
};

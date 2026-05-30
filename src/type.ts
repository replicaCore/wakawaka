export type Coordinate = { x: number; y: number };

export type Point = Coordinate & { pressure: number };

export type Camera = { x: number; y: number; zoom: number };

export type Stroke = {
  points: Point[];
  color: string;
  pen: PenOptions;
  groupIds?: string[];
};

export type PenOptions = {
  icon: string;
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure: boolean;
  isMarker?: boolean;
  isEraser?: boolean;
  isSelector?: boolean;
};

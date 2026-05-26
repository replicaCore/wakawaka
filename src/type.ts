export type Point = { x: number; y: number; pressure: number };

export type Camera = { x: number; y: number; zoom: number };

export type Stroke = { points: Point[]; color: string; pen: PenOptions };

export type PenOptions = {
  icon: string;
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure: boolean;
  isMarker?: boolean;
  isEraser?: boolean;
};

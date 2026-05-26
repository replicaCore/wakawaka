import type { PenOptions } from "../type";

export const PEN_PRESETS: PenOptions[] = [
  // Перьевая
  {
    size: 12,
    thinning: 0.7,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
  },
  // Шариковая
  {
    size: 6,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
  },
  // Фломастер
  {
    size: 24,
    thinning: 0.2,
    smoothing: 0.8,
    streamline: 0.8,
    simulatePressure: false,
  },
  // Карандаш
  {
    size: 4,
    thinning: 0.5,
    smoothing: 0.2,
    streamline: 0.5,
    simulatePressure: true,
  },
  // Маркер
  {
    size: 40,
    thinning: -0.2,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
    isMarker: true,
  },
  // Ластик
  {
    size: 30,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
    isEraser: true,
  },
];

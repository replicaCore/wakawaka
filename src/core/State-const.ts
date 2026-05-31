import type { PenOptions } from "../type";

export const PEN_PRESETS: PenOptions[] = [
  {
    icon: "pen-tool",
    size: 12,
    thinning: 0.7,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
  },
  {
    icon: "lasso",
    size: 1,
    thinning: 0,
    smoothing: 0,
    streamline: 0,
    simulatePressure: false,
    isSelector: true,
  },
];

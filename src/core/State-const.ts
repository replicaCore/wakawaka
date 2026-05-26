import type { PenOptions } from "../type";

export const PEN_PRESETS: PenOptions[] = [
  {
    icon: "🖋️",
    size: 12,
    thinning: 0.7,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
  },
  {
    icon: "🖊️",
    size: 6,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
  },
  {
    icon: "🖌️",
    size: 24,
    thinning: 0.2,
    smoothing: 0.8,
    streamline: 0.8,
    simulatePressure: false,
  },
  {
    icon: "✏️",
    size: 4,
    thinning: 0.5,
    smoothing: 0.2,
    streamline: 0.5,
    simulatePressure: true,
  },
  {
    icon: "🖍️",
    size: 40,
    thinning: -0.2,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
    isMarker: true,
  },
  {
    icon: "🧽",
    size: 30,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
    isEraser: true,
  },
];

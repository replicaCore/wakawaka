import { PenOptions } from "../shared/types";

export const PEN_PRESETS: PenOptions[] = [
  {
    icon: "pen-tool",
    size: 12,
    thinning: 0.7,
    smoothing: 0.5,
    streamline: 0.5,
  },
  {
    icon: "lasso",
    size: 1,
    thinning: 0,
    smoothing: 0,
    streamline: 0,
    isSelector: true,
  },
  {
    icon: "eraser",
    size: 20,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    isEraser: true,
  },
];

export const ERASER_HITBOX_PADDING = 10;
export const DUPLICATE_OFFSET_PX = 20;
export const SELECTION_BOUNDS_PADDING = 5;

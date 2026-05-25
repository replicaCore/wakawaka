import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "../utils";
import type { State } from "../core/State";
import type { Point } from "../type";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private state: State;

  constructor(canvas: HTMLCanvasElement, state: State) {
    this.canvas = canvas;
    this.state = state;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.render();
  }

  public render = () => {
    const { camera, strokes, currentStroke, currentColor } = this.state;

    this.ctx.resetTransform();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);

    for (const stroke of strokes) {
      this.ctx.fillStyle = stroke.color;
      this.drawPerfectStroke(stroke.points);
    }

    if (currentStroke.length > 0) {
      this.ctx.fillStyle = currentColor;
      this.drawPerfectStroke(currentStroke);
    }
  };

  private drawPerfectStroke(points: Point[]) {
    if (points.length === 0) return;
    const outlinePoints = getStroke(points, {
      size: 12,
      thinning: 0.7,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
    });
    const pathData = getSvgPathFromStroke(outlinePoints);
    const path = new Path2D(pathData);
    this.ctx.fill(path);
  }
}

import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "../utils";
import type { State } from "../core/State";
import type { PenOptions, Point } from "../type";

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
    const {
      camera,
      strokes,
      currentStroke,
      currentColor,
      currentPen,
      backgroundColor,
      // invertColors,
    } = this.state;

    // this.canvas.style.filter = invertColors
    //   ? "invert(1) hue-rotate(180deg)"
    //   : "none";

    this.ctx.resetTransform();

    this.ctx.fillStyle = backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);

    for (const stroke of strokes) {
      this.ctx.fillStyle = stroke.color;
      this.drawPerfectStroke(stroke.points, stroke.pen);
    }

    if (currentStroke.length > 0) {
      this.ctx.fillStyle = currentColor;
      this.drawPerfectStroke(currentStroke, currentPen);
    }
  };

  private drawPerfectStroke(points: Point[], penOption: PenOptions) {
    if (points.length === 0) return;

    if (penOption.isMarker) {
      this.ctx.globalAlpha = 0.4;
    }

    const outlinePoints = getStroke(points, penOption);
    const pathData = getSvgPathFromStroke(outlinePoints);
    const path = new Path2D(pathData);
    this.ctx.fill(path);

    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.globalAlpha = 1.0;
  }
}

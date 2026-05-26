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

    if (this.state.selectedStrokes.size > 0) {
      this.ctx.strokeStyle = "#3b82f6";
      this.ctx.lineWidth = 2 / camera.zoom;
      this.ctx.setLineDash([5 / camera.zoom, 5 / camera.zoom]);

      for (const stroke of this.state.selectedStrokes) {
        if (stroke.points.length === 0) continue;

        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        const padding = stroke.pen.size / 2 + 5;

        for (const p of stroke.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }

        this.ctx.strokeRect(
          minX - padding,
          minY - padding,
          maxX - minX + padding * 2,
          maxY - minY + padding * 2,
        );
      }
      this.ctx.setLineDash([]);
    }

    if (this.state.lassoPath.length > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.state.lassoPath[0].x, this.state.lassoPath[0].y);
      for (let i = 1; i < this.state.lassoPath.length; i++) {
        this.ctx.lineTo(this.state.lassoPath[i].x, this.state.lassoPath[i].y);
      }
      this.ctx.closePath();

      this.ctx.strokeStyle = "#3b82f6";
      this.ctx.lineWidth = 1.5 / camera.zoom;
      this.ctx.setLineDash([5 / camera.zoom, 5 / camera.zoom]);
      this.ctx.stroke();

      this.ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
      this.ctx.fill();

      this.ctx.setLineDash([]);
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

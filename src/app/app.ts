import { Canvas } from "../canvas/canvas";
import { Pen } from "../pen/pen";
import type { Color, Point } from "../type";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "../utils";

export class App {
  private canvas: Canvas;
  private pens: Pen[] = [];
  private currentPen: number = 1;
  private color: Color = "White";

  constructor() {
    this.canvas = new Canvas(
      document.getElementById("app") as HTMLCanvasElement,
      window.innerWidth,
      window.innerHeight,
      this,
    );

    for (let i = 0; i <= 5; i++) {
      let pen = new Pen(this.canvas.canvas);
      this.pens.push(pen);
    }
  }

  renderScene(allStrokes: Point[][], currentStroke: Point[]) {
    const ctx = this.pens[this.currentPen].pen;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const stroke of allStrokes) {
      this.drawPerfectStroke(ctx, stroke);
    }

    if (currentStroke.length > 0) {
      this.drawPerfectStroke(ctx, currentStroke);
    }
  }

  private drawPerfectStroke(ctx: CanvasRenderingContext2D, points: Point[]) {
    const outlinePoints = getStroke(points, {
      size: 12,
      thinning: 0.7,
      smoothing: 0.5,
      streamline: 0.5,
    });

    const pathData = getSvgPathFromStroke(outlinePoints);
    const path = new Path2D(pathData);

    ctx.fillStyle = this.color;
    ctx.fill(path);
  }
}

import type { Camera, PenOptions, Point, Stroke } from "../type";
import { PEN_PRESETS } from "./State-const";

export class State {
  public strokes: Stroke[] = [];
  public currentStroke: Point[] = [];
  public history: Stroke[] = [];

  public camera: Camera = { x: 0, y: 0, zoom: 1 };
  public currentColor: string = "#ebdbb2";
  public pens: PenOptions[] = JSON.parse(JSON.stringify(PEN_PRESETS));
  public currentPen: PenOptions = this.pens[0];

  public onUpdate: () => void = () => {};
  public eraserMode: "partial" | "stroke" = "partial";

  public addPoint(point: Point) {
    this.currentStroke.push(point);
    this.onUpdate();
  }

  public eraseStrokeAt(point: Point) {
    const radius = this.currentPen.size * 1.5;
    const initialLength = this.strokes.length;

    this.strokes = this.strokes.filter((stroke) => {
      const isHit = stroke.points.some(
        (p) => Math.hypot(p.x - point.x, p.y - point.y) < radius,
      );
      return !isHit;
    });

    if (this.strokes.length !== initialLength) {
      this.onUpdate();
    }
  }

  public setPen(index: number) {
    this.currentPen = this.pens[index];
  }

  public setPenSize(size: number) {
    this.currentPen.size = size;
    this.onUpdate();
  }

  public setEraserMode(mode: "partial" | "stroke") {
    this.eraserMode = mode;
  }

  public endStroke() {
    if (this.currentStroke.length > 0) {
      this.strokes.push({
        points: [...this.currentStroke],
        color: this.currentColor,
        pen: this.currentPen,
      });
      this.currentStroke = [];
      this.history = [];
      this.onUpdate();
    }
  }

  public undo() {
    const stroke = this.strokes.pop();
    if (stroke) {
      this.history.push(stroke);
      this.onUpdate();
    }
  }

  public redo() {
    const stroke = this.history.pop();
    if (stroke) {
      this.strokes.push(stroke);
      this.onUpdate();
    }
  }

  public setColor(color: string) {
    this.currentColor = color;
  }
}

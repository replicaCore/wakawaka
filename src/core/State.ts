import type { Camera, PenOptions, Point, Stroke } from "../type";
import { PEN_PRESETS } from "./State-const";

export class State {
  public strokes: Stroke[] = [];
  public currentStroke: Point[] = [];
  public history: Stroke[][] = [];
  public redoHistory: Stroke[][] = [];

  public camera: Camera = { x: 0, y: 0, zoom: 1 };
  public currentColor: string = "#ebdbb2";
  public pens: PenOptions[] = JSON.parse(JSON.stringify(PEN_PRESETS));
  public currentPen: PenOptions = this.pens[0];

  public onUpdate: () => void = () => {};
  public eraserMode: "partial" | "stroke" = "partial";

  public saveHistory() {
    this.history.push(JSON.parse(JSON.stringify(this.strokes)));
    this.redoHistory = [];
  }

  public addPoint(point: Point) {
    this.currentStroke.push(point);
    this.onUpdate();
  }

  public eraseStrokeAt(point: Point) {
    const radius = this.currentPen.size / 2;
    const initialLength = this.strokes.length;

    this.strokes = this.strokes.filter((stroke) => {
      return !stroke.points.some(
        (p) => Math.hypot(p.x - point.x, p.y - point.y) < radius,
      );
    });

    if (this.strokes.length !== initialLength) this.onUpdate();
  }

  public erasePartialAt(point: Point) {
    const radius = this.currentPen.size;
    const newStrokes: Stroke[] = [];
    let changed = false;

    for (const stroke of this.strokes) {
      let currentSegment: Point[] = [];
      let strokeChanged = false;

      for (const p of stroke.points) {
        const dist = Math.hypot(p.x - point.x, p.y - point.y);

        if (dist < radius) {
          strokeChanged = true;
          changed = true;
          if (currentSegment.length > 0) {
            newStrokes.push({ ...stroke, points: currentSegment });
            currentSegment = [];
          }
        } else {
          currentSegment.push(p);
        }
      }

      if (strokeChanged) {
        if (currentSegment.length > 0) {
          newStrokes.push({ ...stroke, points: currentSegment });
        }
      } else {
        newStrokes.push(stroke);
      }
    }
    if (changed) {
      this.strokes = newStrokes;
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
      this.saveHistory();

      this.strokes.push({
        points: [...this.currentStroke],
        color: this.currentColor,
        pen: { ...this.currentPen },
      });
      this.currentStroke = [];

      this.onUpdate();
    }
  }

  public undo() {
    if (this.history.length > 0) {
      this.redoHistory.push(JSON.parse(JSON.stringify(this.strokes)));
      this.strokes = this.history.pop()!;
      this.currentStroke = [];
      this.onUpdate();
    }
  }

  public redo() {
    if (this.redoHistory.length > 0) {
      this.history.push(JSON.parse(JSON.stringify(this.strokes)));
      this.strokes = this.redoHistory.pop()!;
      this.onUpdate();
    }
  }

  public setColor(color: string) {
    this.currentColor = color;
  }
}

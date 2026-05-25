import type { Camera, Point } from "../type";

export class State {
  public strokes: Point[][] = [];
  public currentStroke: Point[] = [];
  public history: Point[][] = [];

  public camera: Camera = { x: 0, y: 0, zoom: 1 };
  public currentColor: string = "#ef4444";

  public onUpdate: () => void = () => {};

  public addPoint(point: Point) {
    this.currentStroke.push(point);
    this.onUpdate();
  }

  public endStroke() {
    if (this.currentStroke.length > 0) {
      this.strokes.push([...this.currentStroke]);
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

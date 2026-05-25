import type { Camera, Point, Stroke } from "../type";

export class State {
  public strokes: Stroke[] = [];
  public currentStroke: Point[] = [];
  public history: Stroke[] = [];

  public camera: Camera = { x: 0, y: 0, zoom: 1 };
  public currentColor: string = "#ebdbb2";

  public onUpdate: () => void = () => {};

  public addPoint(point: Point) {
    this.currentStroke.push(point);
    this.onUpdate();
  }

  public endStroke() {
    if (this.currentStroke.length > 0) {
      this.strokes.push({
        points: [...this.currentStroke],
        color: this.currentColor,
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

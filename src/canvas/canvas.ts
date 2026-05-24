import type { App } from "../app/app";
import type { Point } from "../type";

export class Canvas {
  private _canvas: HTMLCanvasElement;
  private _allStrokes: Point[][] = [];
  private currentStroke: Point[] = [];
  private _isDrawing = false;
  private app: App;

  public get allStrokes(): Point[][] {
    return this._allStrokes;
  }
  public set allStrokes(value: Point[][]) {
    this._allStrokes = value;
  }
  public get isDrawing() {
    return this._isDrawing;
  }
  public set isDrawing(value) {
    this._isDrawing = value;
  }
  public get canvas() {
    return this._canvas;
  }

  constructor(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    app: App,
  ) {
    this._canvas = canvas;
    this.canvas.width = width;
    this.canvas.height = height;
    this.app = app;

    this.canvas.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;

      this.isDrawing = true;
      this.currentStroke = [
        { x: e.clientX, y: e.clientY, pressure: e.pressure },
      ];

      this.app.renderScene(this.allStrokes, this.currentStroke);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.isDrawing) return;

      this.currentStroke.push({
        x: e.clientX,
        y: e.clientY,
        pressure: e.pressure,
      });

      this.app.renderScene(this.allStrokes, this.currentStroke);
    });

    window.addEventListener("pointerup", () => {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.allStrokes.push(this.currentStroke);
        this.currentStroke = [];
        console.log(`Линий в памяти: ${this.allStrokes.length}`);
      }
    });
  }
}

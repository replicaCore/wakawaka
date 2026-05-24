import type { App } from "../app/app";
import type { Point, Camera } from "../type";

export class Canvas {
  private _canvas: HTMLCanvasElement;
  private _allStrokes: Point[][] = [];
  private _currentStroke: Point[] = [];
  private _isDrawing = false;
  private app: App;

  public camera: Camera = { x: 0, y: 0, zoom: 1 };

  private isPanning = false;
  private lastPanPoint = { x: 0, y: 0 };

  public get allStrokes() {
    return this._allStrokes;
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
  public get currentStroke(): Point[] {
    return this._currentStroke;
  }
  public set currentStroke(value: Point[]) {
    this._currentStroke = value;
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
      if (e.pointerType === "touch" || e.button === 1 /* колесико мыши */) {
        this.isPanning = true;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        return;
      }

      this.isDrawing = true;
      const worldPt = this.getScreenToWorld(e.clientX, e.clientY);
      this.currentStroke = [
        { x: worldPt.x, y: worldPt.y, pressure: e.pressure },
      ];

      this.app.renderScene(this.allStrokes, this.currentStroke, this.camera);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (this.isPanning) {
        const dx = e.clientX - this.lastPanPoint.x;
        const dy = e.clientY - this.lastPanPoint.y;
        this.camera.x += dx;
        this.camera.y += dy;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };

        this.app.renderScene(this.allStrokes, this.currentStroke, this.camera);
        return;
      }

      if (!this.isDrawing) return;
      const worldPt = this.getScreenToWorld(e.clientX, e.clientY);
      this.currentStroke.push({
        x: worldPt.x,
        y: worldPt.y,
        pressure: e.pressure,
      });
      this.app.renderScene(this.allStrokes, this.currentStroke, this.camera);
    });

    window.addEventListener("pointerup", () => {
      this.isPanning = false;

      if (this.isDrawing) {
        this.isDrawing = false;
        this._allStrokes.push(this.currentStroke);
        this.currentStroke = [];
      }
    });

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.zoomCamera(e.clientX, e.clientY, zoomFactor);
      },
      { passive: false },
    );
  }

  private getScreenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.camera.x) / this.camera.zoom,
      y: (y - this.camera.y) / this.camera.zoom,
    };
  }

  public zoomCamera(clientX: number, clientY: number, zoomFactor: number) {
    const newZoom = this.camera.zoom * zoomFactor;

    if (newZoom < 0.01 || newZoom > 100) return;

    this.camera.x =
      clientX - (clientX - this.camera.x) * (newZoom / this.camera.zoom);
    this.camera.y =
      clientY - (clientY - this.camera.y) * (newZoom / this.camera.zoom);
    this.camera.zoom = newZoom;

    this.app.renderScene(this.allStrokes, this.currentStroke, this.camera);
  }
}

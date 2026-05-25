import type { State } from "../core/State";

export class InputHandler {
  private isDrawing = false;
  private isPanning = false;
  private lastPanPoint = { x: 0, y: 0 };
  private canvas: HTMLCanvasElement;
  private state: State;

  constructor(canvas: HTMLCanvasElement, state: State) {
    this.canvas = canvas;
    this.state = state;
    this.setupEvents();
  }

  private getScreenToWorld(x: number, y: number) {
    const { camera } = this.state;
    return {
      x: (x - camera.x) / camera.zoom,
      y: (y - camera.y) / camera.zoom,
    };
  }

  private setupEvents() {
    this.canvas.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" || e.button === 1) {
        this.isPanning = true;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        return;
      }

      this.isDrawing = true;
      const worldPt = this.getScreenToWorld(e.clientX, e.clientY);

      this.state.addPoint({
        x: worldPt.x,
        y: worldPt.y,
        pressure: e.pressure || 0.5,
      });
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (this.isPanning) {
        const dx = e.clientX - this.lastPanPoint.x;
        const dy = e.clientY - this.lastPanPoint.y;

        this.state.camera.x += dx;
        this.state.camera.y += dy;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };

        this.state.onUpdate();
        return;
      }

      if (!this.isDrawing) return;

      const worldPt = this.getScreenToWorld(e.clientX, e.clientY);
      this.state.addPoint({
        x: worldPt.x,
        y: worldPt.y,
        pressure: e.pressure || 0.5,
      });
    });

    window.addEventListener("pointerup", () => {
      this.isPanning = false;

      if (this.isDrawing) {
        this.isDrawing = false;
        this.state.endStroke();
      }
    });

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        this.zoomCamera(centerX, centerY, zoomFactor);
      },
      { passive: false },
    );
  }

  private zoomCamera(clientX: number, clientY: number, zoomFactor: number) {
    const { camera } = this.state;
    const newZoom = camera.zoom * zoomFactor;

    if (newZoom < 0.01 || newZoom > 100) return;

    camera.x = clientX - (clientX - camera.x) * (newZoom / camera.zoom);
    camera.y = clientY - (clientY - camera.y) * (newZoom / camera.zoom);
    camera.zoom = newZoom;

    this.state.onUpdate();
  }
}

import type { State } from "../core/State";

export class InputHandler {
  private isDrawing = false;
  private isPanning = false;
  private isSpacePressed = false;

  private isDrawingLasso = false;
  private isDraggingSelection = false;
  private lastDragWorldPt = { x: 0, y: 0 };

  private lastPanPoint = { x: 0, y: 0 };
  private cursorCircle: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private state: State;

  constructor(canvas: HTMLCanvasElement, state: State) {
    this.canvas = canvas;
    this.state = state;
    this.cursorCircle = document.getElementById(
      "cursor-circle",
    ) as HTMLDivElement;
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
      document.body.classList.add("canvas-active");
      if (e.pointerType === "touch" || e.button === 1 || this.isSpacePressed) {
        this.isPanning = true;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };

        if (this.isSpacePressed) {
          this.canvas.style.cursor = "grabbing";
        }
        return;
      }

      const worldPt = this.getScreenToWorld(e.clientX, e.clientY);

      if (this.state.currentPen.isSelector) {
        if (this.state.isPointInSelectionBox(worldPt)) {
          this.isDraggingSelection = true;
          this.lastDragWorldPt = worldPt;
          this.state.saveHistory();
        } else {
          this.state.selectedStrokes.clear();
          this.isDrawingLasso = true;
          this.state.lassoPath = [
            { x: worldPt.x, y: worldPt.y, pressure: e.pressure || 0.5 },
          ];
          this.state.onUpdate();
        }
        return;
      }

      this.isDrawing = true;
      if (this.state.currentPen.isEraser) {
        this.state.saveHistory();
        if (this.state.eraserMode === "stroke") {
          this.state.eraseStrokeAt(worldPt);
        } else {
          this.state.erasePartialAt(worldPt);
        }
      } else {
        this.state.addPoint({
          x: worldPt.x,
          y: worldPt.y,
          pressure: e.pressure || 0.5,
        });
      }
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "touch" && !this.state.currentPen.isSelector) {
        this.cursorCircle.classList.remove("hidden");
        const visualSize = this.state.currentPen.size * this.state.camera.zoom;
        this.cursorCircle.style.width = `${visualSize}px`;
        this.cursorCircle.style.height = `${visualSize}px`;
        this.cursorCircle.style.left = `${e.clientX}px`;
        this.cursorCircle.style.top = `${e.clientY}px`;
      } else {
        this.cursorCircle.classList.add("hidden");
      }

      if (this.isPanning) {
        const dx = e.clientX - this.lastPanPoint.x;
        const dy = e.clientY - this.lastPanPoint.y;

        this.state.camera.x += dx;
        this.state.camera.y += dy;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };

        this.state.onUpdate();
        return;
      }

      const worldPt = this.getScreenToWorld(e.clientX, e.clientY);

      if (this.isDrawingLasso) {
        this.state.lassoPath.push({
          x: worldPt.x,
          y: worldPt.y,
          pressure: e.pressure || 0.5,
        });
        this.state.onUpdate();
        return;
      }

      if (this.isDraggingSelection) {
        const dx = worldPt.x - this.lastDragWorldPt.x;
        const dy = worldPt.y - this.lastDragWorldPt.y;
        this.state.moveSelected(dx, dy);
        this.lastDragWorldPt = worldPt;
        return;
      }

      if (!this.isDrawing) return;

      if (this.state.currentPen.isEraser) {
        if (this.state.eraserMode === "stroke") {
          this.state.eraseStrokeAt(worldPt);
        } else {
          this.state.erasePartialAt(worldPt);
        }
      } else {
        this.state.addPoint({
          x: worldPt.x,
          y: worldPt.y,
          pressure: e.pressure || 0.5,
        });
      }
    });

    this.canvas.addEventListener("pointerleave", () => {
      this.cursorCircle.classList.add("hidden");
    });

    window.addEventListener("pointerup", () => {
      document.body.classList.remove("canvas-active");
      this.isPanning = false;

      if (this.isDrawingLasso) {
        this.isDrawingLasso = false;
        this.state.finishLasso();
      }
      this.isDraggingSelection = false;

      if (this.isSpacePressed) {
        this.canvas.style.cursor = "grab";
      } else {
        this.canvas.style.cursor = "";
      }

      if (this.isDrawing) {
        this.isDrawing = false;
        if (
          !this.state.currentPen.isEraser &&
          !this.state.currentPen.isSelector
        ) {
          this.state.endStroke();
        }
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

        if (!this.cursorCircle.classList.contains("hidden")) {
          const visualSize =
            this.state.currentPen.size * this.state.camera.zoom;
          this.cursorCircle.style.width = `${visualSize}px`;
          this.cursorCircle.style.height = `${visualSize}px`;
        }
      },
      { passive: false },
    );

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !this.isSpacePressed) {
        this.isSpacePressed = true;
        this.canvas.style.cursor = "grab";
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        this.isSpacePressed = false;
        this.canvas.style.cursor = "grab";
      }
    });
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

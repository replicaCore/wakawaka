// src/canvas/InputHandler.ts
import type { State } from "../core/State";
import type { Coordinate } from "../type";

export class InputHandler {
  private isDrawing = false;
  private isPanning = false;
  private isSpacePressed = false;
  private isDrawingLasso = false;
  private isDraggingSelection = false;

  private lastDragWorldPt: Coordinate = { x: 0, y: 0 };
  private lastPanPoint: Coordinate = { x: 0, y: 0 };

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

  private getScreenToWorld(x: number, y: number): Coordinate {
    const { camera } = this.state;
    return {
      x: (x - camera.x) / camera.zoom,
      y: (y - camera.y) / camera.zoom,
    };
  }

  private setupEvents() {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerleave", () =>
      this.cursorCircle.classList.add("hidden"),
    );
    window.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });

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

  private handlePointerDown = (e: PointerEvent) => {
    document.body.classList.add("canvas-active");
    if (e.pointerType === "touch" || e.button === 1 || this.isSpacePressed) {
      this.isPanning = true;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      if (this.isSpacePressed) this.canvas.style.cursor = "grabbing";
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
        this.state.triggerUIUpdate(); // Скрыть UI тулбар на время рисования Лассо
      }
      return;
    }

    this.isDrawing = true;
    if (this.state.currentPen.isEraser) {
      this.state.saveHistory();
      this.state.eraserMode === "stroke"
        ? this.state.eraseStrokeAt(worldPt)
        : this.state.erasePartialAt(worldPt);
    } else {
      this.state.addPoint({
        x: worldPt.x,
        y: worldPt.y,
        pressure: e.pressure || 0.5,
      });
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    this.updateCursorVisual(e);

    if (this.isPanning) {
      this.state.camera.x += e.clientX - this.lastPanPoint.x;
      this.state.camera.y += e.clientY - this.lastPanPoint.y;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      this.state.onUpdate();
      this.state.triggerUIUpdate();
      return;
    }

    const worldPt = this.getScreenToWorld(e.clientX, e.clientY);

    if (this.isDrawingLasso) {
      this.state.lassoPath.push({
        x: worldPt.x,
        y: worldPt.y,
        pressure: e.pressure || 0.5,
      });
      // НОВОЕ: Пересчитываем выделение прямо во время движения
      this.state.updateLassoSelection();
      this.state.onUpdate();
      return;
    }

    if (this.isDraggingSelection) {
      if (this.state.selectionMode === "move") {
        const dx = worldPt.x - this.lastDragWorldPt.x;
        const dy = worldPt.y - this.lastDragWorldPt.y;
        this.state.moveSelected(dx, dy);
      } else if (this.state.selectionMode === "scale") {
        const bounds = this.state.getSelectionBounds();
        if (bounds) {
          const cx = (bounds.minX + bounds.maxX) / 2;
          const cy = (bounds.minY + bounds.maxY) / 2;
          const lastDist = Math.hypot(
            this.lastDragWorldPt.x - cx,
            this.lastDragWorldPt.y - cy,
          );
          const currentDist = Math.hypot(worldPt.x - cx, worldPt.y - cy);

          if (lastDist > 1) {
            const scaleFactor = currentDist / lastDist;
            this.state.scaleSelected(scaleFactor, { x: cx, y: cy });
          }
        }
      }
      this.lastDragWorldPt = worldPt;
      return;
    }

    if (!this.isDrawing) return;

    if (this.state.currentPen.isEraser) {
      this.state.eraserMode === "stroke"
        ? this.state.eraseStrokeAt(worldPt)
        : this.state.erasePartialAt(worldPt);
    } else {
      this.state.addPoint({
        x: worldPt.x,
        y: worldPt.y,
        pressure: e.pressure || 0.5,
      });
    }
  };

  private handlePointerUp = () => {
    document.body.classList.remove("canvas-active");
    this.isPanning = false;

    if (this.isDrawingLasso) {
      this.isDrawingLasso = false;
      this.state.finishLasso();
    }
    this.isDraggingSelection = false;
    this.canvas.style.cursor = this.isSpacePressed ? "grab" : "";

    if (this.isDrawing) {
      this.isDrawing = false;
      if (
        !this.state.currentPen.isEraser &&
        !this.state.currentPen.isSelector
      ) {
        this.state.endStroke();
      }
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const { camera } = this.state;
    const newZoom = camera.zoom * zoomFactor;

    if (newZoom < 0.01 || newZoom > 100) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    camera.x = centerX - (centerX - camera.x) * (newZoom / camera.zoom);
    camera.y = centerY - (centerY - camera.y) * (newZoom / camera.zoom);
    camera.zoom = newZoom;

    this.state.onUpdate();
    this.state.triggerUIUpdate(); // Обязательно: UI тулбар должен масштабироваться!
    this.updateCursorVisual(e as unknown as PointerEvent);
  };

  private updateCursorVisual(e: PointerEvent) {
    if (e.pointerType !== "touch" && !this.state.currentPen.isSelector) {
      this.cursorCircle.classList.remove("hidden");
      const visualSize = this.state.currentPen.size * this.state.camera.zoom;
      this.cursorCircle.style.width = `${visualSize}px`;
      this.cursorCircle.style.height = `${visualSize}px`;
      if (e.clientX) {
        this.cursorCircle.style.left = `${e.clientX}px`;
        this.cursorCircle.style.top = `${e.clientY}px`;
      }
    } else {
      this.cursorCircle.classList.add("hidden");
    }
  }
}

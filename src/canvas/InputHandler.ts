import { round1 } from "../shared/utils";
import type { State } from "../core/State";
import type { Coordinate } from "../shared/types";

export class InputHandler {
  private isDrawing = false;
  private isPanning = false;
  private isSpacePressed = false;
  private isDrawingLasso = false;
  private isDraggingSelection = false;
  private hasDragged = false;

  private lastDragWorldPt: Coordinate = { x: 0, y: 0 };
  private lastPanPoint: Coordinate = { x: 0, y: 0 };

  private cursorCircle: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private state: State;

  private pointers = new Map<number, PointerEvent>();
  private lastPinchDist: number | null = null;
  private lastPinchCenter: Coordinate | null = null;

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
    window.addEventListener("pointercancel", this.handlePointerUp);
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
    this.pointers.set(e.pointerId, e);

    if (this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      this.lastPinchDist = Math.hypot(
        pts[0].clientX - pts[1].clientX,
        pts[0].clientY - pts[1].clientY,
      );
      this.lastPinchCenter = {
        x: (pts[0].clientX + pts[1].clientX) / 2,
        y: (pts[0].clientY + pts[1].clientY) / 2,
      };

      this.isPanning = true;
      this.isDrawing = false;
      this.isDrawingLasso = false;
      this.isDraggingSelection = false;
      this.state.currentStroke = [];
      this.state.lassoPath = [];
      this.state.onUpdate();
      return;
    }
    if (this.pointers.size > 2) return;

    if (e.pointerType === "touch" || e.button === 1 || this.isSpacePressed) {
      this.isPanning = true;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      if (this.isSpacePressed) this.canvas.style.cursor = "grabbing";
      return;
    }

    const worldPt = this.getScreenToWorld(e.clientX, e.clientY);

    if (this.state.spawningLibraryItem) {
      this.state.spawnLibraryItem(worldPt);
      this.canvas.style.cursor = "";
      return;
    }

    if (this.state.currentPen.isSelector) {
      if (this.state.isPointInSelectionBox(worldPt)) {
        this.isDraggingSelection = true;
        this.hasDragged = false;
        this.lastDragWorldPt = worldPt;
      } else {
        this.state.selectedStrokes.clear();
        this.isDrawingLasso = true;
        this.state.lassoPath = [{ x: worldPt.x, y: worldPt.y }];
        this.state.onUpdate();
        this.state.triggerUIUpdate();
      }
      return;
    }

    this.isDrawing = true;
    this.state.addPoint({
      x: round1(worldPt.x),
      y: round1(worldPt.y),
    });
  };

  private handlePointerMove = (e: PointerEvent) => {
    this.updateCursorVisual(e);

    if (this.pointers.has(e.pointerId)) {
      this.pointers.set(e.pointerId, e);
    }

    const isInteracting =
      this.isDrawing ||
      this.isPanning ||
      this.isDrawingLasso ||
      this.isDraggingSelection;

    if (isInteracting) {
      const EDGE_ZONE = window.innerWidth / 15;

      const isNearEdge =
        e.clientX < EDGE_ZONE ||
        e.clientY < EDGE_ZONE ||
        e.clientX > window.innerWidth - EDGE_ZONE ||
        e.clientY > window.innerHeight - EDGE_ZONE;

      if (isNearEdge) {
        document.body.classList.add("canvas-active");
      } else {
        document.body.classList.remove("canvas-active");
      }
    }

    if (this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      const dist = Math.hypot(
        pts[0].clientX - pts[1].clientX,
        pts[0].clientY - pts[1].clientY,
      );
      const center = {
        x: (pts[0].clientX + pts[1].clientX) / 2,
        y: (pts[0].clientY + pts[1].clientY) / 2,
      };

      if (this.lastPinchCenter && this.lastPinchDist) {
        this.state.camera.x += center.x - this.lastPinchCenter.x;
        this.state.camera.y += center.y - this.lastPinchCenter.y;

        const zoomFactor = dist / this.lastPinchDist;
        const newZoom = this.state.camera.zoom * zoomFactor;

        if (newZoom >= 0.01 && newZoom <= 100) {
          this.state.camera.x =
            center.x -
            (center.x - this.state.camera.x) *
              (newZoom / this.state.camera.zoom);
          this.state.camera.y =
            center.y -
            (center.y - this.state.camera.y) *
              (newZoom / this.state.camera.zoom);
          this.state.camera.zoom = newZoom;
        }

        this.lastPinchDist = dist;
        this.lastPinchCenter = center;
        this.state.onUpdate();
        this.state.triggerUIUpdate();
      }
      return;
    }

    if (this.isPanning) {
      this.state.camera.x += e.clientX - this.lastPanPoint.x;
      this.state.camera.y += e.clientY - this.lastPanPoint.y;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      this.state.onUpdate();
      this.state.triggerUIUpdate();
      return;
    }

    const worldPt = this.getScreenToWorld(e.clientX, e.clientY);

    const threshold = 2 / this.state.camera.zoom;

    if (this.isDrawingLasso) {
      const lastPt = this.state.lassoPath[this.state.lassoPath.length - 1];
      if (lastPt) {
        const dist = Math.hypot(worldPt.x - lastPt.x, worldPt.y - lastPt.y);
        if (dist < threshold) return;
      }

      this.state.lassoPath.push({
        x: round1(worldPt.x),
        y: round1(worldPt.y),
      });
      this.state.updateLassoSelection();
      this.state.onUpdate();
      return;
    }

    if (this.isDraggingSelection) {
      if (!this.hasDragged) {
        this.state.saveHistory();
        this.hasDragged = true;
      }

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

    const lastPt =
      this.state.currentStroke[this.state.currentStroke.length - 1];
    if (lastPt) {
      const dist = Math.hypot(worldPt.x - lastPt.x, worldPt.y - lastPt.y);
      if (dist < threshold) return;
    }

    this.state.addPoint({
      x: round1(worldPt.x),
      y: round1(worldPt.y),
    });
  };

  private handlePointerUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);

    if (this.pointers.size < 2) {
      this.lastPinchDist = null;
      this.lastPinchCenter = null;
    }

    if (this.pointers.size === 1) {
      const remaining = Array.from(this.pointers.values())[0];
      this.lastPanPoint = { x: remaining.clientX, y: remaining.clientY };
    }

    if (this.pointers.size === 0) {
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
        if (!this.state.currentPen.isSelector) {
          this.state.endStroke();
        }
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
    if (this.state.spawningLibraryItem) {
      this.canvas.style.cursor = "crosshair";
      this.cursorCircle.classList.add("hidden");
      return;
    }

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

import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "../shared/utils";
import type { State } from "../core/State";
import type { Stroke } from "../shared/types";
class LRUCache<K, V> {
  private max: number;
  private cache: Map<K, V> = new Map();
  constructor(max: number) {
    this.max = max;
  }
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }
  set(key: K, val: V) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, val);
  }
}
export class Render {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private state: State;
  private renderPending = false;
  private lastFpsTime = performance.now();
  private framesThisSecond = 0;
  private fpsElement = document.getElementById("fps-counter");
  private pathCache = new LRUCache<string, Path2D>(3000);
  private simplePathCache = new LRUCache<string, Path2D>(3000);
  constructor(canvas: HTMLCanvasElement, state: State) {
    this.canvas = canvas;
    this.state = state;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  private resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.render();
  }
  public render = () => {
    if (!this.renderPending) {
      this.renderPending = true;
      requestAnimationFrame(this.draw);
    }
  };
  private draw = () => {
    this.renderPending = false;
    const now = performance.now();
    this.framesThisSecond++;
    if (now - this.lastFpsTime >= 1000) {
      if (this.fpsElement) {
        this.fpsElement.innerText = `FPS: ${this.framesThisSecond}`;
      }
      this.framesThisSecond = 0;
      this.lastFpsTime = now;
    }
    const dpr = window.devicePixelRatio || 1;
    this.ctx.resetTransform();
    this.ctx.fillStyle = this.state.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(
      this.state.camera.zoom * dpr,
      0,
      0,
      this.state.camera.zoom * dpr,
      this.state.camera.x * dpr,
      this.state.camera.y * dpr,
    );
    this.drawAllStrokes();
    this.drawSelectionBox();
    this.drawLassoPath();
  };
  private drawAllStrokes() {
    const { camera, spatialIndex } = this.state;
    const vpMinX = -camera.x / camera.zoom;
    const vpMinY = -camera.y / camera.zoom;
    const vpMaxX = (window.innerWidth - camera.x) / camera.zoom;
    const vpMaxY = (window.innerHeight - camera.y) / camera.zoom;
    const visibleItems = spatialIndex.search({
      minX: vpMinX,
      minY: vpMinY,
      maxX: vpMaxX,
      maxY: vpMaxY,
    });
    const visibleIds = new Set(visibleItems.map((item) => item.stroke.id));
    const useLOD = camera.zoom < 0.5;
    for (const strokeId of this.state.strokeOrder) {
      if (!visibleIds.has(strokeId)) continue;
      const stroke = this.state.strokes.get(strokeId);
      if (!stroke) continue;
      if (stroke.type === "text" && stroke.text) {
        this.ctx.globalAlpha = 1.0;
        this.ctx.font = `${stroke.pen.size}px Arial`;
        this.ctx.fillStyle = stroke.color;
        this.ctx.textBaseline = "top";
        const lines = stroke.textLines || [stroke.text];
        let currentY = stroke.points[0].y;
        const lineHeight = stroke.pen.size * 1.2;
        for (const line of lines) {
          this.ctx.fillText(line, stroke.points[0].x, currentY);
          currentY += lineHeight;
        }
        continue;
      }
      let path = this.pathCache.get(stroke.id);
      let simplePath = this.simplePathCache.get(stroke.id);
      if (!path || !simplePath || stroke._pathDirty) {
        const outlinePoints = getStroke(stroke.points, {
          ...stroke.pen,
          simulatePressure: false,
        });
        path = new Path2D(getSvgPathFromStroke(outlinePoints));
        simplePath = new Path2D();
        if (stroke.points.length > 0) {
          simplePath.moveTo(stroke.points[0].x, stroke.points[0].y);
          const OPTIMIZATION_THRESHOLD = 10;
          let lastSavedPt = stroke.points[0];
          for (let i = 1; i < stroke.points.length - 1; i++) {
            const pt = stroke.points[i];
            const dist = Math.hypot(pt.x - lastSavedPt.x, pt.y - lastSavedPt.y);
            if (dist > OPTIMIZATION_THRESHOLD) {
              simplePath.lineTo(pt.x, pt.y);
              lastSavedPt = pt;
            }
          }
          const lastPt = stroke.points[stroke.points.length - 1];
          simplePath.lineTo(lastPt.x, lastPt.y);
        }
        this.pathCache.set(stroke.id, path);
        this.simplePathCache.set(stroke.id, simplePath);
        stroke._pathDirty = false;
      }
      if (this.state.erasingStrokes.has(stroke)) {
        this.ctx.globalAlpha = 0.3;
      } else if (stroke.pen.isMarker) {
        this.ctx.globalAlpha = 0.4;
      } else {
        this.ctx.globalAlpha = 1.0;
      }
      if (useLOD) {
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineWidth = stroke.pen.size;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.stroke(simplePath);
      } else {
        this.ctx.fillStyle = stroke.color;
        this.ctx.fill(path);
      }
    }
    this.ctx.globalAlpha = 1.0;
    if (this.state.currentStroke.length > 0) {
      this.ctx.fillStyle = this.state.currentColor;
      if (this.state.currentPen.isMarker) this.ctx.globalAlpha = 0.4;
      const outlinePoints = getStroke(this.state.currentStroke, {
        ...this.state.currentPen,
        simulatePressure: false,
      });
      const currentPath = new Path2D(getSvgPathFromStroke(outlinePoints));
      this.ctx.fill(currentPath);
      this.ctx.globalAlpha = 1.0;
    }
  }
  private computeStrokeBounds(stroke: Stroke) {
    if (stroke.points.length === 0) return undefined;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const padding = stroke.pen.size / 2 + 5;
    for (const p of stroke.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }
  private getBoundsForStrokes(strokes: Iterable<Stroke>) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let hasPoints = false;
    for (const stroke of strokes) {
      if (!stroke.bounds) {
        stroke.bounds = this.computeStrokeBounds(stroke);
      }
      const b = stroke.bounds;
      if (b) {
        hasPoints = true;
        if (b.minX < minX) minX = b.minX;
        if (b.minY < minY) minY = b.minY;
        if (b.maxX > maxX) maxX = b.maxX;
        if (b.maxY > maxY) maxY = b.maxY;
      }
    }
    if (!hasPoints) return null;
    return { minX, minY, maxX, maxY };
  }
  private drawSelectionBox() {
    if (this.state.selectedStrokes.size === 0) return;
    this.ctx.strokeStyle = "#3b82f6";
    this.ctx.lineWidth = 2 / this.state.camera.zoom;
    this.ctx.setLineDash([
      5 / this.state.camera.zoom,
      5 / this.state.camera.zoom,
    ]);
    const grouped = new Map<string, Stroke[]>();
    const individual = new Set<Stroke>();
    for (const stroke of this.state.selectedStrokes) {
      if (stroke.groupIds && stroke.groupIds.length > 0) {
        const topGroup = stroke.groupIds[stroke.groupIds.length - 1];
        if (!grouped.has(topGroup)) {
          grouped.set(topGroup, []);
        }
        grouped.get(topGroup)!.push(stroke);
      } else {
        individual.add(stroke);
      }
    }
    const drawBox = (
      bounds: { minX: number; minY: number; maxX: number; maxY: number } | null,
    ) => {
      if (!bounds) return;
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      this.ctx.strokeRect(bounds.minX, bounds.minY, width, height);
    };
    for (const stroke of individual) {
      drawBox(this.getBoundsForStrokes([stroke]));
    }
    for (const strokes of grouped.values()) {
      drawBox(this.getBoundsForStrokes(strokes));
    }
    this.ctx.setLineDash([]);
  }
  private drawLassoPath() {
    if (this.state.lassoPath.length === 0) return;
    this.ctx.beginPath();
    this.ctx.moveTo(this.state.lassoPath[0].x, this.state.lassoPath[0].y);
    for (let i = 1; i < this.state.lassoPath.length; i++) {
      this.ctx.lineTo(this.state.lassoPath[i].x, this.state.lassoPath[i].y);
    }
    this.ctx.closePath();
    this.ctx.strokeStyle = "#3b82f6";
    this.ctx.lineWidth = 1.5 / this.state.camera.zoom;
    this.ctx.setLineDash([
      5 / this.state.camera.zoom,
      5 / this.state.camera.zoom,
    ]);
    this.ctx.stroke();
    this.ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    this.ctx.fill();
    this.ctx.setLineDash([]);
  }
}

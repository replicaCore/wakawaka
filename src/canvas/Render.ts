// src/canvas/Render.ts
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "../utils";
import type { State } from "../core/State";
import type { PenOptions, Point, Stroke } from "../type";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private state: State;

  constructor(canvas: HTMLCanvasElement, state: State) {
    this.canvas = canvas;
    this.state = state;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.render();
  }

  public render = () => {
    this.ctx.resetTransform();
    this.ctx.fillStyle = this.state.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.setTransform(
      this.state.camera.zoom,
      0,
      0,
      this.state.camera.zoom,
      this.state.camera.x,
      this.state.camera.y,
    );

    this.drawAllStrokes();
    this.drawSelectionBox();
    this.drawLassoPath();
  };

  private drawAllStrokes() {
    for (const stroke of this.state.strokes) {
      this.ctx.fillStyle = stroke.color;
      this.drawPerfectStroke(stroke.points, stroke.pen);
    }

    if (this.state.currentStroke.length > 0) {
      this.ctx.fillStyle = this.state.currentColor;
      this.drawPerfectStroke(this.state.currentStroke, this.state.currentPen);
    }
  }

  // НОВОЕ: Вспомогательная функция вычисления границ для массива векторов
  private getBoundsForStrokes(strokes: Iterable<Stroke>) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let hasPoints = false;
    for (const stroke of strokes) {
      const padding = stroke.pen.size / 2 + 5;
      for (const p of stroke.points) {
        hasPoints = true;
        if (p.x - padding < minX) minX = p.x - padding;
        if (p.y - padding < minY) minY = p.y - padding;
        if (p.x + padding > maxX) maxX = p.x + padding;
        if (p.y + padding > maxY) maxY = p.y + padding;
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

    // Разделяем выделенные элементы на одиночки и группы
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

    // Функция для отрисовки рамки по координатам
    const drawBox = (
      bounds: { minX: number; minY: number; maxX: number; maxY: number } | null,
    ) => {
      if (!bounds) return;
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      this.ctx.strokeRect(bounds.minX, bounds.minY, width, height);
    };

    // Рисуем рамки для каждого одиночного вектора
    for (const stroke of individual) {
      drawBox(this.getBoundsForStrokes([stroke]));
    }

    // Рисуем общую рамку для каждой группы
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

  private drawPerfectStroke(points: Point[], penOption: PenOptions) {
    if (points.length === 0) return;
    if (penOption.isMarker) this.ctx.globalAlpha = 0.4;

    const outlinePoints = getStroke(points, penOption);
    const path = new Path2D(getSvgPathFromStroke(outlinePoints));
    this.ctx.fill(path);

    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.globalAlpha = 1.0;
  }
}

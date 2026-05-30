// src/core/State.ts
import type { Camera, Coordinate, PenOptions, Point, Stroke } from "../type";
import { PEN_PRESETS } from "./State-const";
import { pointInPolygon } from "../utils";

export class State {
  public strokes: Stroke[] = [];
  public currentStroke: Point[] = [];
  public history: Stroke[][] = [];
  public redoHistory: Stroke[][] = [];

  public selectedStrokes: Set<Stroke> = new Set();
  public lassoPath: Point[] = [];

  // НОВОЕ: Режим выделения (перемещение или масштабирование)
  public selectionMode: "move" | "scale" = "move";

  public camera: Camera = { x: 0, y: 0, zoom: 1 };
  public backgroundColor: string = "#000000";
  public invertColors: boolean = false;

  public colors: string[] = [
    "#ef4444",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
  ];
  public currentColor: string = this.colors[0];

  public pens: PenOptions[] = JSON.parse(JSON.stringify(PEN_PRESETS));
  public currentPen: PenOptions = this.pens[0];

  public onUpdate: () => void = () => {};
  public onUIUpdate: () => void = () => {};
  public eraserMode: "partial" | "stroke" = "partial";

  private uiListeners: (() => void)[] = [];

  public subscribeUI(fn: () => void) {
    this.uiListeners.push(fn);
  }

  public triggerUIUpdate() {
    this.uiListeners.forEach((fn) => fn());
  }

  public saveHistory() {
    this.history.push(JSON.parse(JSON.stringify(this.strokes)));
    this.redoHistory = [];
  }

  public addPoint(point: Point) {
    this.currentStroke.push(point);
    this.onUpdate();
  }

  public eraseStrokeAt(point: Coordinate) {
    const radius = this.currentPen.size / 2;
    const initialLength = this.strokes.length;
    this.strokes = this.strokes.filter((stroke) => {
      return !stroke.points.some(
        (p) => Math.hypot(p.x - point.x, p.y - point.y) < radius,
      );
    });
    if (this.strokes.length !== initialLength) this.onUpdate();
  }

  public erasePartialAt(point: Coordinate) {
    const radius = this.currentPen.size / 2;
    const newStrokes: Stroke[] = [];
    let changed = false;

    for (const stroke of this.strokes) {
      let currentSegment: Point[] = [];
      let strokeChanged = false;
      for (const p of stroke.points) {
        if (Math.hypot(p.x - point.x, p.y - point.y) < radius) {
          strokeChanged = true;
          changed = true;
          if (currentSegment.length > 0) {
            newStrokes.push({ ...stroke, points: currentSegment });
            currentSegment = [];
          }
        } else {
          currentSegment.push(p);
        }
      }
      if (strokeChanged && currentSegment.length > 0) {
        newStrokes.push({ ...stroke, points: currentSegment });
      } else if (!strokeChanged) {
        newStrokes.push(stroke);
      }
    }
    if (changed) {
      this.strokes = newStrokes;
      this.onUpdate();
    }
  }

  public setPen(index: number) {
    this.currentPen = this.pens[index];
    this.selectedStrokes.clear();
    this.selectionMode = "move"; // Сброс режима
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public setEraserMode(mode: "partial" | "stroke") {
    this.eraserMode = mode;
    this.triggerUIUpdate();
  }

  public endStroke() {
    if (this.currentStroke.length > 0) {
      this.saveHistory();
      this.strokes.push({
        points: [...this.currentStroke],
        color: this.currentColor,
        pen: { ...this.currentPen },
      });
      this.currentStroke = [];
      this.onUpdate();
    }
  }

  public undo() {
    if (this.history.length > 0) {
      this.redoHistory.push(JSON.parse(JSON.stringify(this.strokes)));
      this.strokes = this.history.pop()!;
      this.selectedStrokes.clear();
      this.onUpdate();
      this.triggerUIUpdate();
    }
  }

  public redo() {
    if (this.redoHistory.length > 0) {
      this.history.push(JSON.parse(JSON.stringify(this.strokes)));
      this.strokes = this.redoHistory.pop()!;
      this.selectedStrokes.clear();
      this.onUpdate();
      this.triggerUIUpdate();
    }
  }

  public setColor(color: string) {
    this.currentColor = color;
    this.triggerUIUpdate();
  }

  // НОВОЕ: Получение границ (Bounding Box) текущего выделения
  public getSelectionBounds() {
    if (this.selectedStrokes.size === 0) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const stroke of this.selectedStrokes) {
      const padding = stroke.pen.size / 2 + 5;
      for (const p of stroke.points) {
        if (p.x - padding < minX) minX = p.x - padding;
        if (p.y - padding < minY) minY = p.y - padding;
        if (p.x + padding > maxX) maxX = p.x + padding;
        if (p.y + padding > maxY) maxY = p.y + padding;
      }
    }
    return { minX, minY, maxX, maxY };
  }

  public isPointInSelectionBox(pt: Coordinate): boolean {
    const bounds = this.getSelectionBounds();
    if (!bounds) return false;
    return (
      pt.x >= bounds.minX &&
      pt.x <= bounds.maxX &&
      pt.y >= bounds.minY &&
      pt.y <= bounds.maxY
    );
  }

  public finishLasso() {
    if (this.lassoPath.length < 3) {
      this.lassoPath = [];
      this.selectedStrokes.clear();
      this.onUpdate();
      this.triggerUIUpdate(); // Обязательно обновляем UI!
      return;
    }

    this.selectedStrokes.clear();
    for (const stroke of this.strokes) {
      for (const p of stroke.points) {
        if (pointInPolygon(p, this.lassoPath)) {
          this.selectedStrokes.add(stroke);
          break;
        }
      }
    }
    this.lassoPath = [];
    this.onUpdate();
    this.triggerUIUpdate(); // Обязательно обновляем UI!
  }

  // НОВЫЕ МЕТОДЫ ДЛЯ КНОПОК
  public deleteSelection() {
    if (this.selectedStrokes.size === 0) return;
    this.saveHistory();
    this.strokes = this.strokes.filter((s) => !this.selectedStrokes.has(s));
    this.selectedStrokes.clear();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public changeSelectionColor() {
    if (this.selectedStrokes.size === 0) return;
    this.saveHistory();
    for (const stroke of this.selectedStrokes) {
      stroke.color = this.currentColor; // Используем выбранный в палитре цвет
    }
    this.onUpdate();
  }

  public moveSelected(dx: number, dy: number) {
    for (const stroke of this.selectedStrokes) {
      for (const p of stroke.points) {
        p.x += dx;
        p.y += dy;
      }
    }
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public scaleSelected(scale: number, origin: Coordinate) {
    for (const stroke of this.selectedStrokes) {
      for (const p of stroke.points) {
        p.x = origin.x + (p.x - origin.x) * scale;
        p.y = origin.y + (p.y - origin.y) * scale;
      }
      stroke.pen.size *= scale; // Масштабируем толщину кисти тоже
    }
    this.onUpdate();
    this.triggerUIUpdate();
  }
}

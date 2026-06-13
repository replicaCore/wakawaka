import { getStroke } from "perfect-freehand";
import RBush from "rbush";
import type {
  Project,
  Stroke,
  Point,
  PenOptions,
  Camera,
  Coordinate,
  LibraryItem,
  SpatialItem,
  HistoryStep,
} from "../shared/types";
import {
  PEN_PRESETS,
  DUPLICATE_OFFSET_PX,
  ERASER_HITBOX_PADDING,
} from "./State-const";
import { HistoryManager } from "./HistoryManager";
import {
  getSelectionBounds,
  pointInPolygon,
  isPointInBounds,
  isEraserIntersectingStroke,
} from "./SelectionMath";
import { round1 } from "../shared/utils";

export function fastCloneStroke(s: Stroke): Stroke {
  return {
    id: s.id,
    type: s.type,
    text: s.text,
    color: s.color,
    pen: { ...s.pen },
    _pathDirty: s._pathDirty,
    groupIds: s.groupIds ? [...s.groupIds] : undefined,
    bounds: s.bounds ? { ...s.bounds } : undefined,
    points: s.points.map((p) => ({ x: p.x, y: p.y })),
    outlinePolygon: s.outlinePolygon
      ? s.outlinePolygon.map((p) => ({ x: p.x, y: p.y }))
      : undefined,
  };
}

export class State {
  public currentProjectId: string | null = null;
  public currentProjectName: string = "Новый холст";
  public isDirty: boolean = false;

  public strokes: Map<string, Stroke> = new Map();
  public strokeOrder: string[] = [];

  public currentStroke: Point[] = [];
  public erasingStrokes: Set<Stroke> = new Set();
  public selectedStrokes: Set<Stroke> = new Set();
  public lassoPath: Point[] = [];
  public selectionMode: "move" | "scale" = "move";

  public libraryItems: LibraryItem[] = [];
  public spawningLibraryItem: LibraryItem | null = null;
  public onLibrarySave: (item: LibraryItem) => void = () => {};
  public onLibraryDelete: (id: string) => void = () => {};
  public selectionDragAnywhere: boolean = true;
  private uiUpdatePending: boolean = false;

  public camera: Camera = { x: 0, y: 0, zoom: 1 };
  public backgroundColor: string = "#000000";
  public invertColors: boolean = false;

  public colors: any[] = [
    "#282828",
    "#ef4444",
    "#22c55e",
    "#3b82f6",
    "#eab308",
  ];
  public currentColor: string = this.colors[0];

  public penSizes: [number, number, number] = [4, 12, 24];
  public activeSizeIndex: number = 1;
  public pens: PenOptions[] = structuredClone(PEN_PRESETS); // Здесь можно оставить, т.к. это выполняется 1 раз и массив крошечный
  public currentPen: PenOptions = this.pens[0];

  private historyManager = new HistoryManager();
  public onUpdate: () => void = () => {};
  private uiListeners: (() => void)[] = [];
  private dragBeforeState: Stroke[] | null = null;

  public spatialIndex = new RBush<SpatialItem>(9);
  private spatialMap = new Map<string, SpatialItem>();

  public syncDeltas = new Map<string, Stroke | null>();

  public subscribeUI(fn: () => void) {
    this.uiListeners.push(fn);
    return () => {
      this.uiListeners = this.uiListeners.filter((listener) => listener !== fn);
    };
  }

  public triggerUIUpdate() {
    if (!this.uiUpdatePending) {
      this.uiUpdatePending = true;
      requestAnimationFrame(() => {
        this.uiUpdatePending = false;
        this.uiListeners.forEach((fn) => fn());
      });
    }
  }

  public markDirty() {
    this.isDirty = true;
  }

  private ensureBounds(stroke: Stroke) {
    if (!stroke.bounds) {
      stroke.bounds = getSelectionBounds([stroke]) || {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
      };
    }
    return stroke.bounds;
  }

  private addStrokeToIndex(stroke: Stroke) {
    const b = this.ensureBounds(stroke);
    const item: SpatialItem = {
      minX: b.minX,
      minY: b.minY,
      maxX: b.maxX,
      maxY: b.maxY,
      stroke,
    };
    this.spatialIndex.insert(item);
    this.spatialMap.set(stroke.id, item);
  }

  private removeStrokeFromIndex(stroke: Stroke) {
    const item = this.spatialMap.get(stroke.id);
    if (item) {
      this.spatialIndex.remove(item);
      this.spatialMap.delete(stroke.id);
    }
  }

  private rebuildSpatialIndex() {
    this.spatialIndex.clear();
    this.spatialMap.clear();

    const items: SpatialItem[] = [];
    for (const id of this.strokeOrder) {
      const stroke = this.strokes.get(id);
      if (stroke) {
        const b = this.ensureBounds(stroke);
        const item = {
          minX: b.minX,
          minY: b.minY,
          maxX: b.maxX,
          maxY: b.maxY,
          stroke,
        };
        items.push(item);
        this.spatialMap.set(stroke.id, item);
      }
    }
    this.spatialIndex.load(items);
  }

  private setStrokesFromList(strokesList: Stroke[]) {
    this.strokes.clear();
    this.strokeOrder = [];
    for (const stroke of strokesList) {
      this.strokes.set(stroke.id, stroke);
      this.strokeOrder.push(stroke.id);
    }
    this.rebuildSpatialIndex();
  }

  public getStrokesList(): Stroke[] {
    return this.strokeOrder.map((id) => this.strokes.get(id)!).filter(Boolean);
  }

  private applyInverseStep(step: HistoryStep) {
    switch (step.action) {
      case "ADD":
        for (const s of step.strokes) {
          this.removeStrokeFromIndex(this.strokes.get(s.id)!);
          this.strokes.delete(s.id);
          this.strokeOrder = this.strokeOrder.filter((id) => id !== s.id);
          this.syncDeltas.set(s.id, null);
        }
        break;
      case "DELETE":
        const restores = step.strokes
          .map((s, i) => ({
            stroke: s,
            index: step.indices?.[i] ?? this.strokeOrder.length,
          }))
          .sort((a, b) => a.index - b.index);

        for (const r of restores) {
          // ✅ Оптимизация
          this.strokes.set(r.stroke.id, fastCloneStroke(r.stroke));
          this.strokeOrder.splice(r.index, 0, r.stroke.id);
          this.addStrokeToIndex(this.strokes.get(r.stroke.id)!);
          this.syncDeltas.set(r.stroke.id, this.strokes.get(r.stroke.id)!);
        }
        break;
      case "UPDATE":
        for (const s of step.before) {
          this.removeStrokeFromIndex(this.strokes.get(s.id)!);
          // ✅ Оптимизация
          const restored = fastCloneStroke(s);
          this.strokes.set(s.id, restored);
          this.addStrokeToIndex(restored);
          this.syncDeltas.set(s.id, restored);
        }
        break;
      case "REORDER":
        this.strokeOrder = [...step.before];
        break;
    }
  }

  private applyForwardStep(step: HistoryStep) {
    switch (step.action) {
      case "ADD":
        for (const s of step.strokes) {
          // ✅ Оптимизация
          const cloned = fastCloneStroke(s);
          this.strokes.set(s.id, cloned);
          this.strokeOrder.push(s.id);
          this.addStrokeToIndex(cloned);
          this.syncDeltas.set(s.id, cloned);
        }
        break;
      case "DELETE":
        for (const s of step.strokes) {
          this.removeStrokeFromIndex(this.strokes.get(s.id)!);
          this.strokes.delete(s.id);
          this.strokeOrder = this.strokeOrder.filter((id) => id !== s.id);
          this.syncDeltas.set(s.id, null);
        }
        break;
      case "UPDATE":
        for (const s of step.after) {
          this.removeStrokeFromIndex(this.strokes.get(s.id)!);
          // ✅ Оптимизация
          const cloned = fastCloneStroke(s);
          this.strokes.set(s.id, cloned);
          this.addStrokeToIndex(cloned);
          this.syncDeltas.set(s.id, cloned);
        }
        break;
      case "REORDER":
        this.strokeOrder = [...step.after];
        break;
    }
  }

  public undo() {
    const step = this.historyManager.undo();
    if (step) {
      const selectedIds = Array.from(this.selectedStrokes).map((s) => s.id);

      this.applyInverseStep(step);

      this.selectedStrokes.clear();
      for (const id of selectedIds) {
        const updatedStroke = this.strokes.get(id);
        if (updatedStroke) {
          this.selectedStrokes.add(updatedStroke);
        }
      }

      this.markDirty();
      this.onUpdate();
      this.triggerUIUpdate();
    }
  }

  public redo() {
    const step = this.historyManager.redo();
    if (step) {
      // 1. Запоминаем ID выделенных элементов
      const selectedIds = Array.from(this.selectedStrokes).map((s) => s.id);

      // 2. Применяем шаг истории
      this.applyForwardStep(step);

      // 3. Восстанавливаем выделение со свежими ссылками
      this.selectedStrokes.clear();
      for (const id of selectedIds) {
        const updatedStroke = this.strokes.get(id);
        if (updatedStroke) {
          this.selectedStrokes.add(updatedStroke);
        }
      }

      this.markDirty();
      this.onUpdate();
      this.triggerUIUpdate();
    }
  }

  private executeUpdate(updateFn: () => void) {
    if (this.selectedStrokes.size === 0) return;
    // ✅ Оптимизация: поверхностное копирование массива штрихов
    const before = Array.from(this.selectedStrokes).map(fastCloneStroke);
    updateFn();
    const after = Array.from(this.selectedStrokes).map(fastCloneStroke);
    for (const s of this.selectedStrokes) this.syncDeltas.set(s.id, s);

    this.historyManager.push({ action: "UPDATE", before, after });
    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public startContinuousUpdate() {
    if (this.selectedStrokes.size === 0) return;
    // ✅ Оптимизация
    this.dragBeforeState = Array.from(this.selectedStrokes).map(
      fastCloneStroke,
    );
  }

  public commitContinuousUpdate() {
    if (!this.dragBeforeState || this.selectedStrokes.size === 0) return;
    // ✅ Оптимизация
    const after = Array.from(this.selectedStrokes).map(fastCloneStroke);
    this.historyManager.push({
      action: "UPDATE",
      before: this.dragBeforeState,
      after,
    });
    this.dragBeforeState = null;
    for (const s of this.selectedStrokes) this.syncDeltas.set(s.id, s);
  }

  public addPoint(point: Point) {
    this.currentStroke.push(point);
    this.onUpdate();
  }

  public endStroke() {
    if (this.currentStroke.length > 0) {
      const rawPolygon = getStroke(this.currentStroke, {
        ...this.currentPen,
        simulatePressure: false,
      });
      const outlinePolygon = rawPolygon.map((pt) => ({ x: pt[0], y: pt[1] }));

      const newStroke: Stroke = {
        id: this.generateId(),
        points: [...this.currentStroke],
        color: this.currentColor,
        pen: { ...this.currentPen },
        outlinePolygon,
        _pathDirty: true,
      };

      this.strokes.set(newStroke.id, newStroke);
      this.strokeOrder.push(newStroke.id);
      this.currentStroke = [];
      this.syncDeltas.set(newStroke.id, newStroke);

      this.historyManager.push({
        action: "ADD",
        // ✅ Оптимизация
        strokes: [fastCloneStroke(newStroke)],
      });

      this.addStrokeToIndex(newStroke);
      this.markDirty();
      this.onUpdate();
    }
  }

  public handleEraser(p1: Point, p2: Point) {
    const padding = ERASER_HITBOX_PADDING / this.camera.zoom;
    const eraserBounds = {
      minX: Math.min(p1.x, p2.x) - padding,
      minY: Math.min(p1.y, p2.y) - padding,
      maxX: Math.max(p1.x, p2.x) + padding,
      maxY: Math.max(p1.y, p2.y) + padding,
    };

    const candidates = this.spatialIndex
      .search(eraserBounds)
      .map((item) => item.stroke);

    let found = false;
    for (const stroke of candidates) {
      if (this.erasingStrokes.has(stroke)) continue;

      if (isEraserIntersectingStroke(p1, p2, stroke, this.camera.zoom)) {
        if (stroke.groupIds && stroke.groupIds.length > 0) {
          const topGroup = stroke.groupIds[stroke.groupIds.length - 1];
          for (const id of this.strokeOrder) {
            const s = this.strokes.get(id)!;
            if (s.groupIds && s.groupIds.includes(topGroup)) {
              this.erasingStrokes.add(s);
            }
          }
        } else {
          this.erasingStrokes.add(stroke);
        }
        found = true;
      }
    }
    if (found) this.onUpdate();
  }

  public commitEraser() {
    if (this.erasingStrokes.size > 0) {
      const erasedArr = Array.from(this.erasingStrokes);
      const indices = erasedArr.map((s) => this.strokeOrder.indexOf(s.id));
      this.historyManager.push({
        action: "DELETE",
        // ✅ Оптимизация
        strokes: erasedArr.map(fastCloneStroke),
        indices,
      });

      for (const s of erasedArr) {
        this.removeStrokeFromIndex(s);
        this.strokes.delete(s.id);
        this.syncDeltas.set(s.id, null);
      }

      const erasedIds = new Set(erasedArr.map((s) => s.id));
      this.strokeOrder = this.strokeOrder.filter((id) => !erasedIds.has(id));

      this.erasingStrokes.clear();
      this.markDirty();
      this.onUpdate();
    }
  }

  public setPen(index: number) {
    this.currentPen = this.pens[index];
    this.selectedStrokes.clear();
    this.selectionMode = "move";

    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public setColor(color: string) {
    this.currentColor = color;
    if (this.selectedStrokes.size > 0) {
      this.executeUpdate(() => {
        for (const stroke of this.selectedStrokes) stroke.color = color;
      });
    }

    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public setPenSizeIndex(index: number) {
    if (index >= 0 && index <= 2) {
      this.activeSizeIndex = index;
      this.pens[0].size = this.penSizes[index];
      this.triggerUIUpdate();
      this.markDirty();
      this.onUpdate();
    }
  }

  public getSelectionBounds() {
    return getSelectionBounds(this.selectedStrokes);
  }

  public isPointInSelectionBox(pt: Coordinate) {
    const bounds = this.getSelectionBounds();
    return isPointInBounds(pt, bounds);
  }

  public updateLassoSelection() {
    if (this.lassoPath.length < 3) {
      this.selectedStrokes.clear();
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of this.lassoPath) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const candidates = this.spatialIndex
      .search({ minX, minY, maxX, maxY })
      .map((i) => i.stroke);
    const groupMap = new Map<string, Stroke[]>();

    for (const stroke of this.strokes.values()) {
      if (stroke.groupIds && stroke.groupIds.length > 0) {
        const topGroup = stroke.groupIds[stroke.groupIds.length - 1];
        if (!groupMap.has(topGroup)) groupMap.set(topGroup, []);
        groupMap.get(topGroup)!.push(stroke);
      }
    }

    const initiallySelected = new Set<Stroke>();
    const processedGroups = new Set<string>();

    for (const stroke of candidates) {
      if (initiallySelected.has(stroke)) continue;

      let intersects = false;
      for (const p of stroke.points) {
        if (pointInPolygon(p, this.lassoPath)) {
          intersects = true;
          break;
        }
      }

      if (intersects) {
        if (stroke.groupIds && stroke.groupIds.length > 0) {
          const topGroup = stroke.groupIds[stroke.groupIds.length - 1];
          if (!processedGroups.has(topGroup)) {
            processedGroups.add(topGroup);
            const groupStrokes = groupMap.get(topGroup) || [];
            for (const s of groupStrokes) initiallySelected.add(s);
          }
        } else {
          initiallySelected.add(stroke);
        }
      }
    }

    this.selectedStrokes = initiallySelected;
  }

  public finishLasso() {
    this.lassoPath = [];
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public deleteSelection() {
    if (this.selectedStrokes.size === 0) return;
    const delArr = Array.from(this.selectedStrokes);
    const indices = delArr.map((s) => this.strokeOrder.indexOf(s.id));
    this.historyManager.push({
      action: "DELETE",
      // ✅ Оптимизация
      strokes: delArr.map(fastCloneStroke),
      indices,
    });

    const deletedIds = new Set<string>();
    for (const s of this.selectedStrokes) {
      this.removeStrokeFromIndex(s);
      this.strokes.delete(s.id);
      this.syncDeltas.set(s.id, null);
      deletedIds.add(s.id);
    }

    this.strokeOrder = this.strokeOrder.filter((id) => !deletedIds.has(id));
    this.selectedStrokes.clear();
    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public changeSelectionColor() {
    this.executeUpdate(() => {
      for (const stroke of this.selectedStrokes)
        stroke.color = this.currentColor;
    });
  }

  public moveSelected(dx: number, dy: number) {
    for (const stroke of this.selectedStrokes) {
      this.removeStrokeFromIndex(stroke);

      stroke.bounds = undefined;
      stroke.outlinePolygon = undefined;
      stroke._pathDirty = true;

      for (const p of stroke.points) {
        p.x = round1(p.x + dx);
        p.y = round1(p.y + dy);
      }

      this.addStrokeToIndex(stroke);
    }
    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public scaleSelected(scale: number, origin: Coordinate) {
    for (const stroke of this.selectedStrokes) {
      this.removeStrokeFromIndex(stroke);

      stroke.bounds = undefined;
      stroke.outlinePolygon = undefined;
      stroke._pathDirty = true;

      for (const p of stroke.points) {
        p.x = round1(origin.x + (p.x - origin.x) * scale);
        p.y = round1(origin.y + (p.y - origin.y) * scale);
      }
      stroke.pen.size = round1(stroke.pen.size * scale);

      this.addStrokeToIndex(stroke);
    }
    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public groupSelected() {
    if (this.selectedStrokes.size < 2) return;

    const topLevelEntities = new Set<string>();
    let ungroupedCount = 0;
    for (const stroke of this.selectedStrokes) {
      if (stroke.groupIds && stroke.groupIds.length > 0) {
        topLevelEntities.add(stroke.groupIds[stroke.groupIds.length - 1]);
      } else {
        ungroupedCount++;
      }
    }
    if (topLevelEntities.size + ungroupedCount < 2) return;

    const newGroupId = this.generateId();
    this.executeUpdate(() => {
      for (const stroke of this.selectedStrokes) {
        if (!stroke.groupIds) stroke.groupIds = [];
        stroke.groupIds.push(newGroupId);
      }
    });
  }

  public ungroupSelected() {
    if (this.selectedStrokes.size === 0) return;

    this.executeUpdate(() => {
      const topGroupsToUngroup = new Set<string>();
      for (const stroke of this.selectedStrokes) {
        if (stroke.groupIds && stroke.groupIds.length > 0) {
          topGroupsToUngroup.add(stroke.groupIds[stroke.groupIds.length - 1]);
        }
      }
      for (const stroke of this.strokes.values()) {
        if (stroke.groupIds && stroke.groupIds.length > 0) {
          const top = stroke.groupIds[stroke.groupIds.length - 1];
          if (topGroupsToUngroup.has(top)) stroke.groupIds.pop();
        }
      }
    });
  }

  public duplicateSelected() {
    if (this.selectedStrokes.size === 0) return;

    const offset = DUPLICATE_OFFSET_PX / this.camera.zoom;
    const newSelected = new Set<Stroke>();
    const groupMap = new Map<string, string>();
    const newStrokesList: Stroke[] = [];

    for (const stroke of this.selectedStrokes) {
      // ✅ Оптимизация
      const newStroke: Stroke = fastCloneStroke(stroke);

      newStroke.id = this.generateId();
      newStroke.bounds = undefined;
      newStroke.outlinePolygon = undefined;
      newStroke._pathDirty = true;

      if (newStroke.groupIds) {
        newStroke.groupIds = newStroke.groupIds.map((gid) => {
          if (!groupMap.has(gid)) groupMap.set(gid, this.generateId());
          return groupMap.get(gid)!;
        });
      }

      for (const p of newStroke.points) {
        p.x = round1(p.x + offset);
        p.y = round1(p.y + offset);
      }

      this.strokes.set(newStroke.id, newStroke);
      this.strokeOrder.push(newStroke.id);
      newSelected.add(newStroke);
      newStrokesList.push(newStroke);
      this.addStrokeToIndex(newStroke);
    }

    this.historyManager.push({
      action: "ADD",
      // ✅ Оптимизация
      strokes: newStrokesList.map(fastCloneStroke),
    });

    this.selectedStrokes = newSelected;
    this.selectionMode = "move";
    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public flipSelected(direction: "horizontal" | "vertical") {
    if (this.selectedStrokes.size === 0) return;
    const bounds = this.getSelectionBounds();
    if (!bounds) return;

    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;

    this.executeUpdate(() => {
      for (const stroke of this.selectedStrokes) {
        this.removeStrokeFromIndex(stroke);

        stroke.bounds = undefined;
        stroke.outlinePolygon = undefined;
        stroke._pathDirty = true;

        for (const p of stroke.points) {
          if (direction === "horizontal") p.x = round1(2 * cx - p.x);
          else p.y = round1(2 * cy - p.y);
        }

        this.addStrokeToIndex(stroke);
      }
    });
  }

  public reorderSelected(direction: "up" | "down" | "front" | "back") {
    if (this.selectedStrokes.size === 0) return;

    const beforeOrder = [...this.strokeOrder];

    const selectedIds = new Set(
      Array.from(this.selectedStrokes).map((s) => s.id),
    );
    const unselectedIds = this.strokeOrder.filter((id) => !selectedIds.has(id));
    const sortedSelectedIds = this.strokeOrder.filter((id) =>
      selectedIds.has(id),
    );

    if (direction === "front") {
      this.strokeOrder = [...unselectedIds, ...sortedSelectedIds];
    } else if (direction === "back") {
      this.strokeOrder = [...sortedSelectedIds, ...unselectedIds];
    } else if (direction === "up") {
      const newOrder = [...this.strokeOrder];
      for (let i = newOrder.length - 2; i >= 0; i--) {
        if (selectedIds.has(newOrder[i]) && !selectedIds.has(newOrder[i + 1])) {
          const temp = newOrder[i];
          newOrder[i] = newOrder[i + 1];
          newOrder[i + 1] = temp;
        }
      }
      this.strokeOrder = newOrder;
    } else if (direction === "down") {
      const newOrder = [...this.strokeOrder];
      for (let i = 1; i < newOrder.length; i++) {
        if (selectedIds.has(newOrder[i]) && !selectedIds.has(newOrder[i - 1])) {
          const temp = newOrder[i];
          newOrder[i] = newOrder[i - 1];
          newOrder[i - 1] = temp;
        }
      }
      this.strokeOrder = newOrder;
    }

    let changed = false;
    for (let i = 0; i < beforeOrder.length; i++) {
      if (beforeOrder[i] !== this.strokeOrder[i]) {
        changed = true;
        break;
      }
    }

    if (changed) {
      this.historyManager.push({
        action: "REORDER",
        before: beforeOrder,
        after: [...this.strokeOrder],
      });
      this.markDirty();
      this.onUpdate();
      this.triggerUIUpdate();
    }
  }

  // Только измененные методы в src/core/State.ts

  public loadProject(project: Project | null) {
    let loadedStrokes: Stroke[] = [];

    if (project) {
      this.currentProjectId = project.id;
      this.currentProjectName = project.name;
      this.syncDeltas.clear();
      this.backgroundColor = project.backgroundColor || "#000000";
      this.camera = project.camera || { x: 0, y: 0, zoom: 1 };
      this.selectionDragAnywhere = project.selectionDragAnywhere ?? true;

      this.penSizes = project.penSizes || [4, 12, 24];
      this.activeSizeIndex = project.activeSizeIndex ?? 1;

      if (project.colors && project.colors.length > 0) {
        this.colors = structuredClone(project.colors);
      } else {
        this.colors = ["#000000", "#ef4444", "#22c55e", "#3b82f6", "#eab308"];
      }

      if (project.penOptions) {
        this.pens[0] = project.penOptions;
        this.pens[0].icon = "pen-tool";
      } else {
        this.pens[0] = structuredClone(PEN_PRESETS[0]);
      }
      this.historyManager.load(project.history, project.redoHistory);

      loadedStrokes = (project.strokes || []).map((stroke) => {
        if (!stroke.id) stroke.id = this.generateId();
        stroke._pathDirty = true;

        // <--- ДОБАВЛЕНО: Генерируем textLines для старых проектов
        if (stroke.type === "text" && stroke.text && !stroke.textLines) {
          stroke.textLines = stroke.text.split("\n");
        }

        return stroke;
      });
    } else {
      this.currentProjectId = Date.now().toString();
      this.currentProjectName =
        "Новый проект " + new Date().toLocaleTimeString();
      this.backgroundColor = "#000000";
      this.camera = { x: 0, y: 0, zoom: 1 };
      this.selectionDragAnywhere = true;

      this.colors = ["#000000", "#ef4444", "#22c55e", "#3b82f6", "#eab308"];

      this.pens[0].icon = "pen-tool";
      this.penSizes = [4, 12, 24];
      this.activeSizeIndex = 1;
      this.pens[0] = structuredClone(PEN_PRESETS[0]);
      this.historyManager.clear();
      loadedStrokes = [];
    }

    this.setStrokesFromList(loadedStrokes);
    this.selectedStrokes.clear();
    this.lassoPath = [];
    this.isDirty = false;
    this.currentPen = this.pens[0];
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public addText(
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const newStroke: Stroke = {
      id: this.generateId(),
      type: "text",
      text,
      textLines: text.split("\n"), // <--- ДОБАВЛЕНО: Один раз сплитим
      points: [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ],
      color: this.currentColor,
      pen: { ...this.currentPen },
      _pathDirty: true,
    };
    newStroke.outlinePolygon = [...newStroke.points];

    this.strokes.set(newStroke.id, newStroke);
    this.strokeOrder.push(newStroke.id);
    this.syncDeltas.set(newStroke.id, newStroke);

    this.historyManager.push({
      action: "ADD",
      strokes: [fastCloneStroke(newStroke)],
    });

    this.addStrokeToIndex(newStroke);
    this.markDirty();
    this.onUpdate();
  }

  public getProjectData(includeHistory = false): Project {
    const { history, redoHistory } = this.historyManager.getRawData();
    return {
      activeSizeIndex: this.activeSizeIndex,
      backgroundColor: this.backgroundColor,
      camera: this.camera,
      history: includeHistory ? history : [],
      id: this.currentProjectId!,
      name: this.currentProjectName,
      penOptions: this.pens[0],
      penSizes: this.penSizes,
      redoHistory: includeHistory ? redoHistory : [],
      selectionDragAnywhere: this.selectionDragAnywhere,
      colors: this.colors,
      strokes: this.getStrokesList(),
      thumbnail: "",
      updatedAt: Date.now(),
    };
  }

  public spawnLibraryItem(pt: Coordinate) {
    if (!this.spawningLibraryItem) return;

    const bounds = getSelectionBounds(this.spawningLibraryItem.strokes);
    if (!bounds) return;

    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const dx = pt.x - cx;
    const dy = pt.y - cy;

    // ✅ Оптимизация
    const newStrokes: Stroke[] =
      this.spawningLibraryItem.strokes.map(fastCloneStroke);
    const newGroupId = this.generateId();

    for (const s of newStrokes) {
      s.id = this.generateId();
      s.bounds = undefined;
      s._pathDirty = true;
      if (!s.groupIds) s.groupIds = [];
      s.groupIds.push(newGroupId);
      for (const p of s.points) {
        p.x = round1(p.x + dx);
        p.y = round1(p.y + dy);
      }
      this.strokes.set(s.id, s);
      this.strokeOrder.push(s.id);
      this.addStrokeToIndex(s);
    }

    this.historyManager.push({
      action: "ADD",
      // ✅ Оптимизация
      strokes: newStrokes.map(fastCloneStroke),
    });

    this.selectedStrokes = new Set(newStrokes);
    this.spawningLibraryItem = null;
    this.selectionMode = "move";
    this.currentPen = this.pens.find((p) => p.isSelector) || this.pens[1];

    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  private generateId() {
    return (
      Math.random().toString(36).substring(2, 12) + Date.now().toString(36)
    );
  }
}

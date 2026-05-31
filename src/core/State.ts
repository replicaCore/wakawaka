import type {
  Camera,
  Coordinate,
  PenOptions,
  Point,
  Project,
  Stroke,
} from "../type";
import { PEN_PRESETS } from "./State-const";
import { pointInPolygon } from "../utils";

export class State {
  public currentProjectId: string | null = null;
  public currentProjectName: string = "Новый холст";
  public isDirty: boolean = false;
  public strokes: Stroke[] = [];
  public currentStroke: Point[] = [];
  public history: Stroke[][] = [];
  public redoHistory: Stroke[][] = [];

  public selectedStrokes: Set<Stroke> = new Set();
  public lassoPath: Point[] = [];

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

  public setPen(index: number) {
    this.currentPen = this.pens[index];
    this.selectedStrokes.clear();
    this.selectionMode = "move";
    this.onUpdate();
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

  // НОВОЕ: Метод обновления выделения в реальном времени
  public updateLassoSelection() {
    if (this.lassoPath.length < 3) {
      this.selectedStrokes.clear();
      return;
    }

    const initiallySelected = new Set<Stroke>();
    for (const stroke of this.strokes) {
      for (const p of stroke.points) {
        if (pointInPolygon(p, this.lassoPath)) {
          initiallySelected.add(stroke);
          break;
        }
      }
    }

    let expanded = true;
    while (expanded) {
      expanded = false;
      const currentTopGroups = new Set<string>();

      for (const stroke of initiallySelected) {
        if (stroke.groupIds && stroke.groupIds.length > 0) {
          currentTopGroups.add(stroke.groupIds[stroke.groupIds.length - 1]);
        }
      }

      if (currentTopGroups.size > 0) {
        for (const stroke of this.strokes) {
          if (
            !initiallySelected.has(stroke) &&
            stroke.groupIds &&
            stroke.groupIds.length > 0
          ) {
            const topGroup = stroke.groupIds[stroke.groupIds.length - 1];
            if (currentTopGroups.has(topGroup)) {
              initiallySelected.add(stroke);
              expanded = true;
            }
          }
        }
      }
    }
    this.selectedStrokes = initiallySelected;
  }

  public finishLasso() {
    this.lassoPath = []; // Просто очищаем линию лассо, выделение уже посчитано
    this.onUpdate();
    this.triggerUIUpdate();
  }

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
      stroke.color = this.currentColor;
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
      stroke.pen.size *= scale;
    }
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public groupSelected() {
    if (this.selectedStrokes.size < 2) return;
    this.saveHistory();
    const newGroupId = Math.random().toString(36).substring(2, 10);

    for (const stroke of this.selectedStrokes) {
      if (!stroke.groupIds) stroke.groupIds = [];
      stroke.groupIds.push(newGroupId);
    }
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public ungroupSelected() {
    if (this.selectedStrokes.size === 0) return;
    this.saveHistory();

    const topGroupsToUngroup = new Set<string>();
    for (const stroke of this.selectedStrokes) {
      if (stroke.groupIds && stroke.groupIds.length > 0) {
        topGroupsToUngroup.add(stroke.groupIds[stroke.groupIds.length - 1]);
      }
    }

    for (const stroke of this.strokes) {
      if (stroke.groupIds && stroke.groupIds.length > 0) {
        const top = stroke.groupIds[stroke.groupIds.length - 1];
        if (topGroupsToUngroup.has(top)) {
          stroke.groupIds.pop();
        }
      }
    }

    this.onUpdate();
    this.triggerUIUpdate();
  }

  public loadProject(project: Project | null) {
    if (project) {
      this.currentProjectId = project.id;
      this.currentProjectName = project.name;
      this.strokes = project.strokes || [];
      this.backgroundColor = project.backgroundColor || "#000000";
      this.camera = project.camera || { x: 0, y: 0, zoom: 1 };
    } else {
      this.currentProjectId = Date.now().toString();
      this.currentProjectName =
        "Новый проект " + new Date().toLocaleTimeString();
      this.strokes = [];
      this.backgroundColor = "#000000";
      this.camera = { x: 0, y: 0, zoom: 1 };
    }

    this.history = [];
    this.redoHistory = [];
    this.selectedStrokes.clear();
    this.lassoPath = [];

    // НОВОЕ: Сброс флага
    this.isDirty = false;

    this.onUpdate();
    this.triggerUIUpdate();
  }

  public getProjectData(): Project {
    return {
      id: this.currentProjectId!,
      name: this.currentProjectName,
      thumbnail: "",
      updatedAt: Date.now(),
      strokes: this.strokes,
      backgroundColor: this.backgroundColor,
      camera: this.camera,
    };
  }

  public setPenSize(size: number) {
    this.currentPen.size = size;
    this.triggerUIUpdate();
  }
}

import type {
  Project,
  Stroke,
  Point,
  PenOptions,
  Camera,
  Coordinate,
} from "../shared/types";
import { PEN_PRESETS } from "./State-const";
import { HistoryManager } from "./HistoryManager";
import {
  getSelectionBounds,
  pointInPolygon,
  isPointInBounds,
} from "./SelectionMath";
import { round1 } from "../shared/utils";

export class State {
  public currentProjectId: string | null = null;
  public currentProjectName: string = "Новый холст";
  public isDirty: boolean = false;

  public strokes: Stroke[] = [];
  public currentStroke: Point[] = [];

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

  public penSizes: [number, number, number] = [4, 12, 24];
  public activeSizeIndex: number = 1;
  public pens: PenOptions[] = JSON.parse(JSON.stringify(PEN_PRESETS));
  public currentPen: PenOptions = this.pens[0];

  private historyManager = new HistoryManager();

  public onUpdate: () => void = () => {};
  private uiListeners: (() => void)[] = [];

  public subscribeUI(fn: () => void) {
    this.uiListeners.push(fn);
  }
  public triggerUIUpdate() {
    this.uiListeners.forEach((fn) => fn());
  }
  public markDirty() {
    this.isDirty = true;
  }

  // --- ИСТОРИЯ ---
  public saveHistory() {
    this.historyManager.save(this.strokes);
  }

  public undo() {
    const prevState = this.historyManager.undo(this.strokes);
    if (prevState) {
      this.strokes = prevState;
      this.selectedStrokes.clear();
      this.markDirty();
      this.onUpdate();
      this.triggerUIUpdate();
    }
  }

  public redo() {
    const nextState = this.historyManager.redo(this.strokes);
    if (nextState) {
      this.strokes = nextState;
      this.selectedStrokes.clear();
      this.markDirty();
      this.onUpdate();
      this.triggerUIUpdate();
    }
  }

  // --- РИСОВАНИЕ И КИСТИ ---
  public addPoint(point: Point) {
    this.currentStroke.push(point);
    this.onUpdate();
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
      this.markDirty();
      this.onUpdate();
    }
  }

  public setPen(index: number) {
    this.currentPen = this.pens[index];
    this.selectedStrokes.clear();
    this.selectionMode = "move";
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public setColor(color: string) {
    this.currentColor = color;
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

  public togglePressure(val: boolean) {
    this.pens[0].simulatePressure = val;
    this.triggerUIUpdate();
    this.markDirty();
    this.onUpdate();
  }

  // --- ВЫДЕЛЕНИЕ (LASSO, ТРАНСФОРМАЦИИ) ---
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
    this.lassoPath = [];
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public deleteSelection() {
    if (this.selectedStrokes.size === 0) return;
    this.saveHistory();
    this.strokes = this.strokes.filter((s) => !this.selectedStrokes.has(s));
    this.selectedStrokes.clear();
    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public changeSelectionColor() {
    if (this.selectedStrokes.size === 0) return;
    this.saveHistory();
    for (const stroke of this.selectedStrokes) {
      stroke.color = this.currentColor;
    }
    this.markDirty();
    this.onUpdate();
  }

  public moveSelected(dx: number, dy: number) {
    for (const stroke of this.selectedStrokes) {
      for (const p of stroke.points) {
        p.x = round1(p.x + dx);
        p.y = round1(p.y + dy);
      }
    }
    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public scaleSelected(scale: number, origin: Coordinate) {
    for (const stroke of this.selectedStrokes) {
      for (const p of stroke.points) {
        p.x = round1(origin.x + (p.x - origin.x) * scale);
        p.y = round1(origin.y + (p.y - origin.y) * scale);
      }
      stroke.pen.size = round1(stroke.pen.size * scale);
    }
    this.markDirty();
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
    this.markDirty();
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
        if (topGroupsToUngroup.has(top)) stroke.groupIds.pop();
      }
    }
    this.markDirty();
    this.onUpdate();
    this.triggerUIUpdate();
  }

  // --- УПРАВЛЕНИЕ ПРОЕКТОМ ---
  public loadProject(project: Project | null) {
    if (project) {
      this.currentProjectId = project.id;
      this.currentProjectName = project.name;
      this.strokes = project.strokes || [];
      this.backgroundColor = project.backgroundColor || "#000000";
      this.camera = project.camera || { x: 0, y: 0, zoom: 1 };

      this.penSizes = project.penSizes || [4, 12, 24];
      this.activeSizeIndex = project.activeSizeIndex ?? 1;
      if (project.penOptions) {
        this.pens[0] = project.penOptions;
        this.pens[0].icon = "pen-tool";
      } else {
        this.pens[0] = JSON.parse(JSON.stringify(PEN_PRESETS[0]));
      }
      this.historyManager.load(project.history, project.redoHistory);
    } else {
      this.currentProjectId = Date.now().toString();
      this.currentProjectName =
        "Новый проект " + new Date().toLocaleTimeString();
      this.strokes = [];
      this.backgroundColor = "#000000";
      this.camera = { x: 0, y: 0, zoom: 1 };

      this.pens[0].icon = "pen-tool";
      this.penSizes = [4, 12, 24];
      this.activeSizeIndex = 1;
      this.pens[0] = JSON.parse(JSON.stringify(PEN_PRESETS[0]));
      this.historyManager.clear();
    }

    this.selectedStrokes.clear();
    this.lassoPath = [];
    this.isDirty = false;
    this.currentPen = this.pens[0];
    this.onUpdate();
    this.triggerUIUpdate();
  }

  public getProjectData(includeHistory = false): Project {
    const { history, redoHistory } = this.historyManager.getRawData();
    return {
      id: this.currentProjectId!,
      name: this.currentProjectName,
      thumbnail: "",
      updatedAt: Date.now(),
      strokes: this.strokes,
      backgroundColor: this.backgroundColor,
      camera: this.camera,
      penSizes: this.penSizes,
      activeSizeIndex: this.activeSizeIndex,
      penOptions: this.pens[0],
      history: includeHistory ? history : [],
      redoHistory: includeHistory ? redoHistory : [],
    };
  }
}

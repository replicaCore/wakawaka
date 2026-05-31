import type { Stroke } from "../shared/types";

export class HistoryManager {
  private history: Stroke[][] = [];
  private redoHistory: Stroke[][] = [];
  private maxSteps = 20;

  public save(strokes: Stroke[]) {
    this.history.push(JSON.parse(JSON.stringify(strokes)));
    if (this.history.length > this.maxSteps) this.history.shift();
    this.redoHistory = [];
  }

  public undo(currentStrokes: Stroke[]): Stroke[] | null {
    if (this.history.length === 0) return null;
    this.redoHistory.push(JSON.parse(JSON.stringify(currentStrokes)));
    return this.history.pop()!;
  }

  public redo(currentStrokes: Stroke[]): Stroke[] | null {
    if (this.redoHistory.length === 0) return null;
    this.history.push(JSON.parse(JSON.stringify(currentStrokes)));
    return this.redoHistory.pop()!;
  }

  public clear() {
    this.history = [];
    this.redoHistory = [];
  }

  public load(history: Stroke[][] = [], redoHistory: Stroke[][] = []) {
    this.history = history;
    this.redoHistory = redoHistory;
  }

  public getRawData() {
    return { history: this.history, redoHistory: this.redoHistory };
  }
}

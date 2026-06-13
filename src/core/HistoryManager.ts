import type { HistoryStep } from "../shared/types";
export class HistoryManager {
  private history: HistoryStep[] = [];
  private redoHistory: HistoryStep[] = [];
  private maxSteps = 20; 
  public push(step: HistoryStep) {
    this.history.push(step);
    if (this.history.length > this.maxSteps) this.history.shift();
    this.redoHistory = [];
  }
  public undo(): HistoryStep | null {
    if (this.history.length === 0) return null;
    const step = this.history.pop()!;
    this.redoHistory.push(step);
    return step;
  }
  public redo(): HistoryStep | null {
    if (this.redoHistory.length === 0) return null;
    const step = this.redoHistory.pop()!;
    this.history.push(step);
    return step;
  }
  public clear() {
    this.history = [];
    this.redoHistory = [];
  }
  public load(history: HistoryStep[] = [], redoHistory: HistoryStep[] = []) {
    this.history = history;
    this.redoHistory = redoHistory;
  }
  public getRawData() {
    return { history: this.history, redoHistory: this.redoHistory };
  }
  public peekLastStep(): HistoryStep | null {
    return this.history.length > 0
      ? this.history[this.history.length - 1]
      : null;
  }
}

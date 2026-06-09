// src/core/HistoryManager.ts
import type { Stroke, HistoryStep } from "../shared/types";

export class HistoryManager {
  private history: HistoryStep[] = [];
  private redoHistory: HistoryStep[] = [];
  private maxSteps = 20; // Теперь памяти жрет мало, можем дать 50 шагов!

  public push(step: HistoryStep) {
    this.history.push(step);
    if (this.history.length > this.maxSteps) this.history.shift();
    this.redoHistory = [];
  }

  // Применяем обратное действие
  public undo(currentStrokes: Stroke[]): Stroke[] | null {
    if (this.history.length === 0) return null;
    const step = this.history.pop()!;
    this.redoHistory.push(step);

    let newStrokes = [...currentStrokes];

    switch (step.action) {
      case "ADD":
        // Отмена ДОБАВЛЕНИЯ = УДАЛЕНИЕ
        const idsToRemove = new Set(step.strokes.map((s) => s.id));
        newStrokes = newStrokes.filter((s) => !idsToRemove.has(s.id));
        break;

      case "DELETE":
        // Отмена УДАЛЕНИЯ = ВОЗВРАЩЕНИЕ
        newStrokes.push(...structuredClone(step.strokes));
        break;

      case "UPDATE":
        // Отмена ОБНОВЛЕНИЯ = ВОЗВРАТ К 'BEFORE'
        const beforeMap = new Map(step.before.map((s) => [s.id, s]));
        newStrokes = newStrokes.map((s) =>
          beforeMap.has(s.id) ? structuredClone(beforeMap.get(s.id)!) : s,
        );
        break;
    }

    return newStrokes;
  }

  // Применяем действие снова
  public redo(currentStrokes: Stroke[]): Stroke[] | null {
    if (this.redoHistory.length === 0) return null;
    const step = this.redoHistory.pop()!;
    this.history.push(step);

    let newStrokes = [...currentStrokes];

    switch (step.action) {
      case "ADD":
        // Повтор ДОБАВЛЕНИЯ = ДОБАВИТЬ СНОВА
        newStrokes.push(...structuredClone(step.strokes));
        break;

      case "DELETE":
        // Повтор УДАЛЕНИЯ = УДАЛИТЬ СНОВА
        const idsToDelete = new Set(step.strokes.map((s) => s.id));
        newStrokes = newStrokes.filter((s) => !idsToDelete.has(s.id));
        break;

      case "UPDATE":
        // Повтор ОБНОВЛЕНИЯ = ПРИМЕНИТЬ 'AFTER'
        const afterMap = new Map(step.after.map((s) => [s.id, s]));
        newStrokes = newStrokes.map((s) =>
          afterMap.has(s.id) ? structuredClone(afterMap.get(s.id)!) : s,
        );
        break;
    }

    return newStrokes;
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
}

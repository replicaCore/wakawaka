// src/services/AutosaveService.ts
import type { State } from "../core/State";

export class AutosaveService {
  private timer: number | null = null;
  private worker: Worker;
  private initializedProjects = new Set<string>();

  constructor(
    private state: State,
    private canvas: HTMLCanvasElement,
  ) {
    // Инициализируем воркер с помощью встроенного синтаксиса Vite
    this.worker = new Worker(new URL("./autosave.worker.ts", import.meta.url), {
      type: "module",
    });

    // Обработка ошибок воркера
    this.worker.onerror = (error) => {
      console.error("Autosave worker error:", error);
    };

    this.worker.onmessage = (event) => {
      if (event.data.type === "SAVED") {
        console.log("Autosave completed:", event.data.projectId);
      } else if (event.data.type === "ERROR") {
        console.error("Autosave error:", event.data.error);
      }
    };
  }

  public trigger() {
    if (!this.state.currentProjectId) return;
    if (this.timer) clearTimeout(this.timer);

    this.timer = window.setTimeout(() => {
      if (this.state.isDirty) this.forceSave();
    }, 3000) as unknown as number;
  }

  public forceSave() {
    if (!this.state.currentProjectId || !this.state.isDirty) return;
    if (this.timer) clearTimeout(this.timer);

    const projectId = this.state.currentProjectId;
    const isInit = !this.initializedProjects.has(projectId);

    // 1. Генерация картинки (Canvas API работает ТОЛЬКО в главном потоке)
    const thumbnail = this.generateThumbnail();

    // 2. Собираем мета-данные проекта
    const projectData = this.state.getProjectData(false);

    // ✅ ИСПРАВЛЕНИЕ ТИПОВ: Отделяем strokes через деструктуризацию
    const { strokes, ...meta } = {
      ...projectData,
      thumbnail,
      updatedAt: Date.now(),
    };

    // 3. Получаем дельты (измененные штрихи с момента последнего сохранения)
    const deltas = Array.from(this.state.syncDeltas.entries());
    this.state.syncDeltas.clear(); // Очищаем после отправки

    // 4. Отправляем в фоновый поток
    this.worker.postMessage({
      type: isInit ? "INIT_AND_SAVE" : "UPDATE_AND_SAVE",
      payload: {
        projectId,
        meta,
        strokeOrder: this.state.strokeOrder, // Легкий массив ID для порядка отрисовки
        deltas, // { strokeId, stroke | null } - null означает удаление
        fullStrokes: isInit ? this.state.getStrokesList() : undefined, // Только при первой инициализации
      },
    });

    this.initializedProjects.add(projectId);
    this.state.isDirty = false;
  }

  private generateThumbnail(): string {
    try {
      const tempCanvas = document.createElement("canvas");
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return "";

      const MAX_SIZE = 400;
      const ratio = this.canvas.width / this.canvas.height;

      if (ratio > 1) {
        tempCanvas.width = MAX_SIZE;
        tempCanvas.height = MAX_SIZE / ratio;
      } else {
        tempCanvas.width = MAX_SIZE * ratio;
        tempCanvas.height = MAX_SIZE;
      }

      ctx.drawImage(this.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      return tempCanvas.toDataURL("image/jpeg", 0.6);
    } catch (error) {
      console.error("Failed to generate thumbnail:", error);
      return "";
    }
  }

  public dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.worker.terminate();
  }
}

// src/services/Autosave.ts
import type { State } from "../core/State";

export class AutosaveService {
  private timer: number | null = null;
  private worker: Worker;

  constructor(
    private state: State,
    private canvas: HTMLCanvasElement,
  ) {
    // Инициализируем воркер с помощью встроенного синтаксиса Vite
    this.worker = new Worker(new URL("./autosave.worker.ts", import.meta.url), {
      type: "module",
    });
  }

  public trigger() {
    if (!this.state.currentProjectId) return;
    if (this.timer) clearTimeout(this.timer);

    this.timer = window.setTimeout(() => {
      if (this.state.isDirty) this.forceSave();
    }, 3000) as unknown as number;
  }

  // Метод больше не async, так как отправка в воркер происходит мгновенно
  public forceSave() {
    if (!this.state.currentProjectId || !this.state.isDirty) return;
    if (this.timer) clearTimeout(this.timer);

    // 1. Генерация картинки (Canvas API работает ТОЛЬКО в главном потоке)
    const thumbnail = this.generateThumbnail();

    // 2. Быстро собираем данные
    const data = this.state.getProjectData(false);

    // 3. Отправляем в фоновый поток (postMessage делает быстрый structuredClone,
    // а вот тяжелая запись в БД будет в воркере)
    this.worker.postMessage({
      type: "SAVE_PROJECT",
      payload: {
        ...data,
        thumbnail,
        updatedAt: Date.now(),
      },
    });

    this.state.isDirty = false;
  }

  private generateThumbnail(): string {
    const tempCanvas = document.createElement("canvas");
    const ctx = tempCanvas.getContext("2d")!;
    const MAX_SIZE = 400;
    const ratio = this.canvas.width / this.canvas.height;

    tempCanvas.width = ratio > 1 ? MAX_SIZE : MAX_SIZE * ratio;
    tempCanvas.height = ratio > 1 ? MAX_SIZE / ratio : MAX_SIZE;

    ctx.drawImage(this.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    return tempCanvas.toDataURL("image/jpeg", 0.6);
  }
}

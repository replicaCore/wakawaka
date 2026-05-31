import type { Database } from "./Database";
import type { State } from "../core/State";

export class AutosaveService {
  private timer: number | null = null;

  constructor(
    private db: Database,
    private state: State,
    private canvas: HTMLCanvasElement,
  ) {}

  public trigger() {
    if (!this.state.currentProjectId) return;
    if (this.timer) clearTimeout(this.timer);

    this.timer = window.setTimeout(() => {
      if (this.state.isDirty) this.forceSave();
    }, 3000) as unknown as number;
  }

  public async forceSave() {
    if (!this.state.currentProjectId || !this.state.isDirty) return;
    if (this.timer) clearTimeout(this.timer);

    const thumbnail = this.generateThumbnail();
    const data = this.state.getProjectData(false);

    await this.db.saveProject({
      ...data,
      thumbnail,
      updatedAt: Date.now(),
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

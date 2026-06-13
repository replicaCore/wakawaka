import type { State } from "../core/State";
export class AutosaveService {
  private timer: number | null = null;
  private worker: Worker;
  private initializedProjects = new Set<string>();
  private saveResolvers = new Map<string, () => void>();
  constructor(
    private state: State,
    private canvas: HTMLCanvasElement,
  ) {
    this.worker = new Worker(new URL("./autosave.worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onerror = (error) => {
      console.error("Autosave worker error:", error);
    };
    this.worker.onmessage = (event) => {
      if (event.data.type === "SAVED") {
        const resolver = this.saveResolvers.get(event.data.projectId);
        if (resolver) {
          resolver();
          this.saveResolvers.delete(event.data.projectId);
        }
      } else if (event.data.type === "ERROR") {
        console.error("Autosave error:", event.data.error);
        if (event.data.projectId) {
          const resolver = this.saveResolvers.get(event.data.projectId);
          if (resolver) {
            resolver();
            this.saveResolvers.delete(event.data.projectId);
          }
        }
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
  public forceSave(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.state.currentProjectId || !this.state.isDirty) {
        resolve(); 
        return;
      }
      if (this.timer) clearTimeout(this.timer);
      const projectId = this.state.currentProjectId;
      const isInit = !this.initializedProjects.has(projectId);
      const thumbnail = this.generateThumbnail();
      const projectData = this.state.getProjectData(false);
      const { strokes, ...meta } = {
        ...projectData,
        thumbnail,
        updatedAt: Date.now(),
      };
      const deltas = Array.from(this.state.syncDeltas.entries());
      this.state.syncDeltas.clear(); 
      this.saveResolvers.set(projectId, resolve);
      this.worker.postMessage({
        type: isInit ? "INIT_AND_SAVE" : "UPDATE_AND_SAVE",
        payload: {
          projectId,
          meta,
          strokeOrder: this.state.strokeOrder, 
          deltas, 
          fullStrokes: isInit ? this.state.getStrokesList() : undefined, 
        },
      });
      this.initializedProjects.add(projectId);
      this.state.isDirty = false;
    });
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

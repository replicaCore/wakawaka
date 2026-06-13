import type { State } from "../core/State";
import type { Database } from "../services/Database";
import { importFile } from "../services/Exporter";
import type { Project } from "../shared/types";
import { refreshIcons } from "./icons";
export class Hub {
  private db: Database;
  private state: State;
  private canvas: HTMLCanvasElement;
  private autosaveTimer: number | null = null;
  private hubScreen = document.getElementById("hub-screen") as HTMLDivElement;
  private editorScreen = document.getElementById(
    "editor-screen",
  ) as HTMLDivElement;
  private grid = document.getElementById("projects-grid") as HTMLDivElement;
  constructor(db: Database, state: State, canvas: HTMLCanvasElement) {
    this.db = db;
    this.state = state;
    this.canvas = canvas;
    document
      .getElementById("new-project-btn")
      ?.addEventListener("click", () => this.createNewProject());
    document
      .getElementById("back-to-hub-btn")
      ?.addEventListener("click", () => this.saveAndGoToHub());
    document.getElementById("import-btn")?.addEventListener("click", () => {
      document.getElementById("import-file-input")?.click();
    });
    document
      .getElementById("import-file-input")
      ?.addEventListener("change", async (e) => {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const project = await importFile(file);
        if (project) {
          project.id = Date.now().toString(); 
          this.openProject(project);
        }
        input.value = ""; 
      });
  }
  public async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get("id");
    if (projectId) {
      const proj = await this.db.getProject(projectId);
      if (proj) {
        this.openProject(proj);
        return; 
      }
    }
    this.showHub();
    this.renderGrid();
  }
  public triggerAutosave() {
    if (!this.state.currentProjectId) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = window.setTimeout(() => {
      if (this.state.isDirty) {
        this.saveCurrentProject();
      }
    }, 3000) as unknown as number;
  }
  public async forceSave() {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    if (this.state.isDirty) {
      await this.saveCurrentProject();
    }
  }
  private generateThumbnail(): string {
    const tempCanvas = document.createElement("canvas");
    const ctx = tempCanvas.getContext("2d")!;
    const MAX_SIZE = 400; 
    const ratio = this.canvas.width / this.canvas.height;
    if (ratio > 1) {
      tempCanvas.width = MAX_SIZE;
      tempCanvas.height = MAX_SIZE / ratio;
    } else {
      tempCanvas.height = MAX_SIZE;
      tempCanvas.width = MAX_SIZE * ratio;
    }
    ctx.drawImage(this.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    return tempCanvas.toDataURL("image/jpeg", 0.6);
  }
  private async saveCurrentProject() {
    if (!this.state.currentProjectId) return;
    const thumbnail = this.generateThumbnail();
    const data = this.state.getProjectData(false);
    await this.db.saveProject({
      ...data,
      thumbnail: thumbnail,
      updatedAt: Date.now(),
    });
    this.state.isDirty = false;
  }
  private async saveAndGoToHub() {
    if (this.state.isDirty) {
      await this.saveCurrentProject();
    }
    this.showHub();
    this.renderGrid();
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  private createNewProject() {
    this.state.loadProject(null);
    this.showEditor();
    window.history.replaceState(
      {},
      document.title,
      `?id=${this.state.currentProjectId}`,
    );
  }
  private openProject(project: Project) {
    this.state.loadProject(project);
    this.showEditor();
    window.history.replaceState({}, document.title, `?id=${project.id}`);
  }
  private async renderGrid() {
    this.grid.innerHTML = "";
    const projects = await this.db.getAllProjects();
    projects.sort((a, b) => b.updatedAt - a.updatedAt);
    if (projects.length === 0) {
      this.grid.innerHTML = `<div class="col-span-full text-center text-gray-400 mt-10">У вас пока нет проектов. Создайте новый!</div>`;
      return;
    }
    projects.forEach((proj) => {
      const card = document.createElement("div");
      card.className =
        "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group relative flex flex-col";
      const date = new Date(proj.updatedAt).toLocaleDateString();
      card.innerHTML = `
        <div class="aspect-square bg-gray-100 relative">
           <img src="${proj.thumbnail}" class="w-full h-full object-cover" alt="thumbnail">
        </div>
        <div class="p-3">
           <h3 class="font-bold text-gray-800 truncate">${proj.name}</h3>
           <p class="text-xs text-gray-400 mt-1">${date}</p>
        </div>
        <button class="delete-btn absolute top-2 right-2 bg-white text-red-500 w-8 h-8 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-50">
          <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
        </button>
      `;
      card.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest(".delete-btn")) return;
        this.openProject(proj);
      });
      card
        .querySelector(".delete-btn")
        ?.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (confirm(`Удалить проект "${proj.name}"?`)) {
            await this.db.deleteProject(proj.id);
            this.renderGrid();
          }
        });
      this.grid.appendChild(card);
    });
    refreshIcons();
  }
  public showEditor() {
    this.hubScreen.classList.add("hidden");
    this.editorScreen.classList.remove("hidden");
  }
  public showHub() {
    this.editorScreen.classList.add("hidden");
    this.hubScreen.classList.remove("hidden");
  }
}

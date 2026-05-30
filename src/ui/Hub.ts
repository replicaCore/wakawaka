// src/ui/Hub.ts
import type { Database } from "../canvas/Database";
import type { State } from "../core/State";

export class Hub {
  private db: Database;
  private state: State;
  private canvas: HTMLCanvasElement; // Нужен для создания скриншота

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

    this.renderGrid();
  }

  // Отрисовка списка проектов
  private async renderGrid() {
    this.grid.innerHTML = ""; // Очищаем

    const projects = await this.db.getAllProjects();

    // Сортируем по дате (сначала новые)
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
        <button class="delete-btn absolute top-2 right-2 bg-white text-red-500 w-8 h-8 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-50">✕</button>
      `;

      // Клик по карточке открывает проект
      card.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest(".delete-btn")) return;
        this.openProject(proj);
      });

      // Кнопка удаления
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
  }

  // Создать новый пустой проект
  private createNewProject() {
    this.state.loadProject(null); // Передаем null, создастся чистый лист
    this.showEditor();
  }

  // Открыть существующий проект
  private openProject(project: any) {
    this.state.loadProject(project);
    this.showEditor();
  }

  // Сохранить текущий проект и выйти
  private async saveAndGoToHub() {
    // Делаем скриншот текущего состояния холста (0.2 качество для легкости базы)
    const thumbnail = this.canvas.toDataURL("image/jpeg", 0.2);

    // Получаем данные
    const data = this.state.getProjectData();

    // Сохраняем в БД
    await this.db.saveProject({
      ...data,
      thumbnail: thumbnail,
      updatedAt: Date.now(),
    });

    this.showHub();
    this.renderGrid();
  }

  // Смена экранов
  private showEditor() {
    this.hubScreen.classList.add("hidden");
    this.editorScreen.classList.remove("hidden");
  }

  private showHub() {
    this.editorScreen.classList.add("hidden");
    this.hubScreen.classList.remove("hidden");
  }
}

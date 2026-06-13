import type { State } from "../../core/State";
import { refreshIcons } from "../icons";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "../../shared/utils";
export class LibraryBar {
  private panel: HTMLDivElement;
  private grid: HTMLDivElement;
  private statusText: HTMLDivElement;
  private actionBtn: HTMLButtonElement;
  private state: State;
  private isSelectionMode = false;
  private justSaved = false;
  constructor(state: State) {
    this.state = state;
    this.panel = document.getElementById("library-panel") as HTMLDivElement;
    this.grid = document.getElementById("library-grid") as HTMLDivElement;
    this.statusText = document.getElementById(
      "library-status",
    ) as HTMLDivElement;
    this.actionBtn = document.getElementById(
      "lib-action-btn",
    ) as HTMLButtonElement;
    document
      .getElementById("library-close-btn")
      ?.addEventListener("click", () => this.close());
    this.actionBtn.addEventListener("click", () => {
      if (this.isSelectionMode) {
        this.saveSelection();
      } else {
        this.open();
      }
    });
    this.state.subscribeUI(() => this.render());
    this.renderActionBtn(); 
  }
  private open() {
    this.panel.classList.remove("translate-x-full");
    this.renderGrid(true); 
  }
  private close() {
    this.panel.classList.add("translate-x-full");
    this.state.spawningLibraryItem = null;
    this.state.triggerUIUpdate();
  }
  private saveSelection() {
    if (this.state.selectedStrokes.size === 0) return;
    const thumbnail = this.generateThumbnail(this.state.selectedStrokes);
    const item = {
      id: Date.now().toString(),
      strokes: JSON.parse(
        JSON.stringify(Array.from(this.state.selectedStrokes)),
      ),
      thumbnail,
    };
    this.state.libraryItems.push(item);
    this.state.onLibrarySave(item);
    this.justSaved = true;
    this.renderActionBtn();
    setTimeout(() => {
      this.justSaved = false;
      this.renderActionBtn();
    }, 1000);
    if (!this.panel.classList.contains("translate-x-full")) {
      this.renderGrid(true);
    }
  }
  private render() {
    const hasSelection = this.state.selectedStrokes.size > 0;
    if (this.isSelectionMode !== hasSelection) {
      this.isSelectionMode = hasSelection;
      this.renderActionBtn();
    }
    if (!this.panel.classList.contains("translate-x-full")) {
      this.renderGrid();
    }
  }
  private renderActionBtn() {
    if (this.justSaved) {
      this.actionBtn.innerHTML = `<i data-lucide="check" class="w-6 h-6 text-green-500 pointer-events-none"></i>`;
    } else if (this.isSelectionMode) {
      this.actionBtn.innerHTML = `<i data-lucide="star" class="w-6 h-6 text-yellow-500 pointer-events-none drop-shadow-sm fill-yellow-100"></i>`;
    } else {
      this.actionBtn.innerHTML = `<i data-lucide="library" class="w-6 h-6 text-gray-700 pointer-events-none"></i>`;
    }
    refreshIcons();
  }
  private renderGrid(forceRebuild = false) {
    if (
      !forceRebuild &&
      this.grid.children.length === this.state.libraryItems.length &&
      this.state.libraryItems.length > 0
    ) {
      Array.from(this.grid.children).forEach((card, i) => {
        const item = this.state.libraryItems[i];
        const isSpawning = this.state.spawningLibraryItem === item;
        if (isSpawning) {
          card.classList.add("border-blue-500", "ring-2", "ring-blue-200");
          card.classList.remove("border-gray-200", "hover:border-gray-300");
        } else {
          card.classList.remove("border-blue-500", "ring-2", "ring-blue-200");
          card.classList.add("border-gray-200", "hover:border-gray-300");
        }
      });
      if (this.state.spawningLibraryItem)
        this.statusText.classList.remove("hidden");
      else this.statusText.classList.add("hidden");
      return;
    }
    this.grid.innerHTML = "";
    if (this.state.libraryItems.length === 0) {
      this.grid.innerHTML = `<div class="col-span-2 text-center text-sm text-gray-400 py-10">Вы еще ничего не сохранили. Выделите объект и нажмите на звездочку.</div>`;
    }
    if (this.state.spawningLibraryItem) {
      this.statusText.classList.remove("hidden");
    } else {
      this.statusText.classList.add("hidden");
    }
    this.state.libraryItems.forEach((item) => {
      const isSpawning = this.state.spawningLibraryItem === item;
      const card = document.createElement("div");
      card.className = `aspect-square bg-white shadow-sm border rounded-2xl relative cursor-pointer group flex items-center justify-center overflow-hidden transition-all ${isSpawning ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"}`;
      card.innerHTML = `
        <img src="${item.thumbnail}" class="w-[80%] h-[80%] object-contain pointer-events-none" />
        <button class="lib-del-btn absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-opacity">
          <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
        </button>
      `;
      card.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest(".lib-del-btn")) return;
        this.state.spawningLibraryItem = isSpawning ? null : item;
        this.state.triggerUIUpdate();
      });
      card.querySelector(".lib-del-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.state.libraryItems = this.state.libraryItems.filter(
          (i) => i.id !== item.id,
        );
        if (this.state.spawningLibraryItem?.id === item.id)
          this.state.spawningLibraryItem = null;
        this.state.onLibraryDelete(item.id);
        this.renderGrid(true); 
      });
      this.grid.appendChild(card);
    });
    refreshIcons();
  }
  private generateThumbnail(strokes: Set<any>): string {
    const bounds = this.state.getSelectionBounds();
    if (!bounds) return "";
    const canvas = document.createElement("canvas");
    const padding = 15;
    canvas.width = bounds.maxX - bounds.minX + padding * 2;
    canvas.height = bounds.maxY - bounds.minY + padding * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(-bounds.minX + padding, -bounds.minY + padding);
    for (const stroke of strokes) {
      if (stroke.points.length === 0) continue;
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = stroke.pen.isMarker ? 0.4 : 1.0;
      const outline = getStroke(stroke.points, {
        ...stroke.pen,
        simulatePressure: false,
      });
      const path = new Path2D(getSvgPathFromStroke(outline));
      ctx.fill(path);
    }
    return canvas.toDataURL("image/png");
  }
}

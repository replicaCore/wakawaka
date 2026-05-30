// src/ui/SelectionToolbar.ts
import type { State } from "../core/State";

export class SelectionToolbar {
  private container: HTMLDivElement;
  private state: State;

  constructor(state: State) {
    this.state = state;
    this.container = document.createElement("div");
    this.container.className =
      "absolute hidden flex gap-1 bg-white/90 backdrop-blur shadow-lg p-1.5 rounded-xl z-50 pointer-events-auto border border-gray-100 transition-opacity duration-150";

    document.getElementById("UI")?.appendChild(this.container);

    this.state.subscribeUI(() => this.render());
  }

  private render() {
    const bounds = this.state.getSelectionBounds();

    if (!bounds || this.state.lassoPath.length > 0) {
      this.container.classList.add("hidden");
      return;
    }

    this.container.classList.remove("hidden");

    const { camera } = this.state;
    const screenX = ((bounds.minX + bounds.maxX) / 2) * camera.zoom + camera.x;
    const screenY = bounds.maxY * camera.zoom + camera.y;

    this.container.style.left = `${screenX}px`;
    this.container.style.top = `${screenY + 15}px`;
    this.container.style.transform = "translateX(-50%)";

    // Проверяем условия для показа кнопок Группировки
    const canGroup = this.state.selectedStrokes.size > 1;
    let canUngroup = false;
    for (const stroke of this.state.selectedStrokes) {
      if (stroke.groupIds && stroke.groupIds.length > 0) {
        canUngroup = true;
        break;
      }
    }

    let groupButtonsHtml = "";
    if (canGroup || canUngroup) {
      groupButtonsHtml += `<div class="w-px h-6 bg-gray-300 my-auto mx-1"></div>`;
      if (canGroup) {
        groupButtonsHtml += `<button id="sel-group" class="w-10 h-10 rounded-lg flex items-center justify-center text-lg hover:bg-gray-100" title="Сгруппировать">🔗</button>`;
      }
      if (canUngroup) {
        groupButtonsHtml += `<button id="sel-ungroup" class="w-10 h-10 rounded-lg flex items-center justify-center text-lg hover:bg-gray-100" title="Разгруппировать">🔓</button>`;
      }
    }

    this.container.innerHTML = `
      <button id="sel-move" class="w-10 h-10 rounded-lg flex items-center justify-center text-lg ${this.state.selectionMode === "move" ? "bg-blue-100 shadow-inner" : "hover:bg-gray-100"}" title="Перемещение">🤚</button>
      <button id="sel-scale" class="w-10 h-10 rounded-lg flex items-center justify-center text-lg ${this.state.selectionMode === "scale" ? "bg-blue-100 shadow-inner" : "hover:bg-gray-100"}" title="Масштабирование">⤢</button>
      <div class="w-px h-6 bg-gray-300 my-auto mx-1"></div>
      <button id="sel-color" class="w-10 h-10 rounded-lg flex items-center justify-center text-lg hover:bg-gray-100" title="Изменить цвет">🎨</button>
      <button id="sel-delete" class="w-10 h-10 rounded-lg flex items-center justify-center text-lg hover:bg-red-50 text-red-500" title="Удалить">🗑️</button>
      ${groupButtonsHtml}
    `;

    document.getElementById("sel-move")?.addEventListener("click", () => {
      this.state.selectionMode = "move";
      this.state.triggerUIUpdate();
    });

    document.getElementById("sel-scale")?.addEventListener("click", () => {
      this.state.selectionMode = "scale";
      this.state.triggerUIUpdate();
    });

    document.getElementById("sel-color")?.addEventListener("click", () => {
      this.state.changeSelectionColor();
    });

    document.getElementById("sel-delete")?.addEventListener("click", () => {
      this.state.deleteSelection();
    });

    // События для новых кнопок
    document.getElementById("sel-group")?.addEventListener("click", () => {
      this.state.groupSelected();
    });

    document.getElementById("sel-ungroup")?.addEventListener("click", () => {
      this.state.ungroupSelected();
    });
  }
}

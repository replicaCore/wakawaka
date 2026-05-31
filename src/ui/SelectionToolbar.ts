import { refreshIcons } from "../utils";
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
        groupButtonsHtml += `<button id="sel-group" class="w-10 h-10 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100" title="Сгруппировать"><i data-lucide="link" class="w-5 h-5 pointer-events-none"></i></button>`;
      }
      if (canUngroup) {
        groupButtonsHtml += `<button id="sel-ungroup" class="w-10 h-10 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100" title="Разгруппировать"><i data-lucide="unlink" class="w-5 h-5 pointer-events-none"></i></button>`;
      }
    }

    this.container.innerHTML = `
      <button id="sel-move" class="w-10 h-10 rounded-lg flex items-center justify-center text-gray-700 ${this.state.selectionMode === "move" ? "bg-blue-100 shadow-inner" : "hover:bg-gray-100"}" title="Перемещение"><i data-lucide="hand" class="w-5 h-5 pointer-events-none"></i></button>
      <button id="sel-scale" class="w-10 h-10 rounded-lg flex items-center justify-center text-gray-700 ${this.state.selectionMode === "scale" ? "bg-blue-100 shadow-inner" : "hover:bg-gray-100"}" title="Масштабирование"><i data-lucide="maximize" class="w-5 h-5 pointer-events-none"></i></button>
      
      <div class="w-px h-6 bg-gray-300 my-auto mx-1"></div>
      
      <!-- КНОПКИ ДЛЯ СЛОЕВ -->
      <button id="sel-layer-up" class="w-10 h-10 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100" title="На передний план"><i data-lucide="arrow-up-to-line" class="w-5 h-5 pointer-events-none"></i></button>
      <button id="sel-layer-down" class="w-10 h-10 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100" title="На задний план"><i data-lucide="arrow-down-to-line" class="w-5 h-5 pointer-events-none"></i></button>

      <div class="w-px h-6 bg-gray-300 my-auto mx-1"></div>

      <!-- ИКОНКА ПАЛИТРЫ ЦВЕТА -->
      <button id="sel-color" class="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100" style="color: ${this.state.currentColor};" title="Изменить цвет">
        <i data-lucide="palette" class="w-5 h-5 pointer-events-none drop-shadow-sm"></i>
      </button>

      <button id="sel-delete" class="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500" title="Удалить"><i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i></button>
      ${groupButtonsHtml}
    `;

    // Высчитываем координаты для меню (сначала рендерим, чтобы получить ширину/высоту элемента)
    const { camera } = this.state;
    const screenX = ((bounds.minX + bounds.maxX) / 2) * camera.zoom + camera.x;
    const screenYBottom = bounds.maxY * camera.zoom + camera.y;
    const screenYTop = bounds.minY * camera.zoom + camera.y;

    // Даем немного времени браузеру отрисовать элемент, чтобы получить его реальные размеры
    requestAnimationFrame(() => {
      const menuHeight = this.container.offsetHeight || 52; // Примерно 52px высота
      const windowHeight = window.innerHeight;

      // Если внизу нет места, показываем сверху выделения
      if (screenYBottom + menuHeight + 20 > windowHeight) {
        this.container.style.top = `${Math.max(10, screenYTop - menuHeight - 15)}px`; // Не выше верхнего края экрана (10px отступ)
      } else {
        this.container.style.top = `${screenYBottom + 15}px`; // Как обычно, снизу
      }

      this.container.style.left = `${screenX}px`;
      this.container.style.transform = "translateX(-50%)";
    });

    // Навешиваем события на старые кнопки
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

    document.getElementById("sel-group")?.addEventListener("click", () => {
      this.state.groupSelected();
    });

    document.getElementById("sel-ungroup")?.addEventListener("click", () => {
      this.state.ungroupSelected();
    });

    // Навешиваем события-заглушки на НОВЫЕ кнопки слоев
    document.getElementById("sel-layer-up")?.addEventListener("click", () => {
      console.log("layer up"); // Здесь будет метод state
    });

    document.getElementById("sel-layer-down")?.addEventListener("click", () => {
      console.log("layer down"); // Здесь будет метод state
    });

    refreshIcons();
  }
}

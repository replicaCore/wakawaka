import type { State } from "../../core/State";
import { refreshIcons } from "../icons";

// Стандартная палитра для сброса
export const DEFAULT_PALETTE = [
  "#000000",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#eab308",
];

export function renderColorsTab(
  content: HTMLDivElement,
  state: State,
  reRender: () => void,
) {
  // Приводим тип, т.к. теперь внутри могут быть объекты групп
  const colorsArr = state.colors as any[];

  content.innerHTML = "";

  // Шапка со сбросом
  const header = document.createElement("div");
  header.className = "flex justify-end mb-4";
  header.innerHTML = `
    <button id="reset-colors-btn" class="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
      <i data-lucide="rotate-ccw" class="w-4 h-4 pointer-events-none"></i> Сбросить палитру
    </button>
  `;
  header.querySelector("#reset-colors-btn")?.addEventListener("click", () => {
    if (
      confirm("Удалить все настройки цветов и вернуть стандартную палитру?")
    ) {
      colorsArr.length = 0;
      DEFAULT_PALETTE.forEach((c) => colorsArr.push(c));
      state.setColor(colorsArr[0]);
      state.triggerUIUpdate();
      if ((state as any).onUpdate) (state as any).onUpdate();
      reRender();
    }
  });
  content.appendChild(header);

  // Контейнер элементов палитры
  const itemsContainer = document.createElement("div");
  itemsContainer.className = "flex flex-col gap-4 mb-4";

  // Сетка для одиночных цветов
  const singleColorsGrid = document.createElement("div");
  singleColorsGrid.className = "grid grid-cols-5 gap-2";
  let hasSingleColors = false;

  colorsArr.forEach((item, i) => {
    if (typeof item === "string") {
      // 1. Рендер обычного (одиночного) цвета
      hasSingleColors = true;
      const wrap = document.createElement("div");
      wrap.className = "relative group";
      wrap.innerHTML = `
        <input type="color" value="${item}" class="w-10 h-10 rounded-full border shadow-sm cursor-pointer block p-0 transition-transform hover:scale-105" style="padding: 0; border: none; overflow: hidden; appearance: none; -webkit-appearance: none;">
        <button class="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full hidden group-hover:flex items-center justify-center shadow z-10">
          <i data-lucide="x" class="w-3 h-3 pointer-events-none"></i>
        </button>
      `;

      wrap.querySelector("input")?.addEventListener("input", (e) => {
        const newColor = (e.target as HTMLInputElement).value;
        colorsArr[i] = newColor;
        if (state.currentColor === item) state.setColor(newColor);
        else state.triggerUIUpdate();
        if ((state as any).onUpdate) (state as any).onUpdate();
      });

      wrap.querySelector("button")?.addEventListener("click", () => {
        colorsArr.splice(i, 1);
        state.triggerUIUpdate();
        if ((state as any).onUpdate) (state as any).onUpdate();
        reRender();
      });
      singleColorsGrid.appendChild(wrap);
    } else if (item.isGroup) {
      // 2. Рендер группы цветов (папки)
      const groupCard = document.createElement("div");
      groupCard.className =
        "bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2";

      const groupHeader = document.createElement("div");
      groupHeader.className = "flex justify-between items-center";
      groupHeader.innerHTML = `
        <input type="text" value="${item.name || "Группа"}" placeholder="Название группы" class="font-bold text-sm text-gray-700 bg-transparent outline-none focus:border-b border-blue-400 w-2/3 transition-all" />
        <button class="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Удалить группу">
          <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
        </button>
      `;
      groupHeader.querySelector("input")?.addEventListener("change", (e) => {
        item.name = (e.target as HTMLInputElement).value;
        if ((state as any).onUpdate) (state as any).onUpdate();
      });
      groupHeader.querySelector("button")?.addEventListener("click", () => {
        colorsArr.splice(i, 1);
        state.triggerUIUpdate();
        if ((state as any).onUpdate) (state as any).onUpdate();
        reRender();
      });
      groupCard.appendChild(groupHeader);

      const innerGrid = document.createElement("div");
      innerGrid.className = "flex flex-wrap gap-2 mt-1";

      item.colors.forEach((c: string, j: number) => {
        const wrap = document.createElement("div");
        wrap.className = "relative group";
        wrap.innerHTML = `
          <input type="color" value="${c}" class="w-8 h-8 rounded-full border border-gray-200 shadow-sm cursor-pointer block p-0 transition-transform hover:scale-105" style="padding: 0; border: none; overflow: hidden; appearance: none; -webkit-appearance: none;">
          <button class="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full hidden group-hover:flex items-center justify-center shadow z-10">
            <i data-lucide="x" class="w-3 h-3 pointer-events-none"></i>
          </button>
        `;
        wrap.querySelector("input")?.addEventListener("input", (e) => {
          const newColor = (e.target as HTMLInputElement).value;
          item.colors[j] = newColor;
          if (state.currentColor === c) state.setColor(newColor);
          else state.triggerUIUpdate();
          if ((state as any).onUpdate) (state as any).onUpdate();
        });
        wrap.querySelector("button")?.addEventListener("click", () => {
          item.colors.splice(j, 1);
          state.triggerUIUpdate();
          if ((state as any).onUpdate) (state as any).onUpdate();
          reRender();
        });
        innerGrid.appendChild(wrap);
      });

      // Кнопка добавления цвета внутри группы
      const addInnerBtn = document.createElement("button");
      addInnerBtn.className =
        "w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all";
      addInnerBtn.innerHTML = `<i data-lucide="plus" class="w-3 h-3 pointer-events-none"></i>`;
      addInnerBtn.onclick = () => {
        item.colors.push("#808080");
        state.triggerUIUpdate();
        if ((state as any).onUpdate) (state as any).onUpdate();
        reRender();
      };
      innerGrid.appendChild(addInnerBtn);

      groupCard.appendChild(innerGrid);
      itemsContainer.appendChild(groupCard);
    }
  });

  // Вставляем сетку одиночных цветов наверх, если они есть
  if (hasSingleColors) {
    itemsContainer.insertBefore(singleColorsGrid, itemsContainer.firstChild);
  }
  content.appendChild(itemsContainer);

  // Нижние кнопки (Добавить цвет / Добавить группу)
  const actions = document.createElement("div");
  actions.className = "flex gap-2";
  actions.innerHTML = `
    <button id="add-color-btn" class="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
      <i data-lucide="plus" class="w-4 h-4 pointer-events-none"></i> Цвет
    </button>
    <button id="add-group-btn" class="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
      <i data-lucide="folder-plus" class="w-4 h-4 pointer-events-none"></i> Группа
    </button>
  `;
  actions.querySelector("#add-color-btn")?.addEventListener("click", () => {
    colorsArr.push("#808080");
    state.triggerUIUpdate();
    if ((state as any).onUpdate) (state as any).onUpdate();
    reRender();
  });
  actions.querySelector("#add-group-btn")?.addEventListener("click", () => {
    colorsArr.push({
      isGroup: true,
      name: "Новая палитра",
      colors: ["#000000", "#ffffff", "#808080"],
    });
    state.triggerUIUpdate();
    if ((state as any).onUpdate) (state as any).onUpdate();
    reRender();
  });

  content.appendChild(actions);
  refreshIcons();
}

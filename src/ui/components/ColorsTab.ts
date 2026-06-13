import type { State } from "../../core/State";
import { refreshIcons } from "../icons";

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
  const colorsArr = state.colors as any[];
  content.innerHTML = "";

  // Вспомогательная функция для надежного сохранения
  const saveChanges = () => {
    state.markDirty(); // <-- ВАЖНО: Активирует флаг сохранения
    state.triggerUIUpdate();
    if ((state as any).onUpdate) (state as any).onUpdate(); // Отправляет в Worker
  };

  const header = document.createElement("div");
  header.className = "flex justify-end mb-4";
  header.innerHTML = `
    <button id="reset-colors-btn" class="text-xs font-medium text-red-500 hover:text-red-400 flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors">
      <i data-lucide="rotate-ccw" class="w-3.5 h-3.5 pointer-events-none"></i> Сбросить палитру
    </button>
  `;
  header.querySelector("#reset-colors-btn")?.addEventListener("click", () => {
    if (
      confirm("Вернуть стандартную палитру? Все ваши группы будут удалены.")
    ) {
      colorsArr.length = 0;
      DEFAULT_PALETTE.forEach((c) => colorsArr.push(c));
      state.setColor(colorsArr[0]);
      saveChanges();
      reRender();
    }
  });
  content.appendChild(header);

  const itemsContainer = document.createElement("div");
  itemsContainer.className = "flex flex-col gap-3 mb-4";

  const createColorCircle = (
    color: string,
    sizeClass: string,
    onChange: (c: string) => void,
    onDelete: () => void,
  ) => {
    const wrap = document.createElement("div");
    wrap.className = `relative group shrink-0 ${sizeClass}`;
    wrap.innerHTML = `
      <div class="w-full h-full rounded-full shadow-sm cursor-pointer transition-transform hover:scale-105 border border-black/10" style="background-color: ${color};"></div>
      <input type="color" class="hidden" value="${color}">
      <button class="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full hidden group-hover:flex items-center justify-center shadow-md z-10 transition-transform active:scale-90" title="Удалить">
        <i data-lucide="trash-2" class="w-2.5 h-2.5 pointer-events-none"></i>
      </button>
    `;

    const visual = wrap.querySelector("div")!;
    const input = wrap.querySelector("input")!;
    const delBtn = wrap.querySelector("button")!;

    visual.addEventListener("click", () => input.click());
    input.addEventListener("input", (e) =>
      onChange((e.target as HTMLInputElement).value),
    );
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onDelete();
    });

    return wrap;
  };

  let singleColorsBuffer: { color: string; originalIndex: number }[] = [];

  const flushSingleColors = () => {
    if (singleColorsBuffer.length === 0) return;
    const grid = document.createElement("div");
    grid.className = "flex flex-wrap gap-2";

    singleColorsBuffer.forEach(({ color, originalIndex }) => {
      const circle = createColorCircle(
        color,
        "w-9 h-9",
        (newColor) => {
          colorsArr[originalIndex] = newColor;
          if (state.currentColor === color) state.setColor(newColor);
          else saveChanges();
        },
        () => {
          colorsArr.splice(originalIndex, 1);
          saveChanges();
          reRender();
        },
      );
      grid.appendChild(circle);
    });

    itemsContainer.appendChild(grid);
    singleColorsBuffer = [];
  };

  colorsArr.forEach((item, i) => {
    if (typeof item === "string") {
      singleColorsBuffer.push({ color: item, originalIndex: i });
    } else if (item.isGroup) {
      flushSingleColors();

      const groupCard = document.createElement("div");
      groupCard.className =
        "bg-black/5 p-3 rounded-xl border border-black/5 flex flex-col gap-2.5";

      const groupHeader = document.createElement("div");
      groupHeader.className = "flex justify-between items-center";
      groupHeader.innerHTML = `
        <input type="text" value="${item.name || "Группа"}" placeholder="Название..." class="font-semibold text-sm bg-transparent outline-none focus:border-b border-blue-400 w-3/4 transition-all" />
        <button class="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors" title="Удалить группу">
          <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
        </button>
      `;
      groupHeader.querySelector("input")?.addEventListener("change", (e) => {
        item.name = (e.target as HTMLInputElement).value;
        saveChanges();
      });
      groupHeader.querySelector("button")?.addEventListener("click", () => {
        colorsArr.splice(i, 1);
        saveChanges();
        reRender();
      });
      groupCard.appendChild(groupHeader);

      const innerGrid = document.createElement("div");
      innerGrid.className = "flex flex-wrap gap-2 items-center";

      item.colors.forEach((c: string, j: number) => {
        const circle = createColorCircle(
          c,
          "w-8 h-8",
          (newColor) => {
            item.colors[j] = newColor;
            if (state.currentColor === c) state.setColor(newColor);
            else saveChanges();
          },
          () => {
            item.colors.splice(j, 1);
            saveChanges();
            reRender();
          },
        );
        innerGrid.appendChild(circle);
      });

      const addInnerBtn = document.createElement("button");
      addInnerBtn.className =
        "w-8 h-8 shrink-0 rounded-full border-2 border-dashed border-gray-400/50 flex items-center justify-center text-gray-400/80 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-500/10 transition-all active:scale-95";
      addInnerBtn.innerHTML = `<i data-lucide="plus" class="w-3.5 h-3.5 pointer-events-none"></i>`;
      addInnerBtn.onclick = () => {
        item.colors.push("#808080");
        saveChanges();
        reRender();
      };
      innerGrid.appendChild(addInnerBtn);

      groupCard.appendChild(innerGrid);
      itemsContainer.appendChild(groupCard);
    }
  });

  flushSingleColors();
  content.appendChild(itemsContainer);

  const actions = document.createElement("div");
  actions.className = "flex gap-2 mt-2";
  actions.innerHTML = `
    <button id="add-color-btn" class="flex-1 py-2.5 bg-black/5 hover:bg-black/10 rounded-xl text-sm font-medium flex justify-center items-center gap-2 transition-colors">
      <i data-lucide="plus" class="w-4 h-4 pointer-events-none"></i> Цвет
    </button>
    <button id="add-group-btn" class="flex-1 py-2.5 bg-black/5 hover:bg-black/10 rounded-xl text-sm font-medium flex justify-center items-center gap-2 transition-colors">
      <i data-lucide="folder-plus" class="w-4 h-4 pointer-events-none"></i> Группа
    </button>
  `;

  actions.querySelector("#add-color-btn")?.addEventListener("click", () => {
    colorsArr.push("#808080");
    saveChanges();
    reRender();
  });

  actions.querySelector("#add-group-btn")?.addEventListener("click", () => {
    colorsArr.push({
      isGroup: true,
      name: "Новая палитра",
      colors: ["#000000", "#ffffff", "#808080"],
    });
    saveChanges();
    reRender();
  });

  content.appendChild(actions);
  refreshIcons();
}

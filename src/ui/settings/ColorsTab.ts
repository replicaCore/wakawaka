// src/ui/settings/ColorsTab.ts
import type { State } from "../../core/State";

export function renderColorsTab(
  content: HTMLDivElement,
  state: State,
  reRender: () => void,
) {
  const colorsGrid = document.createElement("div");
  colorsGrid.className = "grid grid-cols-5 gap-2 mb-4";

  state.colors.forEach((c, i) => {
    const wrap = document.createElement("div");
    wrap.className = "relative group";
    wrap.innerHTML = `
      <input type="color" value="${c}" class="w-10 h-10 rounded-full border shadow-sm cursor-pointer block p-0" style="padding: 0; border: none; overflow: hidden; appearance: none; -webkit-appearance: none;">
      <button class="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs hidden group-hover:flex items-center justify-center shadow" data-idx="${i}">✕</button>
    `;
    wrap.querySelector("input")?.addEventListener("input", (e) => {
      const newColor = (e.target as HTMLInputElement).value;
      state.colors[i] = newColor;
      if (state.currentColor === c) {
        state.setColor(newColor);
      } else {
        state.triggerUIUpdate();
      }
    });

    wrap.querySelector("button")?.addEventListener("click", () => {
      if (state.currentColor === c)
        state.setColor(state.colors[0] || "#808080");
      state.colors.splice(i, 1);
      state.triggerUIUpdate();
      reRender();
    });
    colorsGrid.appendChild(wrap);
  });

  const addBtn = document.createElement("button");
  addBtn.className =
    "w-full py-2 bg-blue-100 text-blue-600 rounded-xl font-medium";
  addBtn.innerText = "+ Добавить новый цвет";
  addBtn.onclick = () => {
    state.colors.push("#808080");
    state.triggerUIUpdate();
    reRender();
  };

  content.appendChild(colorsGrid);
  content.appendChild(addBtn);
}

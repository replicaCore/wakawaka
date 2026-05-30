// src/ui/settings/CanvasTab.ts
import type { State } from "../../core/State";

export function renderCanvasTab(content: HTMLDivElement, state: State) {
  content.innerHTML = `
    <div class="flex flex-col gap-4">
      <label class="flex justify-between items-center">
        <span class="font-medium">Цвет фона</span>
        <input type="color" id="bg-color-picker" value="${state.backgroundColor}" class="w-10 h-10 rounded cursor-pointer">
      </label>
      <label class="flex justify-between items-center">
        <span class="font-medium">Инвертировать цвета (Dark Mode)</span>
        <input type="checkbox" id="invert-checkbox" ${state.invertColors ? "checked" : ""} class="w-5 h-5">
      </label>
    </div>
  `;

  document.getElementById("bg-color-picker")?.addEventListener("input", (e) => {
    state.backgroundColor = (e.target as HTMLInputElement).value;
    state.onUpdate();
  });
  document
    .getElementById("invert-checkbox")
    ?.addEventListener("change", (e) => {
      state.invertColors = (e.target as HTMLInputElement).checked;
      state.onUpdate();
    });
}

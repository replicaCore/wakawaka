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
      <div class="w-full h-px bg-gray-200 my-2"></div>
      <label class="flex justify-between items-center gap-4">
        <span class="font-medium text-sm leading-tight text-gray-700">Перемещать выделение из любой области экрана (Стилус)</span>
        <input type="checkbox" id="drag-anywhere-checkbox" ${state.selectionDragAnywhere ? "checked" : ""} class="w-5 h-5 flex-shrink-0">
      </label>
    </div>
  `;
  document.getElementById("bg-color-picker")?.addEventListener("input", (e) => {
    state.backgroundColor = (e.target as HTMLInputElement).value;
    state.markDirty();
    state.onUpdate();
  });
  document
    .getElementById("invert-checkbox")
    ?.addEventListener("change", (e) => {
      state.invertColors = (e.target as HTMLInputElement).checked;
      state.markDirty();
      state.onUpdate();
    });
  document
    .getElementById("drag-anywhere-checkbox")
    ?.addEventListener("change", (e) => {
      state.selectionDragAnywhere = (e.target as HTMLInputElement).checked;
      state.markDirty();
      state.onUpdate();
    });
}

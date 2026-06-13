import type { State } from "../../core/State";
import { exportImage, exportJSON, exportSVG } from "../../services/Exporter";
export function renderExportTab(content: HTMLDivElement, state: State) {
  content.innerHTML = `
    <div class="flex flex-col gap-3">
      <button id="exp-json" class="py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
        <i data-lucide="file-json" class="w-5 h-5"></i> Сохранить как JSON (Проект)
      </button>
      <button id="exp-svg" class="py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
        <i data-lucide="file-code" class="w-5 h-5"></i> Сохранить как SVG (Вектор)
      </button>
      <button id="exp-png" class="py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
        <i data-lucide="image" class="w-5 h-5"></i> Сохранить как PNG (Без фона)
      </button>
      <button id="exp-jpg" class="py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
        <i data-lucide="image" class="w-5 h-5"></i> Сохранить как JPG (С фоном)
      </button>
    </div>
  `;
  document
    .getElementById("exp-json")
    ?.addEventListener("click", () => exportJSON(state.getProjectData()));
  document
    .getElementById("exp-svg")
    ?.addEventListener("click", () => exportSVG(state.getProjectData()));
  document
    .getElementById("exp-png")
    ?.addEventListener("click", () =>
      exportImage(state.getProjectData(), "png"),
    );
  document
    .getElementById("exp-jpg")
    ?.addEventListener("click", () =>
      exportImage(state.getProjectData(), "jpg"),
    );
}

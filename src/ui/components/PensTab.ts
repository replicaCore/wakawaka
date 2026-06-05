import type { State } from "../../core/State";

export function renderPensTab(
  content: HTMLDivElement,
  state: State,
  // reRender: () => void,
) {
  const pen = state.pens[0]; // ТЕПЕРЬ 0

  content.innerHTML = `
    <div class="flex flex-col gap-4 mb-4">
      <div class="border rounded-xl p-4 bg-gray-50 flex flex-col gap-3 shadow-sm">
        <h3 class="font-bold text-gray-700 border-b pb-2 mb-2 text-sm">Настройка размеров (S, M, L)</h3>
        <div class="flex gap-4">
          <label class="flex flex-col gap-1 w-full text-xs font-medium text-gray-600">
            <span>Маленький (S)</span>
            <input type="number" min="1" max="100" value="${state.penSizes[0]}" class="border rounded p-1.5 text-center w-full focus:ring-2 outline-none size-input" data-idx="0">
          </label>
          <label class="flex flex-col gap-1 w-full text-xs font-medium text-gray-600">
            <span>Средний (M)</span>
            <input type="number" min="1" max="100" value="${state.penSizes[1]}" class="border rounded p-1.5 text-center w-full focus:ring-2 outline-none size-input" data-idx="1">
          </label>
          <label class="flex flex-col gap-1 w-full text-xs font-medium text-gray-600">
            <span>Большой (L)</span>
            <input type="number" min="1" max="100" value="${state.penSizes[2]}" class="border rounded p-1.5 text-center w-full focus:ring-2 outline-none size-input" data-idx="2">
          </label>
        </div>
      </div>

      <div class="border rounded-xl p-4 bg-gray-50 flex flex-col gap-4 shadow-sm text-xs font-medium text-gray-600">
        <h3 class="font-bold text-gray-700 border-b pb-2 mb-1 text-sm">Форма и физика кисти</h3>
        <label class="flex justify-between items-center">
          <span>Утончение к концу (Thinning)</span>
          <input type="range" min="-1" max="1" step="0.05" value="${pen.thinning}" class="w-32 prop-thinning">
        </label>
        <label class="flex justify-between items-center">
          <span>Сглаживание (Smoothing)</span>
          <input type="range" min="0" max="1" step="0.05" value="${pen.smoothing}" class="w-32 prop-smoothing">
        </label>
        <label class="flex justify-between items-center">
          <span>Поток линии (Streamline)</span>
          <input type="range" min="0" max="1" step="0.05" value="${pen.streamline}" class="w-32 prop-streamline">
        </label>
      </div>
    </div>
  `;

  // Логика обновления размеров S, M, L
  content.querySelectorAll(".size-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const idx = parseInt((e.target as HTMLInputElement).dataset.idx!);
      const val = parseInt((e.target as HTMLInputElement).value) || 1;
      state.penSizes[idx] = val;

      // Применяем и сохраняем изменения
      if (state.activeSizeIndex === idx) {
        state.setPenSizeIndex(idx);
      } else {
        state.onUpdate();
      }
    });
  });

  // Логика обновления физики кисти
  const setupSlider = (cls: string, prop: keyof typeof pen) => {
    content.querySelector(cls)?.addEventListener("input", (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      (pen as any)[prop] = val;
      if (state.currentPen === pen) {
        state.triggerUIUpdate();
        state.onUpdate(); // Автосохранение при смене физики
      }
    });
  };

  setupSlider(".prop-thinning", "thinning");
  setupSlider(".prop-smoothing", "smoothing");
  setupSlider(".prop-streamline", "streamline");
}

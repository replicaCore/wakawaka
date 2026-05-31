// src/ui/settings/PensTab.ts
import type { State } from "../../core/State";
import type { PenOptions } from "../../type";

export function renderPensTab(
  content: HTMLDivElement,
  state: State,
  reRender: () => void,
) {
  const list = document.createElement("div");
  list.className = "flex flex-col gap-3 mb-4 pr-2 max-h-[55vh] overflow-y-auto";

  state.pens.forEach((pen, i) => {
    const isSelector = pen.isSelector;
    const item = document.createElement("div");
    item.className =
      "border rounded-xl p-3 bg-gray-50 flex flex-col gap-3 shadow-sm";

    const header = document.createElement("div");
    header.className = "flex justify-between items-center";

    let toolName = "Кисть " + (i + 1);
    if (isSelector) toolName = "Выделение";

    header.innerHTML = `
      <div class="flex items-center gap-2">
        <input type="text" class="w-10 h-10 text-center text-lg rounded border bg-white outline-none focus:ring-2 focus:ring-blue-400" value="${pen.icon}" ${isSelector ? "disabled" : ""} />
        <span class="font-bold text-gray-700">${toolName}</span>
      </div>
      <div class="flex gap-1">
        ${!isSelector && i > 0 ? `<button class="w-7 h-7 bg-white rounded shadow text-xs hover:bg-gray-200 up-btn">▲</button>` : ""}
        ${!isSelector && i < state.pens.length - 1 ? `<button class="w-7 h-7 bg-white rounded shadow text-xs hover:bg-gray-200 down-btn">▼</button>` : ""}
        ${!isSelector ? `<button class="w-7 h-7 bg-red-50 text-red-500 rounded shadow text-xs hover:bg-red-100 del-btn">✕</button>` : ""}
      </div>
    `;

    header.querySelector(".up-btn")?.addEventListener("click", () => {
      [state.pens[i - 1], state.pens[i]] = [state.pens[i], state.pens[i - 1]];
      state.triggerUIUpdate();
      reRender();
    });

    header.querySelector(".down-btn")?.addEventListener("click", () => {
      [state.pens[i + 1], state.pens[i]] = [state.pens[i], state.pens[i + 1]];
      state.triggerUIUpdate();
      reRender();
    });

    header.querySelector(".del-btn")?.addEventListener("click", () => {
      state.pens.splice(i, 1);
      if (state.currentPen === pen) state.setPen(0);
      state.triggerUIUpdate();
      reRender();
    });

    header.querySelector("input")?.addEventListener("input", (e) => {
      pen.icon = (e.target as HTMLInputElement).value;
      state.triggerUIUpdate();
    });
    item.appendChild(header);

    if (!isSelector) {
      const form = document.createElement("div");
      form.className =
        "flex flex-col gap-2 text-xs font-medium text-gray-600 border-t pt-3";
      form.innerHTML = `
        <label class="flex justify-between items-center">
          <span>Размер (Size)</span>
          <input type="range" min="1" max="100" value="${pen.size}" class="w-24 prop-size">
        </label>
        <label class="flex justify-between items-center">
          <span>Утончение (Thinning)</span>
          <input type="range" min="-1" max="1" step="0.05" value="${pen.thinning}" class="w-24 prop-thinning">
        </label>
        <label class="flex justify-between items-center">
          <span>Сглаживание (Smoothing)</span>
          <input type="range" min="0" max="1" step="0.05" value="${pen.smoothing}" class="w-24 prop-smoothing">
        </label>
        <label class="flex justify-between items-center">
          <span>Поток (Streamline)</span>
          <input type="range" min="0" max="1" step="0.05" value="${pen.streamline}" class="w-24 prop-streamline">
        </label>
        <div class="flex justify-between items-center mt-1">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" ${pen.simulatePressure ? "checked" : ""} class="prop-pressure rounded">
            <span>Имитация нажима</span>
          </label>
          ${`<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" ${pen.isMarker ? "checked" : ""} class="prop-marker rounded"><span>Выделитель</span></label>`}
        </div>
      `;

      const setupSlider = (
        cls: string,
        prop: keyof PenOptions,
        isFloat = true,
      ) => {
        form.querySelector(cls)?.addEventListener("input", (e) => {
          const val = (e.target as HTMLInputElement).value;
          (pen as any)[prop] = isFloat ? parseFloat(val) : parseInt(val, 10);
          if (state.currentPen === pen) state.triggerUIUpdate();
        });
      };

      setupSlider(".prop-size", "size", false);
      setupSlider(".prop-thinning", "thinning");
      setupSlider(".prop-smoothing", "smoothing");
      setupSlider(".prop-streamline", "streamline");

      form.querySelector(".prop-pressure")?.addEventListener("change", (e) => {
        pen.simulatePressure = (e.target as HTMLInputElement).checked;
      });

      item.appendChild(form);
    }
    list.appendChild(item);
  });
  content.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.className =
    "w-full py-3 bg-blue-100 text-blue-600 rounded-xl font-bold uppercase tracking-wider shrink-0 shadow-sm";
  addBtn.innerText = "+ Добавить кисть";
  addBtn.onclick = () => {
    const newPen: PenOptions = {
      icon: "✨",
      size: 15,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
    };
    state.triggerUIUpdate();
    reRender();
    setTimeout(
      () => list.scrollTo({ top: list.scrollHeight, behavior: "smooth" }),
      10,
    );
  };
  content.appendChild(addBtn);
}

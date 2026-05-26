import type { PenOptions } from "../type";
import type { State as StateClass } from "../core/State";

export class Settings {
  private modal: HTMLDivElement;
  private content: HTMLDivElement;
  private tabs: NodeListOf<HTMLButtonElement>;
  private activeTab: string = "canvas";
  private state: StateClass;

  constructor(state: StateClass) {
    this.state = state;
    this.modal = document.getElementById("settings-modal") as HTMLDivElement;
    this.content = document.getElementById(
      "settings-content",
    ) as HTMLDivElement;
    this.tabs = document.querySelectorAll(".settings-tab");

    document
      .getElementById("settings-open-btn")
      ?.addEventListener("click", () => this.open());
    document
      .getElementById("settings-close-btn")
      ?.addEventListener("click", () => this.close());

    this.tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this.activeTab = (e.target as HTMLElement).dataset.tab!;
        this.updateTabsUI();
        this.renderContent();
      });
    });
  }

  private open() {
    this.modal.classList.remove("hidden");
    this.renderContent();
  }

  private close() {
    this.modal.classList.add("hidden");
  }

  private updateTabsUI() {
    this.tabs.forEach((tab) => {
      if (tab.dataset.tab === this.activeTab) {
        tab.classList.add("border-blue-500", "font-semibold");
        tab.classList.remove("border-transparent", "text-gray-500");
      } else {
        tab.classList.remove("border-blue-500", "font-semibold");
        tab.classList.add("border-transparent", "text-gray-500");
      }
    });
  }

  private renderContent() {
    this.content.innerHTML = "";

    if (this.activeTab === "canvas") {
      this.content.innerHTML = `
        <div class="flex flex-col gap-4">
          <label class="flex justify-between items-center">
            <span class="font-medium">Цвет фона</span>
            <input type="color" id="bg-color-picker" value="${this.state.backgroundColor}" class="w-10 h-10 rounded cursor-pointer">
          </label>
          <label class="flex justify-between items-center">
            <span class="font-medium">Инвертировать цвета (Dark Mode)</span>
            <input type="checkbox" id="invert-checkbox" ${this.state.invertColors ? "checked" : ""} class="w-5 h-5">
          </label>
        </div>
      `;
      document
        .getElementById("bg-color-picker")
        ?.addEventListener("input", (e) => {
          this.state.backgroundColor = (e.target as HTMLInputElement).value;
          this.state.onUpdate();
        });
      document
        .getElementById("invert-checkbox")
        ?.addEventListener("change", (e) => {
          this.state.invertColors = (e.target as HTMLInputElement).checked;
          this.state.onUpdate();
        });
    }

    if (this.activeTab === "colors") {
      const colorsGrid = document.createElement("div");
      colorsGrid.className = "grid grid-cols-5 gap-2 mb-4";

      this.state.colors.forEach((c, i) => {
        const wrap = document.createElement("div");
        wrap.className = "relative group";
        wrap.innerHTML = `
          <input type="color" value="${c}" class="w-10 h-10 rounded-full border shadow-sm cursor-pointer block p-0" style="padding: 0; border: none; overflow: hidden; appearance: none; -webkit-appearance: none;">
          <button class="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs hidden group-hover:flex items-center justify-center shadow" data-idx="${i}">✕</button>
          `;
        wrap.querySelector("input")?.addEventListener("input", (e) => {
          const newColor = (e.target as HTMLInputElement).value;
          this.state.colors[i] = newColor;

          if (this.state.currentColor === c) {
            this.state.setColor(newColor);
          } else {
            this.state.triggerUIUpdate();
          }
        });

        wrap.querySelector("button")?.addEventListener("click", () => {
          if (this.state.currentColor === c) {
            this.state.setColor(this.state.colors[0] || "#808080");
          }
          this.state.colors.splice(i, 1);
          this.state.triggerUIUpdate();
          this.renderContent();
        });

        colorsGrid.appendChild(wrap);
      });

      const addBtn = document.createElement("button");
      addBtn.className =
        "w-full py-2 bg-blue-100 text-blue-600 rounded-xl font-medium";
      addBtn.innerText = "+ Добавить новый цвет";
      addBtn.onclick = () => {
        this.state.colors.push("#808080");
        this.state.triggerUIUpdate();
        this.renderContent();
      };
      this.content.appendChild(colorsGrid);
      this.content.appendChild(addBtn);
    }

    if (this.activeTab === "pens") {
      const list = document.createElement("div");
      list.className =
        "flex flex-col gap-3 mb-4 pr-2 max-h-[55vh] overflow-y-auto";

      this.state.pens.forEach((pen, i) => {
        const isEraser = pen.isEraser;
        const item = document.createElement("div");
        item.className =
          "border rounded-xl p-3 bg-gray-50 flex flex-col gap-3 shadow-sm";

        const header = document.createElement("div");
        header.className = "flex justify-between items-center";

        const isNextEraser =
          i < this.state.pens.length - 1 && this.state.pens[i + 1].isEraser;

        header.innerHTML = `
          <div class="flex items-center gap-2">
            <input type="text" class="w-10 h-10 text-center text-lg rounded border bg-white outline-none focus:ring-2 focus:ring-blue-400" value="${pen.icon}" ${isEraser ? "disabled" : ""} />
            <span class="font-bold text-gray-700">${isEraser ? "Ластик" : "Кисть " + (i + 1)}</span>
          </div>
          <div class="flex gap-1">
            ${!isEraser && i > 0 ? `<button class="w-7 h-7 bg-white rounded shadow text-xs hover:bg-gray-200 up-btn">▲</button>` : ""}
            ${!isEraser && !isNextEraser ? `<button class="w-7 h-7 bg-white rounded shadow text-xs hover:bg-gray-200 down-btn">▼</button>` : ""}
            ${!isEraser ? `<button class="w-7 h-7 bg-red-50 text-red-500 rounded shadow text-xs hover:bg-red-100 del-btn">✕</button>` : ""}
          </div>
        `;

        header.querySelector(".up-btn")?.addEventListener("click", () => {
          [this.state.pens[i - 1], this.state.pens[i]] = [
            this.state.pens[i],
            this.state.pens[i - 1],
          ];
          this.state.triggerUIUpdate();
          this.renderContent();
        });

        header.querySelector(".down-btn")?.addEventListener("click", () => {
          [this.state.pens[i + 1], this.state.pens[i]] = [
            this.state.pens[i],
            this.state.pens[i + 1],
          ];
          this.state.triggerUIUpdate();
          this.renderContent();
        });

        header.querySelector(".del-btn")?.addEventListener("click", () => {
          this.state.pens.splice(i, 1);
          if (this.state.currentPen === pen) this.state.setPen(0);
          this.state.triggerUIUpdate();
          this.renderContent();
        });

        header.querySelector("input")?.addEventListener("input", (e) => {
          pen.icon = (e.target as HTMLInputElement).value;
          this.state.triggerUIUpdate();
        });

        item.appendChild(header);

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
            ${
              !isEraser
                ? `
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" ${pen.isMarker ? "checked" : ""} class="prop-marker rounded">
              <span>Выделитель</span>
            </label>`
                : ""
            }
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
            if (this.state.currentPen === pen) this.state.triggerUIUpdate();
          });
        };

        setupSlider(".prop-size", "size", false);
        setupSlider(".prop-thinning", "thinning");
        setupSlider(".prop-smoothing", "smoothing");
        setupSlider(".prop-streamline", "streamline");

        form
          .querySelector(".prop-pressure")
          ?.addEventListener("change", (e) => {
            pen.simulatePressure = (e.target as HTMLInputElement).checked;
          });

        if (!isEraser) {
          form
            .querySelector(".prop-marker")
            ?.addEventListener("change", (e) => {
              pen.isMarker = (e.target as HTMLInputElement).checked;
              this.state.onUpdate();
            });
        }

        item.appendChild(form);
        list.appendChild(item);
      });

      this.content.appendChild(list);

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
        const eraserIdx = this.state.pens.findIndex((p) => p.isEraser);
        this.state.pens.splice(
          eraserIdx !== -1 ? eraserIdx : this.state.pens.length,
          0,
          newPen,
        );

        this.state.triggerUIUpdate();
        this.renderContent();

        setTimeout(
          () => list.scrollTo({ top: list.scrollHeight, behavior: "smooth" }),
          10,
        );
      };
      this.content.appendChild(addBtn);
    }
  }
}

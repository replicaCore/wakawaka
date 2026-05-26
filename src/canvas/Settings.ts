import type { State } from "../core/State";

export class Settings {
  private modal: HTMLDivElement;
  private content: HTMLDivElement;
  private tabs: NodeListOf<HTMLButtonElement>;
  private activeTab: string = "canvas";
  private state: State;

  constructor(state: State) {
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
          <div class="w-10 h-10 rounded-full border shadow-sm" style="background: ${c}"></div>
          <button class="absolute left-2.5 top-1/2 -translate-y-1/2 bg-red-500 text-white w-5 h-5 rounded-full text-xs hidden group-hover:block" data-idx="${i}">✕</button>
        `;
        wrap.querySelector("button")?.addEventListener("click", () => {
          this.state.colors.splice(i, 1);
          this.state.onUIUpdate();
          this.renderContent();
        });
        colorsGrid.appendChild(wrap);
      });

      const addBtn = document.createElement("button");
      addBtn.className =
        "w-full py-2 bg-blue-100 text-blue-600 rounded-xl font-medium";
      addBtn.innerText = "+ Добавить новый цвет";
      addBtn.onclick = () => {
        this.state.colors.push("#000000");
        this.state.onUIUpdate();
        this.renderContent();
      };

      this.content.appendChild(colorsGrid);
      this.content.appendChild(addBtn);
    }

    if (this.activeTab === "pens") {
      this.content.innerHTML = `<p class="text-gray-500 mb-4">Сейчас у вас ${this.state.pens.length} кистей.</p>`;

      const addPenBtn = document.createElement("button");
      addPenBtn.className =
        "w-full py-2 bg-blue-100 text-blue-600 rounded-xl font-medium";
      addPenBtn.innerText = "+ Создать новую кисть (Custom)";
      addPenBtn.onclick = () => {
        this.state.pens.push({
          size: 15,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
          simulatePressure: true,
        });
        this.state.onUIUpdate();
        this.renderContent();
      };
      this.content.appendChild(addPenBtn);
    }
  }
}

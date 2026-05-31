import type { State } from "../core/State";
import { refreshIcons } from "../utils";

export class Pens {
  private container: HTMLDivElement;
  private quickSettings: HTMLDivElement;
  private sizeBtns: HTMLButtonElement[] = [];
  private pressureToggle: HTMLInputElement;
  private state: State;

  constructor(state: State) {
    this.state = state;
    this.container = document.getElementById(
      "pens-container",
    ) as HTMLDivElement;
    this.quickSettings = document.getElementById(
      "UI-quick-settings",
    ) as HTMLDivElement;

    for (let i = 0; i < 3; i++) {
      const btn = document.getElementById(`size-${i}`) as HTMLButtonElement;
      btn.addEventListener("click", () => this.state.setPenSizeIndex(i));
      this.sizeBtns.push(btn);
    }

    this.pressureToggle = document.getElementById(
      "pressure-toggle",
    ) as HTMLInputElement;
    this.pressureToggle.addEventListener("change", (e) => {
      this.state.togglePressure((e.target as HTMLInputElement).checked);
    });

    this.state.subscribeUI(() => this.render());
    this.render();
  }

  public render() {
    this.container.innerHTML = "";

    this.state.pens.forEach((pen, i) => {
      const btn = document.createElement("button");
      btn.className = `w-10 h-10 flex items-center justify-center rounded-xl transition-transform active:scale-95 ${this.state.currentPen === pen ? "bg-blue-100 shadow-inner" : "hover:bg-gray-100"}`;
      btn.innerHTML = `<i data-lucide="${pen.icon}" class="w-5 h-5 pointer-events-none"></i>`;
      btn.onclick = () => this.state.setPen(i);
      this.container.appendChild(btn);
    });

    if (this.state.currentPen.isSelector) {
      this.quickSettings.style.opacity = "0.3";
      this.quickSettings.style.pointerEvents = "none";
    } else {
      this.quickSettings.style.opacity = "1";
      this.quickSettings.style.pointerEvents = "auto";

      // ТЕПЕРЬ 0
      this.pressureToggle.checked = this.state.pens[0].simulatePressure;

      this.sizeBtns.forEach((btn, i) => {
        if (i === this.state.activeSizeIndex) {
          btn.classList.add("bg-blue-200", "shadow-inner", "text-blue-800");
          btn.classList.remove("hover:bg-gray-200", "text-gray-600");
        } else {
          btn.classList.remove("bg-blue-200", "shadow-inner", "text-blue-800");
          btn.classList.add("hover:bg-gray-200", "text-gray-600");
        }
      });
    }
    refreshIcons();
  }
}

import type { State } from "../core/State";

export class Pens {
  private buttons: NodeListOf<HTMLElement>;
  private activeIndex = 0;
  private state: State;
  private slider: HTMLInputElement;
  private eraserBtn: HTMLButtonElement;

  constructor(state: State) {
    this.state = state;
    this.buttons = document.querySelectorAll(".pen-btn");
    this.slider = document.getElementById(
      "pen-size-slider",
    ) as HTMLInputElement;
    this.eraserBtn = document.getElementById(
      "eraser-mode-btn",
    ) as HTMLButtonElement;

    this.setupEvents();
    this.updateActiveUI();
  }

  private setupEvents() {
    this.buttons.forEach((btn, index) => {
      btn.addEventListener("click", () => {
        this.activeIndex = index;
        this.state.setPen(index);
        this.updateActiveUI();
      });
    });

    this.slider.addEventListener("input", (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.state.setPenSize(val);
    });

    this.eraserBtn.addEventListener("click", () => {
      const newMode =
        this.state.eraserMode === "partial" ? "stroke" : "partial";
      this.state.setEraserMode(newMode);
      this.updateActiveUI();
    });
  }

  private updateActiveUI() {
    this.buttons.forEach((btn, i) => {
      if (i === this.activeIndex) {
        btn.classList.add("bg-blue-100", "shadow-inner");
      } else {
        btn.classList.remove("bg-blue-100", "shadow-inner");
      }
    });

    this.slider.value = this.state.currentPen.size.toString();

    if (this.state.currentPen.isEraser) {
      this.eraserBtn.classList.remove("hidden");
      this.eraserBtn.innerText =
        this.state.eraserMode === "partial" ? "Стирать часть" : "Стирать линию";
    } else {
      this.eraserBtn.classList.add("hidden");
    }
  }
}

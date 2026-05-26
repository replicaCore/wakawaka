import type { State } from "../core/State";

export class Pens {
  private container: HTMLDivElement;
  private eraserBtn: HTMLButtonElement;
  private icons = ["🖋️", "🖊️", "🖌️", "✏️", "🖍️", "🧽", "✨", "🔥"];
  private state: State;

  constructor(state: State) {
    this.state = state;
    this.container = document.getElementById(
      "pens-container",
    ) as HTMLDivElement;
    this.eraserBtn = document.getElementById(
      "eraser-mode-btn",
    ) as HTMLButtonElement;

    this.state.onUIUpdate = () => this.render();

    this.eraserBtn.addEventListener("click", () => {
      this.state.setEraserMode(
        this.state.eraserMode === "partial" ? "stroke" : "partial",
      );
    });

    this.render();
  }

  public render() {
    this.container.innerHTML = ""; // Очищаем

    this.state.pens.forEach((pen, i) => {
      const btn = document.createElement("button");
      btn.className = `w-10 h-10 rounded-xl transition-transform active:scale-95 ${this.state.currentPen === pen ? "bg-blue-100 shadow-inner" : ""}`;
      btn.innerText = pen.isEraser ? "🧽" : this.icons[i] || "🖌️";
      btn.onclick = () => this.state.setPen(i);
      this.container.appendChild(btn);
    });

    if (this.state.currentPen.isEraser) {
      this.eraserBtn.classList.remove("hidden");
      this.eraserBtn.innerText =
        this.state.eraserMode === "partial" ? "Стирать часть" : "Стирать линию";
    } else {
      this.eraserBtn.classList.add("hidden");
    }
  }
}

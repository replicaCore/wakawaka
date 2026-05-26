import type { State } from "../core/State";

export class Palette {
  private container: HTMLDivElement;
  private state: State;

  constructor(state: State) {
    this.state = state;
    this.container = document.getElementById(
      "palette-container",
    ) as HTMLDivElement;
    const oldUpdate = this.state.onUIUpdate;
    this.state.onUIUpdate = () => {
      oldUpdate();
      this.render();
    };
    this.render();
  }

  public render() {
    this.container.innerHTML = "";

    this.state.colors.forEach((color, i) => {
      const btn = document.createElement("div");
      btn.className = `palette-btn w-10 h-10 rounded-full shadow-sm cursor-pointer border-2 border-transparent ${this.state.currentColor === color ? "active-palette" : ""}`;
      btn.style.backgroundColor = color;

      btn.onclick = () => this.state.setColor(color);

      this.container.appendChild(btn);
    });
  }
}

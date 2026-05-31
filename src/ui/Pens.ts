import type { State } from "../core/State";

export class Pens {
  private container: HTMLDivElement;
  private slider: HTMLInputElement;
  private state: State;

  constructor(state: State) {
    this.state = state;
    this.container = document.getElementById(
      "pens-container",
    ) as HTMLDivElement;
    this.slider = document.getElementById(
      "pen-size-slider",
    ) as HTMLInputElement;

    this.state.subscribeUI(() => this.render());

    this.slider.addEventListener("input", (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.state.setPenSize(val);
    });

    this.render();
  }

  public render() {
    this.container.innerHTML = "";

    this.state.pens.forEach((pen, i) => {
      const btn = document.createElement("button");
      btn.className = `w-10 h-10 flex items-center justify-center rounded-xl transition-transform active:scale-95 ${this.state.currentPen === pen ? "bg-blue-100 shadow-inner" : ""}`;
      btn.innerText = pen.icon;
      btn.onclick = () => this.state.setPen(i);
      this.container.appendChild(btn);
    });

    this.slider.value = this.state.currentPen.size.toString();
  }
}

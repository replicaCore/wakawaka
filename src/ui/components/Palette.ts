import { State } from "../../core/State";

export class Palette {
  private container: HTMLDivElement;
  private hiddenPicker: HTMLInputElement;
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private isLongPress = false;
  private activeSlotIndex = 0;
  private state: State;

  constructor(state: State) {
    this.state = state;
    this.container = document.getElementById(
      "palette-container",
    ) as HTMLDivElement;
    this.hiddenPicker = document.getElementById(
      "hidden-picker",
    ) as HTMLInputElement;

    this.hiddenPicker.addEventListener("input", (e) => {
      const newColor = (e.target as HTMLInputElement).value;
      this.state.colors[this.activeSlotIndex] = newColor;
      this.state.setColor(newColor);
    });

    this.state.subscribeUI(() => this.render());
    this.render();
  }

  public render() {
    this.container.innerHTML = "";

    this.state.colors.forEach((color, i) => {
      const btn = document.createElement("div");
      btn.className = `palette-btn w-10 h-10 rounded-full shadow-sm cursor-pointer border-2 border-transparent ${this.state.currentColor === color ? "active-palette" : ""}`;
      btn.style.backgroundColor = color;

      btn.addEventListener("pointerdown", () => {
        this.isLongPress = false;
        this.pressTimer = setTimeout(() => {
          this.isLongPress = true;
          this.activeSlotIndex = i;
          this.hiddenPicker.value = color;
          this.hiddenPicker.click();
        }, 500);
      });

      const clearPress = () => {
        if (this.pressTimer) clearTimeout(this.pressTimer);
      };

      btn.addEventListener("pointerup", () => {
        clearPress();
        if (!this.isLongPress) {
          this.state.setColor(color);
        }
      });

      btn.addEventListener("pointerleave", clearPress);
      btn.addEventListener("pointercancel", clearPress);

      this.container.appendChild(btn);
    });
  }
}

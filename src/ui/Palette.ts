import type { State } from "../core/State";

export class Palette {
  private colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
  private buttons: NodeListOf<HTMLElement>;
  private hiddenPicker: HTMLInputElement;
  private activeSlotIndex = 0;

  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private isLongPress = false;
  private state: State;

  constructor(state: State) {
    this.state = state;
    this.buttons = document.querySelectorAll(".palette-btn");
    this.hiddenPicker = document.getElementById(
      "hidden-picker",
    ) as HTMLInputElement;

    this.initColors();
    this.setupEvents();
  }

  private initColors() {
    this.buttons.forEach((btn, i) => {
      btn.style.backgroundColor = this.colors[i];
    });
    this.updateActiveUI();
    this.state.setColor(this.colors[this.activeSlotIndex]);
  }

  private setupEvents() {
    this.buttons.forEach((btn, index) => {
      btn.addEventListener("pointerdown", () => {
        this.isLongPress = false;

        this.pressTimer = setTimeout(() => {
          this.isLongPress = true;
          this.handleLongPress(index);
        }, 500);
      });

      const clearPress = () => {
        if (this.pressTimer) clearTimeout(this.pressTimer);
      };

      btn.addEventListener("pointerup", () => {
        clearPress();
        if (!this.isLongPress) {
          this.handleShortPress(index);
        }
      });

      btn.addEventListener("pointerleave", clearPress);
      btn.addEventListener("pointercancel", clearPress);
    });

    this.hiddenPicker.addEventListener("input", (e) => {
      const newColor = (e.target as HTMLInputElement).value;
      this.colors[this.activeSlotIndex] = newColor;

      this.buttons[this.activeSlotIndex].style.backgroundColor = newColor;
      this.state.setColor(newColor);
    });
  }

  private handleShortPress(index: number) {
    this.activeSlotIndex = index;
    this.state.setColor(this.colors[index]);
    this.updateActiveUI();
  }

  private handleLongPress(index: number) {
    this.activeSlotIndex = index;
    this.updateActiveUI();

    this.hiddenPicker.value = this.colors[index];
    this.hiddenPicker.click();
  }

  private updateActiveUI() {
    this.buttons.forEach((btn, i) => {
      if (i === this.activeSlotIndex) {
        btn.classList.add("border-gray-800", "active-palette");
      } else {
        btn.classList.remove("border-gray-800", "active-palette");
      }
    });
  }
}

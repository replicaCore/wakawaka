import type { State } from "../core/State";

export class Toolbar {
  private state: State;
  constructor(state: State) {
    this.state = state;
    this.setupButtons();
    this.setupKeyboard();
  }

  private setupButtons() {
    const undoButton = document.getElementById("undo");
    const redoButton = document.getElementById("redo");

    undoButton?.addEventListener("click", () => {
      this.state.undo();
    });

    redoButton?.addEventListener("click", () => {
      this.state.redo();
    });
  }

  private setupKeyboard() {
    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyU") {
        this.state.undo();
      }

      if (e.ctrlKey && e.code === "KeyR") {
        this.state.redo();
      }
    });
  }
}

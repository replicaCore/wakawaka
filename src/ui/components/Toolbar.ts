import { State } from "../../core/State";
export class Toolbar {
  private state: State;
  private zoomResetBtn: HTMLButtonElement | null;
  constructor(state: State) {
    this.state = state;
    this.zoomResetBtn = document.getElementById(
      "zoom-reset",
    ) as HTMLButtonElement;
    this.setupButtons();
    this.setupKeyboard();
    this.state.subscribeUI(() => {
      if (this.zoomResetBtn) {
        this.zoomResetBtn.innerText = `${Math.round(this.state.camera.zoom * 100)}%`;
      }
    });
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
    document
      .getElementById("zoom-in")
      ?.addEventListener("click", () => this.zoom(1.2));
    document
      .getElementById("zoom-out")
      ?.addEventListener("click", () => this.zoom(0.8));
    this.zoomResetBtn?.addEventListener("click", () => {
      const { camera } = this.state;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      camera.x = centerX - (centerX - camera.x) * (1 / camera.zoom);
      camera.y = centerY - (centerY - camera.y) * (1 / camera.zoom);
      camera.zoom = 1;
      this.state.onUpdate();
      this.state.triggerUIUpdate();
    });
  }
  private zoom(factor: number) {
    const { camera } = this.state;
    const newZoom = camera.zoom * factor;
    if (newZoom < 0.01 || newZoom > 100) return;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    camera.x = centerX - (centerX - camera.x) * (newZoom / camera.zoom);
    camera.y = centerY - (centerY - camera.y) * (newZoom / camera.zoom);
    camera.zoom = newZoom;
    this.state.onUpdate();
    this.state.triggerUIUpdate();
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

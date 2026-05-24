import type { Canvas } from "../canvas/canvas";

export class KeyboardManager {
  private canvas: Canvas;

  constructor(canvas: Canvas) {
    this.canvas = canvas;

    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyQ") {
        this.canvas.isDrawing = false;
        this.canvas.allStrokes.pop();
        console.log("Key Q press");
      }
    });
  }
}

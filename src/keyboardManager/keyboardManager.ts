import type { App } from "../app/app";
import type { Canvas } from "../canvas/canvas";
import type { Point } from "../type";

export class KeyboardManager {
  private canvas: Canvas;
  private history: Point[][] = [];

  constructor(canvas: Canvas, app: App) {
    this.canvas = canvas;

    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyU") {
        this.canvas.isDrawing = false;
        let stroke = this.canvas.allStrokes.pop();
        if (stroke) {
          this.history.push(stroke);
          app.renderScene(
            canvas.allStrokes,
            canvas.currentStroke,
            canvas.camera,
          );
        }
      }

      if (e.ctrlKey && e.code === "KeyR") {
        this.canvas.isDrawing = false;
        let stroke = this.history.pop();
        if (stroke) {
          this.canvas.allStrokes.push(stroke);
          app.renderScene(
            canvas.allStrokes,
            canvas.currentStroke,
            canvas.camera,
          );
        }
      }
    });

    this.setupButton();
  }

  private setupButton() {
    const undoButton = document.querySelector("#undo");
    undoButton?.addEventListener("click", () => {
      const ke = new KeyboardEvent("keydown", {
        key: "U",
        code: "KeyU",
      });

      document.dispatchEvent(ke);
    });

    const redoButton = document.querySelector("#redo");
    redoButton?.addEventListener("click", () => {
      const ke = new KeyboardEvent("keydown", {
        key: "R",
        code: "KeyR",
        ctrlKey: true,
      });

      document.dispatchEvent(ke);
    });
  }
}

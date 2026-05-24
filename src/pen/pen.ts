export class Pen {
  pen: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.pen = canvas.getContext("2d")!;
  }
}

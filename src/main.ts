import { State } from "./core/State";
import { Palette } from "./ui/Palette";
import { Toolbar } from "./ui/Toolbar";
import { Renderer } from "./canvas/Render";
import { InputHandler } from "./canvas/InputHandler";

document.addEventListener("DOMContentLoaded", () => {
  const canvasElement = document.getElementById("app") as HTMLCanvasElement;

  const state = new State();

  const renderer = new Renderer(canvasElement, state);
  state.onUpdate = renderer.render;

  new InputHandler(canvasElement, state);

  new Palette(state);
  new Toolbar(state);
});

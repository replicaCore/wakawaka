// src/main.ts
import { State } from "./core/State";
import { Renderer } from "./canvas/Render";
import { InputHandler } from "./canvas/InputHandler";
import { Palette } from "./ui/Palette";
import { Toolbar } from "./ui/Toolbar";
import { Pens } from "./ui/Pens";
import { Settings } from "./ui/settings/Settings";
import { SelectionToolbar } from "./ui/SelectionToolbar";
import { Hub } from "./ui/Hub";
import { Database } from "./canvas/Database";

document.addEventListener("DOMContentLoaded", async () => {
  const canvasElement = document.getElementById("app") as HTMLCanvasElement;

  // Инициализация компонентов редактора (без данных)
  const state = new State();
  const renderer = new Renderer(canvasElement, state);
  state.onUpdate = renderer.render;

  new InputHandler(canvasElement, state);
  new Palette(state);
  new Toolbar(state);
  new Pens(state);
  new Settings(state);
  new SelectionToolbar(state);

  // Инициализация базы данных и Хаба
  const db = new Database();
  try {
    await db.init();
    new Hub(db, state, canvasElement);
    console.log("Canvas Database initialized!");
  } catch (e) {
    console.error("Failed to init database", e);
    alert("Критическая ошибка: браузер не поддерживает сохранение.");
  }
});

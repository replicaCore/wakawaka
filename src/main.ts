// src/main.ts
import { Database } from "./canvas/Database";
import { State } from "./core/State";
import { Renderer } from "./canvas/Render";
import { InputHandler } from "./canvas/InputHandler";
import { Palette } from "./ui/Palette";
import { Toolbar } from "./ui/Toolbar";
import { Pens } from "./ui/Pens";
import { Settings } from "./ui/settings/Settings";
import { SelectionToolbar } from "./ui/SelectionToolbar";
import { Hub } from "./ui/Hub";

document.addEventListener("DOMContentLoaded", async () => {
  const canvasElement = document.getElementById("app") as HTMLCanvasElement;

  const state = new State();
  const renderer = new Renderer(canvasElement, state);
  let hub: Hub | null = null;

  // НОВОЕ: Перехватываем onUpdate.
  // Помимо отрисовки экрана, он теперь сигналит Хабу о том, что холст изменился
  state.onUpdate = () => {
    renderer.render();
    if (hub) hub.triggerAutosave();
  };

  new InputHandler(canvasElement, state);
  new Palette(state);
  new Toolbar(state);
  new Pens(state);
  new Settings(state);
  new SelectionToolbar(state);

  const db = new Database();
  try {
    await db.init();
    hub = new Hub(db, state, canvasElement);

    // Инициализируем Хаб (он сам решит, показать меню или открыть холст по URL)
    await hub.init();
  } catch (e) {
    console.error("Failed to init database", e);
    alert("Ваш браузер не поддерживает сохранение проектов.");
  }

  // БЕЗОПАСНОСТЬ: Если пользователь пытается закрыть вкладку на ПК во время сохранения
  window.addEventListener("beforeunload", (e) => {
    if (state.isDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // БЕЗОПАСНОСТЬ ДЛЯ PWA/МОБИЛЬНЫХ: Тихое сохранение при сворачивании приложения
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state.isDirty && hub) {
      hub.forceSave();
    }
  });
});

import { State } from "./core/State";
import { Render } from "./canvas/Render";
import { InputHandler } from "./canvas/InputHandler";
import { Database } from "./services/Database";
import { AutosaveService } from "./services/Autosave";
import { refreshIcons } from "./ui/icons";

// UI Components
import { Palette } from "./ui/components/Palette";
import { Toolbar } from "./ui/components/Toolbar";
import { Pens } from "./ui/components/Pens";
import { Settings } from "./ui/components/SettingsModal";
import { SelectionToolbar } from "./ui/components/SelectionToolbar";

// Views
import { HubView } from "./ui/views/HubView";
import { EditorView } from "./ui/views/EditorView";

document.addEventListener("DOMContentLoaded", async () => {
  const canvasElement = document.getElementById("app") as HTMLCanvasElement;

  // 1. Инициализация Core (Бизнес-логика)
  const state = new State();

  // 2. Инициализация Canvas
  const renderer = new Render(canvasElement, state);
  new InputHandler(canvasElement, state);

  // 3. Инициализация Сервисов
  const db = new Database();
  try {
    await db.init();
  } catch (e) {
    console.error("Failed to init database", e);
  }

  const autosave = new AutosaveService(db, state, canvasElement);

  // 4. Связывание Обновлений
  state.onUpdate = () => {
    renderer.render();
    autosave.trigger();
  };

  // 5. Инициализация UI Views (Экраны)
  const editorView = new EditorView();
  const hubView = new HubView(db, state, editorView, autosave);

  // 6. Инициализация UI Components (Кнопки, меню)
  new Palette(state);
  new Toolbar(state);
  new Pens(state);
  new Settings(state);
  new SelectionToolbar(state);

  // Обработка закрытия вкладки (гарантированное автосохранение)
  window.addEventListener("beforeunload", (e) => {
    if (state.isDirty) {
      e.preventDefault();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state.isDirty) {
      autosave.forceSave();
    }
  });

  // Запуск приложения
  await hubView.init();
  refreshIcons();
});

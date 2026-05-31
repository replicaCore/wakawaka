import { Database } from "./canvas/Database";
import { refreshIcons } from "./utils";
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

    await hub.init();
  } catch (e) {
    console.error("Failed to init database", e);
  }

  window.addEventListener("beforeunload", (e) => {
    if (state.isDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state.isDirty && hub) {
      hub.forceSave();
    }
  });

  refreshIcons();
});

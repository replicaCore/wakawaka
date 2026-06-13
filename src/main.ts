import { State } from "./core/State";
import { Render } from "./canvas/Render";
import { InputHandler } from "./canvas/InputHandler";
import { Database } from "./services/Database";
import { AutosaveService } from "./services/Autosave";
import { refreshIcons } from "./ui/icons";
import { Palette } from "./ui/components/Palette";
import { Toolbar } from "./ui/components/Toolbar";
import { Pens } from "./ui/components/Pens";
import { Settings } from "./ui/components/SettingsModal";
import { SelectionToolbar } from "./ui/components/SelectionToolbar";
import { LibraryBar } from "./ui/components/LibraryBar";
import { HubView } from "./ui/views/HubView";
import { EditorView } from "./ui/views/EditorView";
document.addEventListener("DOMContentLoaded", async () => {
  const canvasElement = document.getElementById("app") as HTMLCanvasElement;
  const state = new State();
  const renderer = new Render(canvasElement, state);
  new InputHandler(canvasElement, state);
  const db = new Database();
  try {
    await db.init();
    state.libraryItems = await db.getAllLibraryItems();
    state.onLibrarySave = (item) => db.saveLibraryItem(item);
    state.onLibraryDelete = (id) => db.deleteLibraryItem(id);
  } catch (e) {
    console.error("Failed to init database", e);
  }
  const autosave = new AutosaveService(state, canvasElement);
  state.onUpdate = () => {
    renderer.render();
    autosave.trigger();
  };
  const editorView = new EditorView();
  const hubView = new HubView(db, state, editorView, autosave);
  new Palette(state);
  new Toolbar(state);
  new Pens(state);
  new Settings(state);
  new SelectionToolbar(state);
  new LibraryBar(state);
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
  await hubView.init();
  refreshIcons();
});

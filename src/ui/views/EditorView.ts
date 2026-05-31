export class EditorView {
  private hubScreen = document.getElementById("hub-screen") as HTMLDivElement;
  private editorScreen = document.getElementById(
    "editor-screen",
  ) as HTMLDivElement;

  public show() {
    this.hubScreen.classList.add("hidden");
    this.editorScreen.classList.remove("hidden");
  }

  public hide() {
    this.editorScreen.classList.add("hidden");
    this.hubScreen.classList.remove("hidden");
  }
}

import type { State } from "../../core/State";
import { renderCanvasTab } from "./CanvasTab";
import { renderColorsTab } from "./ColorsTab";
import { renderPensTab } from "./PensTab";

export class Settings {
  private modal: HTMLDivElement;
  private content: HTMLDivElement;
  private tabs: NodeListOf<HTMLButtonElement>;
  private activeTab: string = "canvas";
  private state: State;

  constructor(state: State) {
    this.state = state;
    this.modal = document.getElementById("settings-modal") as HTMLDivElement;
    this.content = document.getElementById(
      "settings-content",
    ) as HTMLDivElement;
    this.tabs = document.querySelectorAll(".settings-tab");

    document
      .getElementById("settings-open-btn")
      ?.addEventListener("click", () => this.open());
    document
      .getElementById("settings-close-btn")
      ?.addEventListener("click", () => this.close());

    this.tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this.activeTab = (e.target as HTMLElement).dataset.tab!;
        this.updateTabsUI();
        this.renderContent();
      });
    });
  }

  private open() {
    this.modal.classList.remove("hidden");
    this.renderContent();
  }

  private close() {
    this.modal.classList.add("hidden");
  }

  private updateTabsUI() {
    this.tabs.forEach((tab) => {
      if (tab.dataset.tab === this.activeTab) {
        tab.classList.add("border-blue-500", "font-semibold");
        tab.classList.remove("border-transparent", "text-gray-500");
      } else {
        tab.classList.remove("border-blue-500", "font-semibold");
        tab.classList.add("border-transparent", "text-gray-500");
      }
    });
  }

  private renderContent = () => {
    this.content.innerHTML = "";
    if (this.activeTab === "canvas") renderCanvasTab(this.content, this.state);
    if (this.activeTab === "colors")
      renderColorsTab(this.content, this.state, this.renderContent);
    if (this.activeTab === "pens")
      renderPensTab(this.content, this.state, this.renderContent);
  };
}

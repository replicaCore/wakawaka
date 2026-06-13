import { State } from "../../core/State";
export class Palette {
  private container: HTMLDivElement;
  private hiddenPicker: HTMLInputElement;
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private isLongPress = false;
  private expandedGroupIndex: number | null = null; 
  private state: State;
  constructor(state: State) {
    this.state = state;
    this.container = document.getElementById(
      "palette-container",
    ) as HTMLDivElement;
    this.hiddenPicker = document.getElementById(
      "hidden-picker",
    ) as HTMLInputElement;
    document.addEventListener("pointerdown", (e) => {
      if (!this.container.contains(e.target as Node)) {
        if (this.expandedGroupIndex !== null) {
          this.expandedGroupIndex = null;
          this.render();
        }
      }
    });
    this.state.subscribeUI(() => this.render());
    this.render();
  }
  private generateConicGradient(colors: string[]) {
    if (!colors || colors.length === 0) return "background: #e5e7eb;";
    if (colors.length === 1) return `background-color: ${colors[0]};`;
    const step = 100 / colors.length;
    let gradient = "conic-gradient(";
    colors.forEach((c, i) => {
      gradient += `${c} ${i * step}% ${(i + 1) * step}%${i === colors.length - 1 ? "" : ", "}`;
    });
    gradient += ")";
    return `background: ${gradient};`;
  }
  public render() {
    this.container.innerHTML = "";
    const colorsArr = this.state.colors as any[];
    colorsArr.forEach((item, i) => {
      const slotWrap = document.createElement("div");
      slotWrap.className = "relative flex items-center justify-center";
      if (typeof item === "string") {
        const isActive = this.state.currentColor === item;
        const btn = document.createElement("div");
        btn.className = `palette-btn w-10 h-10 rounded-full shadow-sm cursor-pointer border-2 transition-all flex-shrink-0 ${isActive ? "active-palette border-blue-500 scale-110 shadow-md" : "border-transparent hover:scale-105"}`;
        btn.style.backgroundColor = item;
        btn.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.isLongPress = false;
          this.pressTimer = setTimeout(() => {
            this.isLongPress = true;
            this.hiddenPicker.oninput = (ev) => {
              const newColor = (ev.target as HTMLInputElement).value;
              colorsArr[i] = newColor;
              this.state.setColor(newColor);
              this.state.triggerUIUpdate();
              if ((this.state as any).onUpdate) (this.state as any).onUpdate();
            };
            this.hiddenPicker.value = item;
            this.hiddenPicker.click();
          }, 500);
        });
        const clearPress = () => {
          if (this.pressTimer) clearTimeout(this.pressTimer);
        };
        btn.addEventListener("pointerup", (e) => {
          e.stopPropagation();
          clearPress();
          if (!this.isLongPress) {
            this.state.setColor(item);
            this.expandedGroupIndex = null; 
            this.render();
          }
        });
        btn.addEventListener("pointerleave", clearPress);
        btn.addEventListener("pointercancel", clearPress);
        slotWrap.appendChild(btn);
      } else if (item.isGroup) {
        const isExpanded = this.expandedGroupIndex === i;
        const hasActiveColor = item.colors.includes(this.state.currentColor);
        const btn = document.createElement("div");
        btn.className = `palette-btn w-10 h-10 rounded-full shadow-sm cursor-pointer border-2 transition-all flex-shrink-0
          ${hasActiveColor || isExpanded ? "border-blue-500 scale-110 shadow-md z-10" : "border-white hover:scale-105"}`;
        btn.style.cssText = this.generateConicGradient(item.colors);
        btn.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.expandedGroupIndex = isExpanded ? null : i;
          this.render();
        });
        slotWrap.appendChild(btn);
        if (isExpanded) {
          const subMenu = document.createElement("div");
          subMenu.className =
            "absolute left-14 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur shadow-xl p-2.5 rounded-2xl flex flex-wrap justify-start gap-2 border border-gray-100 z-50 w-[140px]";
          if (item.colors.length === 0) {
            subMenu.innerHTML = `<span class="text-xs text-gray-400 text-center w-full py-1">Папка пуста</span>`;
          }
          item.colors.forEach((color: string, j: number) => {
            const cBtn = document.createElement("div");
            cBtn.className = `w-8 h-8 rounded-full shadow-sm cursor-pointer border-2 transition-transform 
              ${this.state.currentColor === color ? "border-blue-500 scale-110" : "border-gray-200 hover:scale-105"}`;
            cBtn.style.backgroundColor = color;
            cBtn.addEventListener("pointerdown", (e) => {
              e.stopPropagation();
              this.isLongPress = false;
              this.pressTimer = setTimeout(() => {
                this.isLongPress = true;
                this.hiddenPicker.oninput = (ev) => {
                  const newColor = (ev.target as HTMLInputElement).value;
                  item.colors[j] = newColor;
                  this.state.setColor(newColor);
                  this.state.triggerUIUpdate();
                  if ((this.state as any).onUpdate)
                    (this.state as any).onUpdate();
                };
                this.hiddenPicker.value = color;
                this.hiddenPicker.click();
              }, 500);
            });
            const clearPressInner = () => {
              if (this.pressTimer) clearTimeout(this.pressTimer);
            };
            cBtn.addEventListener("pointerup", (e) => {
              e.stopPropagation();
              clearPressInner();
              if (!this.isLongPress) {
                this.state.setColor(color);
                this.expandedGroupIndex = null; 
                this.render();
              }
            });
            cBtn.addEventListener("pointerleave", clearPressInner);
            cBtn.addEventListener("pointercancel", clearPressInner);
            subMenu.appendChild(cBtn);
          });
          slotWrap.appendChild(subMenu);
        }
      }
      this.container.appendChild(slotWrap);
    });
  }
}

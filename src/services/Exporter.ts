import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "../shared/utils";
import type { Project, Stroke, Point } from "../shared/types";
import { PEN_PRESETS } from "../core/State-const";

function getProjectBounds(strokes: Stroke[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let hasPoints = false;
  for (const s of strokes) {
    const pad = s.pen.size;
    for (const p of s.points) {
      hasPoints = true;
      if (p.x - pad < minX) minX = p.x - pad;
      if (p.y - pad < minY) minY = p.y - pad;
      if (p.x + pad > maxX) maxX = p.x + pad;
      if (p.y + pad > maxY) maxY = p.y + pad;
    }
  }
  return hasPoints
    ? { minX, minY, maxX, maxY }
    : { minX: 0, minY: 0, maxX: 800, maxY: 600 };
}

function downloadURL(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportImage(project: Project, type: "png" | "jpg") {
  const bounds = getProjectBounds(project.strokes);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  if (type === "jpg") {
    ctx.fillStyle = project.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.translate(-bounds.minX, -bounds.minY);

  for (const stroke of project.strokes) {
    if (stroke.points.length === 0) continue;
    ctx.globalAlpha = stroke.pen.isMarker ? 0.4 : 1.0;
    ctx.fillStyle = stroke.color;
    const outlinePoints = getStroke(stroke.points, stroke.pen);
    const path = new Path2D(getSvgPathFromStroke(outlinePoints));
    ctx.fill(path);
  }

  const url = canvas.toDataURL(
    type === "jpg" ? "image/jpeg" : "image/png",
    1.0,
  );
  downloadURL(url, `${project.name}.${type}`);
}

export function exportSVG(project: Project) {
  const bounds = getProjectBounds(project.strokes);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${width} ${height}" width="${width}" height="${height}">`;
  svg += `<rect x="${bounds.minX}" y="${bounds.minY}" width="${width}" height="${height}" fill="${project.backgroundColor}" />`;

  // Встраиваем проект в SVG для идеального восстановления
  const metaStr = encodeURIComponent(JSON.stringify(project));
  svg += `<metadata id="canvas-hub-data" data-json="${metaStr}"></metadata>`;

  for (const stroke of project.strokes) {
    if (stroke.points.length === 0) continue;
    const outline = getStroke(stroke.points, stroke.pen);
    const d = getSvgPathFromStroke(outline);
    const alpha = stroke.pen.isMarker ? 0.4 : 1.0;
    svg += `<path d="${d}" fill="${stroke.color}" opacity="${alpha}" />`;
  }
  svg += `</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  downloadURL(URL.createObjectURL(blob), `${project.name}.svg`);
}

export function exportJSON(project: Project) {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadURL(URL.createObjectURL(blob), `${project.name}.json`);
}

export async function importFile(file: File): Promise<Project | null> {
  const text = await file.text();

  if (file.name.endsWith(".json")) {
    try {
      return JSON.parse(text) as Project;
    } catch (e) {
      alert("Ошибка чтения JSON");
      return null;
    }
  }

  if (file.name.endsWith(".svg")) {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");

    // Пытаемся достать встроенные метаданные (если SVG сделан в нашем приложении)
    const meta = doc.getElementById("canvas-hub-data");
    if (meta) {
      try {
        return JSON.parse(
          decodeURIComponent(meta.getAttribute("data-json") || ""),
        );
      } catch (e) {
        console.error("Meta parse error", e);
      }
    }

    // Запасной план: парсинг сторонних SVG
    const paths = doc.querySelectorAll("path, polyline, polygon, line");
    const strokes: Stroke[] = [];

    const svgContainer = document.createElement("div");
    svgContainer.style.visibility = "hidden";
    svgContainer.style.position = "absolute";
    document.body.appendChild(svgContainer);
    const tempSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    svgContainer.appendChild(tempSvg);

    paths.forEach((el) => {
      if (el instanceof SVGPathElement) {
        tempSvg.appendChild(el.cloneNode(true));
        const clonedEl = tempSvg.lastChild as SVGPathElement;
        try {
          const len = clonedEl.getTotalLength();
          if (len > 0) {
            const points: Point[] = [];
            // Выбираем точки по контуру пути
            for (let i = 0; i <= len; i += Math.max(1, len / 50)) {
              const pt = clonedEl.getPointAtLength(i);
              points.push({ x: pt.x, y: pt.y, pressure: 0.5 });
            }
            strokes.push({
              points,
              color:
                el.getAttribute("fill") || el.getAttribute("stroke") || "#000",
              pen: PEN_PRESETS[1], // Обычная кисть
            });
          }
        } catch (e) {}
        tempSvg.innerHTML = "";
      }
    });
    document.body.removeChild(svgContainer);

    return {
      id: Date.now().toString(),
      name: file.name.replace(".svg", ""),
      thumbnail: "",
      updatedAt: Date.now(),
      strokes,
      backgroundColor: "#ffffff",
      camera: { x: 0, y: 0, zoom: 1 },
    };
  }
  return null;
}

const DB_NAME = "CanvasHubDB";
const DB_VERSION = 2;
const STORE_NAME = "projects";

let localStrokesMap = new Map();
let currentProjectId = "";

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "INIT_AND_SAVE" || type === "UPDATE_AND_SAVE") {
    const { meta, strokeOrder, deltas, fullStrokes } = payload;

    // Сбрасываем кэш, если открыли другой проект
    if (currentProjectId !== meta.id) {
      localStrokesMap.clear();
      currentProjectId = meta.id;
    }

    // Инициализация (Только первый раз при запуске/смене холста)
    if (type === "INIT_AND_SAVE") {
      localStrokesMap.clear();
      for (const s of fullStrokes) localStrokesMap.set(s.id, s);
    }
    // Дельта-обновление (Приходит каждые 3 секунды, весит копейки)
    else if (type === "UPDATE_AND_SAVE") {
      for (const [id, stroke] of deltas) {
        if (stroke === null) localStrokesMap.delete(id);
        else localStrokesMap.set(id, stroke);
      }
    }

    // Воркер САМ собирает актуальный массив из своего кэша, используя правильный Z-index порядок!
    const finalStrokes = strokeOrder
      .map((id: string) => localStrokesMap.get(id))
      .filter(Boolean);
    const projectToSave = { ...meta, strokes: finalStrokes };

    // Сохраняем в фоне
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(projectToSave);
      tx.oncomplete = () => db.close();
    };
  }
};

const DB_NAME = "CanvasHubDB";
const DB_VERSION = 2;
const STORE_NAME = "projects";
let localStrokesMap = new Map();
let currentProjectId = "";
self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;
  if (type === "INIT_AND_SAVE" || type === "UPDATE_AND_SAVE") {
    const { meta, strokeOrder, deltas, fullStrokes } = payload;
    if (currentProjectId !== meta.id) {
      localStrokesMap.clear();
      currentProjectId = meta.id;
    }
    if (type === "INIT_AND_SAVE") {
      localStrokesMap.clear();
      for (const s of fullStrokes) localStrokesMap.set(s.id, s);
    }
    else if (type === "UPDATE_AND_SAVE") {
      for (const [id, stroke] of deltas) {
        if (stroke === null) localStrokesMap.delete(id);
        else localStrokesMap.set(id, stroke);
      }
    }
    const finalStrokes = strokeOrder
      .map((id: string) => localStrokesMap.get(id))
      .filter(Boolean);
    const projectToSave = { ...meta, strokes: finalStrokes };
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(projectToSave);
      tx.oncomplete = () => {
        db.close();
        self.postMessage({ type: "SAVED", projectId: meta.id });
      };
      tx.onerror = () => {
        db.close();
        self.postMessage({
          type: "ERROR",
          error: tx.error?.message,
          projectId: meta.id,
        });
      };
    };
  }
};

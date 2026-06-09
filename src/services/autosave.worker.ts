// src/services/autosave.worker.ts

const DB_NAME = "CanvasHubDB";
const DB_VERSION = 2;
const STORE_NAME = "projects";

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "SAVE_PROJECT") {
    // Открываем подключение к IndexedDB внутри фонового потока
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      // Вся тяжелая сериализация и запись на диск происходит ЗДЕСЬ (в фоне)
      store.put(payload);

      tx.oncomplete = () => {
        db.close();
      };
    };

    request.onerror = (err) => {
      console.error("Worker DB Error:", err);
    };
  }
};

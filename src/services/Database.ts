import type { Project } from "../shared/types";

export class Database {
  private dbName = "CanvasHubDB";
  private storeName = "projects";
  private db: IDBDatabase | null = null;

  public async init(): Promise<void> {
    await this.requestPersistentStorage();

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("library")) {
          db.createObjectStore("library", { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async getAllLibraryItems(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not init");
      const req = this.db
        .transaction("library", "readonly")
        .objectStore("library")
        .getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  public async saveLibraryItem(item: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not init");
      const req = this.db
        .transaction("library", "readwrite")
        .objectStore("library")
        .put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteLibraryItem(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not init");
      const req = this.db
        .transaction("library", "readwrite")
        .objectStore("library")
        .delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllProjects(): Promise<Project[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // НОВОЕ: Получить конкретный проект по ID
  public async getProject(id: string): Promise<Project | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveProject(project: Project): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(project);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteProject(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persisted();
        if (isPersisted) {
          console.log("✅ Хранилище защищено от очистки (уже Persistent).");
          return;
        }

        const granted = await navigator.storage.persist();
        if (granted) {
          console.log("✅ Android разрешил Persistent Storage!");
        } else {
          console.warn(
            "⚠️ Persistent Storage отклонено. Данные могут быть удалены при нехватке места. Установите приложение (PWA), чтобы защитить данные.",
          );
        }
      } catch (error) {
        console.error("Ошибка при запросе Persistent Storage:", error);
      }
    } else {
      console.warn("⚠️ Браузер не поддерживает Persistent Storage API.");
    }
  }
}

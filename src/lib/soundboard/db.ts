import type { BoardSettings, SoundRecord } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const DB_NAME = "soundboard";
const DB_VERSION = 1;
const STORE_SOUNDS = "sounds";
const STORE_SETTINGS = "settings";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB nicht verfügbar"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SOUNDS)) {
          db.createObjectStore(STORE_SOUNDS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function getAllSounds(): Promise<SoundRecord[]> {
  const rows = await tx<SoundRecord[]>(STORE_SOUNDS, "readonly", (s) => s.getAll());
  return rows.sort((a, b) => a.order - b.order);
}

export async function putSound(sound: SoundRecord): Promise<void> {
  await tx(STORE_SOUNDS, "readwrite", (s) => s.put(sound));
}

export async function putSounds(sounds: SoundRecord[]): Promise<void> {
  for (const s of sounds) await putSound(s);
}

export async function deleteSound(id: string): Promise<void> {
  await tx(STORE_SOUNDS, "readwrite", (s) => s.delete(id));
}

export async function clearSounds(): Promise<void> {
  await tx(STORE_SOUNDS, "readwrite", (s) => s.clear());
}

export async function getSettings(): Promise<BoardSettings> {
  const val = await tx<BoardSettings | undefined>(STORE_SETTINGS, "readonly", (s) =>
    s.get("settings"),
  );
  return { ...DEFAULT_SETTINGS, ...(val ?? {}) };
}

export async function saveSettings(settings: BoardSettings): Promise<void> {
  await tx(STORE_SETTINGS, "readwrite", (s) => s.put(settings, "settings"));
}

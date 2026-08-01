/**
 * db.ts
 * -----
 * Truy cập IndexedDB thông qua thư viện `idb` — nơi lưu tài liệu (auto-save)
 * và metadata. IndexedDB có dung lượng lớn, phù hợp lưu artwork offline.
 */

import { openDB, IDBPDatabase } from 'idb';
import { ArtDocument } from '../../domain/model';

export interface StoredDocument {
  id: string;
  name: string;
  updatedAt: number;
  document: ArtDocument;
}

const DB_NAME = 'av-artviva';
const DB_VERSION = 1;
const DOC_STORE = 'documents';
const META_STORE = 'meta';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DOC_STORE)) {
          const store = db.createObjectStore(DOC_STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/** Lưu document (upsert). Trả id. */
export async function saveDocument(doc: ArtDocument): Promise<string> {
  const db = await getDb();
  const record: StoredDocument = {
    id: doc.id,
    name: doc.name,
    updatedAt: Date.now(),
    document: doc,
  };
  await db.put(DOC_STORE, record);
  return doc.id;
}

/** Lấy document theo id. */
export async function loadDocument(id: string): Promise<StoredDocument | null> {
  const db = await getDb();
  return (await db.get(DOC_STORE, id)) ?? null;
}

/** Danh sách gần đây (theo updatedAt giảm dần). */
export async function listDocuments(limit = 50): Promise<StoredDocument[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(DOC_STORE, 'updatedAt');
  return all.reverse().slice(0, limit);
}

/** Xoá document. */
export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(DOC_STORE, id);
}

/* ------------------------------ meta ------------------------------ */

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put(META_STORE, { key, value });
}

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const row = await db.get(META_STORE, key);
  return (row?.value as T) ?? fallback;
}

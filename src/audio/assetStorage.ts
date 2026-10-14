import { ActiveProjectSession, DatabaseStorageStats, HistorySnapshot, LibraryAsset } from '../types';

const DB_NAME = 'neuraltune_ultra_db_v3';
const STORE_ASSETS = 'library_assets';
const STORE_SESSION = 'active_project_session';
const STORE_SNAPSHOTS = 'parameter_snapshots';
const DB_VERSION = 2;

export interface StoredAssetRecord extends LibraryAsset {
  audioData?: ArrayBuffer;
}

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbOpenPromise) return dbOpenPromise;

  dbOpenPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SESSION)) {
        db.createObjectStore(STORE_SESSION, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        const snapStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
        snapStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbOpenPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      dbOpenPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn('[IndexedDB] Database open blocked by another tab or connection.');
    };
  });

  return dbOpenPromise;
}

/**
 * Save an asset (uploaded file, live take, or master render) to IndexedDB.
 * Memory-safe: Stores the Blob directly without converting to an in-memory ArrayBuffer.
 */
export async function saveAssetToDB(asset: LibraryAsset): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ASSETS, 'readwrite');
    const store = tx.objectStore(STORE_ASSETS);

    const record: StoredAssetRecord = {
      ...asset,
      audioUrl: '', // Revocable object URLs should never be persisted
      blob: asset.blob,
    };

    store.put(record);

    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] saveAssetToDB failed:', err);
  }
}

/**
 * Load all library assets (uploads, recordings, renders) from IndexedDB.
 */
export async function loadAllAssetsFromDB(): Promise<LibraryAsset[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ASSETS, 'readonly');
    const store = tx.objectStore(STORE_ASSETS);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const list = (request.result || []) as StoredAssetRecord[];
        const valid = list.filter(item => item && item.id && !item.isFactoryDemo && !item.id.startsWith('factory_'));
        
        const processed = valid.map(item => {
          let blob = item.blob;
          if (!blob && item.audioData && item.audioData.byteLength > 0) {
            const mime = item.format === 'MP3' ? 'audio/mpeg' : 'audio/wav';
            blob = new Blob([item.audioData], { type: mime });
          }
          return {
            ...item,
            blob,
            audioUrl: blob ? URL.createObjectURL(blob) : '',
          };
        });
        resolve(processed);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function getAssetFromDB(id: string): Promise<LibraryAsset | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ASSETS, 'readonly');
    const store = tx.objectStore(STORE_ASSETS);
    const request = store.get(id);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const item = request.result as StoredAssetRecord | undefined;
        if (!item) {
          resolve(null);
          return;
        }
        let blob = item.blob;
        if (!blob && item.audioData && item.audioData.byteLength > 0) {
          const mime = item.format === 'MP3' ? 'audio/mpeg' : 'audio/wav';
          blob = new Blob([item.audioData], { type: mime });
        }
        resolve({
          ...item,
          blob,
          audioUrl: blob ? URL.createObjectURL(blob) : '',
        });
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteAssetFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ASSETS, 'readwrite');
    tx.objectStore(STORE_ASSETS).delete(id);
    await new Promise<void>((res) => {
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch (err) {
    console.warn('[IndexedDB] deleteAssetFromDB error:', err);
  }
}

/**
 * Save the active project session (loaded stems, tuning, plugins, settings)
 * so that if the tab reloads or the browser suspends when picking a file,
 * everything is restored seamlessly.
 */
export async function saveCurrentProjectSession(session: ActiveProjectSession): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSION, 'readwrite');
    const store = tx.objectStore(STORE_SESSION);

    // Ensure blobs are clean detached Blobs so IndexedDB never rejects with DataCloneError or detached File handles
    let safeVocalBlob: Blob | undefined = session.vocalBlob;
    if (session.vocalBlob) {
      safeVocalBlob = new Blob([session.vocalBlob], { type: session.vocalBlob.type || 'audio/wav' });
    }
    let safeBeatBlob: Blob | undefined = session.beatBlob;
    if (session.beatBlob) {
      safeBeatBlob = new Blob([session.beatBlob], { type: session.beatBlob.type || 'audio/wav' });
    }

    const record: ActiveProjectSession = {
      ...session,
      vocalBlob: safeVocalBlob,
      beatBlob: safeBeatBlob,
      id: 'current_session',
      lastSaved: Date.now(),
    };

    store.put(record);

    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] saveCurrentProjectSession error:', err);
  }
}

/**
 * Load the active project session from IndexedDB.
 */
export async function loadCurrentProjectSession(): Promise<ActiveProjectSession | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSION, 'readonly');
    const store = tx.objectStore(STORE_SESSION);
    const request = store.get('current_session');

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result as ActiveProjectSession | undefined;
        resolve(result || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clear the saved project session.
 */
export async function clearCurrentProjectSession(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSION, 'readwrite');
    tx.objectStore(STORE_SESSION).delete('current_session');
    await new Promise<void>((res) => {
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch (err) {
    console.warn('[IndexedDB] clearCurrentProjectSession error:', err);
  }
}

/**
 * Persist an array of parameter snapshots to IndexedDB.
 */
export async function saveParameterSnapshotsToDB(snapshots: HistorySnapshot[]): Promise<void> {
  if (!snapshots || snapshots.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    const store = tx.objectStore(STORE_SNAPSHOTS);

    for (const snap of snapshots) {
      store.put(snap);
    }

    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] saveParameterSnapshotsToDB error:', err);
  }
}

/**
 * Load all parameter snapshots from IndexedDB, ordered by timestamp.
 */
export async function loadParameterSnapshotsFromDB(): Promise<HistorySnapshot[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
    const store = tx.objectStore(STORE_SNAPSHOTS);
    const index = store.index('timestamp');
    const request = index.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve((request.result || []) as HistorySnapshot[]);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Clear stored parameter snapshots in IndexedDB.
 */
export async function clearParameterSnapshotsInDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    tx.objectStore(STORE_SNAPSHOTS).clear();
    await new Promise<void>((res) => {
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch (err) {
    console.warn('[IndexedDB] clearParameterSnapshotsInDB error:', err);
  }
}

/**
 * Calculate database storage stats for UI display.
 */
export async function getDatabaseStorageStats(): Promise<DatabaseStorageStats> {
  try {
    const assets = await loadAllAssetsFromDB();
    const session = await loadCurrentProjectSession();
    const snapshots = await loadParameterSnapshotsFromDB();

    let totalBytes = 0;
    let uploadCount = 0;
    let renderCount = 0;
    let recordCount = 0;

    for (const a of assets) {
      if (a.blob) {
        totalBytes += a.blob.size;
      }
      if (a.type.startsWith('imported_')) {
        uploadCount++;
      } else if (a.type === 'recorded_vocal') {
        recordCount++;
      } else if (a.type.startsWith('rendered_')) {
        renderCount++;
      }
    }

    if (session?.vocalBlob) {
      totalBytes += session.vocalBlob.size;
    }
    if (session?.beatBlob) {
      totalBytes += session.beatBlob.size;
    }

    const snapshotCount = Math.max(snapshots.length, session?.snapshots?.length || 0);

    return {
      assetCount: assets.length,
      uploadCount,
      renderCount,
      recordCount,
      totalBytes,
      hasActiveSession: !!(session && (session.vocalBlob || session.beatBlob || session.vocalTrackInfo.name)),
      snapshotCount,
      lastAutoSaveTime: session?.lastSaved || null,
    };
  } catch {
    return {
      assetCount: 0,
      uploadCount: 0,
      renderCount: 0,
      recordCount: 0,
      totalBytes: 0,
      hasActiveSession: false,
      snapshotCount: 0,
      lastAutoSaveTime: null,
    };
  }
}

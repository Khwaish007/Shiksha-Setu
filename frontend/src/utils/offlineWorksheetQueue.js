import axios from 'axios';
import { API_BASE } from '../config/api.js';
import {
  chunkFilesForUpload,
  compressImageIfNeeded,
  formatFileSize,
  VERCEL_MAX_PAYLOAD_BYTES
} from './uploadBatches.js';

const DB_NAME = 'shiksha-setu-offline';
const DB_VERSION = 1;
const STORE_NAME = 'worksheetQueue';
const QUEUE_CHANGED_EVENT = 'offline-worksheet-queue-changed';

const openQueueDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('queuedAt', 'queuedAt');
      store.createIndex('sessionId', 'sessionId');
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const runStoreOperation = async (mode, operation) => {
  const db = await openQueueDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = operation(store);

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

const notifyQueueChanged = () => {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
};

const createQueueId = () => (
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export const onOfflineQueueChanged = (handler) => {
  window.addEventListener(QUEUE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(QUEUE_CHANGED_EVENT, handler);
};

export const getQueuedWorksheets = async () => {
  const db = await openQueueDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result.sort((a, b) => a.queuedAt - b.queuedAt));
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const getOfflineQueueSummary = async () => {
  const entries = await getQueuedWorksheets();
  const totalBytes = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
  const originalBytes = entries.reduce((sum, entry) => sum + (entry.originalSize || entry.size || 0), 0);

  return {
    count: entries.length,
    totalBytes,
    originalBytes,
    dataCostLabel: formatFileSize(totalBytes),
    averageBytes: entries.length ? Math.round(totalBytes / entries.length) : 0,
    averageDataCostLabel: entries.length ? formatFileSize(Math.round(totalBytes / entries.length)) : formatFileSize(0)
  };
};

export const queueWorksheetsForOfflineUpload = async (files, sessionId) => {
  const queuedAt = Date.now();
  const compressedFiles = await Promise.all(files.map((file) => compressImageIfNeeded(file)));

  for (const file of compressedFiles) {
    if (file.size > VERCEL_MAX_PAYLOAD_BYTES) {
      throw new Error(
        `"${file.name}" is ${formatFileSize(file.size)}. Each file must be under ${formatFileSize(VERCEL_MAX_PAYLOAD_BYTES)} after compression.`
      );
    }
  }

  const entries = compressedFiles.map((file, index) => ({
    id: createQueueId(),
    sessionId: sessionId || null,
    fileName: file.name,
    type: file.type || 'image/jpeg',
    size: file.size,
    originalSize: files[index]?.size || file.size,
    queuedAt: queuedAt + index,
    attempts: 0,
    blob: file
  }));

  await runStoreOperation('readwrite', (store) => {
    entries.forEach((entry) => store.put(entry));
  });
  notifyQueueChanged();

  return {
    entries,
    count: entries.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.size, 0),
    dataCostLabel: formatFileSize(entries.reduce((sum, entry) => sum + entry.size, 0))
  };
};

const deleteQueuedEntries = async (ids) => {
  await runStoreOperation('readwrite', (store) => {
    ids.forEach((id) => store.delete(id));
  });
  notifyQueueChanged();
};

const incrementAttempts = async (ids) => {
  const db = await openQueueDatabase();

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    ids.forEach((id) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          store.put({
            ...entry,
            attempts: (entry.attempts || 0) + 1,
            lastAttemptAt: Date.now()
          });
        }
      };
    });

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
  notifyQueueChanged();
};

const buildQueuedFile = (entry) => new File([entry.blob], entry.fileName, {
  type: entry.type || 'image/jpeg',
  lastModified: entry.queuedAt
});

export const syncQueuedWorksheets = async ({ sessionId, onProgress } = {}) => {
  if (!sessionId || !navigator.onLine) {
    return { syncedCount: 0, skippedCount: 0, results: [] };
  }

  const entries = await getQueuedWorksheets();
  const eligibleEntries = entries;

  if (!eligibleEntries.length) {
    return { syncedCount: 0, skippedCount: entries.length, results: [] };
  }

  const queuedFiles = eligibleEntries.map((entry) => buildQueuedFile(entry));
  const fileBatches = chunkFilesForUpload(queuedFiles);
  const results = [];
  let syncedCount = 0;
  let cursor = 0;

  for (let batchIndex = 0; batchIndex < fileBatches.length; batchIndex++) {
    const batch = fileBatches[batchIndex];
    const batchEntries = eligibleEntries.slice(cursor, cursor + batch.length);
    cursor += batch.length;

    const formData = new FormData();
    batch.forEach((file) => formData.append('worksheets', file));

    onProgress?.({
      current: batchIndex + 1,
      total: fileBatches.length,
      count: batch.length
    });

    try {
      const { data } = await axios.post(
        `${API_BASE}/sessions/${sessionId}/evaluate`,
        formData,
        { timeout: 120000 }
      );
      results.push(...data);
      syncedCount += batchEntries.length;
      await deleteQueuedEntries(batchEntries.map((entry) => entry.id));
    } catch (error) {
      await incrementAttempts(batchEntries.map((entry) => entry.id));
      throw error;
    }
  }

  return {
    syncedCount,
    skippedCount: 0,
    results
  };
};

export const estimateWorksheetDataCost = async (files) => {
  if (!files.length) {
    return {
      count: 0,
      totalBytes: 0,
      originalBytes: 0,
      dataCostLabel: formatFileSize(0),
      averageDataCostLabel: formatFileSize(0)
    };
  }

  const compressedFiles = await Promise.all(files.map((file) => compressImageIfNeeded(file)));
  const totalBytes = compressedFiles.reduce((sum, file) => sum + file.size, 0);
  const originalBytes = files.reduce((sum, file) => sum + file.size, 0);

  return {
    count: compressedFiles.length,
    totalBytes,
    originalBytes,
    dataCostLabel: formatFileSize(totalBytes),
    averageDataCostLabel: formatFileSize(Math.round(totalBytes / compressedFiles.length))
  };
};

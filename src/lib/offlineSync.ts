/**
 * Offline-First Storage & Synchronization Engine for Tour CRM Media Uploads
 * Uses IndexedDB to store pending media uploads when offline
 * Automatically synchronizes with server when internet is restored
 */

export interface PendingUploadItem {
  id: string;
  tour_id: string;
  tour_code: string;
  file_name: string;
  file_blob: Blob;
  caption?: string;
  uploaded_by: string;
  uploader_role: string;
  created_at: string;
}

const DB_NAME = 'TourCRM_OfflineUploads';
const DB_VERSION = 1;
const STORE_NAME = 'pending_media';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB không được hỗ trợ trên trình duyệt này.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingUpload(item: PendingUploadItem): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[OfflineSync] Lỗi lưu file vào IndexedDB:', err);
  }
}

export async function getPendingUploads(): Promise<PendingUploadItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[OfflineSync] Lỗi lấy danh sách file chờ đồng bộ:', err);
    return [];
  }
}

export async function removePendingUpload(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[OfflineSync] Lỗi xóa file đã đồng bộ:', err);
  }
}

let isSyncing = false;

export async function syncPendingUploads(
  addTourMediaFn?: (media: any) => Promise<any>,
  onProgress?: (current: number, total: number) => void
): Promise<{ successCount: number; remainingCount: number }> {
  if (isSyncing || !navigator.onLine) {
    const pending = await getPendingUploads();
    return { successCount: 0, remainingCount: pending.length };
  }

  isSyncing = true;
  const pendingItems = await getPendingUploads();

  if (pendingItems.length === 0) {
    isSyncing = false;
    return { successCount: 0, remainingCount: 0 };
  }

  console.log(`[OfflineSync] Đang tiến hành đồng bộ ${pendingItems.length} file lưu tạm khi có mạng...`);
  let successCount = 0;

  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    if (onProgress) onProgress(i + 1, pendingItems.length);

    try {
      const file = new File([item.file_blob], item.file_name, {
        type: item.file_blob.type || 'image/jpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadType', 'tour_media');
      formData.append('tourCode', item.tour_code);
      formData.append('category', 'tour_media');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.url) {
        if (addTourMediaFn) {
          await addTourMediaFn({
            tour_id: item.tour_id,
            tour_code: item.tour_code,
            file_url: data.url,
            file_id: data.fileId || '',
            file_name: item.file_name,
            file_size: item.file_blob.size,
            uploaded_by: item.uploaded_by,
            uploader_role: item.uploader_role,
            caption: item.caption
          });
        }
        await removePendingUpload(item.id);
        successCount++;
      }
    } catch (err) {
      console.error(`[OfflineSync] Đồng bộ file ${item.file_name} thất bại:`, err);
    }
  }

  isSyncing = false;
  const remaining = await getPendingUploads();
  return { successCount, remainingCount: remaining.length };
}

/**
 * Recording Storage Utility
 * 
 * Video kayıtlarını IndexedDB'de saklar (localStorage yerine)
 * Daha büyük dosyalar için uygun
 */

const DB_NAME = 'VideoBotRecordings';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

export interface RecordingData {
  id: string;
  blob: Blob;
  mimeType: string;
  timestamp: number;
  fileName: string;
}

let dbInstance: IDBDatabase | null = null;

/**
 * IndexedDB'yi başlat
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('IndexedDB açılamadı'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Tüm kayıtları temizle (IndexedDB'den sil)
 */
export async function clearAllRecordings(): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        // localStorage'dan da temizle
        localStorage.removeItem('lastRecordingId');
        localStorage.removeItem('lastRecordingTimestamp');
        localStorage.removeItem('recordingBlobBase64');
        localStorage.removeItem('recordingMimeType');
        localStorage.removeItem('recordingTimestamp');
        localStorage.removeItem('recordingFileName');
        console.log('✅ All recordings cleared from IndexedDB and localStorage');
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Error clearing recordings from IndexedDB');
        reject(new Error('Kayıtlar temizlenemedi'));
      };
    });
  } catch (error) {
    console.error('❌ Error clearing recordings:', error);
    // Fallback: sadece localStorage'ı temizle
    localStorage.removeItem('lastRecordingId');
    localStorage.removeItem('lastRecordingTimestamp');
    localStorage.removeItem('recordingBlobBase64');
    localStorage.removeItem('recordingMimeType');
    localStorage.removeItem('recordingTimestamp');
    localStorage.removeItem('recordingFileName');
    console.log('✅ LocalStorage cleared (IndexedDB clear failed)');
  }
}

/**
 * Kaydı IndexedDB'ye kaydet
 */
export async function saveRecording(blob: Blob, mimeType: string, fileName?: string): Promise<string> {
  try {
    const db = await initDB();
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // fileName parametre olarak gelirse kullan, yoksa genel format oluştur
    const finalFileName = fileName || `gorusme-kaydi_${day}-${month}-${year}-${hours}-${minutes}.webm`;
    const id = `recording_${timestamp}_${Math.random().toString(36).substring(7)}`;

    const recordingData: RecordingData = {
      id,
      blob,
      mimeType,
      timestamp,
      fileName: finalFileName,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.add(recordingData);

      request.onsuccess = () => {
        // localStorage'a da ID'yi kaydet (hızlı erişim için)
        localStorage.setItem('lastRecordingId', id);
        localStorage.setItem('lastRecordingTimestamp', timestamp.toString());
        console.log('✅ Recording saved to IndexedDB, id:', id, 'fileName:', finalFileName, 'blob size:', blob.size, 'bytes');
        resolve(id);
      };

      request.onerror = (event) => {
        console.error('❌ IndexedDB add error:', event);
        const errorMsg = 'Kayıt IndexedDB\'ye kaydedilemedi';
        console.error(errorMsg, {
          id,
          fileName: finalFileName,
          blobSize: blob.size,
          mimeType,
        });
        reject(new Error(errorMsg));
      };
    });
  } catch (error) {
    console.error('❌ Error saving recording to IndexedDB:', error);
    // Fallback: base64'e çevir ve localStorage'a kaydet
    return saveRecordingFallback(blob, mimeType, fileName);
  }
}

/**
 * Fallback: Base64 olarak localStorage'a kaydet
 */
async function saveRecordingFallback(blob: Blob, mimeType: string, fileName?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('📦 Using localStorage fallback (IndexedDB not available)');
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      if (base64data && base64data.length > 0) {
        localStorage.setItem('recordingBlobBase64', base64data);
        localStorage.setItem('recordingMimeType', mimeType);
        localStorage.setItem('recordingTimestamp', Date.now().toString());
        if (fileName) {
          localStorage.setItem('recordingFileName', fileName);
        }
        console.log('✅ Recording saved to localStorage as base64 (fallback), size:', base64data.length, 'chars');
        resolve('localStorage');
      } else {
        console.error('❌ Base64 conversion failed: empty result');
        reject(new Error('Base64 conversion failed'));
      }
    };
    reader.onerror = (error) => {
      console.error('❌ FileReader error:', error);
      reject(new Error('FileReader error'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * IndexedDB'den kaydı al
 */
export async function getRecording(id: string): Promise<RecordingData | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Kayıt IndexedDB\'den alınamadı'));
      };
    });
  } catch (error) {
    console.error('❌ Error getting recording from IndexedDB:', error);
    return null;
  }
}

/**
 * Tüm kayıtları al (IndexedDB'den timestamp'e göre sıralı)
 */
export async function getAllRecordings(): Promise<RecordingData[]> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      
      // Önce getAll ile tüm kayıtları al
      const getAllRequest = objectStore.getAll();

      getAllRequest.onsuccess = () => {
        const allRecordings = getAllRequest.result as RecordingData[];
        console.log('📦 Retrieved all recordings from IndexedDB:', allRecordings.length);
        if (allRecordings.length > 0) {
          console.log('📋 Recording details:', allRecordings.map(r => ({
            id: r.id,
            fileName: r.fileName,
            timestamp: r.timestamp,
            blobSize: r.blob?.size || 0,
          })));
        }
        
        // Timestamp'e göre sırala (en yeni önce - descending)
        const sortedRecordings = allRecordings.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log('✅ Recordings sorted by timestamp, count:', sortedRecordings.length);
        resolve(sortedRecordings);
      };

      getAllRequest.onerror = (event) => {
        console.error('❌ Error getting all recordings from IndexedDB (getAll failed):', event);
        reject(new Error('Kayıtlar IndexedDB\'den alınamadı'));
      };
    });
  } catch (error) {
    console.error('❌ Error getting all recordings from IndexedDB:', error);
    // Fallback: localStorage'dan base64 kontrol et
    const base64data = localStorage.getItem('recordingBlobBase64');
    if (base64data) {
      const mimeType = localStorage.getItem('recordingMimeType') || 'video/webm';
      const timestamp = parseInt(localStorage.getItem('recordingTimestamp') || '0', 10);
      const base64String = base64data.includes(',') ? base64data.split(',')[1] : base64data;
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.codePointAt(i) ?? 0;
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const date = new Date(timestamp);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const fileName = `gorusme-kaydi_${day}-${month}-${year}-${hours}-${minutes}.webm`;
      return [{
        id: 'localStorage',
        blob,
        mimeType,
        timestamp,
        fileName,
      }];
    }
    return [];
  }
}

/**
 * Son kaydı al (localStorage'dan ID'yi oku veya en son kaydı IndexedDB'den al)
 */
export async function getLastRecording(): Promise<RecordingData | null> {
  // Önce IndexedDB'den tüm kayıtları al, en son kaydı döndür
  try {
    const allRecordings = await getAllRecordings();
    if (allRecordings.length > 0) {
      console.log('✅ Last recording found in IndexedDB, total recordings:', allRecordings.length);
      return allRecordings[0]; // En yeni kayıt (timestamp'e göre sıralı, prev cursor kullandık)
    }
  } catch (error) {
    console.warn('⚠️ Could not get recordings from IndexedDB, trying localStorage...');
  }

  // Fallback: localStorage'dan ID ile
  const id = localStorage.getItem('lastRecordingId');
  if (!id) {
    // Fallback: localStorage'dan base64'i al
    const base64data = localStorage.getItem('recordingBlobBase64');
    if (base64data) {
      const mimeType = localStorage.getItem('recordingMimeType') || 'video/webm';
      const timestamp = parseInt(localStorage.getItem('recordingTimestamp') || '0', 10);
      
      // Base64'ü blob'a çevir
      const base64String = base64data.includes(',') ? base64data.split(',')[1] : base64data;
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.codePointAt(i) ?? 0;
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      const date = new Date(timestamp);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const fileName = `gorusme-kaydi_${day}-${month}-${year}-${hours}-${minutes}.webm`;
      
      return {
        id: 'localStorage',
        blob,
        mimeType,
        timestamp,
        fileName,
      };
    }
    return null;
  }
  
  return getRecording(id);
}


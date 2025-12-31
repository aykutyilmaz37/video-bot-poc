/**
 * Video kayıt servisi
 * Video dosyalarını tarih-saat bazlı isimlendirme ile kaydeder
 * Örnek: FileUpload.ts pattern'ini takip eder
 */

import { saveRecording, getLastRecording, getAllRecordings, clearAllRecordings } from './recordingStorage';

/**
 * Tüm kayıtları temizle (yeni görüşme başladığında kullanılır)
 */
export const clearAllVideos = async (): Promise<void> => {
  try {
    console.log('🧹 Clearing all previous recordings...');
    await clearAllRecordings();
    console.log('✅ All recordings cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing recordings:', error);
  }
};

export interface UploadVideoResult {
  success: boolean;
  fileId: string;
  url: string;
  downloadUrl: string;
  fileName: string;
}

/**
 * Video blob'unu kaydet ve metadata döndür
 */
export const uploadVideo = async (
  videoBlob: Blob,
  questionId: number
): Promise<UploadVideoResult> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Tarih-saat formatı: GG-AA-YYYY-SS-DD (Gün-Ay-Yıl-Saat-Dakika)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  // Dosya adı: Soru{questionId}_GG-AA-YYYY-SS-DD.webm
  const fileName = `Soru${questionId}_${day}-${month}-${year}-${hours}-${minutes}.webm`;
  
  // Create a file ID
  const fileId = `video_q${questionId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Blob URL oluştur (indirme için)
  const downloadUrl = URL.createObjectURL(videoBlob);

  // Simulated URL (geriye uyumluluk için)
  const url = `local://interview/records/${fileName}`;

  // IndexedDB'ye kaydet (fileName ile birlikte)
  try {
    await saveRecording(videoBlob, videoBlob.type, fileName);
    
    console.log('📤 Video Kaydedildi:', {
      questionId,
      fileId,
      fileName,
      url,
      downloadUrl,
      size: `${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`,
      type: videoBlob.type,
    });

    return {
      success: true,
      fileId,
      url,
      downloadUrl,
      fileName,
    };
  } catch (error) {
    console.error('❌ Error saving video:', error);
    // Hata olsa bile download URL'i döndür
    return {
      success: false,
      fileId,
      url,
      downloadUrl,
      fileName,
    };
  }
};

/**
 * Tüm kayıtları al
 */
export const getAllVideos = async (): Promise<UploadVideoResult[]> => {
  try {
    console.log('🔍 Getting all recordings from storage...');
    const allRecordings = await getAllRecordings();
    
    if (allRecordings.length === 0) {
      console.log('⚠️ No recordings found in storage');
      // Fallback: localStorage'dan base64 kontrol et
      const base64data = localStorage.getItem('recordingBlobBase64');
      if (base64data) {
        console.log('✅ Found base64 data in localStorage (fallback)');
        const mimeType = localStorage.getItem('recordingMimeType') || 'video/webm';
        const timestamp = Number.parseInt(localStorage.getItem('recordingTimestamp') || '0', 10);
        
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
        
        const downloadUrl = URL.createObjectURL(blob);
        return [{
          success: true,
          fileId: 'localStorage',
          url: `local://interview/records/${fileName}`,
          downloadUrl,
          fileName,
        }];
      }
      return [];
    }

    console.log('✅ Recordings found:', allRecordings.length);
    return allRecordings.map((recordingData) => {
      const downloadUrl = URL.createObjectURL(recordingData.blob);
      return {
        success: true,
        fileId: recordingData.id,
        url: `local://interview/records/${recordingData.fileName}`,
        downloadUrl,
        fileName: recordingData.fileName,
      };
    });
  } catch (error) {
    console.error('❌ Error getting all videos:', error);
    return [];
  }
};

/**
 * Son kaydı al (geriye uyumluluk için)
 */
export const getLastVideo = async (): Promise<UploadVideoResult | null> => {
  try {
    console.log('🔍 Getting last recording from storage...');
    const recordingData = await getLastRecording();
    
    if (!recordingData) {
      console.log('⚠️ No recording data found in storage');
      // Fallback: localStorage'dan base64 kontrol et
      const base64data = localStorage.getItem('recordingBlobBase64');
      if (base64data) {
        console.log('✅ Found base64 data in localStorage (fallback)');
        const mimeType = localStorage.getItem('recordingMimeType') || 'video/webm';
        const timestamp = Number.parseInt(localStorage.getItem('recordingTimestamp') || '0', 10);
        
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
        
        const downloadUrl = URL.createObjectURL(blob);
        return {
          success: true,
          fileId: 'localStorage',
          url: `local://interview/records/${fileName}`,
          downloadUrl,
          fileName,
        };
      }
      return null;
    }

    console.log('✅ Recording data found:', recordingData.fileName);
    const downloadUrl = URL.createObjectURL(recordingData.blob);

    return {
      success: true,
      fileId: recordingData.id,
      url: `local://interview/records/${recordingData.fileName}`,
      downloadUrl,
      fileName: recordingData.fileName,
    };
  } catch (error) {
    console.error('❌ Error getting last video:', error);
    return null;
  }
};


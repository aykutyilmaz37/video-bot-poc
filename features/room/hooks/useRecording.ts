/**
 * Recording Hook
 * 
 * MediaRecorder API ile video ve audio kaydı yapar
 * Örnek: useVideoRecorder.ts pattern'ini takip eder
 */

import { useRef, useCallback, useState } from 'react';
import { uploadVideo } from '../utils/fileUpload';

interface UseRecordingOptions {
  videoStream: MediaStream | null;
  audioStream?: MediaStream | null;
  onRecordingComplete?: (blob: Blob, blobUrl: string, questionId?: number) => void;
}

interface UseRecordingReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: (questionId?: number) => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  recordingBlobUrl: string | null;
  recordingError: string | null;
}

export function useRecording({
  videoStream,
  audioStream,
  onRecordingComplete,
}: UseRecordingOptions): UseRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingBlobUrl, setRecordingBlobUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const currentQuestionIdRef = useRef<number | undefined>(undefined);

  const startRecording = useCallback(async (questionId?: number) => {
    console.log('🎥 startRecording called', { questionId, hasVideoStream: !!videoStream, hasAudioStream: !!audioStream });
    try {
      setRecordingError(null);
      currentQuestionIdRef.current = questionId;

      // Video ve audio stream'lerini birleştir
      if (!videoStream) {
        console.warn('⚠️ Video stream bulunamadı, kayıt başlatılamıyor. Stream hazır olana kadar bekleniyor...');
        // Stream henüz hazır değilse, bir süre bekle ve tekrar dene
        return;
      }
      
      // Eğer zaten kayıt yapılıyorsa, önce durdur
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('⚠️ Kayıt zaten devam ediyor, önce durduruluyor...');
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.warn('⚠️ Önceki kaydı durdururken hata:', err);
        }
      }

      const tracks: MediaStreamTrack[] = [...videoStream.getTracks()];
      
      // Audio stream varsa ekle
      if (audioStream) {
        audioStream.getAudioTracks().forEach(track => {
          tracks.push(track);
        });
      } else if (videoStream.getAudioTracks().length === 0) {
        // Video stream'de audio yoksa, sistem sesini de kaydetmek için
        // Canvas ile video stream'i capture edebiliriz
        console.warn('⚠️ Audio track bulunamadı, sadece video kaydedilecek');
      }

      const combinedStream = new MediaStream(tracks);
      
      console.log('🎥 Combined stream created:', {
        totalTracks: combinedStream.getTracks().length,
        videoTracks: combinedStream.getVideoTracks().length,
        audioTracks: combinedStream.getAudioTracks().length,
        trackStates: combinedStream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
        })),
      });

      // Örnek kodda olduğu gibi basit mimeType seçimi
      const finalMimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: finalMimeType,
      });

      chunksRef.current = [];
      startTimeRef.current = Date.now();

      // Örnek kodda olduğu gibi dataavailable event handler
      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 MediaRecorder data available, size:', event.data?.size || 0);
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // onstop handler - MediaRecorder durduğunda çağrılır
      // ÖNEMLİ: Bu handler'ı stopRecording içinde override ETME!
      mediaRecorder.onstop = async () => {
        console.log('🛑 MediaRecorder onstop event triggered');
        console.log('📊 Chunks collected:', chunksRef.current.length);
        const totalChunkSize = chunksRef.current.reduce((sum, chunk) => sum + (chunk?.size || 0), 0);
        console.log('📊 Total chunks size:', totalChunkSize, 'bytes');
        
        if (chunksRef.current.length === 0 || totalChunkSize === 0) {
          console.error('❌ No chunks collected or chunks are empty, recording may have failed');
          setRecordingError('Kayıt verisi toplanamadı');
          setIsRecording(false);
          setRecordingDuration(0);
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
          startTimeRef.current = null;
          currentQuestionIdRef.current = undefined;
          return;
        }
        
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        const blobUrl = URL.createObjectURL(blob);
        setRecordingBlobUrl(blobUrl);
        
        // Duration'ı sıfırla
        setRecordingDuration(0);
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        startTimeRef.current = null;
        setIsRecording(false);

        console.log('✅ Recording stopped, blob size:', blob.size, 'bytes (', (blob.size / 1024 / 1024).toFixed(2), 'MB)');
        console.log('✅ Recording blob URL:', blobUrl);
        console.log('✅ Blob type:', blob.type);

        const questionId = currentQuestionIdRef.current;
        console.log('📝 Current questionId for recording:', questionId);

        // Kaydı uploadVideo ile kaydet (IndexedDB + metadata)
        // questionId zorunlu, eğer yoksa 0 kullan (fallback)
        try {
          console.log('💾 Starting uploadVideo for questionId:', questionId || 0, 'blob size:', blob.size);
          const uploadResult = await uploadVideo(blob, questionId || 0);
          console.log('📤 uploadVideo result:', uploadResult);
          if (uploadResult.success) {
            console.log('✅ Recording saved successfully:', uploadResult.fileName, 'questionId:', questionId || 'N/A');
          } else {
            console.warn('⚠️ Recording saved but upload returned success:false');
          }
        } catch (error) {
          console.error('❌ Error saving recording:', error);
          console.error('Error details:', error instanceof Error ? error.stack : error);
        }

        if (onRecordingComplete) {
          onRecordingComplete(blob, blobUrl, questionId);
        }
        
        currentQuestionIdRef.current = undefined;
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setRecordingError('Kayıt hatası oluştu');
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      console.log('🎥 MediaRecorder created, starting recording...', {
        mimeType: finalMimeType,
        questionId,
        state: mediaRecorder.state,
        streamTracks: combinedStream.getTracks().length,
        videoTracks: combinedStream.getVideoTracks().length,
        audioTracks: combinedStream.getAudioTracks().length,
      });
      
      try {
        // Örnek kodda olduğu gibi start() çağrısı parametresiz (her zaman data available)
        // Ama biz her 1 saniyede bir data almak için timeslice kullanabiliriz
        mediaRecorder.start(1000); // Her 1 saniyede bir data available event
        setIsRecording(true);
        console.log('✅ MediaRecorder.start() called successfully, state:', mediaRecorder.state);

        // Duration'ı güncelle
        durationIntervalRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setRecordingDuration(elapsed);
          }
        }, 1000);

        console.log('✅ Recording started with mimeType:', finalMimeType, 'questionId:', questionId || 'N/A');
      } catch (startError) {
        console.error('❌ Error calling mediaRecorder.start():', startError);
        setRecordingError('Kayıt başlatılamadı: ' + (startError instanceof Error ? startError.message : String(startError)));
        setIsRecording(false);
        currentQuestionIdRef.current = undefined;
        throw startError;
      }
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setRecordingError(error instanceof Error ? error.message : 'Kayıt başlatılamadı');
      setIsRecording(false);
      currentQuestionIdRef.current = undefined;
    }
  }, [videoStream, audioStream, onRecordingComplete]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    console.log('🛑 stopRecording called', { hasMediaRecorder: !!mediaRecorderRef.current, isRecording });
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        console.warn('⚠️ stopRecording called but mediaRecorderRef.current is null');
        resolve(null);
        return;
      }
      
      if (!isRecording) {
        console.warn('⚠️ stopRecording called but isRecording is false. MediaRecorder state:', mediaRecorderRef.current.state);
        resolve(null);
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;
      console.log('🛑 stopRecording: MediaRecorder state:', mediaRecorder.state);
      console.log('📊 Current chunks count before stop:', chunksRef.current.length);

      // ÖNEMLİ: onstop handler'ı startRecording içinde zaten tanımlı!
      // Burada override ETME, sadece stop() çağır
      if (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused') {
        try {
          // Önce tüm bekleyen data'ları almak için requestData çağır
          if (mediaRecorder.state === 'recording') {
            console.log('📦 Requesting data before stop...');
            mediaRecorder.requestData();
          }
          
          console.log('🛑 Calling MediaRecorder.stop()...');
          mediaRecorder.stop();
          console.log('✅ MediaRecorder.stop() called successfully, new state:', mediaRecorder.state);
          
          // onstop event'i zaten startRecording içindeki handler'ı tetikleyecek
          // Promise'i resolve et, blob onstop handler'da işlenecek
          resolve(null);
        } catch (stopError) {
          console.error('❌ Error stopping MediaRecorder:', stopError);
          resolve(null);
        }
      } else {
        console.warn('⚠️ MediaRecorder state is not recording or paused:', mediaRecorder.state);
        resolve(null);
      }

      // Tracks'leri durdurmayalım, çünkü hala kullanılıyor olabilir
    });
  }, [isRecording]);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    recordingBlobUrl,
    recordingError,
  };
}


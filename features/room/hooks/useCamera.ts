'use client';

import { useRef, useCallback, useState } from 'react';

interface UseCameraReturn {
  videoStream: MediaStream | null;
  isCameraReady: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  stop: () => void;
}

/**
 * Native Camera Management Hook
 * 
 * LiveKit olmadan kullanıcı kamerāsını yönetir
 */
export function useCamera(): UseCameraReturn {
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);

  const initialize = useCallback(async () => {
    try {
      setError(null);
      setIsCameraReady(false);

      // Eğer önceki stream varsa temizle
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Kamerayı aç
      console.log('📹 Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });

      console.log('✅ Camera and microphone access granted');
      console.log('📹 Stream tracks:', {
        video: stream.getVideoTracks().length,
        audio: stream.getAudioTracks().length,
      });

      streamRef.current = stream;
      setVideoStream(stream);
      setIsCameraReady(true);
      
      console.log('✅ Camera stream initialized');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Kamera açılamadı';
      setError(errorMsg);
      console.error('❌ Camera initialization error:', err);
      
      // Error details
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Kamera ve mikrofon izinleri reddedildi. Lütfen tarayıcı ayarlarından izinleri etkinleştirin.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('Kamera veya mikrofon bulunamadı. Lütfen cihazlarınızı kontrol edin.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Kamera başka bir uygulama tarafından kullanılıyor olabilir.');
        }
      }
      
      // Hata durumunda exception fırlat
      throw err;
    }
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setVideoStream(null);
    }
    
    setIsCameraReady(false);
  }, []);

  return {
    videoStream,
    isCameraReady,
    error,
    initialize,
    stop,
  };
}


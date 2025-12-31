/**
 * User Video Component
 * 
 * Kullanıcı kamerasını gösteren component
 */

import { useRef, useEffect, useCallback } from 'react';

interface UserVideoProps {
  videoStream: MediaStream | null;
}

export function UserVideo({ videoStream }: UserVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stream'i video element'e bağlama fonksiyonu
  const attachStreamToVideo = useCallback((video: HTMLVideoElement, stream: MediaStream) => {
    // Eğer zaten aynı stream bağlıysa, tekrar bağlama
    if (video.srcObject === stream) {
      console.log('📹 Stream already attached, skipping');
      return;
    }

    console.log('📹 Attaching stream to video element, stream:', stream);
    console.log('📹 Stream tracks:', {
      video: stream.getVideoTracks().length,
      audio: stream.getAudioTracks().length,
      videoTrackId: stream.getVideoTracks()[0]?.id,
      videoTrackEnabled: stream.getVideoTracks()[0]?.enabled,
      videoTrackReadyState: stream.getVideoTracks()[0]?.readyState,
    });

    // Önce mevcut srcObject'i temizle
    if (video.srcObject) {
      console.log('🧹 Clearing existing srcObject');
      video.srcObject = null;
    }

    // Stream'i ata
    video.srcObject = stream;
    console.log('✅ Video stream attached to video element');
    
    // Video metadata yüklendiğinde oynat
    const handleLoadedMetadata = () => {
      console.log('📹 Video metadata loaded, videoWidth:', video.videoWidth, 'videoHeight:', video.videoHeight);
      video.play()
        .then(() => {
          console.log('✅ Video playing successfully');
        })
        .catch((err) => {
          console.error('❌ Video play error:', err);
        });
    };

    const handleLoadedData = () => {
      console.log('📹 Video data loaded');
      // Tekrar oynatmayı dene
      video.play().catch((err) => {
        console.error('❌ Video play error (loadeddata):', err);
      });
    };

    const handleCanPlay = () => {
      console.log('📹 Video can play');
      video.play().catch((err) => {
        console.error('❌ Video play error (canplay):', err);
      });
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);

    // Eğer metadata zaten yüklendiyse, hemen oynatmayı dene
    if (video.readyState >= 1) {
      console.log('📹 Video readyState:', video.readyState, '- attempting play');
      video.play().catch((err) => {
        console.error('❌ Video play error (immediate):', err);
      });
    }
  }, []);

  // Video element'e stream'i bağla
  useEffect(() => {
    if (!videoStream) {
      console.log('⏳ Waiting for video stream...');
      return;
    }

    const video = videoRef.current;
    if (!video) {
      console.log('⏳ Video ref not ready yet, will retry...');
      // Video ref hazır olana kadar bekle
      const checkInterval = setInterval(() => {
        const currentVideo = videoRef.current;
        if (currentVideo && videoStream) {
          clearInterval(checkInterval);
          console.log('✅ Video ref ready, attaching stream');
          attachStreamToVideo(currentVideo, videoStream);
        }
      }, 100);

      // 5 saniye sonra timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!videoRef.current) {
          console.error('❌ Video ref still not ready after 5 seconds');
        }
      }, 5000);

      return () => {
        clearInterval(checkInterval);
      };
    }

    // Video ref hazır, stream'i bağla
    console.log('✅ Video ref ready, attaching stream');
    attachStreamToVideo(video, videoStream);
  }, [videoStream, attachStreamToVideo]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-800">
      <video
        ref={(el) => {
          videoRef.current = el;
          // Video element mount olduğunda, eğer stream varsa hemen bağla
          if (el && videoStream) {
            console.log('✅ Video element mounted via ref callback, attaching stream');
            attachStreamToVideo(el, videoStream);
          }
        }}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          backgroundColor: '#1f2937',
        }}
      />
      {!videoStream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <p className="text-sm text-gray-400">📹 Kamera hazırlanıyor...</p>
        </div>
      )}
      <div className="absolute bottom-4 left-4 rounded bg-black/50 px-3 py-1 text-sm text-white">
        Siz
      </div>
    </div>
  );
}


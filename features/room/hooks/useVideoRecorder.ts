import { useState, useRef, useCallback, useEffect } from 'react';

// RecordingStatus enum
enum RecordingStatus {
  IDLE = 'idle',
  RECORDING = 'recording',
  STOPPED = 'stopped',
  UPLOADING = 'uploading',
  UPLOADED = 'uploaded',
}

interface UseVideoRecorderReturn {
  status: RecordingStatus;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: () => Promise<boolean>;
  startRecording: () => boolean;
  stopRecording: () => Promise<Blob | null>;
  stopCamera: () => void;
  setStatus: (status: RecordingStatus) => void;
}

/**
 * Video Recorder Hook
 * 
 * MediaRecorder API ile video ve audio kaydı yapar
 * Örnek: useVideoRecorder.ts pattern'ini takip eder
 */
export const useVideoRecorder = (): UseVideoRecorderReturn => {
  const [status, setStatus] = useState<RecordingStatus>(RecordingStatus.IDLE);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Attach stream to video element - useEffect will handle playing
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Stream attached to video element');
      } else {
        console.warn('Video ref not available yet, stream will be attached when element mounts');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      console.error('Camera access error:', err);
      return false;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setError('No camera stream available');
      return false;
    }

    try {
      // Clear previous chunks
      chunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setStatus(RecordingStatus.RECORDING);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      console.error('Recording error:', err);
      return false;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || status !== RecordingStatus.RECORDING) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setStatus(RecordingStatus.STOPPED);
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, [status]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus(RecordingStatus.IDLE);
  }, []);

  // Ensure video plays when stream is attached
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    
    if (!video || !stream) return;

    // Attach stream if not already attached
    if (video.srcObject !== stream) {
      video.srcObject = stream;
      console.log('Stream attached to video element in useEffect');
    }

    const handleLoadedMetadata = async () => {
      try {
        await video.play();
        console.log('Video started playing successfully');
      } catch (error) {
        console.error('Video play error:', error);
        setError('Video oynatılamadı');
      }
    };

    const handleCanPlay = async () => {
      try {
        if (video.paused) {
          await video.play();
        }
      } catch (error) {
        console.error('Video play error:', error);
      }
    };

    // If metadata already loaded, play immediately
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      video.addEventListener('canplay', handleCanPlay, { once: true });
    }

    // Also try to play immediately (some browsers need this)
    video.play().catch(() => {
      // Ignore initial play error, will retry on loadedmetadata
    });

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [status]); // Re-run when status changes (stream might be attached)

  // Also watch for video element mount and attach stream if available
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    
    if (video && stream && !video.srcObject) {
      video.srcObject = stream;
      console.log('Stream attached to video element on mount');
      
      video.play().catch((error) => {
        console.error('Initial play error:', error);
        // Will retry when metadata loads
      });
    }
  }, []); // Run once on mount

  return {
    status,
    error,
    videoRef,
    startCamera,
    startRecording,
    stopRecording,
    stopCamera,
    setStatus,
  };
};


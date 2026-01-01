"use client";

export interface RecorderConfig {
  videoStream: MediaStream;
  aiAudioElement?: HTMLAudioElement | null;
}

export function createRecorder({
  videoStream,
  aiAudioElement,
}: RecorderConfig) {
    
  let mediaRecorder: MediaRecorder | null = null;
  let audioContext: AudioContext | null = null;
  let recordedChunks: Blob[] = [];
  let recordedBlob: Blob | null = null;

  const start = async () => {
    if (!videoStream) {
      throw new Error("No video stream provided");
    }

    audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    /** 🎤 mic */
    const micSource = audioContext.createMediaStreamSource(videoStream);
    micSource.connect(destination);

    /** 🤖 AI audio */
    if (aiAudioElement) {
      try {
        const aiSource =
          audioContext.createMediaElementSource(aiAudioElement);
        aiSource.connect(destination);
        aiSource.connect(audioContext.destination);
      } catch {
        // already connected — ignore
      }
    }

    const mixedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);

    mediaRecorder = new MediaRecorder(mixedStream, {
      mimeType: MediaRecorder.isTypeSupported(
        "video/webm; codecs=vp9,opus"
      )
        ? "video/webm; codecs=vp9,opus"
        : "video/webm; codecs=vp8,opus",
    });

    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, {
        type: mediaRecorder!.mimeType,
      });
    };

    mediaRecorder.start();
    console.log("🎥 Recording started");
  };

  const stop = () => {
    return new Promise<void>((resolve) => {
      if (!mediaRecorder) {
        resolve();
        return;
      }
  
      mediaRecorder.onstop = () => {
        recordedBlob = new Blob(recordedChunks, {
          type: mediaRecorder!.mimeType,
        });
  
        audioContext?.close();
        mediaRecorder = null;
        audioContext = null;
  
        console.log("⏹ Recording stopped, blob ready");
        resolve();
      };
  
      mediaRecorder.stop();
    });
  };

  const download = () => {
    if (!recordedBlob) return;

    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interview.webm";
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    start,
    stop,
    download,
  };
}

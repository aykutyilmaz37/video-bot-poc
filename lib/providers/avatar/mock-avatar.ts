/**
 * Mock Avatar Provider
 * 
 * Mock avatar provider - test ve development için kullanılır.
 * Döngüsel bir video veya placeholder gösterir.
 */

import { AvatarProvider, AvatarExpression } from './types';

export class MockAvatarProvider implements AvatarProvider {
  private videoElement: HTMLVideoElement | null = null;
  private currentExpression: AvatarExpression = 'neutral';

  async startVideoStream(): Promise<HTMLVideoElement | MediaStream> {
    // Canvas ile basit bir placeholder oluştur
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    
    // Gradient arka plan
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#2d2d2d');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Avatar placeholder text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AI Avatar', canvas.width / 2, canvas.height / 2);
    
    // Canvas'ı video stream'e dönüştür
    const stream = canvas.captureStream(30); // 30 FPS
    
    // Video element oluştur ve stream'i bağla
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.muted = false;
    this.videoElement.loop = true;
    this.videoElement.playsInline = true;
    this.videoElement.srcObject = stream;
    
    // Stream'i döndür (video element yerine)
    return stream;
  }

  async setExpression(expression: AvatarExpression): Promise<void> {
    this.currentExpression = expression;
    // Mock implementation - gerçek provider'da bu ifadeyi avatar'a gönderir
    console.log(`[MockAvatar] Expression changed to: ${expression}`);
  }

  async stopVideoStream(): Promise<void> {
    if (this.videoElement) {
      if (this.videoElement.srcObject) {
        const stream = this.videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      this.videoElement = null;
    }
  }

  isAvailable(): boolean {
    return true; // Mock her zaman kullanılabilir
  }
}


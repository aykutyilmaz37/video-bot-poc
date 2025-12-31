'use client';

import { useEffect, useRef } from 'react';

interface OrbProps {
  className?: string;
  getInputVolume?: () => number;
  getOutputVolume?: () => number;
  volumeMode?: 'manual' | 'auto';
  manualInput?: number;
  manualOutput?: number;
  agentState?: 'listening' | 'talking' | 'thinking' | 'idle';
  colors?: [string, string];
  seed?: number;
}

/**
 * Orb Component - Basit animasyonlu 3D benzeri orb görselleştirme
 * 
 * ElevenLabs UI'daki Orb component'inin basit versiyonu
 * Ses seviyelerine göre animasyon yapar
 */
export function Orb({
  className = '',
  getInputVolume,
  getOutputVolume,
  volumeMode = 'auto',
  manualInput = 0,
  manualOutput = 0,
  agentState = 'idle',
  colors = ['#6366f1', '#818cf8'], // indigo colors
  seed = 1000,
}: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas boyutunu ayarla
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio);
    const baseRadius = Math.min(centerX, centerY) * 0.8;

    const animate = () => {
      time += 0.02;

      // Volume hesapla
      let inputVolume = 0;
      let outputVolume = 0;

      if (volumeMode === 'manual') {
        inputVolume = Math.max(0, Math.min(1, manualInput || 0));
        outputVolume = Math.max(0, Math.min(1, manualOutput || 0));
      } else {
        inputVolume = getInputVolume ? Math.max(0, Math.min(1, getInputVolume())) : 0;
        outputVolume = getOutputVolume ? Math.max(0, Math.min(1, getOutputVolume())) : 0;
      }

      // Agent state'e göre base volume ayarla
      let baseVolume = 0;
      if (agentState === 'talking') {
        baseVolume = outputVolume;
      } else if (agentState === 'listening') {
        baseVolume = inputVolume * 0.5;
      } else if (agentState === 'thinking') {
        baseVolume = 0.3 + Math.sin(time * 2) * 0.2;
      } else {
        baseVolume = 0.1;
      }

      // Canvas'ı temizle
      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

      // Gradient oluştur
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 1.5);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(0.5, colors[1]);
      gradient.addColorStop(1, 'transparent');

      // Orb çiz (pulsing effect)
      const radius = baseRadius * (0.7 + baseVolume * 0.3 + Math.sin(time * 3) * 0.1);
      
      ctx.save();
      ctx.globalAlpha = 0.8 + baseVolume * 0.2;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner glow
      ctx.globalAlpha = 0.4 + baseVolume * 0.3;
      const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.6);
      innerGradient.addColorStop(0, '#ffffff');
      innerGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [getInputVolume, getOutputVolume, volumeMode, manualInput, manualOutput, agentState, colors, seed]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  );
}


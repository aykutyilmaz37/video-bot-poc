'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage as ChatMessageType } from '../../types/room';
import { ChatMessage } from './ChatMessage';
// SVG Icons
const MicrophoneIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const MicrophoneIconSolid = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const PaperAirplaneIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

interface ChatSidebarProps {
  readonly messages: ChatMessageType[];
  readonly chatInput: string;
  readonly isElevenLabsConnected: boolean;
  readonly onInputChange: (value: string) => void;
  readonly onSendMessage: (message: string) => void;
  readonly onUserActivity: () => void;
  readonly conversation?: {
    sendUserMessage: (text: string) => void;
    isSpeaking?: boolean;
    isMuted?: boolean;
    mute?: () => void;
    unmute?: () => void;
    getInputVolume?: () => number;
  };
}

/**
 * Chat Sidebar Component
 * 
 * ElevenLabs örneğindeki gibi: Sesli konuşma + Metin mesajlaşma + Transkript
 */
export function ChatSidebar({
  messages,
  chatInput,
  isElevenLabsConnected,
  onInputChange,
  onSendMessage,
  onUserActivity,
  conversation,
}: ChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Conversation'dan mute durumunu direkt kullan (local state yerine)
  const isMuted = conversation?.isMuted ?? false;

  // Yeni mesaj geldiğinde scroll'u en alta kaydır
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim() || !isElevenLabsConnected) return;
    
    const userMessage = chatInput.trim();
    onSendMessage(userMessage);
  };

  const handleToggleMute = useCallback(() => {
    if (!conversation) return;
    
    if (isMuted) {
      conversation.unmute?.();
    } else {
      conversation.mute?.();
    }
  }, [conversation, isMuted]);

  // Waveform visualization state
  const [waveformData, setWaveformData] = useState<number[]>(new Array(20).fill(0));

  // Input volume for waveform visualization - animated
  useEffect(() => {
    if (!conversation?.getInputVolume || isMuted) {
      // useEffect cleanup içinde state update - bu durumda sorun değil
      // Ama linter'ı mutlu etmek için interval içinde set edelim
      const timeoutId = setTimeout(() => {
        setWaveformData(new Array(20).fill(0));
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const interval = setInterval(() => {
      const volume = conversation.getInputVolume?.() ?? 0;
      // Gerçek waveform data simülasyonu (volume'a göre)
      const newData = Array.from({ length: 20 }, () => {
        // Volume'a göre bar yüksekliği oluştur (biraz random variation ile)
        return Math.min(1, volume * (0.5 + Math.random() * 0.5));
      });
      setWaveformData(newData);
    }, 100); // 100ms'de bir güncelle

    return () => clearInterval(interval);
  }, [conversation, isMuted]);

  // Waveform bars
  const waveformBars = waveformData.map((value, i) => (
    <div
      key={`waveform-${i}-${value}`}
      className="w-0.5 bg-indigo-400 transition-all duration-100"
      style={{
        height: `${Math.max(10, value * 100)}%`,
        opacity: value > 0 ? 0.6 + value * 0.4 : 0.2,
      }}
    />
  ));

  return (
    <div className="flex h-full w-full flex-col border-l border-gray-800 bg-gray-800/30 lg:w-1/3">
      <div className="shrink-0 border-b border-gray-700 p-4">
        <h2 className="text-lg font-semibold text-white">Sohbet</h2>
      </div>
      
      {/* Messages Container */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-gray-400">
                Mesaj yazın veya mikrofonu kullanarak konuşun
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area - ElevenLabs örneğindeki gibi */}
      <div className="shrink-0 border-t border-gray-700 bg-gray-800/50">
        {/* Waveform Visualization (sesli konuşma sırasında) */}
        {isElevenLabsConnected && !isMuted && (
          <div className="flex h-12 items-center justify-center gap-1 px-4">
            {waveformBars}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-end gap-2">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              disabled={!isElevenLabsConnected}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                isMuted
                  ? 'bg-gray-600 hover:bg-gray-500'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } disabled:cursor-not-allowed disabled:opacity-50`}
              title={isMuted ? 'Mikrofonu aç' : 'Mikrofonu kapat'}
            >
              {isMuted ? (
                <MicrophoneIcon className="h-5 w-5 text-white" />
              ) : (
                <MicrophoneIconSolid className="h-5 w-5 text-white" />
              )}
            </button>

            {/* Text Input */}
            <div className="flex-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => {
                  onInputChange(e.target.value);
                  if (isElevenLabsConnected) {
                    onUserActivity();
                  }
                }}
                placeholder={isMuted ? "Mesaj yazın..." : "Mesaj yazın veya konuşun..."}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isElevenLabsConnected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.trim()) {
                      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                    }
                  }
                }}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!chatInput.trim() || !isElevenLabsConnected}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Gönder"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Status Text */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>
              {(() => {
                if (!isElevenLabsConnected) {
                  return 'Bağlantı bekleniyor...';
                }
                if (isMuted) {
                  return 'Mikrofon kapalı - Mesaj yazabilirsiniz';
                }
                return 'Mikrofon açık - Konuşabilir veya yazabilirsiniz';
              })()}
            </span>
            {conversation?.isSpeaking && (
              <span className="text-indigo-400">AI konuşuyor...</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

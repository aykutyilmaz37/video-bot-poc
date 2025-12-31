'use client';

import { useState, useCallback } from 'react';
import { RoomState, UseRoomStateReturn, ChatMessage } from '../types/room';

const initialState: RoomState = {
  isConnected: true, // Artık her zaman "bağlı" sayıyoruz (LiveKit yok)
  isElevenLabsConnected: false,
  isChatOpen: true,
  chatMessages: [],
  chatInput: '',
  participants: new Map(), // Artık kullanılmıyor ama tip uyumluluğu için bırakıyoruz
  localParticipantIdentity: 'user', // Basit bir değer
  connectionError: null,
  errorMessage: null,
  isLoading: true,
  loadingStep: 'idle',
  isCameraReady: false,
  isAvatarReady: false,
};

/**
 * Room State Management Hook
 * 
 * Tüm room state'ini merkezi olarak yönetir
 */
export function useRoomState(): UseRoomStateReturn {
  const [state, setStateInternal] = useState<RoomState>(initialState);

  const setState = useCallback((updates: Partial<RoomState>) => {
    setStateInternal(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const updateChatMessages = useCallback((message: ChatMessage) => {
    setStateInternal(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages, message],
    }));
  }, []);

  const updateChatInput = useCallback((input: string) => {
    setStateInternal(prev => ({
      ...prev,
      chatInput: input,
    }));
  }, []);

  const toggleChat = useCallback(() => {
    setStateInternal(prev => ({
      ...prev,
      isChatOpen: !prev.isChatOpen,
    }));
  }, []);

  const updateParticipants = useCallback((updater: (prev: Map<string, unknown>) => Map<string, unknown>) => {
    setStateInternal(prev => ({
      ...prev,
      participants: updater(prev.participants),
    }));
  }, []);

  const reset = useCallback(() => {
    setStateInternal(initialState);
  }, []);

  return {
    state,
    setState,
    updateChatMessages,
    updateChatInput,
    toggleChat,
    updateParticipants,
    reset,
  };
}


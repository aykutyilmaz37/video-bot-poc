/**
 * Room Feature Types
 * 
 * Tüm room feature'ı için type tanımlamaları
 */

/**
 * Chat Message Type
 */
export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
}

/**
 * Room State Type
 */
export interface RoomState {
  isConnected: boolean;
  isElevenLabsConnected: boolean;
  isChatOpen: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  participants: Map<string, unknown>; // Artık kullanılmıyor ama tip uyumluluğu için
  localParticipantIdentity: string | null;
  connectionError: string | null;
  errorMessage: string | null;
  isLoading: boolean;
  loadingStep: 'idle' | 'connecting_elevenlabs' | 'connecting_room' | 'starting_camera' | 'starting_avatar' | 'ready';
  isCameraReady: boolean;
  isAvatarReady: boolean;
}

/**
 * Video Elements Ref Type (artık kullanılmıyor - LiveKit kaldırıldı)
 * @deprecated LiveKit kaldırıldı, artık kullanılmıyor
 */
export type VideoElementsRef = React.MutableRefObject<Map<string, HTMLVideoElement>>;

/**
 * Room State Hook Return Type
 */
export interface UseRoomStateReturn {
  state: RoomState;
  setState: (updates: Partial<RoomState>) => void;
  updateChatMessages: (message: ChatMessage) => void;
  updateChatInput: (input: string) => void;
  toggleChat: () => void;
  updateParticipants: (updater: (prev: Map<string, unknown>) => Map<string, unknown>) => void;
  reset: () => void;
}

/**
 * ElevenLabs Hook Return Type
 */
export interface UseElevenLabsReturn {
  conversation: ReturnType<typeof import('@elevenlabs/react').useConversation>;
  sendMessage: (text: string) => void;
  endSession: () => Promise<void>;
  startSession: (overrideToken?: string) => Promise<void>;
}

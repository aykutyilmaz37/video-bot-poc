/**
 * Message Parsing Utilities
 * 
 * ElevenLabs ve LiveKit mesajlarını parse etmek için helper fonksiyonlar
 */

import { ChatMessage } from '../types/room';

/**
 * ElevenLabs message object type
 */
type ElevenLabsMessage = unknown;

/**
 * Parse ElevenLabs message ve sender'ı belirle
 */
export function parseElevenLabsMessage(message: ElevenLabsMessage): {
  text: string;
  sender: 'Siz' | 'AI Bot';
} {
  let messageText = '';
  let messageSource = 'agent'; // Default: agent message

  try {
    if (message && typeof message === 'object') {
      const msg = message as Record<string, unknown>;

      // Source kontrolü - kullanıcı mı agent mı?
      if ('source' in msg) {
        messageSource = String(msg.source);
      } else if ('role' in msg) {
        messageSource = String(msg.role);
      } else if ('sender' in msg) {
        messageSource = String(msg.sender);
      }

      // Message text'i al
      if ('message' in msg && msg.message) {
        messageText = String(msg.message);
      } else if ('text' in msg && msg.text) {
        messageText = String(msg.text);
      } else if ('content' in msg && msg.content) {
        messageText = String(msg.content);
      } else if ('transcript' in msg && msg.transcript) {
        messageText = String(msg.transcript);
        // Transcript genellikle kullanıcıdan gelir
        if (!messageSource || messageSource === 'agent') {
          messageSource = 'user';
        }
      }
    } else if (typeof message === 'string') {
      messageText = message;
    }
  } catch (parseError) {
    console.error('❌ Error parsing message:', parseError);
  }

  // Source'a göre sender belirle
  const sender = (messageSource === 'user' || messageSource === 'human' || messageSource === 'participant')
    ? 'Siz'
    : 'AI Bot';

  return {
    text: messageText.trim(),
    sender,
  };
}

/**
 * Create chat message from parsed data
 */
export function createChatMessage(text: string, sender: 'Siz' | 'AI Bot'): ChatMessage {
  return {
    id: `${sender.toLowerCase()}-${Date.now()}-${Math.random()}`,
    sender,
    message: text,
    timestamp: Date.now(),
  };
}

/**
 * Parse ElevenLabs error message
 */
export function parseElevenLabsError(error: unknown): string {
  let userMessage = 'ElevenLabs bağlantı hatası';

  try {
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      if ('error_type' in errorObj && errorObj.error_type) {
        userMessage = `Hata: ${String(errorObj.error_type)}`;
      } else if ('message' in errorObj && errorObj.message) {
        const errorMsg = String(errorObj.message);
        userMessage = errorMsg;

        // WebRTC peer connection hatalarını özel olarak handle et
        if (errorMsg.includes('pc connection') || errorMsg.includes('peer connection') || errorMsg.includes('could not establish')) {
          userMessage = 'WebRTC bağlantı hatası. Lütfen:\n1. Mikrofon izinlerini kontrol edin\n2. Tarayıcıyı yenileyin\n3. HTTPS bağlantısı kullandığınızdan emin olun';
          console.error('🔴 WebRTC peer connection error detected');
        }
      } else if ('error' in errorObj && errorObj.error) {
        userMessage = String(errorObj.error);
      }
    } else if (typeof error === 'string') {
      userMessage = error;
      if (error.includes('pc connection') || error.includes('peer connection') || error.includes('could not establish')) {
        userMessage = 'WebRTC bağlantı hatası. Lütfen tarayıcıyı yenileyin ve mikrofon izinlerini kontrol edin.';
      }
    }
  } catch (parseError) {
    console.error('❌ Error parsing error object:', parseError);
  }

  return userMessage;
}


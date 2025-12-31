'use client';

import { ChatMessage as ChatMessageType } from '../../types/room';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * Chat Message Component
 * 
 * Individual chat message item
 */
export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`rounded-lg p-3 ${
        message.sender === 'AI Bot'
          ? 'bg-indigo-600/20 text-indigo-100'
          : 'bg-gray-700/50 text-gray-200'
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold">{message.sender}</span>
        <span className="text-xs text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <p className="text-sm">{message.message}</p>
    </div>
  );
}


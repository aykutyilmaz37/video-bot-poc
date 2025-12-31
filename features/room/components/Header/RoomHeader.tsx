'use client';

interface RoomHeaderProps {
  isConnected: boolean;
  isElevenLabsConnected: boolean;
  isChatOpen: boolean;
  isRecording?: boolean;
  onToggleChat: () => void;
  onEndInterview: () => Promise<void>;
}

/**
 * Room Header Component
 * 
 * Connection status, chat toggle ve end interview butonları
 */
export function RoomHeader({
  isConnected,
  isElevenLabsConnected,
  isChatOpen,
  isRecording = false,
  onToggleChat,
  onEndInterview,
}: RoomHeaderProps) {
  return (
    <div className="border-b border-gray-800 bg-gray-800/50 p-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <h1 className="text-xl font-semibold text-white">AI Video Görüşme</h1>
        <div className="flex items-center gap-4">
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm text-red-400">Kayıt Yapılıyor</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-300">
              {isConnected ? 'Bağlı' : 'Bağlanıyor...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${isElevenLabsConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm text-gray-300">
              AI: {isElevenLabsConnected ? 'Bağlı' : 'Bağlanıyor...'}
            </span>
          </div>
          <button
            onClick={onToggleChat}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            {isChatOpen ? 'Sohbeti Gizle' : 'Sohbeti Göster'}
          </button>
          <button
            onClick={onEndInterview}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Görüşmeyi Bitir
          </button>
        </div>
      </div>
    </div>
  );
}


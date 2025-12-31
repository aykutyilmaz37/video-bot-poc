/**
 * Loading View Component
 * 
 * Room initialization sırasında gösterilen loading state
 */

interface LoadingViewProps {
  loadingStep: 'idle' | 'connecting_elevenlabs' | 'connecting_room' | 'starting_camera' | 'starting_avatar' | 'ready';
}

const loadingMessages: Record<LoadingViewProps['loadingStep'], string> = {
  idle: '🔄 Hazırlanıyor...',
  connecting_elevenlabs: '🤖 AI bağlantısı kuruluyor...',
  connecting_room: '🔌 Görüşme odasına bağlanılıyor...',
  starting_camera: '📹 Kameranız hazırlanıyor...',
  starting_avatar: '👤 AI avatar hazırlanıyor...',
  ready: '✅ Hazırlanıyor...',
};

export function LoadingView({ loadingStep }: LoadingViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-12 w-12 animate-spin text-indigo-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          {loadingMessages[loadingStep] || 'Hazırlanıyor...'}
        </h2>
        <p className="text-sm text-gray-400">
          Lütfen bekleyin...
        </p>
      </div>
    </div>
  );
}


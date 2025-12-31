/**
 * Home View - Client Component
 * 
 * Landing page client-side logic ve interactivity
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type LoadingStep = 
  | 'idle'
  | 'checking_permissions'
  | 'creating_room'
  | 'getting_ai_token'
  | 'ai_ready'
  | 'redirecting';

/**
 * Home View Component
 * 
 * Görüşme başlatma sayfası
 */
export function HomeView() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleStartInterview = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingStep('checking_permissions');

    try {
      // 1. Kamera ve mikrofon izinlerini iste
      setLoadingStep('checking_permissions');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // İzinler alındı, stream'i durdur (room'da tekrar açacağız)
      stream.getTracks().forEach(track => track.stop());

      // 2. ElevenLabs token'ı al
      setLoadingStep('getting_ai_token');
      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      if (!agentId) {
        throw new Error('ElevenLabs Agent ID yapılandırılmamış');
      }

      const tokenResponse = await fetch('/api/elevenlabs/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'ElevenLabs token alınamadı');
      }

      const tokenData = await tokenResponse.json();
      const conversationToken = tokenData.conversationToken || tokenData.token || tokenData.conversation_token;

      if (!conversationToken || typeof conversationToken !== 'string') {
        throw new Error('Geçersiz ElevenLabs token formatı');
      }

      // 3. Room oluştur (conversationToken ile birlikte)
      setLoadingStep('creating_room');
      const roomResponse = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationToken }),
      });

      if (!roomResponse.ok) {
        throw new Error('Room oluşturulamadı');
      }

      const roomData = await roomResponse.json();
      const roomId = roomData.roomId;

      if (!roomId) {
        throw new Error('Room ID alınamadı');
      }

      // 4. Token alındı, AI hazır - RoomView'de bağlantı kurulacak
      setLoadingStep('ai_ready');
      
      // Kısa bir bekleme sonrası yönlendir (kullanıcı "AI hazır" mesajını görsün)
      setTimeout(() => {
        setLoadingStep('redirecting');
        // URL'den conversationToken'ı kaldırdık - sadece room ID (kısa format: xxx-xxxx-xxx)
        router.push(`/room/${roomId}`);
      }, 1000);
    } catch (err) {
      console.error('Error starting interview:', err);
      
      const error = err as Error & { name?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Kamera ve mikrofon izinleri reddedildi. Lütfen tarayıcı ayarlarından izinleri etkinleştirin.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('Kamera veya mikrofon bulunamadı. Lütfen cihazlarınızı kontrol edin.');
      } else {
        setError(error.message || 'Görüşme başlatılamadı. Lütfen tekrar deneyin.');
      }
      setIsLoading(false);
      setLoadingStep('idle');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-2xl text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-900 dark:text-white">
            AI Video Görüşme
          </h1>
          <p className="mb-12 text-xl text-gray-600 dark:text-gray-300">
            Yapay zeka destekli video görüşme deneyimine hoş geldiniz.
            Görüşmeyi başlatmak için aşağıdaki butona tıklayın.
          </p>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
              <p className="font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleStartInterview}
            disabled={isLoading}
            className="rounded-lg bg-indigo-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
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
                Hazırlanıyor...
              </span>
            ) : (
              'Görüşmeyi Başlat'
            )}
          </button>

          {/* Loading Status Messages */}
          {isLoading && loadingStep !== 'idle' && (
            <div className="mt-6 space-y-2">
              {loadingStep === 'checking_permissions' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  🔒 Kamera ve mikrofon izinleri kontrol ediliyor...
                </p>
              )}
              {loadingStep === 'creating_room' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  🏠 Görüşme odası oluşturuluyor...
                </p>
              )}
              {loadingStep === 'getting_ai_token' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  🔑 AI bağlantı anahtarı alınıyor...
                </p>
              )}
              {loadingStep === 'ai_ready' && (
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ✅ AI hazır! Görüşmeye yönlendiriliyorsunuz...
                </p>
              )}
              {loadingStep === 'redirecting' && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ➡️ Yönlendiriliyor...
                </p>
              )}
            </div>
          )}

          {!isLoading && (
            <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
              <p>Görüşme başlatıldığında kamera ve mikrofon erişimi istenecektir.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


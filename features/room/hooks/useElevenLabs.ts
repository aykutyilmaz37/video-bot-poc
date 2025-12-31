'use client';

import { useCallback, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { defaultInterviewConfig, technicalTermsGlossary } from '@/lib/interview/config';
import { UseElevenLabsReturn } from '../types/room';
import { parseElevenLabsMessage, createChatMessage, parseElevenLabsError } from '../utils/messages';

interface UseElevenLabsProps {
  onMessage: (message: { id: string; sender: string; message: string; timestamp: number }) => void;
  onError: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  // Note: MutableRefObject is deprecated in React types but still needed for mutable refs
  connectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  elevenLabsStartedRef: React.MutableRefObject<boolean>;
  conversationToken?: string; // Opsiyonel: eğer token önceden alınmışsa
  isReadyToSpeak?: React.MutableRefObject<boolean>; // Konuşmaya hazır olana kadar mesajları görmezden gel
}

/**
 * ElevenLabs Conversational AI Hook
 * 
 * ElevenLabs conversation yönetimi ve message handling
 * 
 * Eğer NEXT_PUBLIC_USE_MOCK_ELEVENLABS=true ise, mock implementation kullanılır
 */
export function useElevenLabs({
  onMessage,
  onError,
  onConnect,
  onDisconnect,
  connectionTimeoutRef,
  elevenLabsStartedRef,
  conversationToken: providedToken,
  isReadyToSpeak,
}: UseElevenLabsProps): UseElevenLabsReturn {
  // onConnect callback'inin çağrılmasını beklemek için Promise ref
  const connectPromiseRef = useRef<{
    resolve: (() => void) | null;
    reject: ((error: Error) => void) | null;
  }>({ resolve: null, reject: null });

  // Otomatik sonlandırma için endSession ref'i
  const endSessionRef = useRef<(() => Promise<void>) | null>(null);
  // Otomatik sonlandırma flag'i (tekrar tekrar tetiklenmeyi önlemek için)
  const isEndingSessionRef = useRef(false);

  const conversation = useConversation({
    // WebRTC bağlantıları için connection delay önerilir (özellikle mobil cihazlar için)
    connectionDelay: {
      android: 3000,
      ios: 1000,
      default: 500, // Desktop için kısa bir gecikme
    },
    onConnect: () => {
      console.log('✅ ElevenLabs connected');
      
      // Promise resolve et (eğer varsa)
      if (connectPromiseRef.current.resolve) {
        connectPromiseRef.current.resolve();
        connectPromiseRef.current.resolve = null;
        connectPromiseRef.current.reject = null;
      }
      
      onConnect?.();
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    },
    onDisconnect: () => {
      console.log('❌ ElevenLabs disconnected');
      // Flag'i reset et (yeni bağlantı için)
      isEndingSessionRef.current = false;
      onDisconnect?.();
    },
    onMessage: (message) => {
      console.log('📨 Message received:', message);
      console.log('📨 Message type:', typeof message);
      console.log('📨 Message details:', JSON.stringify(message, null, 2));

      // Eğer henüz konuşmaya hazır değilsek, AI Bot mesajlarını görmezden gel
      if (isReadyToSpeak && !isReadyToSpeak.current) {
        const parsed = parseElevenLabsMessage(message);
        // Sadece kullanıcı mesajlarını göster (eğer varsa)
        if (parsed.sender === 'Siz' && parsed.text) {
          const chatMessage = createChatMessage(parsed.text, parsed.sender);
          onMessage(chatMessage);
        } else {
          console.log('⏸️ AI Bot message ignored (not ready to speak yet)');
        }
        return;
      }

      const parsed = parseElevenLabsMessage(message);
      
      if (parsed.text) {
        const chatMessage = createChatMessage(parsed.text, parsed.sender);
        onMessage(chatMessage);

        // Otomatik sonlandırma kontrolü: Eğer AI Bot closingMessage içeriyorsa
        if (parsed.sender === 'AI Bot' && !isEndingSessionRef.current) {
          const closingMessage = defaultInterviewConfig.closingMessage.toLowerCase();
          const messageText = parsed.text.toLowerCase();
          
          // Mesaj closingMessage içeriyorsa veya kapanış ifadeleri içeriyorsa
          const isClosingMessage = 
            messageText.includes(closingMessage) || 
            messageText.includes('görüşme sona erdi') || 
            messageText.includes('görüşme tamamlandı') ||
            messageText.includes('tüm sorular') ||
            (messageText.includes('teşekkür ederim') && (messageText.includes('görüşme') || messageText.includes('sona')));
          
          if (isClosingMessage) {
            console.log('✅ Closing message detected:', parsed.text);
            console.log('✅ Ending session in 3 seconds...');
            
            // Flag'i set et - tekrar tekrar tetiklenmeyi önle
            isEndingSessionRef.current = true;
            
            // 3 saniye bekle (AI'nın mesajı bitirmesi için) sonra oturumu kapat
            setTimeout(() => {
              // Eğer flag zaten false ise, başka bir yerden sonlandırılmış
              if (!isEndingSessionRef.current) {
                console.log('⚠️ Ending session flag already reset, skipping...');
                return;
              }
              
              if (endSessionRef.current) {
                console.log('🔄 Calling endSession via ref...');
                endSessionRef.current()
                  .then(() => {
                    console.log('✅ Session ended successfully via auto-close');
                    // Flag'i reset et (endSession içinde zaten reset edildi ama emin olmak için)
                    isEndingSessionRef.current = false;
                    // onDisconnect endSession içinde çağrılacak
                    // Yönlendirme için onDisconnect callback'i içinde yapılacak (RoomView'de)
                  })
                  .catch((err: unknown) => {
                    console.error('❌ Error ending session after closing message:', err);
                    // Flag'i reset et
                    isEndingSessionRef.current = false;
                    // Hata olsa bile onDisconnect'i çağır
                    onDisconnect?.();
                    // Hata durumunda da yönlendir
                    setTimeout(() => {
                      if (typeof globalThis !== 'undefined' && globalThis.location) {
                        globalThis.location.href = '/completed';
                      }
                    }, 1000);
                  });
              } else {
                console.warn('⚠️ endSession ref is null, calling onDisconnect directly and redirecting');
                isEndingSessionRef.current = false;
                onDisconnect?.();
                // Ref yoksa direkt yönlendir
                setTimeout(() => {
                  if (typeof globalThis !== 'undefined' && globalThis.location) {
                    globalThis.location.href = '/completed';
                  }
                }, 1000);
              }
            }, 3000);
          }
        }
      }
    },
    onInterruption: (event) => {
      console.log('⚠️ Conversation interrupted:', event);
    },
    onError: (error: unknown) => {
      console.error('❌ ElevenLabs error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Error objesinin detaylarını kontrol et
      let errorString = String(error);
      let errorMessage = errorString;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorString = error.toString();
      }

      // "leave request" hatası normal bir durum olabilir (cleanup sırasında)
      // Bu hatayı görmezden gel, kritik değil
      if (errorString.includes('leave request') || errorString.includes('Received leave request')) {
        console.warn('⚠️ Leave request received (normal during cleanup/reconnect)');
        return; // Bu hatayı kullanıcıya gösterme
      }

      // WebRTC bağlantı hataları için özel handling
      if (errorMessage.includes('pc connection') || 
          errorMessage.includes('peer connection') || 
          errorMessage.includes('could not establish') ||
          errorMessage.includes('ICE') ||
          errorMessage.includes('WebRTC')) {
        console.error('🔴 WebRTC bağlantı hatası tespit edildi');
        // Promise ref'inde reject varsa, bunu tetikle
        if (connectPromiseRef.current.reject) {
          connectPromiseRef.current.reject(new Error(`WebRTC bağlantı hatası: ${errorMessage}`));
          connectPromiseRef.current.resolve = null;
          connectPromiseRef.current.reject = null;
        }
        // Flag'i reset et - tekrar deneme için
        elevenLabsStartedRef.current = false;
      }

      const userMessage = parseElevenLabsError(error);
      onError(userMessage);
    },
    onModeChange: ({ mode }) => {
      console.log('🔄 Mode changed:', mode);
    },
  });

  const sendMessage = useCallback((text: string) => {
    try {
      conversation.sendUserMessage(text);
      console.log('✅ User message sent to AI:', text);
    } catch (error) {
      console.error('❌ Error sending user message:', error);
    }
  }, [conversation]);

  const startSession = useCallback(async (overrideToken?: string) => {
    if (elevenLabsStartedRef.current) {
      console.log('⚠️ ElevenLabs already started, skipping...');
      return;
    }

    // Önce mevcut session'ı temizle (eğer varsa)
    try {
      await conversation.endSession();
      console.log('🧹 Previous session ended');
    } catch (cleanupError) {
      // Cleanup hatası kritik değil, devam et
      console.warn('⚠️ Error cleaning up previous session (non-critical):', cleanupError);
    }

    elevenLabsStartedRef.current = true;

    try {
      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      
      if (!agentId) {
        console.warn('⚠️ ElevenLabs Agent ID not configured');
        onError('ElevenLabs Agent ID yapılandırılmamış');
        elevenLabsStartedRef.current = false;
        return;
      }

      console.log('🤖 Starting ElevenLabs conversation...');
      console.log('🤖 Agent ID:', agentId);
      
      // HTTPS kontrolü (WebRTC için gerekli)
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn('⚠️ HTTPS gerekli - WebRTC bağlantıları güvenli bağlantı gerektirir');
        elevenLabsStartedRef.current = false;
        throw new Error('WebRTC bağlantısı için HTTPS gerekli. Lütfen güvenli bir bağlantı kullanın.');
      }
      
      // Mikrofon izinlerini kontrol et (WebRTC için gerekli)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // İzinleri test ettik, stream'i kapat
        console.log('✅ Microphone permissions granted');
      } catch (micError) {
        console.error('❌ Microphone permission error:', micError);
        elevenLabsStartedRef.current = false;
        const errorName = micError instanceof Error ? micError.name : 'UnknownError';
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          throw new Error('Mikrofon izinleri gerekli. Lütfen tarayıcı ayarlarından mikrofon izinlerini verin.');
        } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
          throw new Error('Mikrofon bulunamadı. Lütfen cihazınızı kontrol edin.');
        } else {
          throw new Error(`Mikrofon hatası: ${micError instanceof Error ? micError.message : String(micError)}`);
        }
      }
      
      // Conversation token al (eğer önceden verilmemişse veya override edilmişse)
      let conversationToken: string | undefined = overrideToken || providedToken;
      
      if (!conversationToken || conversationToken.trim().length === 0) {
        console.log('📡 Fetching conversation token...');
        const tokenResponse = await fetch('/api/elevenlabs/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}));
          const errorText = await tokenResponse.text().catch(() => '');
          console.error('❌ Token fetch failed:', {
            status: tokenResponse.status,
            error: errorData,
            text: errorText
          });
          elevenLabsStartedRef.current = false;
          throw new Error(errorData.error || errorText || 'Conversation token alınamadı');
        }

        const tokenData = await tokenResponse.json();
        console.log('📦 Token response keys:', Object.keys(tokenData));
        
        conversationToken = tokenData.conversationToken || tokenData.token || tokenData.conversation_token;
        
        if (!conversationToken || typeof conversationToken !== 'string') {
          console.error('❌ Invalid token format:', tokenData);
          elevenLabsStartedRef.current = false;
          throw new Error('Geçersiz token formatı alındı');
        }

        console.log('✅ Token received, length:', conversationToken.length);
      } else {
        console.log('✅ Using provided conversation token, length:', conversationToken.length);
      }

      // Interview sorularını dynamic variables olarak gönder
      const questions = defaultInterviewConfig.questions.map(q => ({
        name: q.text,
        factor: 1,
      }));

      // Token'ı kontrol et
      if (!conversationToken || conversationToken.trim().length === 0) {
        elevenLabsStartedRef.current = false;
        throw new Error('Geçersiz conversation token');
      }

      console.log('🔐 Token length:', conversationToken.length);
      console.log('🔐 Token preview:', conversationToken.substring(0, 20) + '...');

      // WebRTC bağlantısı için retry mekanizması
      let retryCount = 0;
      const maxRetries = 3;
      let lastError: Error | null = null;

      while (retryCount < maxRetries) {
        // Her retry için yeni Promise oluştur
        const connectPromise = new Promise<void>((resolve, reject) => {
          connectPromiseRef.current.resolve = resolve;
          connectPromiseRef.current.reject = reject;
        });

        try {
          console.log(`🔄 Attempting WebRTC connection (attempt ${retryCount + 1}/${maxRetries})...`);
          
          if (!conversationToken || conversationToken.trim().length === 0) {
            throw new Error('Geçersiz conversation token');
          }

          // startSession Promise'ini başlat
          const sessionPromise = conversation.startSession({
            conversationToken: conversationToken.trim(),
            connectionType: 'webrtc',
            dynamicVariables: {
              companyName: defaultInterviewConfig.companyName,
              positionName: defaultInterviewConfig.positionName,
              greetingMessage: defaultInterviewConfig.greetingMessage,
              companyIntro: defaultInterviewConfig.companyIntro,
              positionIntro: defaultInterviewConfig.positionIntro,
              questions: JSON.stringify(questions),
              // Teknik terimler glossary'si - Agent'ın bu terimleri doğru anlaması için
              technicalTermsGlossary: JSON.stringify(technicalTermsGlossary),
            },
            overrides: {
              agent: {
                language: 'tr',
              },
            },
          });

          // startSession Promise'ini ve onConnect callback'ini birlikte bekle
          console.log('⏳ Waiting for ElevenLabs session to start...');
          
          // Önce startSession'ın tamamlanmasını bekle
          let conversationId: string | undefined;
          try {
            conversationId = await sessionPromise;
            console.log('✅ Session started, conversationId:', conversationId);
          } catch (sessionStartError) {
            // startSession hatası varsa hemen fırlat
            throw sessionStartError;
          }

          // Sonra onConnect callback'inin çağrılmasını bekle (WebRTC bağlantısı için)
          console.log('⏳ Waiting for WebRTC connection to establish...');
          try {
            // Timeout: startSession başarılı olduğuna göre, bağlantı kısa sürede kurulmalı
            // Ancak WebRTC için 25 saniye veriyoruz (ICE negotiation için)
            await Promise.race([
              connectPromise,
              new Promise<void>((_, reject) => {
                setTimeout(() => {
                  reject(new Error('WebRTC bağlantı zaman aşımı (25 saniye) - ICE negotiation başarısız olabilir'));
                }, 25000);
              }),
            ]);
            
            console.log('✅ ElevenLabs WebRTC connection established successfully');
            break; // Başarılı, döngüden çık
          } catch (promiseError) {
            // onConnect callback'i çağrılmadı, bağlantı kurulamadı
            throw promiseError;
          }
        } catch (sessionError) {
          lastError = sessionError instanceof Error ? sessionError : new Error(String(sessionError));
          console.error(`❌ WebRTC connection attempt ${retryCount + 1} failed:`, lastError.message);
          
          // Promise ref'i temizle
          connectPromiseRef.current.resolve = null;
          connectPromiseRef.current.reject = null;
          
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Yeni token al ve tekrar dene
            console.log('🔄 Fetching new token for retry...');
            const retryTokenResponse = await fetch('/api/elevenlabs/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agentId }),
            });

            if (retryTokenResponse.ok) {
              const retryData = await retryTokenResponse.json();
              conversationToken = retryData.conversationToken;
              console.log('✅ New token received for retry');
              
              // Retry arasında kısa bir bekleme
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            } else {
              console.error('❌ Failed to get new token for retry');
              break;
            }
          }
        }
      }

      if (retryCount >= maxRetries && lastError) {
        elevenLabsStartedRef.current = false;
        throw lastError;
      }

      console.log('✅ ElevenLabs session started and connected');
    } catch (error) {
      console.error('❌ Error starting ElevenLabs conversation:', error);
      elevenLabsStartedRef.current = false; // Hata durumunda tekrar denemek için
      if (error instanceof Error) {
        onError(`ElevenLabs: ${error.message}`);
      }
      throw error; // Hata fırlat ki RoomView'de yakalansın
    }
  }, [conversation, onError, onConnect, elevenLabsStartedRef, providedToken]);

  const endSession = useCallback(async () => {
    try {
      // Flag'leri reset et
      elevenLabsStartedRef.current = false;
      isEndingSessionRef.current = false;
      
      // Promise ref'leri temizle
      connectPromiseRef.current.resolve = null;
      connectPromiseRef.current.reject = null;
      
      await conversation.endSession();
      console.log('✅ ElevenLabs session ended');
      // onDisconnect callback'ini çağır (RoomView'de yönlendirme yapılacak)
      onDisconnect?.();
    } catch (error) {
      const errorString = String(error);
      // "leave request" hatası normal bir durum olabilir
      if (errorString.includes('leave request') || errorString.includes('Received leave request')) {
        console.warn('⚠️ Leave request during endSession (normal)');
      } else {
        console.error('Error ending ElevenLabs session:', error);
      }
      // Hata olsa bile onDisconnect'i çağır
      onDisconnect?.();
      // Flag'i reset et
      isEndingSessionRef.current = false;
    }
  }, [conversation, elevenLabsStartedRef, onDisconnect]);

  // endSession ref'ini set et (otomatik sonlandırma için)
  endSessionRef.current = endSession;

  return {
    conversation,
    sendMessage,
    endSession,
    startSession,
  };
}


/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useRef, useMemo, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { UseElevenLabsReturn } from '../types/room';
import { createChatMessage } from '../utils/messages';

// Web Speech Recognition API tipleri (basitleştirilmiş)
type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognitionType, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionType, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionType, ev: { error: string; message: string }) => void) | null;
  onresult: ((this: SpeechRecognitionType, ev: { resultIndex: number; results: Array<Array<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
};

type SpeechRecognitionConstructor = {
  new (): SpeechRecognitionType;
};

interface UseMockElevenLabsProps {
  onMessage: (message: { id: string; sender: string; message: string; timestamp: number }) => void;
  onError: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  connectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  elevenLabsStartedRef: React.MutableRefObject<boolean>;
  conversationToken?: string; // Token yapısı kalacak ama kullanılmayacak
  isReadyToSpeak?: React.MutableRefObject<boolean>;
}

/**
 * Mock ElevenLabs Hook
 * 
 * Development için mock conversation implementasyonu
 * Token yapısı korunur ama gerçek API çağrısı yapılmaz
 */
export function useMockElevenLabs({
  onMessage,
  onError,
  onConnect,
  onDisconnect,
  connectionTimeoutRef,
  elevenLabsStartedRef,
  conversationToken: _providedToken, // Kullanılmayacak ama interface'i koruyoruz
  isReadyToSpeak,
}: UseMockElevenLabsProps): UseElevenLabsReturn {
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const greetingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const isRecordingRef = useRef(false);
  const isMutedRef = useRef(false);
  const isTTSSpeakingRef = useRef(false); // TTS konuşması sırasında recognition'ı engellemek için
  const isUserSpeakingRef = useRef(false); // Kullanıcı gerçekten konuşuyor mu?
  const [isSpeaking, setIsSpeaking] = useState(false); // AI konuşuyor mu? (state olarak - UI güncellemesi için)
  
  // Frontend görüşme senaryosu için soru takibi
  const currentQuestionIndexRef = useRef(0);
  const answeredQuestionsCountRef = useRef(0);
  
  const frontendInterviewQuestions = [
    'Merhaba! Öncelikle kendinizi kısaca tanıtır mısınız? Frontend geliştirme alanında ne kadar deneyiminiz var?',
    'En son yaptığınız projeler nelerdir? Projelerinizde hangi teknolojileri kullandınız?',
    'Projenizin en büyük challengeı nedir? Bu challengeı nasıl çözdünüz?',
    'Projenizin en büyük başarısı nedir? Bu başarıyı nasıl elde ettiniz?',
    'Projenizin en büyük başarısı nedir? Bu başarıyı nasıl elde ettiniz?',
  ];
  
  const closingMessage = 'Harika! Tüm sorularınızı cevapladığınız için teşekkür ederim. Görüşme sona ermiştir. İyi günler!';
  
  // Türkçe ses seçme helper fonksiyonu (rastgele Türkçe ses)
  const getTurkishVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof globalThis === 'undefined' || !('speechSynthesis' in globalThis)) {
      return null;
    }
    
    // Sesleri al (bazı tarayıcılarda async yüklenebilir, bu yüzden fallback kullanacağız)
    const voices = globalThis.speechSynthesis.getVoices();
    
    // Tüm Türkçe sesleri bul
    const turkishVoices = voices.filter(voice => voice.lang.startsWith('tr'));
    
    if (turkishVoices.length > 0) {
      // Rastgele bir Türkçe ses seç
      const randomIndex = Math.floor(Math.random() * turkishVoices.length);
      return turkishVoices[randomIndex];
    }
    
    return null;
  }, []);
  
  // Web Speech Recognition API desteği kontrolü
  const initSpeechRecognition = useCallback(() => {
    if (globalThis.window === undefined) return null;
    
    // Tarayıcı desteği kontrolü
    const SpeechRecognitionConstructor = (globalThis.window as any).SpeechRecognition || (globalThis.window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      console.warn('🎭 Mock ElevenLabs: Speech Recognition API desteklenmiyor');
      return null;
    }
    
    const recognition = new SpeechRecognitionConstructor() as SpeechRecognitionType;
    recognition.continuous = true; // Sürekli dinleme
    recognition.interimResults = true; // Ara sonuçlar
    recognition.lang = 'tr-TR'; // Türkçe
    
    recognition.onstart = () => {
      console.log('🎭 Mock ElevenLabs: Speech recognition started');
      isRecordingRef.current = true;
    };
    
    recognition.onend = () => {
      console.log('🎭 Mock ElevenLabs: Speech recognition ended');
      isRecordingRef.current = false;
      // Eğer muted değilse, session aktifse VE TTS konuşmuyorsa, tekrar başlat
      // TTS konuşuyorsa restart etme (feedback loop önleme)
      if (!isMutedRef.current && elevenLabsStartedRef.current && !isTTSSpeakingRef.current) {
        try {
          recognition.start();
          console.log('🎭 Mock ElevenLabs: Recognition auto-restarted (TTS not speaking)');
        } catch {
          // Zaten başlatılmış olabilir, hata görmezden gel
        }
      } else {
        console.log('🎭 Mock ElevenLabs: Recognition not restarted (muted:', isMutedRef.current, ', TTS speaking:', isTTSSpeakingRef.current, ')');
      }
    };
    
    recognition.onerror = (event: { error: string; message: string }) => {
      console.error('🎭 Mock ElevenLabs: Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Ses algılanmadı, normal durum
        return;
      }
      if (event.error === 'not-allowed') {
        onError('Mikrofon izinleri verilmedi. Lütfen tarayıcı ayarlarından izin verin.');
      }
    };
    
    recognition.onresult = (event: { resultIndex: number; results: Array<Array<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => {
      // TTS konuşması sırasında recognition sonuçlarını yok say (feedback loop önleme)
      if (isTTSSpeakingRef.current) {
        console.log('🎭 Mock ElevenLabs: Ignoring recognition result (TTS is speaking)');
        return;
      }
      
      let finalTranscript = '';
      let hasInterimResults = false;
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i] as Array<{ transcript: string; confidence: number }> & { isFinal: boolean };
        const transcript = result[0]?.transcript || '';
        if (!result.isFinal && transcript.trim()) {
          // Interim result varsa (henüz final değil ama ses algılanıyor), kullanıcı konuşuyor
          hasInterimResults = true;
          isUserSpeakingRef.current = true;
        }
        if (result.isFinal) {
          finalTranscript += transcript + ' ';
        }
      }
      
      // Final transcript varsa, mesaj olarak gönder
      if (finalTranscript.trim()) {
        console.log('🎭 Mock ElevenLabs: Recognized speech:', finalTranscript);
        // Final transcript geldi, kullanıcı konuşmayı bitirdi (biraz gecikmeyle)
        setTimeout(() => {
          isUserSpeakingRef.current = false;
        }, 500);
        // sendUserMessage'yı doğrudan çağır (mockConversation henüz oluşturulmamış olabilir)
        const userMessage = createChatMessage(finalTranscript.trim(), 'Siz');
        onMessage(userMessage);
        
        // Kullanıcı cevap verdi, sayacı artır
        answeredQuestionsCountRef.current += 1;
        
        // AI cevabı gönder - Frontend görüşme senaryosu
        // Kullanıcıya daha fazla zaman ver (3-4 saniye bekle)
        setTimeout(() => {
          let response = '';
          let nextQuestionIndex = -1;
          
          // Eğer 5 soru cevaplandıysa, görüşmeyi sonlandır
          if (answeredQuestionsCountRef.current >= 5) {
            response = closingMessage;
          } else if (currentQuestionIndexRef.current < frontendInterviewQuestions.length) {
            // Bir sonraki soruyu sor
            nextQuestionIndex = currentQuestionIndexRef.current;
            response = frontendInterviewQuestions[currentQuestionIndexRef.current];
            currentQuestionIndexRef.current += 1;
          } else {
            // Tüm sorular soruldu, kapanış mesajı
            response = closingMessage;
          }
          
          const aiMessage = createChatMessage(response, 'AI Bot');
          onMessage(aiMessage);
          
          // TTS ile sesli cevap (AI konuşurken Speech Recognition'ı durdur - feedback loop önleme)
          if (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis) {
            try {
              // TTS başlamadan önce Speech Recognition'ı durdur ve flag'i set et (feedback loop önleme)
              isTTSSpeakingRef.current = true;
              if (recognitionRef.current && !isMutedRef.current) {
                try {
                  recognitionRef.current.stop();
                  console.log('🎭 Mock ElevenLabs: Stopped recognition during TTS (onresult)');
                } catch (err) {
                  // Ignore errors
                }
              }
              
              const utterance = new SpeechSynthesisUtterance(response);
              utterance.lang = 'tr-TR';
              const turkishVoice = getTurkishVoice();
              if (turkishVoice) {
                utterance.voice = turkishVoice;
              }
              
              // TTS bittiğinde flag'i kaldır ve Speech Recognition'ı tekrar başlat (veya görüşmeyi sonlandır)
              utterance.onend = () => {
                console.log('🎭 Mock ElevenLabs: TTS ended, restarting recognition (onresult)');
                isTTSSpeakingRef.current = false;
                setIsSpeaking(false);
                
                // Eğer kapanış mesajı ise, görüşmeyi sonlandır
                if (response === closingMessage) {
                  setTimeout(() => {
                    // End session'ı doğrudan çağır - onDisconnect callback'i çağrılacak
                    if (typeof globalThis !== 'undefined' && globalThis.location) {
                      globalThis.location.href = '/completed';
                    }
                  }, 2000);
                  return;
                }
                
                // Kısa bir gecikme ile restart et (TTS tamamen bitmiş olsun)
                setTimeout(() => {
                  if (recognitionRef.current && !isMutedRef.current && elevenLabsStartedRef.current && !isTTSSpeakingRef.current) {
                    try {
                      recognitionRef.current.start();
                      console.log('🎭 Mock ElevenLabs: Recognition restarted after TTS (onresult)');
                    } catch (err) {
                      // Zaten başlatılmış olabilir
                    }
                  }
                }, 200);
              };
              
              utterance.onerror = () => {
                // Hata olsa bile flag'i kaldır ve recognition'ı tekrar başlat
                isTTSSpeakingRef.current = false;
                setIsSpeaking(false); // AI konuşması bitti (hata durumunda)
                setTimeout(() => {
                  if (recognitionRef.current && !isMutedRef.current && elevenLabsStartedRef.current && !isTTSSpeakingRef.current) {
                    try {
                      recognitionRef.current.start();
                    } catch (err) {
                      // Ignore
                    }
                  }
                }, 200);
              };
              
              // TTS başladığında flag'i set et
              utterance.onstart = () => {
                setIsSpeaking(true); // AI konuşmaya başladı
              };
              
              globalThis.speechSynthesis.speak(utterance);
            } catch (ttsError) {
              console.warn('🎭 Mock ElevenLabs: TTS error:', ttsError);
              isTTSSpeakingRef.current = false;
              setIsSpeaking(false); // AI konuşması bitti (hata durumunda)
              // TTS hatası olsa bile recognition'ı tekrar başlat
              setTimeout(() => {
                if (recognitionRef.current && !isMutedRef.current && elevenLabsStartedRef.current && !isTTSSpeakingRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (err) {
                    // Ignore
                  }
                }
              }, 200);
            }
          }
        }, 3000 + Math.random() * 1000); // 3-4 saniye arası bekle (kullanıcıya daha fazla zaman ver)
      }
    };
    
    return recognition;
  }, [onError, onMessage, elevenLabsStartedRef, getTurkishVoice, setIsSpeaking, frontendInterviewQuestions, closingMessage]);
  
  // Mock conversation objesi - useMemo ile optimize et
  const mockConversation = useMemo(() => ({
    startSession: async () => {
      console.log('🎭 Mock ElevenLabs: Starting session...');
      return 'mock-conversation-id';
    },
    endSession: async () => {
      console.log('🎭 Mock ElevenLabs: Ending session...');
      // Timeout'ları temizle
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
      if (greetingTimeoutRef.current) {
        clearTimeout(greetingTimeoutRef.current);
        greetingTimeoutRef.current = null;
      }
      // TTS'i durdur
      if (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis) {
        globalThis.speechSynthesis.cancel();
      }
    },
    sendUserMessage: (text: string) => {
      console.log('🎭 Mock ElevenLabs: User message:', text);
      // Kullanıcı mesajını göster (mock mode'da buradan ekleniyor)
      const userMessage = createChatMessage(text, 'Siz');
      onMessage(userMessage);
      
      // Kullanıcı cevap verdi, sayacı artır ve kayıt durdur
      const currentAnswerIndex = answeredQuestionsCountRef.current;
      answeredQuestionsCountRef.current += 1;
      
      // 1-2 saniye sonra AI cevabı gönder (ses ile)
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      
      messageTimeoutRef.current = setTimeout(() => {
        if (isReadyToSpeak && !isReadyToSpeak.current) {
          console.log('🎭 Mock ElevenLabs: Not ready to speak yet, skipping response');
          return;
        }
        
        // Frontend görüşme senaryosu - bir sonraki soruyu sor veya kapanış mesajı
        let response = '';
        let nextQuestionIndex = -1;
        
        // Eğer 5 soru cevaplandıysa, görüşmeyi sonlandır
        if (answeredQuestionsCountRef.current >= 5) {
          response = closingMessage;
        } else if (currentQuestionIndexRef.current < frontendInterviewQuestions.length) {
          // Bir sonraki soruyu sor
          nextQuestionIndex = currentQuestionIndexRef.current;
          response = frontendInterviewQuestions[currentQuestionIndexRef.current];
          currentQuestionIndexRef.current += 1;
        } else {
          // Tüm sorular soruldu, kapanış mesajı
          response = closingMessage;
        }
        
        const aiMessage = createChatMessage(response, 'AI Bot');
        onMessage(aiMessage);
        
        // Web Speech API ile ses çal (TTS) - Kadın sesi (AI konuşurken Speech Recognition'ı durdur)
        if (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis) {
          try {
            // TTS başlamadan önce Speech Recognition'ı durdur ve flag'i set et (feedback loop önleme)
            isTTSSpeakingRef.current = true;
            if (recognitionRef.current && !isMutedRef.current) {
              try {
                recognitionRef.current.stop();
                console.log('🎭 Mock ElevenLabs: Stopped recognition during TTS (sendUserMessage)');
              } catch {
                // Ignore errors
              }
            }
            
            const utterance = new SpeechSynthesisUtterance(response);
            utterance.lang = 'tr-TR'; // Türkçe
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            // Türkçe ses seç
            const turkishVoice = getTurkishVoice();
            if (turkishVoice) {
              utterance.voice = turkishVoice;
              console.log('🎭 Mock ElevenLabs: Using voice:', turkishVoice.name, `(${turkishVoice.lang})`);
            } else {
              console.log('🎭 Mock ElevenLabs: Turkish voice not found, using default');
            }
            
            // Önceki konuşmaları iptal et
            globalThis.speechSynthesis.cancel();
            
            // TTS bittiğinde flag'i kaldır ve Speech Recognition'ı tekrar başlat (veya görüşmeyi sonlandır)
            utterance.onend = () => {
              console.log('🎭 Mock ElevenLabs: TTS ended, restarting recognition (sendUserMessage)');
              isTTSSpeakingRef.current = false;
              setIsSpeaking(false);
              
              // Eğer kapanış mesajı ise, görüşmeyi sonlandır
              if (response === closingMessage) {
                setTimeout(() => {
                  // End session'ı doğrudan çağır - onDisconnect callback'i çağrılacak
                  if (typeof globalThis !== 'undefined' && globalThis.location) {
                    globalThis.location.href = '/completed';
                  }
                }, 2000);
                return;
              }
              
              // Kısa bir gecikme ile restart et (TTS tamamen bitmiş olsun)
              setTimeout(() => {
                if (recognitionRef.current && !isMutedRef.current && elevenLabsStartedRef.current && !isTTSSpeakingRef.current) {
                  try {
                    recognitionRef.current.start();
                    console.log('🎭 Mock ElevenLabs: Recognition restarted after TTS (sendUserMessage)');
                  } catch {
                    // Zaten başlatılmış olabilir
                  }
                }
              }, 200);
            };
            
            utterance.onerror = () => {
              // Hata olsa bile flag'i kaldır ve recognition'ı tekrar başlat
              isTTSSpeakingRef.current = false;
              setIsSpeaking(false); // AI konuşması bitti (hata durumunda)
              setTimeout(() => {
                if (recognitionRef.current && !isMutedRef.current && elevenLabsStartedRef.current && !isTTSSpeakingRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch {
                    // Ignore
                  }
                }
              }, 200);
            };
            
            // TTS başladığında flag'i set et
            utterance.onstart = () => {
              setIsSpeaking(true); // AI konuşmaya başladı
            };
            
            globalThis.speechSynthesis.speak(utterance);
            console.log('🎭 Mock ElevenLabs: Playing TTS audio for:', response);
          } catch (ttsError) {
            console.warn('🎭 Mock ElevenLabs: TTS error:', ttsError);
            isTTSSpeakingRef.current = false;
            setIsSpeaking(false); // AI konuşması bitti (hata durumunda)
            // TTS hatası olsa bile recognition'ı tekrar başlat
            setTimeout(() => {
              if (recognitionRef.current && !isMutedRef.current && elevenLabsStartedRef.current && !isTTSSpeakingRef.current) {
                try {
                  recognitionRef.current.start();
                } catch {
                  // Ignore
                }
              }
            }, 200);
          }
        }
      }, 3000 + Math.random() * 1000); // 3-4 saniye arası random (kullanıcıya daha fazla zaman ver)
    },
    sendUserActivity: () => {
      console.log('🎭 Mock ElevenLabs: User activity detected');
    },
    getInputByteFrequencyData: (): Uint8Array => {
      return new Uint8Array(256);
    },
    getOutputByteFrequencyData: (): Uint8Array => {
      return new Uint8Array(256);
    },
    // Diğer gerekli metodları ekle (tip uyumluluğu için minimal implementasyon)
    setVolume: () => {},
    getInputVolume: () => {
      // Konuşma sırasında volume simülasyonu (sadece kullanıcı gerçekten konuşuyorken ve TTS konuşmuyorken)
      // TTS konuşuyorsa volume 0 döndür (feedback loop önleme)
      if (isTTSSpeakingRef.current) {
        return 0;
      }
      // Kullanıcı gerçekten konuşuyorsa volume döndür, aksi halde 0
      return isUserSpeakingRef.current && isRecordingRef.current ? Math.random() * 0.5 + 0.3 : 0;
    },
    getOutputVolume: () => {
      // TTS konuşması sırasında volume simülasyonu
      return (globalThis as any).speechSynthesis?.speaking ? Math.random() * 0.5 + 0.4 : 0;
    },
    sendFeedback: () => {},
    isSpeaking: isSpeaking,
    isThinking: false,
    isMuted: isMutedRef.current,
    mute: () => {
      isMutedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('🎭 Mock ElevenLabs: Error stopping recognition:', error);
        }
      }
      console.log('🎭 Mock ElevenLabs: Muted');
    },
    unmute: () => {
      isMutedRef.current = false;
      if (recognitionRef.current && elevenLabsStartedRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.warn('🎭 Mock ElevenLabs: Error starting recognition:', error);
        }
      }
      console.log('🎭 Mock ElevenLabs: Unmuted');
    },
    interrupt: () => {},
    isInterrupting: false,
    getId: () => 'mock-conversation-id',
    sendContextualUpdate: () => {},
    sendMCPToolApprovalResult: () => {},
    changeInputDevice: () => Promise.resolve(),
    changeOutputDevice: () => Promise.resolve(),
  } as unknown as ReturnType<typeof useConversation>), [onMessage, isReadyToSpeak, getTurkishVoice, isSpeaking, frontendInterviewQuestions, closingMessage]);

  const sendMessage = useCallback((text: string) => {
    try {
      mockConversation.sendUserMessage(text);
    } catch (error) {
      console.error('❌ Error sending mock message:', error);
    }
  }, [mockConversation]);

  const startSession = useCallback(async (_overrideToken?: string) => {
    if (elevenLabsStartedRef.current) {
      console.log('🎭 Mock ElevenLabs: Already started, skipping...');
      return;
    }

    elevenLabsStartedRef.current = true;

    try {
      console.log('🎭 Mock ElevenLabs: Starting mock session...');
      
      // Mikrofon izinlerini kontrol et
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // İzinleri test ettik, stream'i kapat
        console.log('✅ Mock ElevenLabs: Microphone permissions granted');
      } catch (micError) {
        console.error('❌ Mock ElevenLabs: Microphone permission error:', micError);
        const errorName = micError instanceof Error ? micError.name : 'UnknownError';
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          throw new Error('Mikrofon izinleri gerekli. Lütfen tarayıcı ayarlarından mikrofon izinlerini verin.');
        }
      }
      
      // Soru index'lerini sıfırla (yeni session başlarken)
      currentQuestionIndexRef.current = 0;
      answeredQuestionsCountRef.current = 0;
      
      // Speech Recognition'ı başlat
      recognitionRef.current = initSpeechRecognition();
      if (recognitionRef.current && !isMutedRef.current) {
        try {
          recognitionRef.current.start();
          console.log('🎭 Mock ElevenLabs: Speech recognition started');
        } catch (err) {
          console.warn('🎭 Mock ElevenLabs: Could not start speech recognition:', err);
        }
      }
      
      // Kısa bir gecikme ile "bağlanma" simülasyonu
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // onConnect callback'ini çağır
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      onConnect?.();
      
      // Eğer hazırsa, greeting mesajı gönder
      if (greetingTimeoutRef.current) {
        clearTimeout(greetingTimeoutRef.current);
      }
      
      greetingTimeoutRef.current = setTimeout(() => {
        if (isReadyToSpeak && !isReadyToSpeak.current) {
          // Henüz hazır değil, greeting'i ertele
          console.log('🎭 Mock ElevenLabs: Not ready for greeting yet');
          return;
        }
        
        // İlk soruyu sor (greeting yerine)
        const firstQuestion = frontendInterviewQuestions[0];
        currentQuestionIndexRef.current = 1; // Bir sonraki soru index'i
        const greetingMessage = createChatMessage(firstQuestion, 'AI Bot');
            onMessage(greetingMessage);
          
              // İlk soru için TTS - Kadın sesi (AI konuşurken Speech Recognition'ı durdur)
              if (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis) {
                try {
                  // TTS başlamadan önce Speech Recognition'ı durdur ve flag'i set et (feedback loop önleme)
                  isTTSSpeakingRef.current = true;
                  if (recognitionRef.current && !isMutedRef.current) {
                    try {
                      recognitionRef.current.stop();
                      console.log('🎭 Mock ElevenLabs: Stopped recognition during first question TTS');
                    } catch {
                      // Ignore errors
                    }
                  }
                  
                  const utterance = new SpeechSynthesisUtterance(firstQuestion);
                  utterance.lang = 'tr-TR';
                  utterance.rate = 1;
                  utterance.pitch = 1;
                  utterance.volume = 1;
                  
                  // Türkçe ses seç
                  const turkishVoice = getTurkishVoice();
                  if (turkishVoice) {
                    utterance.voice = turkishVoice;
                    console.log('🎭 Mock ElevenLabs: Using voice for first question:', turkishVoice.name);
                  }
                  
                  // TTS bittiğinde flag'i kaldır ve Speech Recognition'ı tekrar başlat
                  utterance.onend = () => {
                    console.log('🎭 Mock ElevenLabs: Greeting TTS ended, restarting recognition');
                    isTTSSpeakingRef.current = false;
                    setIsSpeaking(false); // AI konuşması bitti
                    // Kısa bir gecikme ile restart et (TTS tamamen bitmiş olsun)
                    setTimeout(() => {
                      if (recognitionRef.current && !isMutedRef.current && elevenLabsStartedRef.current && !isTTSSpeakingRef.current) {
                        try {
                          recognitionRef.current.start();
                          console.log('🎭 Mock ElevenLabs: Recognition restarted after greeting TTS');
                        } catch {
                          // Zaten başlatılmış olabilir
                        }
                      }
                    }, 200);
                  };
                  
                  utterance.onerror = () => {
                    // Hata olsa bile flag'i kaldır ve recognition'ı tekrar başlat
                    isTTSSpeakingRef.current = false;
                    setIsSpeaking(false); // AI konuşması bitti (hata durumunda)
                    setTimeout(() => {
                      if (recognitionRef.current && !isMutedRef.current && elevenLabsStartedRef.current && !isTTSSpeakingRef.current) {
                        try {
                          recognitionRef.current.start();
                        } catch {
                          // Ignore
                        }
                      }
                    }, 200);
                  };
                  
                  // TTS başladığında flag'i set et
                  utterance.onstart = () => {
                    setIsSpeaking(true); // AI konuşmaya başladı
                  };
                  
                  globalThis.speechSynthesis.speak(utterance);
                  console.log('🎭 Mock ElevenLabs: Playing first question TTS');
                } catch (ttsError) {
                  console.warn('🎭 Mock ElevenLabs: Greeting TTS error:', ttsError);
                  isTTSSpeakingRef.current = false;
                  setIsSpeaking(false); // AI konuşması bitti (hata durumunda)
                  // TTS hatası olsa bile recognition'ı tekrar başlat
                  setTimeout(() => {
                    if (recognitionRef.current && !isMutedRef.current && elevenLabsStartedRef.current && !isTTSSpeakingRef.current) {
                      try {
                        recognitionRef.current.start();
                      } catch {
                        // Ignore
                      }
                    }
                  }, 200);
                }
              }
      }, 1000);

      console.log('✅ Mock ElevenLabs session started');
    } catch (error) {
      console.error('❌ Error starting mock ElevenLabs session:', error);
      elevenLabsStartedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          // Ignore
        }
        recognitionRef.current = null;
      }
      if (error instanceof Error) {
        onError(`Mock ElevenLabs: ${error.message}`);
      }
      throw error;
    }
  }, [onError, onConnect, elevenLabsStartedRef, connectionTimeoutRef, isReadyToSpeak, onMessage, getTurkishVoice, initSpeechRecognition, frontendInterviewQuestions, closingMessage]);

  const endSession = useCallback(async () => {
    try {
      elevenLabsStartedRef.current = false;
      
      // Speech Recognition'ı durdur
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          // Ignore
        }
        recognitionRef.current = null;
      }
      isRecordingRef.current = false;
      
      // Timeout'ları temizle
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
      if (greetingTimeoutRef.current) {
        clearTimeout(greetingTimeoutRef.current);
        greetingTimeoutRef.current = null;
      }
      
      await mockConversation.endSession();
      console.log('✅ Mock ElevenLabs session ended');
      onDisconnect?.();
    } catch (error) {
      console.error('Error ending mock ElevenLabs session:', error);
    }
  }, [onDisconnect, elevenLabsStartedRef, mockConversation]);

  return {
    conversation: mockConversation,
    sendMessage,
    endSession,
    startSession,
  };
}

# AI Video Interview Bot - MVP

Canlı AI video görüşme botu için MVP uygulaması. Kullanıcılar bir web arayüzü üzerinden AI avatar ile görüşme yapabilir.

## 🚀 Özellikler
- **ElevenLabs Conversational AI**: Gerçek AI sohbet botu - dinamik konuşma (Mock mode desteği var)
- **Interview Flow**: State machine ile yapılandırılmış görüşme akışı

## 📋 Gereksinimler

- Node.js 18+ 
- npm veya yarn
- LiveKit server (cloud veya self-hosted)
- ElevenLabs API key (opsiyonel - mock kullanılabilir)

## 🛠️ Kurulum

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Environment variables oluşturun:**
`.env.local` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id

# Mock Mode (Development için - Token bitmişse veya test için)
# true yaparsanız, gerçek ElevenLabs API çağrısı yapılmaz, mock cevaplar kullanılır
NEXT_PUBLIC_USE_MOCK_ELEVENLABS=false
```

3. **Development server'ı başlatın:**
```bash
npm run dev
```

4. Tarayıcıda `http://localhost:3000` adresine gidin.

## 🎭 Mock Mode (Development)

Token bitmişse veya test için mock mode kullanabilirsiniz. `.env.local` dosyasına şunu ekleyin:

```env
NEXT_PUBLIC_USE_MOCK_ELEVENLABS=true
```

Mock mode aktifken:
- Gerçek ElevenLabs API çağrısı yapılmaz
- Mock AI cevapları kullanılır
- Token yapısı korunur (sadece kullanılmaz)
- Kullanıcı mesajlarına otomatik cevaplar verilir

## 📁 Proje Yapısı

```
video-bot/
├── app/
│   ├── api/
│   │   ├── room/
│   │   │   └── create/          # LiveKit room oluşturma
│   │   └── elevenlabs/
│   │       └── token/           # ElevenLabs conversation token
│   ├── room/
│   │   └── [roomId]/            # Görüşme odası sayfası
│   ├── completed/               # Görüşme tamamlandı sayfası
│   └── page.tsx                 # Landing page
├── lib/
│   ├── providers/
│   │   ├── avatar/              # Avatar provider interface ve implementations
│   │   └── voice/               # Voice provider interface ve implementations
│   └── interview/
│       ├── controller.ts        # Interview state machine
│       ├── config.ts            # Görüşme soruları ve mesajlar
│       └── types.ts             # Type definitions
└── public/                      # Static assets
```

## 🎯 Kullanım

1. **Landing Page**: Ana sayfada "Görüşmeyi Başlat" butonuna tıklayın
2. **İzinler**: Kamera ve mikrofon izinlerini verin
3. **Görüşme**: AI avatar ile görüşme yapın
4. **Sorular**: 5 soru sorulacak, cevaplarınızı konuşarak verin
5. **Tamamlandı**: Görüşme sonunda tamamlandı sayfasına yönlendirilirsiniz

## 🏗️ Mimari

### Provider Pattern

Avatar ve voice provider'lar interface-based bir yapı kullanır. Bu sayede:
- Farklı provider'lar kolayca değiştirilebilir
- Mock implementation'lar test için kullanılabilir
- API key yoksa otomatik olarak mock'a fallback yapılır

### Interview State Machine

Görüşme akışı bir state machine ile yönetilir:
- `idle` → `greeting` → `company_intro` → `position_intro` → `asking_question` → `listening` → `processing` → `bot_responding` → `completed`

### Modüller

- **Avatar Provider**: Video stream sağlar (HeyGen veya mock)
- **ElevenLabs Conversational AI**: Gerçek AI sohbet botu - kullanıcı cevaplarına göre dinamik konuşma
- **Interview Controller**: Görüşme akışını yönetir
- **LiveKit VideoConference**: Video konferans UI component'i

## 🔧 Yapılandırma

### Görüşme Soruları

Soruları değiştirmek için `lib/interview/config.ts` dosyasını düzenleyin:

```typescript
export const defaultInterviewConfig: InterviewConfig = {
  companyName: 'Acme',
  positionName: 'Yazılım Geliştirici',
  questions: [
    { id: 1, text: 'Kendinizi tanıtır mısınız?', category: 'genel' },
    // ... daha fazla soru
  ],
};
```

### Avatar Provider Değiştirme

`lib/providers/avatar/index.ts` dosyasında provider seçimi yapılır. Yeni bir provider eklemek için:

1. `AvatarProvider` interface'ini implement edin
2. Factory function'a ekleyin

### Voice Provider Değiştirme

Benzer şekilde, `lib/providers/voice/index.ts` dosyasında voice provider değiştirilebilir.

## 🐛 Sorun Giderme

### LiveKit Bağlantı Hatası
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, ve `LIVEKIT_API_SECRET` değerlerini kontrol edin
- LiveKit server'ın çalıştığından emin olun

### ElevenLabs API Hatası
- `ELEVENLABS_API_KEY` ve `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` değerlerini kontrol edin
- ElevenLabs dashboard'unuzdan Agent ID'nizi alın
- API key'in doğru olduğundan emin olun

### Conversational AI Çalışmıyor
- Agent ID'nin doğru olduğundan emin olun
- ElevenLabs dashboard'da agent'ın aktif olduğunu kontrol edin
- Mikrofon izinlerini kontrol edin

## 📝 Notlar

- Bu bir MVP'dir, production için ek güvenlik ve optimizasyonlar gerekebilir
- Speech-to-Text için Web Speech API kullanılıyor (browser-dependent)
- Interview soruları statik bir array'de tutuluyor (database yok)

## 🚧 Gelecek Geliştirmeler

- [ ] Daha gelişmiş response engine (LLM-based)
- [ ] Görüşme kayıtları
- [ ] Authentication sistemi
- [ ] Database entegrasyonu
- [ ] Daha fazla avatar expression desteği

## 📄 Lisans

MIT

/**
 * Interview Configuration
 * 
 * Görüşme soruları ve mesajları burada tanımlanır.
 */

import { InterviewConfig, InterviewQuestion } from './types';

/**
 * Frontend geliştirme teknik terimleri glossary'si
 * Kullanıcı bu terimleri söylediğinde doğru anlaşılması için
 */
export const technicalTermsGlossary: Record<string, string> = {
  // Framework'ler ve Kütüphaneler
  'react': 'React',
  'reactjs': 'React',
  'vue': 'Vue',
  'vuejs': 'Vue',
  'angular': 'Angular',
  'nextjs': 'Next.js',
  'next': 'Next.js',
  'nuxt': 'Nuxt',
  'svelte': 'Svelte',
  
  // Programlama Dilleri
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'css': 'CSS',
  'html': 'HTML',
  'scss': 'SCSS',
  'sass': 'SASS',
  'less': 'LESS',
  
  // State Management
  'redux': 'Redux',
  'mobx': 'MobX',
  'zustand': 'Zustand',
  'recoil': 'Recoil',
  'jotai': 'Jotai',
  
  // React Konseptleri
  'hook': 'Hook',
  'hooks': 'Hooks',
  'useState': 'useState',
  'useEffect': 'useEffect',
  'useContext': 'useContext',
  'useReducer': 'useReducer',
  'useCallback': 'useCallback',
  'useMemo': 'useMemo',
  'component': 'Component',
  'components': 'Components',
  'props': 'Props',
  'state': 'State',
  'context': 'Context',
  'provider': 'Provider',
  'custom hook': 'Custom Hook',
  
  // Diğer Terimler
  'api': 'API',
  'rest': 'REST',
  'graphql': 'GraphQL',
  'websocket': 'WebSocket',
  'npm': 'NPM',
  'yarn': 'Yarn',
  'pnpm': 'PNPM',
  'git': 'Git',
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'aws': 'AWS',
  'azure': 'Azure',
  'gcp': 'GCP',
};

export const defaultInterviewConfig: InterviewConfig = {
  companyName: 'Acme',
  positionName: 'Yazılım Geliştirici',
  greetingMessage: 'Merhaba, Acme şirketine hoşgeldiniz.',
  companyIntro: 'Acme, teknoloji alanında öncü bir şirkettir. İnovatif çözümler üretiyoruz.',
  positionIntro: 'Bugün Yazılım Geliştirici pozisyonu için görüşme yapacağız.',
  closingMessage: 'Görüşme tamamlandı. Zaman ayırdığınız için teşekkür ederiz.',
  questions: [
    {
      id: 1,
      text: 'Kendinizi kısaca tanıtır mısınız?',
      category: 'genel',
    },
    {
      id: 2,
      text: 'Bu pozisyon için neden başvurdunuz?',
      category: 'motivasyon',
    },
    {
      id: 3,
      text: 'En güçlü yönleriniz nelerdir?',
      category: 'kişisel',
    },
    {
      id: 4,
      text: 'Takım çalışması hakkında ne düşünüyorsunuz?',
      category: 'işbirliği',
    },
    {
      id: 5,
      text: 'Son olarak, bize sormak istediğiniz bir soru var mı?',
      category: 'kapanış',
    },
  ],
};


/**
 * Avatar Provider Factory
 * 
 * Mock avatar provider (D-ID kaldırıldı)
 */

import { AvatarProvider } from './types';
import { MockAvatarProvider } from './mock-avatar';

export function createAvatarProvider(): AvatarProvider {
  // Mock provider kullan (D-ID kaldırıldı)
  return new MockAvatarProvider();
}

// Client-side için (browser'da çalışır)
export function createAvatarProviderClient(): AvatarProvider {
  // Mock provider kullan (D-ID kaldırıldı)
  return new MockAvatarProvider();
}

export type { AvatarProvider, AvatarExpression } from './types';
export { MockAvatarProvider } from './mock-avatar';

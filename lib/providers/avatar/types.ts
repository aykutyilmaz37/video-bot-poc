/**
 * Avatar Provider Interface
 * 
 * Bu interface, farklı avatar sağlayıcılarını (mock, vb.) 
 * değiştirilebilir hale getirir.
 */

export type AvatarExpression = 'neutral' | 'positive' | 'thinking' | 'speaking';

export interface AvatarProvider {
  /**
   * Avatar video stream'ini başlatır
   * @returns HTMLVideoElement veya MediaStream
   */
  startVideoStream(): Promise<HTMLVideoElement | MediaStream>;

  /**
   * Avatar ifadesini değiştirir
   * @param expression - Avatar ifadesi
   */
  setExpression(expression: AvatarExpression): Promise<void>;

  /**
   * Avatar video stream'ini durdurur
   */
  stopVideoStream(): Promise<void>;

  /**
   * Provider'ın kullanılabilir olup olmadığını kontrol eder
   */
  isAvailable(): boolean;
}


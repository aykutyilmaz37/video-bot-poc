/**
 * Room Creation API (Basitleştirilmiş - LiveKit olmadan)
 * 
 * Room ID oluşturur ve conversationToken'ı backend'de saklar
 */

import { NextRequest, NextResponse } from 'next/server';

// Basit memory store - production'da Redis veya database kullanılmalı
export const roomStore = new Map<string, { conversationToken: string; createdAt: number }>();

// Cleanup: 1 saat sonra expire olan room'ları temizle
const ROOM_EXPIRY_MS = 60 * 60 * 1000; // 1 saat
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [roomId, data] of roomStore.entries()) {
      if (now - data.createdAt > ROOM_EXPIRY_MS) {
        roomStore.delete(roomId);
        console.log(`🧹 Cleaned up expired room: ${roomId}`);
      }
    }
  }, 5 * 60 * 1000); // Her 5 dakikada bir kontrol et
}

/**
 * Kısa room ID oluştur (Google Meet tarzı)
 * Format: xxx-xxxx-xxx (örnek: abc-defg-hij)
 */
function generateShortRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const parts = [
    Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
    Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
  ];
  return parts.join('-');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationToken } = body;

    if (!conversationToken || typeof conversationToken !== 'string') {
      return NextResponse.json(
        { error: 'conversationToken is required' },
        { status: 400 }
      );
    }

    // Kısa room ID oluştur
    let roomId = generateShortRoomId();
    // Collision kontrolü (çok nadir olur ama yine de kontrol edelim)
    while (roomStore.has(roomId)) {
      roomId = generateShortRoomId();
    }

    // Room'u store'a ekle
    roomStore.set(roomId, {
      conversationToken,
      createdAt: Date.now(),
    });

    console.log(`✅ Room created: ${roomId}`);

    return NextResponse.json({
      roomId,
    });
  } catch (error) {
    console.error('[API] Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}

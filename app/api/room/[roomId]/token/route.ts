/**
 * Room Token API
 * 
 * Room ID'den conversationToken'ı döndürür
 */

import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '../../create/route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId is required' },
        { status: 400 }
      );
    }

    const roomData = roomStore.get(roomId);

    if (!roomData) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Token'ı döndür
    return NextResponse.json({
      conversationToken: roomData.conversationToken,
    });
  } catch (error) {
    console.error('[API] Error getting room token:', error);
    return NextResponse.json(
      { error: 'Failed to get room token' },
      { status: 500 }
    );
  }
}


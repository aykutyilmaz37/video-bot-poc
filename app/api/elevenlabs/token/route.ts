/**
 * ElevenLabs Conversation Token API
 * 
 * ElevenLabs Conversational AI için conversation token üretir.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key bulunamadı' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID gereklidir' },
        { status: 400 }
      );
    }

    console.log('📡 Requesting conversationToken for agent:', agentId);
    console.log('📡 API Key present:', !!apiKey);

    // WebRTC için conversation token al
    const tokenUrl = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`;
    console.log('📡 Request URL:', tokenUrl.replace(apiKey, '***'));

    const response = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs API error:', {
        status: response.status,
        error: errorText
      });
      return NextResponse.json(
        { error: 'Conversation token alınamadı', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Token received from ElevenLabs');
    console.log('📦 Response structure:', Object.keys(data));

    // Token'ı farklı formatlardan al
    let conversationToken = data.token || data.conversationToken || data.conversation_token;
    
    // Eğer response direkt token string ise
    if (typeof data === 'string') {
      conversationToken = data;
    }

    if (!conversationToken) {
      console.error('❌ No token in response:', data);
      return NextResponse.json(
        { error: 'Token bulunamadı', details: data },
        { status: 500 }
      );
    }

    console.log('✅ Token extracted successfully, length:', conversationToken.length);

    // WebRTC için conversationToken döndür
    return NextResponse.json({
      conversationToken: conversationToken,
    });
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu', details: String(error) },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}


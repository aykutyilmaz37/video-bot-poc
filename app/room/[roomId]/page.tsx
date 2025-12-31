/**
 * Room Page - Server Component
 * 
 * Basitleştirilmiş - LiveKit olmadan
 * conversationToken artık URL'de değil, client-side'da room ID'den alınacak
 */

import { RoomView } from '@/features/room/views/RoomView';

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

/**
 * Room Page - Server Component
 */
export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  // conversationToken artık URL'de değil, RoomView içinde room ID'den alınacak
  return <RoomView roomId={roomId} />;
}

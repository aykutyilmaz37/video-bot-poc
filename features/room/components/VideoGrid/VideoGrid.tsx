/**
 * Video Grid Component
 * 
 * Kullanıcı kamerası ve AI Orb'ü gösteren grid container
 */

import { UserVideo } from './UserVideo';
import { AIVideo } from './AIVideo';

interface VideoGridProps {
  videoStream: MediaStream | null;
  agentState: 'listening' | 'talking' | 'thinking' | 'idle';
  getInputVolume: () => number;
  getOutputVolume: () => number;
  isMockMode?: boolean;
  isChatOpen?: boolean;
}

export function VideoGrid({
  videoStream,
  agentState,
  getInputVolume,
  getOutputVolume,
  isMockMode = false,
  isChatOpen = false,
}: VideoGridProps) {
  return (
    <div className={`flex flex-1 items-center justify-center p-8 transition-all ${isChatOpen ? 'lg:w-2/3' : 'w-full'}`}>
      <div className="grid w-full max-w-5xl grid-cols-2 gap-8">
        {/* Kullanıcı Kamerası */}
        <UserVideo videoStream={videoStream} />

        {/* AI Bot - Orb */}
        <AIVideo
          agentState={agentState}
          getInputVolume={getInputVolume}
          getOutputVolume={getOutputVolume}
          isMockMode={isMockMode}
        />
      </div>
    </div>
  );
}


/**
 * AI Video Component
 * 
 * AI Bot'u gösteren Orb component'i
 */

import { Orb } from '@/components/ui/orb';

interface AIVideoProps {
  agentState: 'listening' | 'talking' | 'thinking' | 'idle';
  getInputVolume: () => number;
  getOutputVolume: () => number;
  isMockMode?: boolean;
}

export function AIVideo({ 
  agentState, 
  getInputVolume, 
  getOutputVolume,
  isMockMode = false 
}: AIVideoProps) {
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gray-800">
      <div className="relative h-full w-full">
        <Orb
          className="h-full w-full"
          getInputVolume={getInputVolume}
          getOutputVolume={getOutputVolume}
          agentState={agentState}
          colors={['#6366f1', '#818cf8']}
        />
      </div>
      <div className="absolute bottom-4 left-4 rounded bg-black/50 px-3 py-1 text-sm text-white">
        AI Bot {isMockMode && '(Mock)'}
      </div>
    </div>
  );
}


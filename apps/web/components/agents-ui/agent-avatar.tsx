'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@workspace/ui/lib/utils';
import { type AgentState } from '@/hooks/agents-ui/use-agent-audio-visualizer-aura';

interface AgentAvatarProps {
  state: AgentState;
  className?: string;
}

export function AgentAvatar({ state, className }: AgentAvatarProps) {
  const isThinking = state === 'thinking' || state === 'connecting';
  const isSpeaking = state === 'speaking';
  const videoRef = React.useRef<HTMLVideoElement>(null);

  return (
    <div className={cn("relative flex h-full w-full items-end justify-center overflow-hidden", className)}>
      <div className="relative h-[95%] w-fit overflow-hidden rounded-t-3xl">
        <video
          ref={videoRef}
          src="/avatar_speaking.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="h-full w-auto"
        />
        
        {isThinking && (
          <div className="absolute inset-0 bg-main/20 animate-pulse pointer-events-none" />
        )}
        
        {isSpeaking && (
          <div className="absolute inset-x-0 bottom-0 h-2 bg-main animate-glow pointer-events-none" />
        )}
      </div>
    </div>
  );
}

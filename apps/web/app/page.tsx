'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { PhoneOff, ScrollText, X } from 'lucide-react';
import { AgentAudioVisualizerAura } from '@/components/agents-ui/agent-audio-visualizer-aura';
import {
  VoiceButton,
  type VoiceButtonState,
} from '@workspace/ui/components/ui/voice-button';
import {
  Message,
  MessageContent,
  MessageAvatar,
} from '@workspace/ui/components/ui/message';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/ui/components/sheet';
import { cn } from '@workspace/ui/lib/utils';

// ---------------------------------------------------------------------------
// Fake transcript — replace with your agent's real messages
// ---------------------------------------------------------------------------
const TRANSCRIPT = [
  { id: 1, from: 'assistant' as const, text: "Bonjour! I'm your language coach. Ready to practice for your next client meeting?" },
  { id: 2, from: 'user' as const, text: "Yes, I have a pitch in Paris next Thursday and I want to nail the opening." },
  { id: 3, from: 'assistant' as const, text: "Great. Let's start with a strong opener. Repeat after me: « Merci de me recevoir aujourd'hui. »" },
  { id: 4, from: 'user' as const, text: "Merci de me recevoir aujourd'hui." },
  { id: 5, from: 'assistant' as const, text: "Perfect pronunciation! Now let's work on presenting your agenda confidently." },
  { id: 6, from: 'user' as const, text: "Sure, what's the best phrase for 'I'd like to walk you through three key points'?" },
  { id: 7, from: 'assistant' as const, text: "Try: « J'aimerais vous présenter trois points essentiels. » — formal, clear, and confident." },
];

// Shared neobrutalism utilities
const nb = {
  border: 'border-2 border-border',
  shadow: 'shadow-shadow',
  press: 'hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all duration-100',
  radius: 'rounded-base',
} as const;

export default function Page() {
  const { resolvedTheme } = useTheme();
  const [voiceState, setVoiceState] = useState<VoiceButtonState>('idle');

  const auraState = voiceState === 'recording' ? 'listening' : 'thinking';

  const handleVoicePress = () => {
    if (voiceState === 'idle') {
      setVoiceState('recording');
    } else if (voiceState === 'recording') {
      setVoiceState('processing');
      setTimeout(() => {
        setVoiceState('success');
        setTimeout(() => setVoiceState('idle'), 1200);
      }, 1500);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-16 bg-background">

      {/* Close button */}
      <button
        type="button"
        aria-label="Close"
        className={cn(
          'absolute top-5 right-5 flex size-9 items-center justify-center',
          'bg-background text-foreground',
          nb.radius, nb.border, nb.shadow, nb.press,
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <X className="size-4" />
      </button>

      {/* Aura ring — untouched */}
      <AgentAudioVisualizerAura
        size="xl"
        color="#1FD5F9"
        colorShift={0.1}
        state={auraState}
        themeMode={resolvedTheme as 'dark' | 'light'}
      />

      {/* Control bar */}
      <div className={cn(
        'flex items-center gap-3 bg-background p-3',
        nb.radius, nb.border, nb.shadow,
      )}>

        {/* Voice button — walkie-talkie push-to-speak */}
        <VoiceButton
          state={voiceState}
          onPress={handleVoicePress}
          label={voiceState === 'idle' ? 'PRESS TO SPEAK' : undefined}
          size="default"
          variant="outline"
          className={cn(
            'h-12 px-5 font-mono text-xs font-bold tracking-wider',
            nb.radius, nb.border, nb.shadow, nb.press,
          )}
        />

        {/* Transcript sheet trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open transcript"
              className={cn(
                'flex size-12 items-center justify-center bg-background text-foreground',
                nb.radius, nb.border, nb.shadow, nb.press,
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <ScrollText className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className={cn('flex flex-col gap-0 p-0', nb.border)}
          >
            <SheetHeader className={cn('px-5 py-4', 'border-b-2 border-border')}>
              <SheetTitle className="font-mono font-bold uppercase tracking-wider">Transcript</SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-0 overflow-y-auto px-4">
              {TRANSCRIPT.map((msg) => (
                <Message key={msg.id} from={msg.from}>
                  <MessageAvatar
                    src=""
                    name={msg.from === 'assistant' ? 'AI' : 'Me'}
                  />
                  <MessageContent variant="flat">
                    {msg.text}
                  </MessageContent>
                </Message>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* End call */}
        <button
          type="button"
          aria-label="End call"
          className={cn(
            'flex h-12 items-center gap-2 px-5',
            'bg-chart-2 font-mono text-xs font-bold tracking-wider text-black',
            nb.radius, nb.border, nb.shadow, nb.press,
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <PhoneOff className="size-4" />
          <span className="hidden md:inline">END PRACTICE</span>
          <span className="inline md:hidden">END</span>
        </button>

      </div>
    </div>
  );
}

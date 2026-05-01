'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  AudioWaveform,
  MicOff,
  ScrollText,
  X,
  Play,
  Settings,
  Volume2,
  Languages,
  MessageSquareQuote,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { type AgentState } from '@livekit/components-react';
import { AgentAudioVisualizerGrid } from '@/components/agents-ui/agent-audio-visualizer-grid';
import { AgentAvatar } from '@/components/agents-ui/agent-avatar';
import { useMadameConversation, type ChatMessage } from '@/hooks/use-madame-conversation';
import { useAnalyserFrequencies } from '@/hooks/use-analyser-frequencies';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@workspace/ui/components/ui/context-menu';
import { Switch } from '@workspace/ui/components/ui/switch';
import { Textarea } from '@workspace/ui/components/ui/textarea';
import { Label } from '@workspace/ui/components/label';
import { cn } from '@workspace/ui/lib/utils';
import { Button } from '@workspace/ui/components/ui/button';

function ActiveVisualizerGrid({ state, analyser }: { state: AgentState; analyser: AnalyserNode | null }) {
  const columnCount = 5;
  const frequencies = useAnalyserFrequencies(analyser, columnCount);

  return (
    <AgentAudioVisualizerGrid
      size="xl"
      rowCount={5}
      columnCount={columnCount}
      state={state}
      frequencies={frequencies}
    />
  );
}

// Shared neobrutalism utilities
const nb = {
  border: 'border-2 border-border',
  shadow: 'shadow-shadow',
  press: 'hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all duration-100',
  radius: 'rounded-base',
} as const;

/** End conversation / practice control */
const END_CONVERSATION_COLOR = '#FF5C5C';

/** Target duration for time-based leg of session progress (ms) */
const PRACTICE_SESSION_TARGET_MS = 15 * 60 * 1000;
/** Message count at which the transcript leg reaches 100% (combined with time caps at 100%) */
const PRACTICE_MESSAGES_FOR_FULL = 24;

// Map conversation status + isSpeaking → aura AgentState
function toAgentState(
  status: string,
  isSpeaking: boolean,
  interimTranscript: string,
  isProcessing: boolean,
  lastRole?: 'user' | 'assistant',
): AgentState {
  if (status === 'disconnected' || status === 'disconnecting') return 'disconnected';
  if (status === 'connecting') return 'connecting';
  if (isSpeaking) return 'speaking';
  if (isProcessing) return 'thinking';
  if (interimTranscript) return 'thinking';
  if (lastRole === 'user') return 'thinking';
  return 'listening';
}

// Map status + processing state → VoiceButtonState
function toVoiceButtonState(status: string, isProcessing: boolean): VoiceButtonState {
  if (status === 'connecting' || isProcessing) return 'processing';
  if (status === 'connected') return 'recording';
  return 'idle';
}

export default function Page() {
  const [visualizerType, setVisualizerType] = useState<'grid' | 'avatar'>('grid');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hasShownHint, setHasShownHint] = useState(false);
  const [activeAction, setActiveAction] = useState<{
    msg: ChatMessage;
    type: 'translate' | 'feedback';
  } | null>(null);
  const [feedbackType, setFeedbackType] = useState<'up' | 'down' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  const { status, isSpeaking, chatHistory, interimTranscript, isProcessing, startSession, endSession, analyser } =
    useMadameConversation();

  const sessionStartedAtRef = useRef<number | null>(null);
  const [sessionProgressTick, setSessionProgressTick] = useState(0);

  useEffect(() => {
    if (status !== 'connected') {
      sessionStartedAtRef.current = null;
      return;
    }
    sessionStartedAtRef.current = Date.now();
    setSessionProgressTick((n) => n + 1);
    const id = window.setInterval(() => setSessionProgressTick((n) => n + 1), 400);
    return () => window.clearInterval(id);
  }, [status]);

  const practiceProgressPercent = useMemo(() => {
    if (status !== 'connected' || !sessionStartedAtRef.current) return 0;
    const elapsed = Date.now() - sessionStartedAtRef.current;
    const timeRatio = Math.min(1, elapsed / PRACTICE_SESSION_TARGET_MS);
    const msgRatio = Math.min(1, chatHistory.length / PRACTICE_MESSAGES_FOR_FULL);
    return Math.min(100, Math.round(100 * (0.55 * timeRatio + 0.45 * msgRatio)));
  }, [status, chatHistory.length, sessionProgressTick]);

  useEffect(() => {
    if (isTranscriptOpen && !hasShownHint && chatHistory.length > 0) {
      setTimeout(() => {
        setHasShownHint(true);
        const hintShown = localStorage.getItem('hasShownTranscriptHint');
        if (!hintShown) {
          setShowHint(true);
          localStorage.setItem('hasShownTranscriptHint', 'true');
        }
      }, 0);
    }
  }, [isTranscriptOpen, hasShownHint, chatHistory.length]);

  const lastRole = chatHistory.at(-1)?.role;
  const agentState = useMemo(
    () => toAgentState(status, isSpeaking, interimTranscript, isProcessing, lastRole),
    [status, isSpeaking, interimTranscript, isProcessing, lastRole],
  );
  const voiceState = toVoiceButtonState(status, isProcessing);

  const handleVoicePress = () => {
    if (status === 'disconnected') {
      startSession({
        language: localStorage.getItem('language') ?? 'en',
        targetLanguage: localStorage.getItem('targetLanguage') ?? 'fr',
        level: Number(localStorage.getItem('level') ?? 3),
        age: localStorage.getItem('age') ?? 'adult',
        activity: null,
        memory: '',
      });
    } else {
      handleEnd();
    }
  };

  const handleEnd = async () => {
    await endSession();
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-main px-4 py-10">
      <div className="absolute right-5 top-5 z-40 flex items-center gap-2">
        {/* Settings button */}
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Settings"
              className={cn(
                'flex size-10 items-center justify-center rounded-full border-2 border-border bg-white text-foreground shadow-shadow',
                nb.press,
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <Settings className="size-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-secondary-background">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl">Conversation Settings</DialogTitle>
              <DialogDescription className="font-base text-xs">
                Configure your learning experience and audio preferences.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-6 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-base font-semibold text-[10px] uppercase">Native Language</Label>
                  <Select defaultValue="english">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-base font-semibold text-[10px] uppercase">Language to Learn</Label>
                  <Select defaultValue="french">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English (US)</SelectItem>
                      <SelectItem value="french">Français (French)</SelectItem>
                      <SelectItem value="spanish">Español (Spanish)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-base font-semibold text-[10px] uppercase">Language Variant</Label>
                  <Select defaultValue="france">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="france">France</SelectItem>
                      <SelectItem value="canada">Canada</SelectItem>
                      <SelectItem value="belgium">Belgium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-base font-semibold text-[10px] uppercase">Preferred Pronoun</Label>
                  <Select defaultValue="he">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select pronoun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="he">He/Him</SelectItem>
                      <SelectItem value="she">She/Her</SelectItem>
                      <SelectItem value="they">They/Them</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-base font-semibold text-[10px] uppercase">Speech Speed</Label>
                  <Select defaultValue="1">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select speed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.8">Slow (0.8x)</SelectItem>
                      <SelectItem value="1">Normal (1x)</SelectItem>
                      <SelectItem value="1.2">Fast (1.2x)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-base border-2 border-border bg-background shadow-shadow">
                  <div className="space-y-0.5">
                    <Label className="font-base font-semibold text-[10px] uppercase">Realtime conversation</Label>
                    <p className="text-[10px] text-muted-foreground">Always-on microphone</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-base border-2 border-border bg-background shadow-shadow">
                  <div className="space-y-0.5">
                    <Label className="font-base font-semibold text-[10px] uppercase">Hide assistant text</Label>
                    <p className="text-[10px] text-muted-foreground">Voice-only mode</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-3 rounded-base border-2 border-border bg-background shadow-shadow">
                  <Label className="font-base font-semibold text-[10px] uppercase">Echo cancellation</Label>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-base border-2 border-border bg-background shadow-shadow">
                  <Label className="font-base font-semibold text-[10px] uppercase">Noise suppression</Label>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-base border-2 border-border bg-background shadow-shadow">
                  <Label className="font-base font-semibold text-[10px] uppercase">Auto gain control</Label>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label className="font-base font-semibold text-[10px] uppercase">Audio detection model</Label>
                  <Select defaultValue="default">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="accurate">Accurate (higher latency)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 border-t-2 border-border pt-4">
              <DialogClose asChild>
                <Button className="w-full h-12 font-medium uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={status !== 'disconnected' ? handleEnd : undefined}
          className={cn(
            'flex size-10 items-center justify-center rounded-full border-2 border-border bg-white text-foreground shadow-shadow',
            nb.press,
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Control card */}
      <div
        className={cn(
          'flex w-full max-w-3xl flex-col overflow-hidden bg-white',
          nb.radius,
          nb.border,
          nb.shadow,
        )}
      >
        {/* Hero + visualizer */}
        <div className="relative flex min-h-[min(72vw,480px)] w-full flex-col bg-white">
          <div className="relative z-20 flex flex-1 flex-col px-5 pb-8 pt-5 sm:px-8">
          <div
            className="mb-4 mt-2 shrink-0 rounded-full border border-border/40 bg-foreground/15 px-0.5 py-0.5 mx-1 sm:mx-2"
            role="progressbar"
            aria-valuenow={practiceProgressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Session progress"
          >
            <div
              className="h-2 max-w-full rounded-full bg-foreground transition-[width] duration-300 ease-out"
              style={{ width: `${practiceProgressPercent}%` }}
            />
          </div>
          <div className="relative z-20 flex items-start justify-between gap-4">
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full border-2 border-border bg-white px-3 py-1.5 shadow-shadow',
              )}
            >
              <AudioWaveform className="size-4 shrink-0 text-foreground" strokeWidth={2.25} />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                Practice
              </span>
            </div>
            <Select value={visualizerType} onValueChange={(val: 'grid' | 'avatar') => setVisualizerType(val)}>
              <SelectTrigger
                className={cn(
                  'h-9 w-[104px] shrink-0 rounded-full border-2 border-border bg-white/40 text-[11px] font-semibold uppercase tracking-wide text-foreground shadow-none backdrop-blur-sm',
                  'hover:bg-white/60 focus:ring-2 focus:ring-ring/30 data-[placeholder]:text-foreground/75 [&_svg]:text-foreground',
                )}
              >
                <SelectValue placeholder="Grid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">GRID</SelectItem>
                <SelectItem value="avatar">AVATAR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 pb-4 pt-4 text-center">
            <div className="max-w-lg space-y-2 px-2">
              <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
                Let&apos;s practice together
              </h1>
              <p className="text-sm font-normal leading-relaxed text-foreground/85 sm:text-base">
                Speak naturally, I&apos;m here to help you improve.
              </p>
            </div>

            <div className="relative flex w-full flex-col items-center justify-center">
              {visualizerType === 'grid' ? (
                <ActiveVisualizerGrid state={agentState} analyser={analyser} />
              ) : (
                <AgentAvatar state={agentState} />
              )}
              {interimTranscript && (
                <div className="absolute bottom-0 max-w-md animate-in fade-in slide-in-from-bottom-2 px-4">
                  <p
                    className={cn(
                      'rounded-base border border-border/25 bg-white/85 px-3 py-2 text-center text-xs font-medium italic text-foreground shadow-sm backdrop-blur-sm',
                    )}
                  >
                    &ldquo;{interimTranscript}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t-2 border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 justify-start">
            <VoiceButton
              state={voiceState}
              onPress={handleVoicePress}
              label={
                voiceState === 'idle' ? (
                  <span className="flex items-center gap-2">
                    <Play className="size-4 shrink-0 fill-current" />
                    start session
                  </span>
                ) : voiceState === 'processing' ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full bg-foreground"
                      aria-hidden
                    />
                    {status === 'connected' ? 'thinking\u2026' : 'connecting\u2026'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full bg-foreground"
                      aria-hidden
                    />
                    listening&hellip;
                  </span>
                )
              }
              size="default"
              variant="outline"
              disabled={status === 'connecting' || status === 'disconnecting'}
              waveformClassName={cn(
                'rounded-base border-2',
                status === 'connected' || status === 'connecting'
                  ? 'border-main/60 bg-main/35'
                  : 'border-border/15 bg-neutral-100',
              )}
              className={cn(
                'max-w-full rounded-base border-2 font-medium normal-case tracking-normal transition-all duration-100',
                voiceState === 'idle'
                  ? cn(
                      'h-12 min-w-[min(100%,14rem)] px-8 text-sm bg-main text-main-foreground border-border shadow-shadow',
                      nb.press,
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    )
                  : cn(
                      'h-11 px-4 text-[11px] font-medium',
                      voiceState === 'recording'
                        ? cn(
                            'border-border bg-white text-foreground shadow-shadow',
                            nb.press,
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          )
                        : cn(
                            'border-border/15 shadow-none',
                            status === 'connected' || voiceState === 'processing'
                              ? 'bg-main/45 text-foreground hover:bg-main/65'
                              : 'bg-white text-foreground hover:bg-neutral-50',
                          ),
                    ),
              )}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 sm:justify-end">
            {/* Transcript sheet */}
            <Sheet open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open transcript"
                  className={cn(
                    'flex h-11 items-center justify-center gap-2 rounded-full border-2 border-border bg-white px-5 text-[11px] font-medium uppercase tracking-wide text-foreground shadow-shadow',
                    nb.press,
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <ScrollText className="size-4 shrink-0" />
                  <span>Transcript</span>
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className={cn(
                  'flex flex-col gap-0 p-0 overflow-hidden',
                  /* Floating panel: inset from viewport, radius, not edge-to-edge */
                  '!top-4 !bottom-4 !right-4 !left-auto !h-auto max-h-[calc(100vh-2rem)]',
                  '!w-[min(calc(100vw-2rem),34rem)] sm:!w-[min(calc(58vw-1rem),44rem)] sm:!max-w-[58vw]',
                  'rounded-base border-2 border-border bg-white shadow-shadow',
                )}
              >
                <SheetHeader className="border-b border-border bg-white px-5 py-4">
                  <SheetTitle className="text-lg font-semibold tracking-normal text-foreground normal-case">
                    Transcript
                  </SheetTitle>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
                  {chatHistory.length === 0 ? (
                    <p className="py-8 text-center text-xs font-normal text-foreground/70">
                      No messages yet. Start speaking.
                    </p>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <Message
                        key={i}
                        from={msg.role === 'user' ? 'user' : 'assistant'}
                        className={cn(
                          'group py-2 items-end gap-2',
                          'flex w-full flex-row',
                          msg.role === 'assistant' ? 'justify-start' : 'justify-end',
                        )}
                      >
                        {msg.role === 'assistant' ? (
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <div className="flex w-full max-w-full flex-row items-end justify-start gap-2 cursor-context-menu">
                                <MessageAvatar
                                  src=""
                                  name="AI"
                                  className="size-10 shrink-0 rounded-full border border-border bg-white text-foreground"
                                />
                                <MessageContent
                                  variant="flat"
                                  className={cn(
                                    'max-w-[min(85%,calc(100%-3rem))] rounded-xl border border-border bg-white p-4 text-xs font-medium text-foreground shadow-none',
                                    'relative transition-colors group-hover:border-foreground/30',
                                  )}
                                >
                                  {msg.content}
                                </MessageContent>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-48 border-2 border-border bg-white shadow-none">
                              <ContextMenuItem onClick={() => {}} className="gap-2 text-[10px] font-semibold uppercase cursor-pointer">
                                <Volume2 className="size-4" />
                                Replay Audio
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => setActiveAction({ msg, type: 'translate' })} className="gap-2 text-[10px] font-semibold uppercase cursor-pointer">
                                <Languages className="size-4" />
                                Translate
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => setActiveAction({ msg, type: 'feedback' })} className="gap-2 text-[10px] font-semibold uppercase cursor-pointer">
                                <MessageSquareQuote className="size-4" />
                                Feedback the AI
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ) : (
                          <div className="flex max-w-full flex-row items-end justify-end gap-2">
                            <MessageContent
                              variant="flat"
                              className={cn(
                                'max-w-[min(85%,calc(100%-3rem))] rounded-xl border border-border !bg-foreground p-4 text-xs font-medium !text-white shadow-none',
                              )}
                            >
                              {msg.content}
                            </MessageContent>
                            <MessageAvatar
                              src=""
                              name="Me"
                              className="size-10 shrink-0 rounded-full border border-border bg-white text-foreground"
                            />
                          </div>
                        )}
                      </Message>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* End practice */}
            <button
              type="button"
              aria-label="End practice"
              onClick={handleEnd}
              disabled={status === 'disconnected' || status === 'disconnecting'}
              className={cn(
                'flex h-11 items-center gap-2 rounded-full border-2 border-border px-5 text-[11px] font-medium uppercase tracking-wide text-white shadow-shadow',
                nb.press,
                'disabled:pointer-events-none disabled:opacity-40',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              style={{ backgroundColor: END_CONVERSATION_COLOR }}
            >
              <MicOff className="size-4 shrink-0" strokeWidth={2.25} />
              <span className="hidden sm:inline">End practice</span>
              <span className="inline sm:hidden">End</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transcript Hint Alert */}
      <Dialog open={showHint} onOpenChange={setShowHint}>
        <DialogContent className="bg-secondary-background">
          <DialogHeader>
            <DialogTitle className="font-heading">Pro Tip: Transcript Actions</DialogTitle>
            <DialogDescription className="font-base text-xs">
              You can <span className="font-semibold text-main">right-click</span> (or long-press) any AI message in the transcript to replay audio, see translations, or get detailed feedback on your conversation!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button 
                onClick={() => setShowHint(false)}
                className="bg-main text-main-foreground hover:bg-main/90"
              >
                Got it!
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Action Alert (Translate/Feedback) */}
      <Dialog 
        open={!!activeAction} 
        onOpenChange={(open) => {
          if (!open) {
            setActiveAction(null);
            setFeedbackType(null);
            setFeedbackComment('');
          }
        }}
      >
        <DialogContent className="max-w-xl bg-secondary-background">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {activeAction?.type === 'translate' ? (
                <>
                  <Languages className="size-5" />
                  Translation
                </>
              ) : (
                <>
                  <MessageSquareQuote className="size-5" />
                  Feedback the AI
                </>
              )}
            </DialogTitle>
            <DialogDescription className="font-base text-[10px] uppercase font-semibold text-muted-foreground">
              Original Message: "{activeAction?.msg.content}"
            </DialogDescription>
          </DialogHeader>
          
          <div className={cn(
            "p-6 bg-background rounded-base border-2 border-border shadow-shadow font-base text-sm",
            activeAction?.type === 'feedback' ? "border-l-8 border-l-main" : ""
          )}>
            {activeAction?.type === 'translate' ? (
              <p>
                <span className="text-muted-foreground italic">[This is a mock translation for demo purposes]</span>
                <br /><br />
                "{activeAction.msg.content.split('').reverse().join('')}" (Reversed for effect)
              </p>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={() => setFeedbackType('up')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-base border-2 border-border shadow-shadow transition-all",
                      feedbackType === 'up' ? "bg-main text-main-foreground -translate-y-1 shadow-none" : "bg-background hover:bg-muted"
                    )}
                  >
                    <ThumbsUp className="size-8" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Good</span>
                  </button>
                  <button
                    onClick={() => setFeedbackType('down')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-base border-2 border-border shadow-shadow transition-all",
                      feedbackType === 'down' ? "bg-destructive text-destructive-foreground -translate-y-1 shadow-none" : "bg-background hover:bg-muted"
                    )}
                  >
                    <ThumbsDown className="size-8" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Bad</span>
                  </button>
                </div>

                {feedbackType === 'down' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Label className="font-base text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Tell us why (required)
                    </Label>
                    <Textarea
                      placeholder="The response was incorrect, inappropriate, etc."
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      className="min-h-[100px] bg-background font-base text-xs"
                    />
                  </div>
                )}
                
                {feedbackType === 'up' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Label className="font-base text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Anything else? (optional)
                    </Label>
                    <Textarea
                      placeholder="I loved this response because..."
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      className="min-h-[100px] bg-background font-base text-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-3">
            <DialogClose asChild>
              <Button variant="outline" className="h-12 font-medium uppercase tracking-widest">
                {activeAction?.type === 'translate' ? 'Close' : 'Cancel'}
              </Button>
            </DialogClose>
            {activeAction?.type === 'feedback' && (
              <Button 
                disabled={!feedbackType || (feedbackType === 'down' && !feedbackComment.trim())}
                onClick={() => {
                  console.log('Feedback submitted:', { type: feedbackType, comment: feedbackComment });
                  setActiveAction(null);
                  setFeedbackType(null);
                  setFeedbackComment('');
                }}
                className={cn(
                  "h-12 font-medium uppercase tracking-widest",
                  feedbackType === 'up' ? "bg-main text-main-foreground" : 
                  feedbackType === 'down' ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background"
                )}
              >
                Submit Feedback
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

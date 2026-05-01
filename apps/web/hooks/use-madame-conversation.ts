'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createAudioContext,
  decodeAudioToFloat32,
  createAudioBuffer,
  scheduleAudioPlayback,
  stopAllAudio,
  resetAudioQueue,
  processMicrophoneChunk,
  type AudioRefs,
} from '@/lib/audio-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConversationStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionConfig {
  /** Firestore doc ID — ties the WS session to a Firebase conversation record */
  firestoreDocId?: string;
  name?: string;
  level?: number;
  age?: string;
  language?: string;
  targetLanguage?: string;
  languageVariant?: string;
  activity?: string | null;
  memory?: string;
  resumedChatHistory?: ChatMessage[];
}

interface UseMadameConversationOptions {
  onMessage?: (msg: ChatMessage) => void;
  onStatusChange?: (status: ConversationStatus) => void;
  onError?: (message: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Cloud Run WebSocket proxy — mirrors _config.wsProxyUrl in the React app */
const WS_PROXY_URL =
  process.env.NEXT_PUBLIC_WS_PROXY_URL ??
  'https://madameai-ws-proxy-dev-nuouh24woa-nn.a.run.app';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMadameConversation(options: UseMadameConversationOptions = {}) {
  const { onMessage, onStatusChange, onError } = options;

  const [status, setStatus] = useState<ConversationStatus>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Default to unmuted for full-duplex
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [analyser, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Stable refs for callbacks (avoids stale-closure issues)
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onStatusChangeRef.current = onStatusChange;
    onErrorRef.current = onError;
  }, [onMessage, onStatusChange, onError]);

  // Audio pipeline refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletNodeRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isMutedRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const audioQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const audioRefs: AudioRefs = { nextStartTimeRef, audioQueueRef, analyserRef };
  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    isMutedRef.current = muted;
  }, []);

  // ── Audio playback ──────────────────────────────────────────────────────────

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = createAudioContext(16000);
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const ctx = audioContextRef.current;
      if (
        analyserRef.current &&
        (analyserRef.current.context !== ctx || analyserRef.current.context.state === 'closed')
      ) {
        analyserRef.current = null;
        setAnalyserNode(null);
      }

      if (!analyserRef.current) {
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyser.connect(audioContextRef.current.destination);
        analyserRef.current = analyser;
        setAnalyserNode(analyser);
      }

      const float32 = decodeAudioToFloat32(base64Audio);
      if (float32.length === 0) return;

      const buffer = createAudioBuffer(audioContextRef.current, float32, 16000);
      scheduleAudioPlayback(audioContextRef.current, buffer, audioRefs, (isEmpty) => {
        if (isEmpty) {
          setIsSpeaking(false);
        }
      });

      if (audioQueueRef.current.size > 0) {
        setIsSpeaking(true);
      }
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Microphone init ─────────────────────────────────────────────────────────

  const initMicrophone = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 16000,
      },
    });
    audioStreamRef.current = stream;

    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext(16000);
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const processor = audioContextRef.current.createScriptProcessor(2048, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (isMutedRef.current) return;
      const base64 = processMicrophoneChunk(e.inputBuffer.getChannelData(0));
      wsRef.current.send(JSON.stringify({ type: 'audio_input', data: base64 }));
    };

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
    audioWorkletNodeRef.current = processor;
  }, []);

  // ── WebSocket message handler ───────────────────────────────────────────────

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Binary blobs → base64 → play
      if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          const uint8 = new Uint8Array(reader.result as ArrayBuffer);
          const base64 = btoa(String.fromCharCode(...uint8));
          playAudioChunk(base64);
        };
        reader.readAsArrayBuffer(event.data);
        return;
      }

      try {
        const data = JSON.parse(event.data as string);

        if (data.type === 'connected') {
          setStatus('connected');
          onStatusChangeRef.current?.('connected');
        } else if (data.type === 'audio') {
          const chunk = data.audio_event?.audio_base_64 ?? data.audio_event?.chunk;
          if (chunk) playAudioChunk(chunk);
        } else if (data.type === 'user_transcript') {
          const text: string = data.user_transcription_event?.user_transcript;
          const isFinal = data.is_final !== false;
          if (isFinal && text) {
            setIsProcessing(false);
            setInterimTranscript('');
            const msg: ChatMessage = { role: 'user', content: text };
            setChatHistory((prev) => [...prev, msg]);
            onMessageRef.current?.(msg);
          } else if (text) {
            setIsProcessing(true);
            setInterimTranscript(text);
          }
        } else if (data.type === 'agent_response') {
          const text: string = data.agent_response_event?.agent_response;
          const isFinal = data.is_final !== false;
          if (isFinal && text) {
            setIsProcessing(false);
            const msg: ChatMessage = { role: 'assistant', content: text };
            setChatHistory((prev) => [...prev, msg]);
            onMessageRef.current?.(msg);
          }
        } else if (data.type === 'interruption') {
          stopAllAudio(audioRefs);
          setIsSpeaking(false);
        } else if (data.type === 'error') {
          onErrorRef.current?.(data.message ?? 'Unknown error');
        }
      } catch {
        // non-JSON frame — ignore
      }
    },
    [playAudioChunk], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Start session ───────────────────────────────────────────────────────────

  const startSession = useCallback(
    async (config: SessionConfig = {}) => {
      if (wsRef.current) return; // already open

      setMuted(false);
      setStatus('connecting');
      onStatusChangeRef.current?.('connecting');
      setChatHistory([]);
      setIsProcessing(false);

      const wsUrl = `${WS_PROXY_URL.replace('https://', 'wss://')}/ws/elevenlabs`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        resetAudioQueue(audioRefs);

        ws.send(JSON.stringify({ type: 'init', config }));

        try {
          await initMicrophone();
        } catch (err) {
          onErrorRef.current?.('Microphone access required');
          console.error('Mic init failed:', err);
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        onErrorRef.current?.('WebSocket connection error');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        onStatusChangeRef.current?.('disconnected');
        wsRef.current = null;
        setIsSpeaking(false);
      };
    },
    [handleMessage, initMicrophone], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── End session ─────────────────────────────────────────────────────────────

  const endSession = useCallback(async () => {
    setStatus('disconnecting');
    onStatusChangeRef.current?.('disconnecting');

    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;

    audioWorkletNodeRef.current?.disconnect();
    audioWorkletNodeRef.current = null;

    analyserRef.current = null;
    setAnalyserNode(null);

    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    wsRef.current?.close();
    wsRef.current = null;

    setStatus('disconnected');
    onStatusChangeRef.current?.('disconnected');
    setIsSpeaking(false);
    setIsProcessing(false);
    setMuted(true);
  }, [setMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    status,
    isSpeaking,
    isMuted,
    isProcessing,
    chatHistory,
    interimTranscript,
    startSession,
    endSession,
    setIsMuted: setMuted,
    analyser,
  };
}

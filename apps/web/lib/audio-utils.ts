/**
 * Audio Utilities for Realtime Conversation
 * TypeScript port of the madameai audioUtils.js
 */

export function createAudioContext(sampleRate: number): AudioContext {
  const AudioContextClass =
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    ?? window.AudioContext;
  if (!AudioContextClass) {
    throw new Error('AudioContext is not supported in this browser');
  }
  return new AudioContextClass({ sampleRate });
}

export function decodeBase64ToPCM16(base64Audio: string): Int16Array {
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

export function pcm16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    const sample = int16Array[i] ?? 0;
    float32Array[i] = sample / (sample < 0 ? 0x8000 : 0x7fff);
  }
  return float32Array;
}

export function decodeAudioToFloat32(base64Audio: string): Float32Array {
  return pcm16ToFloat32(decodeBase64ToPCM16(base64Audio));
}

export function createAudioBuffer(
  audioContext: AudioContext,
  float32Array: Float32Array,
  sampleRate: number,
): AudioBuffer {
  const buffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
  buffer.getChannelData(0).set(float32Array);
  return buffer;
}

export interface AudioRefs {
  nextStartTimeRef: React.MutableRefObject<number>;
  audioQueueRef: React.MutableRefObject<Set<AudioBufferSourceNode>>;
  analyserRef?: React.MutableRefObject<AnalyserNode | null>;
}

export function scheduleAudioPlayback(
  audioContext: AudioContext,
  audioBuffer: AudioBuffer,
  refs: AudioRefs,
  onEnded?: (isQueueEmpty: boolean) => void,
): AudioBufferSourceNode {
  const { nextStartTimeRef, audioQueueRef, analyserRef } = refs;
  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  
  if (analyserRef && analyserRef.current) {
    source.connect(analyserRef.current);
    // analyserRef.current should already be connected to audioContext.destination
  } else {
    source.connect(audioContext.destination);
  }

  source.addEventListener('ended', () => {
    audioQueueRef.current.delete(source);
    onEnded?.(audioQueueRef.current.size === 0);
  });

  source.start(nextStartTimeRef.current);
  nextStartTimeRef.current += audioBuffer.duration;
  audioQueueRef.current.add(source);
  return source;
}

export function stopAllAudio(refs: AudioRefs): void {
  const { nextStartTimeRef, audioQueueRef } = refs;
  for (const source of audioQueueRef.current) {
    try { source.stop(); } catch { /* already stopped */ }
  }
  audioQueueRef.current.clear();
  nextStartTimeRef.current = 0;
}

export function resetAudioQueue(refs: AudioRefs): void {
  refs.audioQueueRef.current.clear();
  refs.nextStartTimeRef.current = 0;
}

export function float32ToPCM16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i] ?? 0));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

export function encodePCM16ToBase64(pcm16: Int16Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
}

export function processMicrophoneChunk(inputData: Float32Array): string {
  return encodePCM16ToBase64(float32ToPCM16(inputData));
}

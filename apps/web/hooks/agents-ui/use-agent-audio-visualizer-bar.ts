import { useEffect, useRef, useState } from 'react';
import { type AgentState } from '@/hooks/agents-ui/use-agent-audio-visualizer-aura';

type AnimParams = {
  base: number;       // resting height floor (0–1)
  amplitude: number;  // max additional height (0–1)
  freq: number;       // oscillation speed (cycles/sec)
  spread: number;     // phase spread across bars (radians)
};

const DEFAULT_PARAMS: AnimParams = {
  base: 0.06,
  amplitude: 0.06,
  freq: 0.4,
  spread: Math.PI,
};

const STATE_PARAMS: Record<string, AnimParams> = {
  disconnected: DEFAULT_PARAMS,
  connecting:   { base: 0.10, amplitude: 0.72, freq: 1.2,  spread: Math.PI * 2 },
  initializing: { base: 0.10, amplitude: 0.72, freq: 1.2,  spread: Math.PI * 2 },
  listening:    { base: 0.08, amplitude: 0.22, freq: 0.85, spread: Math.PI * 0.6 },
  thinking:     { base: 0.14, amplitude: 0.52, freq: 2.6,  spread: Math.PI * 1.4 },
  speaking:     { base: 0.24, amplitude: 0.70, freq: 3.8,  spread: Math.PI * 2 },
};

/** Lerp a → b at rate t ∈ [0,1] */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Compute a smooth height [0–1] for one bar using three harmonics.
 * Multiple harmonics make the motion look organic rather than mechanical.
 */
function barHeight(time: number, freq: number, phase: number, base: number, amplitude: number) {
  const t = time * Math.PI * 2;
  const v =
    0.55 * Math.sin(t * freq + phase) +
    0.30 * Math.sin(t * freq * 1.618 + phase * 0.8) +
    0.15 * Math.sin(t * freq * 3.1   + phase * 1.5);
  // v ∈ ≈ [-1, 1] → map to [0,1]
  return base + amplitude * (v * 0.5 + 0.5);
}

export function useAgentAudioVisualizerBar(
  state: AgentState | undefined,
  barCount: number,
): number[] {
  const [heights, setHeights] = useState<number[]>(() => new Array(barCount).fill(0.08));

  const [phaseSeeds] = useState<number[]>(() => 
    Array.from({ length: barCount }, (_, i) => i * 1.3 + 0.7)
  );

  // Smoothly-interpolated current params (lerped toward target each frame)
  const currentParams = useRef<AnimParams>({ ...DEFAULT_PARAMS });

  useEffect(() => {
    let rafId: number;

    const animate = (time: number) => {
      const t = time / 1000; // seconds
      const key = state ?? 'disconnected';
      const target = STATE_PARAMS[key] ?? DEFAULT_PARAMS;
      const cur = currentParams.current;

      // Lerp params toward target (0.06 per frame ≈ ~300 ms at 60 fps)
      const RATE = 0.06;
      cur.base      = lerp(cur.base,      target.base,      RATE);
      cur.amplitude = lerp(cur.amplitude, target.amplitude, RATE);
      cur.freq      = lerp(cur.freq,      target.freq,      RATE);
      cur.spread    = lerp(cur.spread,    target.spread,    RATE);

      const next = phaseSeeds.map((seed, i) => {
        // Wave phase: evenly distributed across spread + per-bar seed for organic feel
        const wavePhase = (i / barCount) * cur.spread + seed;
        return barHeight(t, cur.freq, wavePhase, cur.base, cur.amplitude);
      });

      setHeights(next);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [state, barCount, phaseSeeds]);

  return heights;
}

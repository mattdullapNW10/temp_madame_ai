import { useState, useEffect, useRef } from 'react';

/**
 * FFT-derived bands with EMA smoothing for fluid motion (e.g. grid visualizer).
 */
export function useAnalyserFrequencies(analyser: AnalyserNode | null, bands: number = 5): number[] {
  const [frequencies, setFrequencies] = useState<number[]>(() => new Array(bands).fill(0));
  const smoothedRef = useRef<number[]>(new Array(bands).fill(0));

  useEffect(() => {
    smoothedRef.current = new Array(bands).fill(0);
  }, [bands]);

  useEffect(() => {
    if (!analyser) return;

    let animationFrameId: number;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    /** Higher = smoother (less jitter), lower = snappier */
    const EMA_SMOOTH = 0.76;

    const updateFrequencies = () => {
      analyser.getByteFrequencyData(dataArray);

      const newBands = new Array(bands).fill(0);
      const spectrumFraction = 0.65;
      const binsPerBand = Math.max(1, Math.floor((dataArray.length * spectrumFraction) / bands));

      for (let i = 0; i < bands; i++) {
        let sum = 0;
        const start = i * binsPerBand;
        for (let j = 0; j < binsPerBand && start + j < dataArray.length; j++) {
          sum += dataArray[start + j] ?? 0;
        }
        const average = sum / binsPerBand;
        const target = Math.min(1, (average / 255) * 2.8);
        const prev = smoothedRef.current[i] ?? 0;
        const smoothed = prev * EMA_SMOOTH + target * (1 - EMA_SMOOTH);
        smoothedRef.current[i] = smoothed;
        newBands[i] = smoothed;
      }

      setFrequencies(newBands);
      animationFrameId = requestAnimationFrame(updateFrequencies);
    };

    updateFrequencies();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyser, bands]);

  return frequencies;
}

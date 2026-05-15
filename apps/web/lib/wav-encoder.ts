/**
 * Encode a sequence of Float32 mono PCM chunks into a 16-bit PCM WAV Blob.
 */
export function encodeWavFromFloat32Chunks(
  chunks: Float32Array[],
  sampleRate: number,
): Blob {
  const totalSamples = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Float32Array(totalSamples);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  const bytesPerSample = 2;
  const byteRate = sampleRate * bytesPerSample;
  const dataSize = merged.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);            // PCM chunk size
  view.setUint16(20, 1, true);             // PCM format
  view.setUint16(22, 1, true);             // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true);             // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let p = 44;
  for (let i = 0; i < merged.length; i++, p += 2) {
    const s = Math.max(-1, Math.min(1, merged[i] ?? 0));
    view.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

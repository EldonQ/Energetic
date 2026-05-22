/**
 * Frequency band extraction.
 * With fftSize=1024 and ~44.1 kHz audio context, each bin ≈ 43 Hz.
 * 512 bins total covering 0..22 kHz.
 *
 * Bands (approx):
 *   bass:   ~20–250 Hz  → bins 0..6
 *   mid:    ~250–4000   → bins 6..93
 *   treble: ~4000–14000 → bins 93..325
 */
export interface Bands {
  bass: number;
  mid: number;
  treble: number;
  overall: number;
}

function avg(buf: Uint8Array, start: number, end: number): number {
  if (end <= start || end > buf.length) return 0;
  let s = 0;
  for (let i = start; i < end; i++) s += buf[i];
  return s / (end - start) / 255;
}

export function extractBands(buf: Uint8Array): Bands {
  return {
    bass: avg(buf, 0, 6),
    mid: avg(buf, 6, 93),
    treble: avg(buf, 93, 325),
    overall: avg(buf, 0, 325),
  };
}

/** Exponential smoothing (lerp) helper. */
export function lerp(prev: number, next: number, a: number): number {
  return prev + (next - prev) * a;
}

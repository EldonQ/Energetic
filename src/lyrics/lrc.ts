/**
 * LRC parsing + track-title ⇄ lyric-file matching.
 * Self-contained: no imports from the rest of the app.
 */

export interface LrcLine {
  time: number; // seconds
  text: string;
}

/** e.g. "[01:23.45]" / "[01:23]" — a line may carry several timestamps. */
const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/**
 * Credit header lines like "作词 : 刘嘉星" / "Mixed by: X".
 * Netease-style LRCs prepend a block of these with fake 1s-apart timestamps;
 * they're production credits, not lyrics, so we drop them (only within the
 * first 30 s — a colon later in an actual lyric line is left alone).
 */
const CREDIT_LINE = /^\s*[^:：]{1,24}\s*[:：]\s*\S/;

export function parseLrc(raw: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    TIME_TAG.lastIndex = 0;
    const text = rawLine.replace(TIME_TAG, '').trim();
    if (!text) continue;
    TIME_TAG.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TIME_TAG.exec(rawLine)) !== null) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const fracRaw = m[3] ?? '0';
      const frac = parseInt(fracRaw, 10) / 10 ** fracRaw.length;
      const time = min * 60 + sec + frac;
      if (time < 30 && CREDIT_LINE.test(text)) continue;
      lines.push({ time, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

/** Lowercase, strip bracketed asides + all punctuation/whitespace. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[(（\[【][^)）\]】]*[)）\]】]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Pick the best .lrc filename for a track title.
 * Exact normalized match wins; otherwise a prefix match either way
 * (handles "不将就 (电影…片尾曲).lrc" vs. ID3 title "不将就").
 */
export function matchLrcFile(title: string, files: string[]): string | null {
  const target = normalize(title);
  if (!target) return null;
  let prefix: string | null = null;
  for (const f of files) {
    const name = normalize(f.replace(/\.lrc$/i, ''));
    if (!name) continue;
    if (name === target) return f;
    if (!prefix && (name.startsWith(target) || target.startsWith(name))) prefix = f;
  }
  return prefix;
}

/** Index of the line active at `time`, or -1 before the first line. */
export function findActiveIndex(lines: LrcLine[], time: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

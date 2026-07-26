import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useLyrics, AUDIO_EL_ID } from './useLyrics';
import type { LrcLine } from './lrc';

/**
 * Museum-caption style synced lyrics: a single engraved line low on the
 * canvas, with the next line ghosted underneath. Hidden entirely when the
 * current track has no matching .lrc file. Press L to toggle.
 *
 * Progress cues stay deliberately quiet — the current line fills
 * karaoke-style as it plays, and the caption's hairline rule doubles as a
 * lyrics progress rail. No overlays, no takeover: the visualization owns
 * the room, the caption is just the plate on the wall.
 *
 * Self-contained (own keyframes, no index.css / i18n edits) — to remove the
 * feature, delete src/lyrics/ and the <LyricsOverlay /> line in App.tsx.
 */

const VISIBLE_KEY = 'echoes-lyrics-visible';

/** End time of line `i` = start of the next line, or track end as fallback. */
function lineEnd(lines: LrcLine[], i: number, duration: number): number {
  return lines[i + 1]?.time ?? Math.max(duration, lines[i].time + 5);
}

/**
 * Current line rendered with a karaoke-style left→right fill tracking
 * playback. Progress is written straight to the element's style inside a
 * rAF loop — no React re-renders at 60 fps.
 */
function KaraokeLine({ line, end }: { line: LrcLine; end: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const span = Math.max(0.001, end - line.time);
    let raf = 0;
    const tick = () => {
      const audio = document.getElementById(AUDIO_EL_ID) as HTMLAudioElement | null;
      if (audio) {
        const p = Math.min(1, Math.max(0, (audio.currentTime - line.time) / span));
        el.style.backgroundSize = `${(p * 100).toFixed(2)}% 100%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [line, end]);

  return (
    <span
      ref={ref}
      style={{
        color: 'rgba(244, 244, 244, 0.35)',
        backgroundImage:
          'linear-gradient(to right, rgba(244, 244, 244, 0.85), rgba(244, 244, 244, 0.85))',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '0% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
      }}
    >
      {line.text}
    </span>
  );
}

export function LyricsOverlay() {
  const { lines, activeIndex } = useLyrics();
  const duration = usePlayerStore((s) => s.duration);
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(VISIBLE_KEY) !== '0';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'KeyL') {
        setVisible((v) => {
          try {
            localStorage.setItem(VISIBLE_KEY, v ? '0' : '1');
          } catch {
            /* ignore */
          }
          return !v;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!visible || !lines.length) return null;

  const current = activeIndex >= 0 ? lines[activeIndex] : null;
  const next = lines[activeIndex + 1] ?? null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 select-none px-8 text-center">
      <style>{`
        @keyframes lyric-in {
          from { opacity: 0; transform: translateY(0.6em); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lyric-line { animation: none !important; }
        }
      `}</style>

      {/* hairline rule, echoing the museum caption plates — doubles as a
          quiet progress rail through the lyrics */}
      <div className="mx-auto mb-4 h-px w-10 bg-bone/15">
        <div
          className="h-px bg-bone/40 transition-[width] duration-700 ease-out"
          style={{ width: `${((Math.max(0, activeIndex) + 1) / lines.length) * 100}%` }}
        />
      </div>

      <p
        key={activeIndex}
        className="lyric-line mx-auto max-w-3xl text-base md:text-lg tracking-[0.12em]"
        style={{ animation: 'lyric-in 600ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
      >
        {current ? (
          <KaraokeLine line={current} end={lineEnd(lines, activeIndex, duration)} />
        ) : (
          ' '
        )}
      </p>

      <p className="mx-auto mt-2 max-w-2xl truncate text-xs tracking-[0.2em] text-dim/80">
        {next?.text ?? ' '}
      </p>
    </div>
  );
}

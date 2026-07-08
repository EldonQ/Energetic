import { useEffect, useState } from 'react';
import { useLyrics } from './useLyrics';

/**
 * Museum-caption style synced lyrics: a single engraved line low on the
 * canvas, with the next line ghosted underneath. Hidden entirely when the
 * current track has no matching .lrc file. Press L to toggle.
 *
 * Self-contained (own keyframes, no index.css / i18n edits) — to remove the
 * feature, delete src/lyrics/ and the <LyricsOverlay /> line in App.tsx.
 */
export function LyricsOverlay() {
  const { lines, activeIndex } = useLyrics();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'KeyL') setVisible((v) => !v);
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

      {/* hairline rule, echoing the museum caption plates */}
      <div className="mx-auto mb-4 h-px w-10 bg-bone/15" />

      <p
        key={activeIndex}
        className="lyric-line mx-auto max-w-3xl text-base md:text-lg tracking-[0.12em] text-bone/85"
        style={{ animation: 'lyric-in 600ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
      >
        {current?.text ?? ' '}
      </p>

      <p className="mx-auto mt-2 max-w-2xl truncate text-xs tracking-[0.2em] text-dim/80">
        {next?.text ?? ' '}
      </p>
    </div>
  );
}

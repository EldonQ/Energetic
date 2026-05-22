import { useEffect } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useVizStore } from '@/store/vizStore';
import { VIZ_MODULES } from '@/visualizations';
import { useUIStore } from '@/store/uiStore';

/**
 * Top exhibition plaques (I / II / III / IV ...).
 * Hover reveals the work's name; keyboard 1..9 jumps directly.
 */
export function VizSwitcher() {
  const { i18n } = useTranslation();
  const lang = useUIStore((s) => s.lang);
  const currentId = useVizStore((s) => s.currentId);
  const setCurrentId = useVizStore((s) => s.setCurrentId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const idx = Number.parseInt(e.key, 10) - 1;
      if (!Number.isNaN(idx) && idx >= 0 && idx < VIZ_MODULES.length) {
        e.preventDefault();
        setCurrentId(VIZ_MODULES[idx].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCurrentId]);

  // Force re-render on lang change so plaque tooltips localize
  void i18n.language;
  void lang;

  return (
    <nav className="pointer-events-auto flex items-center gap-3">
      {VIZ_MODULES.map((v, i) => {
        const active = v.id === currentId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => setCurrentId(v.id)}
            title={`${v.numeral} · ${v.name[lang]}`}
            className={clsx(
              'group relative flex h-9 w-9 items-center justify-center border transition-colors',
              'text-[11px] tracking-wider font-bold',
              active
                ? 'border-bone text-bone'
                : 'border-faint text-dim hover:border-dim hover:text-bone/80',
            )}
            aria-label={v.name[lang]}
            aria-pressed={active}
          >
            <span>{v.numeral}</span>
            <span className="absolute top-full mt-2 right-0 whitespace-nowrap text-[10px] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity text-dim">
              {v.name[lang]}
            </span>
            {/* keyboard hint */}
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] tracking-wider text-dim/40">
              {i + 1}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

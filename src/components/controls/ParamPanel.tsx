import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { useVizStore, mergedParams } from '@/store/vizStore';
import { getVizOrDefault } from '@/visualizations';
import { useUIStore } from '@/store/uiStore';
import type { ParamDef } from '@/visualizations/types';

/**
 * Schema-driven parameter drawer. Renders sliders / color pickers / toggles / selects
 * based on the active visualization's params schema.
 * Toggled with the `P` key or by clicking the gear icon in the header.
 */
export function ParamPanel() {
  const open = useVizStore((s) => s.panelOpen);
  const togglePanel = useVizStore((s) => s.togglePanel);
  const setPanelOpen = useVizStore((s) => s.setPanelOpen);
  const currentId = useVizStore((s) => s.currentId);
  const overrides = useVizStore((s) => s.overrides);
  const setParam = useVizStore((s) => s.setParam);
  const resetViz = useVizStore((s) => s.resetViz);
  const randomizeViz = useVizStore((s) => s.randomizeViz);
  const lang = useUIStore((s) => s.lang);

  const viz = getVizOrDefault(currentId);
  const values = useMemo(
    () => mergedParams(viz.id, viz.defaults, overrides),
    [viz, overrides],
  );

  // Keyboard: 'P' toggle, 'Esc' close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePanel();
      } else if (e.key === 'Escape') {
        setPanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePanel, setPanelOpen]);

  // Group params by their declared `group` attribute (or 'GENERAL' fallback)
  const grouped = useMemo(() => {
    const out: Record<string, [string, ParamDef][]> = {};
    for (const [k, def] of Object.entries(viz.params)) {
      const g = (def.group as string | undefined) ?? 'GENERAL';
      (out[g] ??= []).push([k, def]);
    }
    return out;
  }, [viz.params]);

  return (
    <aside
      className={clsx(
        'pointer-events-auto fixed top-0 right-0 z-40 h-screen w-[320px]',
        'border-l border-faint bg-ink/95 backdrop-blur',
        'transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-faint px-5 py-4">
        <div>
          <p className="label">{lang === 'zh' ? '参数面板' : 'PARAMETERS'}</p>
          <p className="mt-0.5 text-sm font-bold tracking-wider">
            {viz.numeral} · {viz.name[lang]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          className="text-dim text-lg hover:text-bone transition-colors"
          aria-label="Close"
        >
          [×]
        </button>
      </div>

      {/* Scrollable body */}
      <div className="h-[calc(100vh-128px)] overflow-y-auto px-5 py-4 space-y-6">
        {Object.entries(grouped).map(([groupName, entries]) => (
          <section key={groupName}>
            <p className="label mb-3 text-bone/70">{groupName}</p>
            <div className="space-y-3">
              {entries.map(([key, def]) => (
                <ParamControl
                  key={key}
                  def={def}
                  value={values[key as keyof typeof values] as number | string | boolean}
                  onChange={(v) => setParam(viz.id, key, v)}
                  lang={lang}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer actions */}
      <div className="absolute bottom-0 left-0 right-0 flex border-t border-faint">
        <button
          type="button"
          onClick={() => resetViz(viz.id)}
          className="flex-1 px-3 py-3 text-xs tracking-museum text-dim hover:text-bone transition-colors"
        >
          [ {lang === 'zh' ? '重置' : 'RESET'} ]
        </button>
        <div className="w-px bg-faint" />
        <button
          type="button"
          onClick={() => randomizeViz(viz.id, viz.params)}
          className="flex-1 px-3 py-3 text-xs tracking-museum text-dim hover:text-bone transition-colors"
        >
          [ {lang === 'zh' ? '随机' : 'RANDOMIZE'} ]
        </button>
      </div>
    </aside>
  );
}

interface ControlProps {
  def: ParamDef;
  value: number | string | boolean;
  onChange: (v: number | string | boolean) => void;
  lang: 'zh' | 'en';
}

function ParamControl({ def, value, onChange, lang }: ControlProps) {
  const label = def.label[lang];

  if (def.type === 'range') {
    const v = typeof value === 'number' ? value : Number(value);
    const pct = ((v - def.min) / (def.max - def.min)) * 100;
    return (
      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="tracking-wider text-bone/80">{label}</span>
          <span className="tabular-nums text-dim">{v.toFixed(def.step < 0.1 ? 3 : 2)}</span>
        </div>
        <div className="relative h-1 bg-faint">
          <div className="absolute inset-y-0 left-0 bg-bone/70" style={{ width: `${pct}%` }} />
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={v}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    );
  }

  if (def.type === 'color') {
    const v = typeof value === 'string' ? value : '#ffffff';
    return (
      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="tracking-wider text-bone/80">{label}</span>
          <span className="tabular-nums text-dim">{v.toUpperCase()}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span
            className="block h-6 w-10 border border-faint"
            style={{ backgroundColor: v }}
          />
          <input
            type="color"
            value={v}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          <span className="text-[10px] tracking-wider text-dim group-hover:text-bone">
            {lang === 'zh' ? '点击修改' : 'CLICK TO EDIT'}
          </span>
        </label>
      </div>
    );
  }

  if (def.type === 'toggle') {
    const v = !!value;
    return (
      <button
        type="button"
        onClick={() => onChange(!v)}
        className="flex w-full items-center justify-between text-[11px]"
      >
        <span className="tracking-wider text-bone/80">{label}</span>
        <span className={clsx('px-2 py-0.5 border', v ? 'border-bone text-bone' : 'border-faint text-dim')}>
          {v ? 'ON' : 'OFF'}
        </span>
      </button>
    );
  }

  if (def.type === 'select') {
    const v = typeof value === 'string' ? value : def.options[0];
    return (
      <div>
        <div className="text-[11px] tracking-wider text-bone/80 mb-1">{label}</div>
        <div className="flex flex-wrap gap-1">
          {def.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={clsx(
                'px-2 py-1 text-[10px] tracking-wider border transition-colors',
                v === opt
                  ? 'border-bone text-bone'
                  : 'border-faint text-dim hover:border-dim hover:text-bone/80',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

import { useEffect, useState } from 'react';
import { useVizStore } from '@/store/vizStore';
import { getVizOrDefault } from '@/visualizations';
import { useUIStore } from '@/store/uiStore';

/**
 * Brief "NOW SHOWING / III · MERCURY" indicator that fades in for ~2s
 * whenever the active visualization changes.
 */
export function NowShowingToast() {
  const toastAt = useVizStore((s) => s.toastAt);
  const currentId = useVizStore((s) => s.currentId);
  const lang = useUIStore((s) => s.lang);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toastAt) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 2000);
    return () => window.clearTimeout(id);
  }, [toastAt]);

  const viz = getVizOrDefault(currentId);

  return (
    <div
      className={`pointer-events-none absolute bottom-24 right-10 z-30 transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="label text-right">{lang === 'zh' ? '正在展出' : 'NOW SHOWING'}</p>
      <p className="mt-1 text-bone text-sm font-bold uppercase tracking-museum text-right">
        {viz.numeral} · {viz.name[lang]}
      </p>
    </div>
  );
}

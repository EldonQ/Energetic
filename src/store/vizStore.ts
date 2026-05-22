import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParamValues } from '@/visualizations/types';

interface VizState {
  /** id of the active visualization */
  currentId: string;
  /** per-viz parameter overrides (sparse — only changed values stored) */
  overrides: Record<string, Partial<ParamValues>>;
  /** parameter panel visibility */
  panelOpen: boolean;
  /** "now showing" toast trigger timestamp (used by the toast component) */
  toastAt: number;

  setCurrentId: (id: string) => void;
  setParam: (vizId: string, key: string, value: number | string | boolean) => void;
  resetViz: (vizId: string) => void;
  randomizeViz: (vizId: string, schema: Record<string, unknown>) => void;
  togglePanel: () => void;
  setPanelOpen: (v: boolean) => void;
}

export const useVizStore = create<VizState>()(
  persist(
    (set) => ({
      currentId: 'crystal',
      overrides: {},
      panelOpen: false,
      toastAt: 0,

      setCurrentId: (currentId) => set({ currentId, toastAt: Date.now() }),
      setParam: (vizId, key, value) =>
        set((s) => ({
          overrides: {
            ...s.overrides,
            [vizId]: { ...(s.overrides[vizId] ?? {}), [key]: value },
          },
        })),
      resetViz: (vizId) =>
        set((s) => {
          const next = { ...s.overrides };
          delete next[vizId];
          return { overrides: next };
        }),
      randomizeViz: (vizId, schema) =>
        set((s) => {
          const out: Partial<ParamValues> = {};
          for (const [k, def] of Object.entries(schema)) {
            const d = def as { type: string; min?: number; max?: number; step?: number };
            if (d.type === 'range' && d.min !== undefined && d.max !== undefined) {
              const step = d.step ?? 0.01;
              const span = d.max - d.min;
              const steps = Math.max(1, Math.round(span / step));
              const v = d.min + Math.round(Math.random() * steps) * step;
              out[k] = Math.round(v * 1000) / 1000;
            } else if (d.type === 'toggle') {
              out[k] = Math.random() > 0.5;
            }
            // color/select skipped — keep brand aesthetic
          }
          return { overrides: { ...s.overrides, [vizId]: out } };
        }),
      togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
      setPanelOpen: (panelOpen) => set({ panelOpen }),
    }),
    {
      name: 'echoes-viz',
      partialize: (s) => ({ currentId: s.currentId, overrides: s.overrides }),
    },
  ),
);

/** Helper: merge a viz's defaults with the store overrides. */
export function mergedParams<P extends ParamValues>(
  vizId: string,
  defaults: P,
  overrides: Record<string, Partial<ParamValues>>,
): P {
  const o = overrides[vizId] ?? {};
  return { ...defaults, ...o } as P;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IntensityTier } from '@/audio/analyzer';

type Lang = 'zh' | 'en';

interface UIState {
  lang: Lang;
  reducedMotion: boolean;
  /** Global music-reactivity strength tier — applies to ALL visualizations. */
  intensity: IntensityTier;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  setReducedMotion: (v: boolean) => void;
  setIntensity: (v: IntensityTier) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      lang: 'zh',
      reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      intensity: 'pulse',
      setLang: (lang) => set({ lang }),
      toggleLang: () => set({ lang: get().lang === 'zh' ? 'en' : 'zh' }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setIntensity: (intensity) => set({ intensity }),
    }),
    {
      name: 'echoes-ui',
      partialize: (s) => ({ lang: s.lang, intensity: s.intensity }),
      // Migrate legacy `impact` tier (removed in v2) back to `pulse`.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<UIState>;
        if (p.intensity && p.intensity !== 'ambient' && p.intensity !== 'pulse') {
          p.intensity = 'pulse';
        }
        return { ...current, ...p };
      },
    },
  ),
);

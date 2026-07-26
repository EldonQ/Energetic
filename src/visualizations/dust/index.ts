import type { VizModule } from '@/visualizations/types';
import { Dust } from './Dust';
import { dustParams, dustSchema, type DustParams } from './params';

export const dustViz: VizModule<DustParams> = {
  id: 'dust',
  numeral: 'VI',
  name: { zh: '尘球', en: 'Dust' },
  description: {
    zh: '单色点描球体研究：规整点阵球壳、随中频撕裂的湍流丝缕、外围尘埃晕；低频呼吸、高频闪烁，节拍从两极喷发粒羽。',
    en: 'Monochrome stippled-sphere study — a quasi-lattice shell, mid-driven turbulent wisps and a faint dust halo; bass breathes, treble twinkles, beats vent plumes from the poles.',
  },
  params: dustSchema,
  defaults: dustParams,
  useAmbientParticles: false,
  Component: Dust,
};

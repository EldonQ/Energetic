import type { VizModule } from '@/visualizations/types';
import { Monolith } from './Monolith';
import { monolithParams, monolithSchema, type MonolithParams } from './params';

export const monolithViz: VizModule<MonolithParams> = {
  id: 'monolith',
  numeral: 'II',
  name: { zh: '数据壁', en: 'Monolith' },
  description: {
    zh: '池田亮司式频谱墙：上百根细柱按频段排列，单色阈值切片。',
    en: 'Ryoji Ikeda-style spectrum wall — hundreds of thin bars laid along the FFT axis, threshold-gated monochrome.',
  },
  params: monolithSchema,
  defaults: monolithParams,
  useAmbientParticles: false,
  Component: Monolith,
};

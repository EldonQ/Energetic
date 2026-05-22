import type { VizModule } from '@/visualizations/types';
import { Mercury } from './Mercury';
import { mercuryParams, mercurySchema, type MercuryParams } from './params';

export const mercuryViz: VizModule<MercuryParams> = {
  id: 'mercury',
  numeral: 'III',
  name: { zh: '液态金属', en: 'Mercury' },
  description: {
    zh: '基于 SDF 光线步进的液态金属：多个球体在平滑融合下随节拍膨胀与公转。',
    en: 'SDF raymarched liquid metal — smooth-blended spheres swell and orbit to the music.',
  },
  params: mercurySchema,
  defaults: mercuryParams,
  useAmbientParticles: false,
  Component: Mercury,
};

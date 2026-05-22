import type { VizModule } from '@/visualizations/types';
import { Crystal } from './Crystal';
import { crystalParams, crystalSchema, type CrystalParams } from './params';

export const crystalViz: VizModule<CrystalParams> = {
  id: 'crystal',
  numeral: 'I',
  name: { zh: '晶体', en: 'Crystal' },
  description: {
    zh: '半透明二十面体，Fresnel 边缘发光，按音乐频段分层位移。',
    en: 'Translucent icosahedron with Fresnel edges, displaced by audio bands.',
  },
  params: crystalSchema,
  defaults: crystalParams,
  useAmbientParticles: true,
  Component: Crystal,
};

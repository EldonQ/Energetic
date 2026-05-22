import type { VizModule } from '@/visualizations/types';
import { Heightfield } from './Heightfield';
import { heightfieldParams, heightfieldSchema, type HeightfieldParams } from './params';

export const heightfieldViz: VizModule<HeightfieldParams> = {
  id: 'heightfield',
  numeral: 'V',
  name: { zh: '山脊', en: 'Heightfield' },
  description: {
    zh: '受 Inigo Quilez《Elevated》启发：raymarch 程式化山脊，低频抬升地表、高频撒星光、节拍触发闪电。',
    en: 'Inigo Quilez "Elevated"-style raymarched procedural mountains — bass lifts the ridges, treble sparkles the slopes, beats fire lightning flashes.',
  },
  params: heightfieldSchema,
  defaults: heightfieldParams,
  useAmbientParticles: false,
  Component: Heightfield,
};

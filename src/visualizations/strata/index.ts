import type { VizModule } from '@/visualizations/types';
import { Strata } from './Strata';
import { strataParams, strataSchema, type StrataParams } from './params';

export const strataViz: VizModule<StrataParams> = {
  id: 'strata',
  numeral: 'IV',
  name: { zh: '断层', en: 'Strata' },
  description: {
    zh: '受 Quayola Strata 启发：分层 GPU 点云，底层随低频抬升、中层中频起伏、高层高频闪烁，节拍触发垂直扫描层。',
    en: 'Quayola-style stratified point cloud — bottom layers ride bass, middle layers wobble on mid, top layers shimmer on treble; beats sweep a vertical scan-line.',
  },
  params: strataSchema,
  defaults: strataParams,
  useAmbientParticles: false,
  Component: Strata,
};

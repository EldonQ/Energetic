import type { ParamSchema } from '@/visualizations/types';

export const dustParams = {
  count: 30000,
  radius: 1.15,
  dust: 0.7,
  pointSize: 0.85,
  rotation: 0.09,
  breath: 0.6,
  turbulence: 0.65,
  shimmer: 0.6,
  beatBurst: 0.85,
  grain: 1.0,
  lighting: 0.9,
  glow: 1.0,
  baseColor: '#f4f4f4',
};

export type DustParams = typeof dustParams;

export const dustSchema: ParamSchema = {
  count: {
    type: 'range',
    label: { zh: '点数', en: 'Point Count' },
    min: 4000, max: 45000, step: 500,
    group: 'GEOMETRY',
  },
  radius: {
    type: 'range',
    label: { zh: '球半径', en: 'Radius' },
    min: 0.8, max: 2.4, step: 0.05,
    group: 'GEOMETRY',
  },
  dust: {
    type: 'range',
    label: { zh: '尘埃晕', en: 'Dust Halo' },
    min: 0, max: 1.5, step: 0.05,
    group: 'GEOMETRY',
  },
  grain: {
    type: 'range',
    label: { zh: '表面颗粒', en: 'Surface Grain' },
    min: 0.3, max: 2.5, step: 0.05,
    group: 'GEOMETRY',
  },
  pointSize: {
    type: 'range',
    label: { zh: '点大小', en: 'Point Size' },
    min: 0.4, max: 3, step: 0.05,
    group: 'GEOMETRY',
  },
  rotation: {
    type: 'range',
    label: { zh: '自转速度', en: 'Rotation' },
    min: -0.4, max: 0.4, step: 0.005,
    group: 'MOTION',
  },
  breath: {
    type: 'range',
    label: { zh: '低频呼吸', en: 'Bass Breath' },
    min: 0, max: 1.5, step: 0.01,
    group: 'MOTION',
  },
  turbulence: {
    type: 'range',
    label: { zh: '中频湍流', en: 'Mid Turbulence' },
    min: 0, max: 1.5, step: 0.01,
    group: 'MOTION',
  },
  shimmer: {
    type: 'range',
    label: { zh: '高频闪烁', en: 'Treble Shimmer' },
    min: 0, max: 1.5, step: 0.01,
    group: 'MOTION',
  },
  beatBurst: {
    type: 'range',
    label: { zh: '节拍喷发', en: 'Beat Burst' },
    min: 0, max: 1.5, step: 0.01,
    group: 'MOTION',
  },
  lighting: {
    type: 'range',
    label: { zh: '光影', en: 'Lighting' },
    min: 0, max: 1.5, step: 0.02,
    group: 'COLOR',
  },
  glow: {
    type: 'range',
    label: { zh: '辉度', en: 'Glow' },
    min: 0.3, max: 2.5, step: 0.02,
    group: 'COLOR',
  },
  baseColor: { type: 'color', label: { zh: '粒子色', en: 'Particle Color' }, group: 'COLOR' },
};

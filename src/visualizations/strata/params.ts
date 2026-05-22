import type { ParamSchema } from '@/visualizations/types';

export const strataParams = {
  count: 12000,
  layers: 14,
  spread: 4.0,
  layerThickness: 0.06,
  pointSize: 1.6,
  rotation: 0.05,
  bassLift: 0.35,
  midDisplace: 0.35,
  trebleShimmer: 0.5,
  beatSlice: 0.7,
  glow: 1.0,
  baseColor: '#9bd9ff',
  accentColor: '#ffe0a8',
  beatColor: '#ffffff',
  background: '#06070a',
};

export type StrataParams = typeof strataParams;

export const strataSchema: ParamSchema = {
  count: {
    type: 'range',
    label: { zh: '点数', en: 'Point Count' },
    min: 2000, max: 30000, step: 200,
    group: 'GEOMETRY',
  },
  layers: {
    type: 'range',
    label: { zh: '层数', en: 'Layers' },
    min: 4, max: 28, step: 1,
    group: 'GEOMETRY',
  },
  spread: {
    type: 'range',
    label: { zh: '展幅', en: 'Spread' },
    min: 1.5, max: 7, step: 0.05,
    group: 'GEOMETRY',
  },
  layerThickness: {
    type: 'range',
    label: { zh: '层厚', en: 'Layer Thickness' },
    min: 0.01, max: 0.2, step: 0.005,
    group: 'GEOMETRY',
  },
  pointSize: {
    type: 'range',
    label: { zh: '点大小', en: 'Point Size' },
    min: 0.4, max: 4, step: 0.05,
    group: 'GEOMETRY',
  },
  rotation: {
    type: 'range',
    label: { zh: '自转速度', en: 'Rotation' },
    min: -0.5, max: 0.5, step: 0.005,
    group: 'MOTION',
  },
  bassLift: {
    type: 'range',
    label: { zh: '低频抬升', en: 'Bass Lift' },
    min: 0, max: 1.5, step: 0.01,
    group: 'MOTION',
  },
  midDisplace: {
    type: 'range',
    label: { zh: '中频起伏', en: 'Mid Displace' },
    min: 0, max: 1.2, step: 0.01,
    group: 'MOTION',
  },
  trebleShimmer: {
    type: 'range',
    label: { zh: '高频闪烁', en: 'Treble Shimmer' },
    min: 0, max: 1.5, step: 0.01,
    group: 'MOTION',
  },
  beatSlice: {
    type: 'range',
    label: { zh: '节拍扫层', en: 'Beat Slice' },
    min: 0, max: 1.5, step: 0.01,
    group: 'MOTION',
  },
  glow: {
    type: 'range',
    label: { zh: '辉度', en: 'Glow' },
    min: 0.3, max: 2.5, step: 0.02,
    group: 'COLOR',
  },
  baseColor: { type: 'color', label: { zh: '基色', en: 'Base Color' }, group: 'COLOR' },
  accentColor: { type: 'color', label: { zh: '强调色', en: 'Accent Color' }, group: 'COLOR' },
  beatColor: { type: 'color', label: { zh: '节拍色', en: 'Beat Color' }, group: 'COLOR' },
  background: { type: 'color', label: { zh: '背景', en: 'Background' }, group: 'COLOR' },
};

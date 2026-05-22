import type { ParamSchema } from '@/visualizations/types';

export const crystalParams = {
  radius: 1.4,
  detail: 4,
  bassMult: 0.55,
  midMult: 0.22,
  trebleMult: 0.09,
  intensity: 1.0,
  rotateSpeed: 0.12,
  baseColor: '#f5f5f5',
  edgeColor: '#bfe5ff',
  alphaCore: 0.06,
  alphaEdge: 0.9,
};

export type CrystalParams = typeof crystalParams;

export const crystalSchema: ParamSchema = {
  radius: {
    type: 'range',
    label: { zh: '半径', en: 'Radius' },
    min: 0.6,
    max: 2.4,
    step: 0.05,
    group: 'GEOMETRY',
  },
  detail: {
    type: 'range',
    label: { zh: '细分度', en: 'Detail' },
    min: 1,
    max: 6,
    step: 1,
    group: 'GEOMETRY',
  },
  bassMult: {
    type: 'range',
    label: { zh: '低频反应', en: 'Bass Mult' },
    min: 0,
    max: 1.5,
    step: 0.01,
    group: 'MOTION',
  },
  midMult: {
    type: 'range',
    label: { zh: '中频反应', en: 'Mid Mult' },
    min: 0,
    max: 1,
    step: 0.01,
    group: 'MOTION',
  },
  trebleMult: {
    type: 'range',
    label: { zh: '高频反应', en: 'Treble Mult' },
    min: 0,
    max: 0.5,
    step: 0.005,
    group: 'MOTION',
  },
  intensity: {
    type: 'range',
    label: { zh: '位移强度', en: 'Intensity' },
    min: 0,
    max: 3,
    step: 0.05,
    group: 'MOTION',
  },
  rotateSpeed: {
    type: 'range',
    label: { zh: '自转速度', en: 'Rotate Speed' },
    min: 0,
    max: 1,
    step: 0.01,
    group: 'MOTION',
  },
  baseColor: {
    type: 'color',
    label: { zh: '主色', en: 'Base Color' },
    group: 'COLOR',
  },
  edgeColor: {
    type: 'color',
    label: { zh: '边缘色', en: 'Edge Color' },
    group: 'COLOR',
  },
  alphaCore: {
    type: 'range',
    label: { zh: '核心透明', en: 'Alpha Core' },
    min: 0,
    max: 0.5,
    step: 0.01,
    group: 'COLOR',
  },
  alphaEdge: {
    type: 'range',
    label: { zh: '边缘不透明', en: 'Alpha Edge' },
    min: 0.2,
    max: 1,
    step: 0.01,
    group: 'COLOR',
  },
};

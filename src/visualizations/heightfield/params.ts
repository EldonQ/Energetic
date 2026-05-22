import type { ParamSchema } from '@/visualizations/types';

export const heightfieldParams = {
  flightSpeed: 0.45,
  ridgeHeight: 1.2,
  terrainScale: 0.6,
  fogDensity: 0.35,
  cameraHeight: 0.85,
  bassLift: 0.55,
  trebleShimmer: 0.35,
  beatLightning: 0.85,
  sunSize: 1.0,
  exposure: 1.1,
  hueShift: 0,
  ridgeColor: '#cfd9e0',
  valleyColor: '#1a2230',
  skyColor: '#15233b',
  sunColor: '#ffe2a8',
  beatColor: '#fff7d0',
  background: '#090c12',
};

export type HeightfieldParams = typeof heightfieldParams;

export const heightfieldSchema: ParamSchema = {
  flightSpeed: {
    type: 'range', label: { zh: '飞行速度', en: 'Flight Speed' },
    min: 0, max: 2, step: 0.01, group: 'MOTION',
  },
  ridgeHeight: {
    type: 'range', label: { zh: '山脊高度', en: 'Ridge Height' },
    min: 0.2, max: 3, step: 0.02, group: 'GEOMETRY',
  },
  terrainScale: {
    type: 'range', label: { zh: '地形缩放', en: 'Terrain Scale' },
    min: 0.2, max: 2, step: 0.01, group: 'GEOMETRY',
  },
  cameraHeight: {
    type: 'range', label: { zh: '相机高度', en: 'Camera Height' },
    min: 0.3, max: 2.2, step: 0.01, group: 'GEOMETRY',
  },
  fogDensity: {
    type: 'range', label: { zh: '雾密度', en: 'Fog Density' },
    min: 0.05, max: 1, step: 0.01, group: 'GEOMETRY',
  },
  sunSize: {
    type: 'range', label: { zh: '太阳大小', en: 'Sun Size' },
    min: 0.2, max: 2.5, step: 0.02, group: 'GEOMETRY',
  },
  bassLift: {
    type: 'range', label: { zh: '低频抬升', en: 'Bass Lift' },
    min: 0, max: 1.5, step: 0.01, group: 'MOTION',
  },
  trebleShimmer: {
    type: 'range', label: { zh: '高频细节', en: 'Treble Detail' },
    min: 0, max: 1, step: 0.01, group: 'MOTION',
  },
  beatLightning: {
    type: 'range', label: { zh: '节拍闪电', en: 'Beat Lightning' },
    min: 0, max: 1.6, step: 0.01, group: 'MOTION',
  },
  exposure: {
    type: 'range', label: { zh: '曝光', en: 'Exposure' },
    min: 0.4, max: 2, step: 0.02, group: 'COLOR',
  },
  hueShift: {
    type: 'range', label: { zh: '色相', en: 'Hue Shift' },
    min: 0, max: 1, step: 0.01, group: 'COLOR',
  },
  ridgeColor:  { type: 'color', label: { zh: '山脊色', en: 'Ridge' },   group: 'COLOR' },
  valleyColor: { type: 'color', label: { zh: '谷底色', en: 'Valley' },  group: 'COLOR' },
  skyColor:    { type: 'color', label: { zh: '天空色', en: 'Sky' },     group: 'COLOR' },
  sunColor:    { type: 'color', label: { zh: '太阳色', en: 'Sun' },     group: 'COLOR' },
  beatColor:   { type: 'color', label: { zh: '节拍色', en: 'Beat' },    group: 'COLOR' },
  background:  { type: 'color', label: { zh: '背景',   en: 'Background' }, group: 'COLOR' },
};

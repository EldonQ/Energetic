import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import vert from './strata.vert.glsl';
import frag from './strata.frag.glsl';
import { sharedFeaturesRef } from '@/audio/useAudioData';
import { useUIStore } from '@/store/uiStore';
import type { StrataParams } from './params';

/**
 * "VI · Strata" — stratified GPU point cloud (Quayola / Onformative inspired).
 * Points live on horizontal layers; each layer reacts to a different frequency
 * band, producing a sculpted scan-archive look that pumps with the music.
 */
export function Strata({ params }: { params: StrataParams }) {
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const { size } = useThree();
  const MAX = 30000;

  const { geometry, material, uniforms } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX * 3); // dummy; vertex shader rebuilds from layer/radial/angle
    const layer = new Float32Array(MAX);
    const seed = new Float32Array(MAX * 3);
    const radial = new Float32Array(MAX);
    const angle = new Float32Array(MAX);

    for (let i = 0; i < MAX; i++) {
      // Layer index 0..1 — assign deterministically distributed so layer counts feel even
      layer[i] = Math.random();
      seed[i * 3] = Math.random();
      seed[i * 3 + 1] = Math.random();
      seed[i * 3 + 2] = Math.random();
      // radial = sqrt-distributed so density is uniform across the disc
      radial[i] = Math.sqrt(Math.random());
      angle[i] = Math.random() * Math.PI * 2;
      // positions stay zero; vertex shader writes real pos
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }

    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aLayer', new THREE.BufferAttribute(layer, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    g.setAttribute('aRadial', new THREE.BufferAttribute(radial, 1));
    g.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
    g.setDrawRange(0, Math.min(params.count, MAX));

    const u = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uPointSize: { value: params.pointSize },
      uSpread: { value: params.spread },
      uLayerThickness: { value: params.layerThickness },
      uRotation: { value: params.rotation },
      uBassLift: { value: params.bassLift },
      uMidDisplace: { value: params.midDisplace },
      uTrebleShimmer: { value: params.trebleShimmer },
      uBeatSlice: { value: params.beatSlice },
      uGlow: { value: params.glow },
      uBassEnv: { value: 0 },
      uMidEnv: { value: 0 },
      uTrebleEnv: { value: 0 },
      uBeatPulse: { value: 0 },
      uBaseColor: { value: new THREE.Color(params.baseColor) },
      uAccentColor: { value: new THREE.Color(params.accentColor) },
      uBeatColor: { value: new THREE.Color(params.beatColor) },
      uBgColor: { value: new THREE.Color(params.background) },
    };
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m, uniforms: u };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-bucket layer attribute when layers param changes — keeps "stripes" sharp.
  useEffect(() => {
    const layerAttr = geometry.attributes.aLayer as THREE.BufferAttribute;
    const arr = layerAttr.array as Float32Array;
    const layers = Math.max(2, Math.round(params.layers));
    for (let i = 0; i < arr.length; i++) {
      // Snap to layered values
      const t = Math.floor(Math.random() * layers) / (layers - 1);
      arr[i] = t;
    }
    layerAttr.needsUpdate = true;
  }, [params.layers, geometry]);

  useEffect(() => {
    uniforms.uPointSize.value = params.pointSize;
    uniforms.uSpread.value = params.spread;
    uniforms.uLayerThickness.value = params.layerThickness;
    uniforms.uRotation.value = params.rotation;
    uniforms.uBassLift.value = params.bassLift;
    uniforms.uMidDisplace.value = params.midDisplace;
    uniforms.uTrebleShimmer.value = params.trebleShimmer;
    uniforms.uBeatSlice.value = params.beatSlice;
    uniforms.uGlow.value = params.glow;
    uniforms.uBaseColor.value.set(params.baseColor);
    uniforms.uAccentColor.value.set(params.accentColor);
    uniforms.uBeatColor.value.set(params.beatColor);
    uniforms.uBgColor.value.set(params.background);
  }, [
    params.pointSize, params.spread, params.layerThickness, params.rotation,
    params.bassLift, params.midDisplace, params.trebleShimmer, params.beatSlice,
    params.glow, params.baseColor, params.accentColor, params.beatColor, params.background,
    uniforms,
  ]);

  useEffect(() => {
    const n = Math.max(500, Math.min(Math.round(params.count), MAX));
    geometry.setDrawRange(0, n);
  }, [params.count, geometry]);

  useEffect(() => {
    uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  }, [uniforms, size]);

  const timeRef = useRef(0);
  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    const f = sharedFeaturesRef.current;
    if (!reducedMotion) timeRef.current += dt;
    uniforms.uTime.value = timeRef.current;
    uniforms.uBassEnv.value = f.bassEnv;
    uniforms.uMidEnv.value = f.midEnv;
    uniforms.uTrebleEnv.value = f.trebleEnv;
    uniforms.uBeatPulse.value = f.beatPulse;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}

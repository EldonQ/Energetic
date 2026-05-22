import { useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import vert from './mercury.vert.glsl';
import frag from './mercury.frag.glsl';
import { sharedFeaturesRef } from '@/audio/useAudioData';
import { useUIStore } from '@/store/uiStore';
import type { MercuryParams } from './params';

/**
 * "IV · Mercury" — full-screen raymarched SDF metaballs with strong audio reactivity.
 * Bass envelopes stretch orbits, mid inflates radii, beat pulses snap the camera in.
 */
export function Mercury({ params }: { params: MercuryParams }) {
  const { size } = useThree();
  const reducedMotion = useUIStore((s) => s.reducedMotion);

  const { geometry, material, uniforms, state } = useMemo(() => {
    const g = new THREE.PlaneGeometry(2, 2);
    const u = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uAspect: { value: 1 },
      uCamDist: { value: params.cameraDistance },
      uCount: { value: params.ballCount },
      uRadius: { value: params.radius },
      uK: { value: params.smoothness },
      uBassSwell: { value: params.bassSwell },
      uMidInflation: { value: params.midInflation },
      uTrebleRipple: { value: params.trebleRipple },

      // rich audio features
      uBassEnv: { value: 0 },
      uMidEnv: { value: 0 },
      uTrebleEnv: { value: 0 },
      uBeatPulse: { value: 0 },
      uOnset: { value: 0 },
      uLevelNorm: { value: 0 },

      uMetallic: { value: params.metallicity },
      uExposure: { value: params.exposure },
      uInnerColor: { value: new THREE.Color(params.innerColor) },
      uRimColor: { value: new THREE.Color(params.rimColor) },
      uBgColor: { value: new THREE.Color(params.background) },
    };
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: u,
      depthTest: false,
      depthWrite: false,
      transparent: false,
    });
    return {
      geometry: g,
      material: m,
      uniforms: u,
      state: { time: 0 },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    uniforms.uCamDist.value = params.cameraDistance;
    uniforms.uCount.value = Math.max(2, Math.min(6, Math.round(params.ballCount)));
    uniforms.uRadius.value = params.radius;
    uniforms.uK.value = params.smoothness;
    uniforms.uBassSwell.value = params.bassSwell;
    uniforms.uMidInflation.value = params.midInflation;
    uniforms.uTrebleRipple.value = params.trebleRipple;
    uniforms.uMetallic.value = params.metallicity;
    uniforms.uExposure.value = params.exposure;
    uniforms.uInnerColor.value.set(params.innerColor);
    uniforms.uRimColor.value.set(params.rimColor);
    uniforms.uBgColor.value.set(params.background);
  }, [
    params.cameraDistance, params.ballCount, params.radius, params.smoothness,
    params.bassSwell, params.midInflation, params.trebleRipple,
    params.metallicity, params.exposure,
    params.innerColor, params.rimColor, params.background,
    uniforms,
  ]);

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
    uniforms.uAspect.value = size.width / Math.max(1, size.height);
  }, [size, uniforms]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    const f = sharedFeaturesRef.current;
    if (!reducedMotion) {
      // Mid envelope subtly boosts time-scrub speed → faster swirl during busy passages.
      state.time += dt * (1 + params.rotateSpeed + f.midEnv * 0.6);
    }
    uniforms.uTime.value = state.time;
    uniforms.uBassEnv.value = f.bassEnv;
    uniforms.uMidEnv.value = f.midEnv;
    uniforms.uTrebleEnv.value = f.trebleEnv;
    uniforms.uBeatPulse.value = f.beatPulse;
    uniforms.uOnset.value = f.onset;
    uniforms.uLevelNorm.value = f.levelNorm;
  });

  return (
    <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
  );
}

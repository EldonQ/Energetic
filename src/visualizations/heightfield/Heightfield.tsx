import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import vert from './heightfield.vert.glsl';
import frag from './heightfield.frag.glsl';
import { sharedFeaturesRef } from '@/audio/useAudioData';
import { useUIStore } from '@/store/uiStore';
import type { HeightfieldParams } from './params';

/**
 * "VIII · Heightfield" — raymarched procedural mountain flyover, in the
 * lineage of Inigo Quilez's "Elevated". Camera moves forward over an fbm
 * terrain; bass lifts the ridges, treble adds sparkle dust, beats fire
 * lightning flashes across the scene.
 */
export function Heightfield({ params }: { params: HeightfieldParams }) {
  const { size } = useThree();
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const timeRef = useRef(0);

  const { geometry, material, uniforms } = useMemo(() => {
    const g = new THREE.PlaneGeometry(2, 2);
    const u = {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uRidgeHeight: { value: params.ridgeHeight },
      uTerrainScale: { value: params.terrainScale },
      uCameraHeight: { value: params.cameraHeight },
      uFogDensity: { value: params.fogDensity },
      uSunSize: { value: params.sunSize },
      uBassLift: { value: params.bassLift },
      uTrebleShimmer: { value: params.trebleShimmer },
      uBeatLightning: { value: params.beatLightning },
      uExposure: { value: params.exposure },
      uHueShift: { value: params.hueShift },
      uBassEnv: { value: 0 },
      uMidEnv: { value: 0 },
      uTrebleEnv: { value: 0 },
      uBeatPulse: { value: 0 },
      uOnset: { value: 0 },
      uLevelNorm: { value: 0 },
      uRidgeColor: { value: new THREE.Color(params.ridgeColor) },
      uValleyColor: { value: new THREE.Color(params.valleyColor) },
      uSkyColor: { value: new THREE.Color(params.skyColor) },
      uSunColor: { value: new THREE.Color(params.sunColor) },
      uBeatColor: { value: new THREE.Color(params.beatColor) },
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
    return { geometry: g, material: m, uniforms: u };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    uniforms.uRidgeHeight.value = params.ridgeHeight;
    uniforms.uTerrainScale.value = params.terrainScale;
    uniforms.uCameraHeight.value = params.cameraHeight;
    uniforms.uFogDensity.value = params.fogDensity;
    uniforms.uSunSize.value = params.sunSize;
    uniforms.uBassLift.value = params.bassLift;
    uniforms.uTrebleShimmer.value = params.trebleShimmer;
    uniforms.uBeatLightning.value = params.beatLightning;
    uniforms.uExposure.value = params.exposure;
    uniforms.uHueShift.value = params.hueShift;
    uniforms.uRidgeColor.value.set(params.ridgeColor);
    uniforms.uValleyColor.value.set(params.valleyColor);
    uniforms.uSkyColor.value.set(params.skyColor);
    uniforms.uSunColor.value.set(params.sunColor);
    uniforms.uBeatColor.value.set(params.beatColor);
    uniforms.uBgColor.value.set(params.background);
  }, [
    params.ridgeHeight, params.terrainScale, params.cameraHeight, params.fogDensity, params.sunSize,
    params.bassLift, params.trebleShimmer, params.beatLightning, params.exposure, params.hueShift,
    params.ridgeColor, params.valleyColor, params.skyColor, params.sunColor, params.beatColor, params.background,
    uniforms,
  ]);

  useEffect(() => {
    uniforms.uAspect.value = size.width / Math.max(1, size.height);
  }, [size, uniforms]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    const f = sharedFeaturesRef.current;
    if (!reducedMotion) timeRef.current += dt * (params.flightSpeed * (1 + f.bassEnv * 0.4));
    uniforms.uTime.value = timeRef.current;
    uniforms.uBassEnv.value = f.bassEnv;
    uniforms.uMidEnv.value = f.midEnv;
    uniforms.uTrebleEnv.value = f.trebleEnv;
    uniforms.uOnset.value = f.onset;
    uniforms.uBeatPulse.value = f.beatPulse;
    uniforms.uLevelNorm.value = f.levelNorm;
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />;
}

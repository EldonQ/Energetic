import { useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import vert from './environment.vert.glsl';
import frag from './environment.frag.glsl';
import { sharedFeaturesRef } from '@/audio/useAudioData';
import { useUIStore } from '@/store/uiStore';
import type { CrystalParams } from './params';

/**
 * "Deep ice cavern" — the environment the crystal exhibit hangs in.
 *
 * Fullscreen quad at renderOrder -1: strictly BEHIND the subject, never
 * touching its geometry, material or motion. Palette derives from the
 * crystal's own base/edge colours, so retuning the gem retunes the room.
 * Audio response is deliberately slower and dimmer than the subject's —
 * the room accompanies, the crystal performs.
 */
export function CrystalEnvironment({ params }: { params: CrystalParams }) {
  const { size } = useThree();
  const reducedMotion = useUIStore((s) => s.reducedMotion);

  const { geometry, material, uniforms } = useMemo(() => {
    const g = new THREE.PlaneGeometry(2, 2);
    const u = {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uBaseColor: { value: new THREE.Color(params.baseColor) },
      uEdgeColor: { value: new THREE.Color(params.edgeColor) },
      uBassEnv: { value: 0 },
      uMidEnv: { value: 0 },
      uLevelNorm: { value: 0 },
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
    uniforms.uBaseColor.value.set(params.baseColor);
    uniforms.uEdgeColor.value.set(params.edgeColor);
  }, [params.baseColor, params.edgeColor, uniforms]);

  useEffect(() => {
    uniforms.uAspect.value = size.width / Math.max(1, size.height);
  }, [size, uniforms]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    const f = sharedFeaturesRef.current;
    if (!reducedMotion) uniforms.uTime.value += dt;
    // Heavy smoothing (~0.5 s) — the room breathes, it never twitches.
    const k = 1 - Math.exp(-2.0 * dt);
    uniforms.uBassEnv.value += (f.bassEnv - uniforms.uBassEnv.value) * k;
    uniforms.uMidEnv.value += (f.midEnv - uniforms.uMidEnv.value) * k;
    uniforms.uLevelNorm.value += (f.levelNorm - uniforms.uLevelNorm.value) * k;
  });

  return (
    <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
  );
}

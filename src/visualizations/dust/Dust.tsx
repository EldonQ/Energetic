import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import vert from './dust.vert.glsl';
import frag from './dust.frag.glsl';
import { sharedFeaturesRef } from '@/audio/useAudioData';
import { useUIStore } from '@/store/uiStore';
import type { DustParams } from './params';

/**
 * "VI · Dust" — monochrome particle-sphere plate (dotted-sphere archive study).
 * One GPU point cloud, three particle families (see dust.vert.glsl): a regular
 * quasi-lattice shell, an fbm-torn turbulent shell, and a faint dust halo.
 * Quiet music reads as a clean engraved sphere; energy shreds it into wisps.
 */

/** Van der Corput radical inverse (base 2) — prefix-uniform in [0,1). */
function vdc(i: number): number {
  let v = 0;
  let denom = 1;
  while (i > 0) {
    denom *= 2;
    v += (i % 2) / denom;
    i = Math.floor(i / 2);
  }
  return v;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function Dust({ params }: { params: DustParams }) {
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const { size } = useThree();
  const MAX = 45000;

  const { geometry, material, uniforms } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX * 3); // dummy; vertex shader rebuilds from aDir
    const dir = new Float32Array(MAX * 3);
    const seed = new Float32Array(MAX * 3);
    const kind = new Float32Array(MAX);

    let latticeIdx = 0;
    for (let i = 0; i < MAX; i++) {
      // Family mix repeats every 20 points so setDrawRange keeps proportions:
      // 9 lattice / 7 turbulent / 4 dust.
      const slot = i % 20;
      const k = slot < 9 ? 0 : slot < 16 ? 1 : 2;
      kind[i] = k;

      let x: number, y: number, z: number;
      if (k === 0) {
        // Quasi-regular spiral lattice (prefix-uniform, keeps the grid look
        // at any point count): van der Corput height + golden-angle azimuth.
        y = 1 - 2 * vdc(latticeIdx + 1);
        const rr = Math.sqrt(Math.max(0, 1 - y * y));
        const a = latticeIdx * GOLDEN_ANGLE;
        x = Math.cos(a) * rr;
        z = Math.sin(a) * rr;
        latticeIdx++;
      } else {
        // Uniform random direction for the loose families
        y = Math.random() * 2 - 1;
        const a = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.max(0, 1 - y * y));
        x = Math.cos(a) * rr;
        z = Math.sin(a) * rr;
      }
      dir[i * 3] = x;
      dir[i * 3 + 1] = y;
      dir[i * 3 + 2] = z;

      seed[i * 3] = Math.random();
      seed[i * 3 + 1] = Math.random();
      seed[i * 3 + 2] = Math.random();
    }

    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    g.setDrawRange(0, Math.min(params.count, MAX));

    const u = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uPointSize: { value: params.pointSize },
      uRadius: { value: params.radius },
      uDust: { value: params.dust },
      uGrain: { value: params.grain },
      uRotation: { value: params.rotation },
      uBreath: { value: params.breath },
      uTurbulence: { value: params.turbulence },
      uShimmer: { value: params.shimmer },
      uBeatBurst: { value: params.beatBurst },
      uLighting: { value: params.lighting },
      uGlow: { value: params.glow },
      uBassEnv: { value: 0 },
      uMidEnv: { value: 0 },
      uTrebleEnv: { value: 0 },
      uBeatPulse: { value: 0 },
      uBaseColor: { value: new THREE.Color(params.baseColor) },
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

  useEffect(() => {
    uniforms.uPointSize.value = params.pointSize;
    uniforms.uRadius.value = params.radius;
    uniforms.uDust.value = params.dust;
    uniforms.uGrain.value = params.grain;
    uniforms.uRotation.value = params.rotation;
    uniforms.uBreath.value = params.breath;
    uniforms.uTurbulence.value = params.turbulence;
    uniforms.uShimmer.value = params.shimmer;
    uniforms.uBeatBurst.value = params.beatBurst;
    uniforms.uLighting.value = params.lighting;
    uniforms.uGlow.value = params.glow;
    uniforms.uBaseColor.value.set(params.baseColor);
  }, [
    params.pointSize, params.radius, params.dust, params.grain, params.rotation,
    params.breath, params.turbulence, params.shimmer, params.beatBurst,
    params.lighting, params.glow, params.baseColor, uniforms,
  ]);

  useEffect(() => {
    // Lower bound mirrors the schema min for `count` in params.ts
    const n = Math.max(4000, Math.min(Math.round(params.count), MAX));
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

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={1}
      // Slight axis tilt — the plates never sit perfectly upright
      rotation={[0.1, 0, -0.08]}
    />
  );
}

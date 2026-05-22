import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import vert from './crystal.vert.glsl';
import frag from './crystal.frag.glsl';
import { sharedFeaturesRef } from '@/audio/useAudioData';
import { useUIStore } from '@/store/uiStore';
import type { CrystalParams } from './params';

export function Crystal({ params }: { params: CrystalParams }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const reducedMotion = useUIStore((s) => s.reducedMotion);

  const { geometry, material, uniforms } = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(params.radius, Math.round(params.detail));
    const u = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uIntensity: { value: params.intensity },
      uBaseColor: { value: new THREE.Color(params.baseColor) },
      uEdgeColor: { value: new THREE.Color(params.edgeColor) },
      uAlphaCore: { value: params.alphaCore },
      uAlphaEdge: { value: params.alphaEdge },
    };
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: u,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });
    return { geometry: g, material: m, uniforms: u };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.radius, params.detail]);

  useEffect(() => {
    uniforms.uIntensity.value = params.intensity;
    uniforms.uBaseColor.value.set(params.baseColor);
    uniforms.uEdgeColor.value.set(params.edgeColor);
    uniforms.uAlphaCore.value = params.alphaCore;
    uniforms.uAlphaEdge.value = params.alphaEdge;
  }, [params.intensity, params.baseColor, params.edgeColor, params.alphaCore, params.alphaEdge, uniforms]);

  // Beat-driven scale punch (afterglow of a kick → mesh briefly inflates)
  const beatPunchRef = useRef(0);

  useFrame((_state, delta) => {
    const f = sharedFeaturesRef.current;
    const dt = Math.min(delta, 0.05);
    uniforms.uTime.value += reducedMotion ? 0 : dt;

    // Drive shader uniforms from ENVELOPED bands (already attack-fast / release-slow).
    // Normalised forms ensure quiet tracks still hit full range.
    if (reducedMotion) {
      uniforms.uBass.value *= 0.92;
      uniforms.uMid.value *= 0.92;
      uniforms.uTreble.value *= 0.92;
    } else {
      // Use envelope + add an extra onset spike → very punchy displacement
      const bassDrive = (f.bassEnv * 1.4 + f.bassNorm * 0.5) * params.bassMult;
      const midDrive = (f.midEnv * 2.6 + f.onset * 0.6) * params.midMult * 1.6;
      const trebleDrive = f.trebleEnv * 8 * params.trebleMult;
      uniforms.uBass.value = bassDrive;
      uniforms.uMid.value = midDrive;
      uniforms.uTreble.value = trebleDrive;
    }

    // Beat punch: latch at 1 on a beat, decay
    if (f.beat) beatPunchRef.current = 1;
    beatPunchRef.current = Math.max(0, beatPunchRef.current - dt * 4.5);

    if (meshRef.current) {
      if (!reducedMotion) {
        meshRef.current.rotation.y += dt * params.rotateSpeed * (1 + f.midEnv * 0.6);
        meshRef.current.rotation.x = Math.sin(uniforms.uTime.value * 0.25) * 0.18;
      }
      // Brief scale punch on each kick
      const s = 1 + beatPunchRef.current * 0.08 + f.bassEnv * 0.04;
      meshRef.current.scale.setScalar(s);
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} renderOrder={2} />;
}

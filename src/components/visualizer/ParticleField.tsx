import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import vert from '@/shaders/particles.vert.glsl';
import frag from '@/shaders/particles.frag.glsl';
import { sharedBandsRef } from '@/audio/useAudioData';
import { useUIStore } from '@/store/uiStore';

interface ParticleFieldProps {
  count?: number;
  spread?: number;
}

export function ParticleField({ count = 600, spread = 12 }: ParticleFieldProps) {
  const reducedMotion = useUIStore((s) => s.reducedMotion);
  const pointsRef = useRef<THREE.Points>(null!);
  const { gl } = useThree();

  const { geometry, material, uniforms } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.8;
      seeds[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const u = {
      uTime: { value: 0 },
      uTreble: { value: 0 },
      uSize: { value: 1.4 },
      uPixelRatio: { value: gl.getPixelRatio() },
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
  }, [count, spread, gl]);

  useFrame((_state, delta) => {
    if (reducedMotion) return;
    uniforms.uTime.value += delta;
    uniforms.uTreble.value = sharedBandsRef.current.treble;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} renderOrder={1} />;
}

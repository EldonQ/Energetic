import { Canvas } from '@react-three/fiber';
import { ParticleField } from './ParticleField';
import { PostFX } from './PostFX';
import { useSharedAudioData } from '@/audio/useAudioData';
import { useVizStore, mergedParams } from '@/store/vizStore';
import { getVizOrDefault, VIZ_MODULES } from '@/visualizations';
import { useMemo } from 'react';

export function Scene() {
  // Drives the shared audio band ref for all 3D children
  useSharedAudioData();

  const currentId = useVizStore((s) => s.currentId);
  const overrides = useVizStore((s) => s.overrides);

  const { ActiveComponent, params, useAmbient, key } = useMemo(() => {
    const viz = getVizOrDefault(currentId);
    const merged = mergedParams(viz.id, viz.defaults, overrides);
    return {
      ActiveComponent: viz.Component,
      params: merged,
      useAmbient: viz.useAmbientParticles,
      key: viz.id,
    };
  }, [currentId, overrides]);

  // Preserve count to avoid Canvas remount when switching vizs of the same module count
  void VIZ_MODULES.length;

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a0a0a']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={0.5} color={'#ffffff'} />
      <directionalLight position={[-4, -2, 3]} intensity={0.3} color={'#bfe5ff'} />

      {useAmbient && <ParticleField count={500} spread={14} />}
      <ActiveComponent key={key} params={params} />

      <PostFX />
    </Canvas>
  );
}

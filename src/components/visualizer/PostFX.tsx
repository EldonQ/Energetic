import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={1.05} luminanceThreshold={0.12} luminanceSmoothing={0.6} mipmapBlur />
      <Vignette
        offset={0.25}
        darkness={0.78}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

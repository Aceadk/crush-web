'use client';

import { Bloom, EffectComposer } from '@react-three/postprocessing';

/**
 * Desktop-only post-processing: soft bloom that makes the additive particle
 * cores glow. Loaded lazily (dynamic import in canvas-impl) and only mounted
 * for the `high` quality tier — phones render the raw additive pass, which
 * already reads as glow at their pixel densities.
 */
export default function SceneEffects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={0.6}
        luminanceThreshold={0.24}
        luminanceSmoothing={0.32}
      />
    </EffectComposer>
  );
}

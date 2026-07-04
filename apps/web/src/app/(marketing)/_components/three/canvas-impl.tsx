'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MagneticOrbs } from './orbs';
import { SCENE_READY_EVENT, sceneState } from './scene-state';
import type { SceneQualityProfile } from './use-scene-quality';

// Post-processing chunk is only fetched for the `high` tier.
const SceneEffects = dynamic(() => import('./effects'), { ssr: false });

/** Fires the scene-ready event once after the first rendered frame. */
function ReadySignal() {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    sceneState.ready = true;
    window.dispatchEvent(new Event(SCENE_READY_EVENT));
  });
  return null;
}

/** Pauses the render loop while the tab is hidden. */
function FrameloopGovernor() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const onVisibility = () => {
      setFrameloop(document.hidden ? 'never' : 'always');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [setFrameloop]);
  return null;
}

export interface MagneticCanvasProps {
  quality: SceneQualityProfile;
  /** Ambient preset for auth pages: subdued, slow, no post-processing. */
  ambient?: boolean;
  /** Called if the WebGL context is lost so the shell can fall back to CSS. */
  onContextLost: () => void;
}

/**
 * The actual R3F canvas. Kept in its own module so `three` and the fiber
 * runtime only load when a WebGL-capable, motion-tolerant client mounts the
 * scene (next/dynamic in magnetic-scene.tsx).
 */
export default function MagneticCanvas({
  quality,
  ambient = false,
  onContextLost,
}: MagneticCanvasProps) {
  return (
    <Canvas
      dpr={[1, quality.maxDpr]}
      camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 40 }}
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: false,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0d0e12', 0);
        gl.domElement.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault();
            onContextLost();
          },
          { once: true }
        );
      }}
      // The scene is decorative; semantic content lives in the DOM above it.
      aria-hidden
      style={{ pointerEvents: 'none' }}
    >
      <ReadySignal />
      <FrameloopGovernor />
      <MagneticOrbs
        particlesPerOrb={ambient ? Math.min(quality.particlesPerOrb, 1400) : quality.particlesPerOrb}
        starCount={ambient ? Math.min(quality.starCount, 400) : quality.starCount}
        ambient={ambient}
      />
      {quality.postProcessing && !ambient ? <SceneEffects /> : null}
    </Canvas>
  );
}

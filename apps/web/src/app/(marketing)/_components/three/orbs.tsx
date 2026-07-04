'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { sceneState } from './scene-state';
import {
  ORB_FRAGMENT_SHADER,
  ORB_VERTEX_SHADER,
  STARFIELD_FRAGMENT_SHADER,
  STARFIELD_VERTEX_SHADER,
} from './shaders/particles';

/**
 * The "Magnetic Attraction" cast: two luminous particle orbs (primary pink and
 * violet — the two people) over a faint starfield. Orb positions follow the
 * scroll narrative via sceneState.progress: apart → orbiting → collision.
 * Both orbs lean toward a fine pointer with different lag so they feel alive.
 */

/** Deterministic LCG so particle layouts are stable between mounts. */
function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function buildOrbGeometry(count: number, radius: number, seed: number) {
  const rng = createRng(seed);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  const scales = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Random direction, radius biased toward a glowing shell around a dense core.
    const u = rng();
    const theta = rng() * Math.PI * 2;
    const cosPhi = rng() * 2 - 1;
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
    const r = radius * (0.25 + 0.75 * Math.cbrt(u));

    positions[i * 3] = r * sinPhi * Math.cos(theta);
    positions[i * 3 + 1] = r * sinPhi * Math.sin(theta);
    positions[i * 3 + 2] = r * cosPhi;

    seeds[i * 3] = rng();
    seeds[i * 3 + 1] = rng();
    seeds[i * 3 + 2] = rng();
    scales[i] = 0.35 + rng() * 1.15;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  return geometry;
}

function buildStarGeometry(count: number, seed: number) {
  const rng = createRng(seed);
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rng() * 2 - 1) * 16;
    positions[i * 3 + 1] = (rng() * 2 - 1) * 10;
    positions[i * 3 + 2] = -4 - rng() * 8;
    scales[i] = 0.4 + rng() * 1.2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  return geometry;
}

interface OrbUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: THREE.IUniform<number>;
  uProgress: THREE.IUniform<number>;
  uPhase: THREE.IUniform<number>;
  uCursor: THREE.IUniform<THREE.Vector3>;
  uCursorStrength: THREE.IUniform<number>;
  uSize: THREE.IUniform<number>;
  uColorCore: THREE.IUniform<THREE.Color>;
  uColorEdge: THREE.IUniform<THREE.Color>;
  uOpacity: THREE.IUniform<number>;
}

function createOrbMaterial(
  core: string,
  edge: string,
  phase: number,
  ambient: boolean
): THREE.ShaderMaterial {
  const uniforms: OrbUniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uPhase: { value: phase },
    uCursor: { value: new THREE.Vector3(0, 0, 0) },
    uCursorStrength: { value: 0 },
    uSize: { value: ambient ? 3.4 : 4.2 },
    uColorCore: { value: new THREE.Color(core) },
    uColorEdge: { value: new THREE.Color(edge) },
    uOpacity: { value: ambient ? 0.4 : 0.66 },
  };
  return new THREE.ShaderMaterial({
    vertexShader: ORB_VERTEX_SHADER,
    fragmentShader: ORB_FRAGMENT_SHADER,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Orb centre positions for a narrative progress value.
 * Act 1 (0–0.35): drifting far apart — a wide diagonal so the headline owns
 * the centre (portrait viewports arrange the pair vertically instead).
 * Act 2 (0.35–0.8): pulled closer, orbiting each other with growing speed.
 * Act 3 (0.8–1): spiral collapse into the shared centre.
 */
function narrativePosition(
  out: THREE.Vector3,
  progress: number,
  time: number,
  side: 1 | -1,
  spreadX: number,
  spreadY: number
) {
  const apart = Math.min(progress / 0.8, 1);
  const separation = 1 - apart * apart; // 1 far apart → 0 merged
  // Orbit angle accelerates as they close in.
  const orbit = progress * progress * 10.0 + time * (0.08 + progress * 0.9);
  const orbitRadius = separation * 0.35 + 0.12;

  const idleX = Math.sin(time * 0.21 + side * 1.7) * 0.12;
  const idleY = Math.cos(time * 0.17 + side * 0.9) * 0.1;

  out.set(
    side * (spreadX * separation + Math.cos(orbit * side) * orbitRadius * apart) + idleX,
    side * spreadY * separation + Math.sin(orbit * side) * orbitRadius * apart * 0.7 + idleY,
    Math.sin(time * 0.13 + side) * 0.18 * separation - 0.4 * separation
  );
}

export function MagneticOrbs({
  particlesPerOrb,
  starCount,
  ambient = false,
}: {
  particlesPerOrb: number;
  starCount: number;
  /**
   * Ambient preset (auth pages): fewer/dimmer particles, half-speed drift,
   * a fixed mid-narrative orbit instead of scroll-driven progress, and a
   * gentler cursor pull — a subdued backdrop, not the show.
   */
  ambient?: boolean;
}) {
  const viewport = useThree((s) => s.viewport);

  const orbA = useRef<THREE.Points>(null);
  const orbB = useRef<THREE.Points>(null);
  const stars = useRef<THREE.Points>(null);

  const { geometryA, geometryB, starGeometry, materialA, materialB, starMaterial } =
    useMemo(() => {
      return {
        geometryA: buildOrbGeometry(particlesPerOrb, 0.85, 1337),
        geometryB: buildOrbGeometry(particlesPerOrb, 0.78, 7331),
        starGeometry: buildStarGeometry(starCount, 2024),
        // Orb A: brand primary pink. Orb B: brand secondary violet.
        materialA: createOrbMaterial('#ff9dbf', '#ff3f7f', 0, ambient),
        materialB: createOrbMaterial('#c9b8ff', '#7c4dff', 11.7, ambient),
        starMaterial: new THREE.ShaderMaterial({
          vertexShader: STARFIELD_VERTEX_SHADER,
          fragmentShader: STARFIELD_FRAGMENT_SHADER,
          uniforms: {
            uTime: { value: 0 },
            uSize: { value: 1.6 },
            uOpacity: { value: ambient ? 0.35 : 0.5 },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      };
      // Geometry/material identity is fixed per quality profile.
    }, [particlesPerOrb, starCount, ambient]);

  const cursorWorld = useRef(new THREE.Vector3());
  const cursorEased = useRef(new THREE.Vector3());
  const strength = useRef(0);
  const targetA = useRef(new THREE.Vector3());
  const targetB = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    // Ambient preset: half-speed clock, fixed gentle orbit (mid-narrative).
    const t = state.clock.elapsedTime * (ambient ? 0.45 : 1);
    const progress = ambient ? 0.55 : sceneState.progress;
    const dt = Math.min(delta, 1 / 30);

    // Cursor in world units on the z=0 plane, critically damped ease.
    cursorWorld.current.set(
      (sceneState.cursorX * viewport.width) / 2,
      (sceneState.cursorY * viewport.height) / 2,
      0
    );
    cursorEased.current.lerp(cursorWorld.current, 1 - Math.exp(-6 * dt));
    const targetStrength = sceneState.cursorActive ? (ambient ? 0.22 : 0.5) : 0;
    strength.current += (targetStrength - strength.current) * (1 - Math.exp(-4 * dt));

    // Composition adapts to aspect ratio: wide screens separate the orbs
    // horizontally (upper-left / lower-right diagonal); portrait screens
    // stack them vertically so the headline column stays clear.
    const portrait = viewport.aspect < 0.85;
    const spreadX = portrait
      ? viewport.width * 0.22
      : Math.min(2.6, viewport.width * 0.3);
    const spreadY = portrait ? viewport.height * 0.36 : 0.55;

    narrativePosition(targetA.current, progress, t, -1, spreadX, spreadY);
    narrativePosition(targetB.current, progress, t, 1, spreadX, spreadY);

    // Both orbs lean toward the cursor — different pull and lag per orb so the
    // attraction feels physical rather than mirrored.
    const cursorLean = 1 - progress * 0.8;
    if (orbA.current) {
      targetA.current.addScaledVector(cursorEased.current, 0.16 * strength.current * cursorLean * 2);
      orbA.current.position.lerp(targetA.current, 1 - Math.exp(-2.6 * dt));
      materialA.uniforms.uTime.value = t;
      materialA.uniforms.uProgress.value = progress;
      materialA.uniforms.uCursor.value.copy(cursorEased.current);
      materialA.uniforms.uCursorStrength.value = strength.current;
    }
    if (orbB.current) {
      targetB.current.addScaledVector(cursorEased.current, 0.10 * strength.current * cursorLean * 2);
      orbB.current.position.lerp(targetB.current, 1 - Math.exp(-3.4 * dt));
      materialB.uniforms.uTime.value = t;
      materialB.uniforms.uProgress.value = progress;
      materialB.uniforms.uCursor.value.copy(cursorEased.current);
      materialB.uniforms.uCursorStrength.value = strength.current;
    }
    if (stars.current) {
      stars.current.rotation.z = t * 0.008;
      starMaterial.uniforms.uTime.value = t;
    }
  });

  return (
    <>
      <points ref={stars} geometry={starGeometry} material={starMaterial} />
      <points ref={orbA} geometry={geometryA} material={materialA} />
      <points ref={orbB} geometry={geometryB} material={materialB} />
    </>
  );
}

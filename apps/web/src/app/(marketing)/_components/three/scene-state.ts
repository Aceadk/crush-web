/**
 * Shared mutable state for the "Magnetic Attraction" scene.
 *
 * Written by cheap DOM listeners (pointer, scroll orchestration) and read
 * inside the R3F render loop every frame — deliberately NOT React state so
 * cursor moves and scroll progress never trigger re-renders. All consumers
 * live on the client; this module holds no DOM references itself.
 */
export interface MagneticSceneState {
  /** Cursor in NDC space (-1..1, +y up). */
  cursorX: number;
  cursorY: number;
  /** 1 while a fine pointer is over the page, eased toward 0 after leave. */
  cursorActive: boolean;
  /**
   * Scroll-narrative progress 0..1 across the three acts:
   * 0 = apart (Act 1), ~0.5 = orbiting (Act 2), 1 = collided/bloom (Act 3).
   * Stage (a) keeps this at 0; the GSAP ScrollTrigger timeline drives it.
   */
  progress: number;
  /** Set true once the first WebGL frame has rendered. */
  ready: boolean;
}

export const sceneState: MagneticSceneState = {
  cursorX: 0,
  cursorY: 0,
  cursorActive: false,
  progress: 0,
  ready: false,
};

/** Name of the window event fired after the first rendered frame. */
export const SCENE_READY_EVENT = 'crush:scene-ready';

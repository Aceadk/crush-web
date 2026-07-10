/**
 * Film-grain overlay: an inline SVG fractal-noise texture (data URI — allowed
 * by the CSP's img-src) tiled across a fixed, pointer-transparent layer at
 * very low opacity. Static by design: animated grain would cost paint time
 * for a texture nobody consciously sees; the still noise alone kills the
 * "flat digital gradient" look. Server-renderable, zero JS.
 */
const NOISE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;

export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] opacity-[0.05] mix-blend-overlay"
      style={{ backgroundImage: `url("data:image/svg+xml,${NOISE_SVG}")` }}
    />
  );
}

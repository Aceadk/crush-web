/**
 * GLSL for the two luminous particle orbs.
 *
 * Hand-authored shader strings — no blob workers, no eval — so they run under
 * the production CSP. The vertex shader owns all motion: simplex-noise drift,
 * a breathing pulse, the scroll-narrative morph (uProgress: apart → orbit →
 * collapse), and the cursor-attraction bulge. The fragment shader draws a
 * soft additive glow disc.
 */

/** Ashima/IQ 3D simplex noise (public domain), compact form. */
const SIMPLEX_3D = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export const ORB_VERTEX_SHADER = /* glsl */ `
${SIMPLEX_3D}

attribute vec3 aSeed;   // per-particle random (0..1)
attribute float aScale; // per-particle size multiplier

uniform float uTime;
uniform float uProgress;       // 0 apart .. 1 collided (narrative)
uniform float uPhase;          // per-orb time offset so the two never sync
uniform vec3 uCursor;          // cursor in world space (z = 0 plane)
uniform float uCursorStrength; // eased 0..1
uniform float uSize;           // base point size

varying float vGlow;   // 0 core .. 1 edge
varying float vSeed;

void main() {
  vec3 p = position;
  float t = uTime * 0.14 + uPhase;

  // Organic drift: three decorrelated noise fields displace each particle.
  vec3 drift = vec3(
    snoise(vec3(p.yz * 0.7, t + aSeed.x * 7.31)),
    snoise(vec3(p.zx * 0.7, t + aSeed.y * 5.17)),
    snoise(vec3(p.xy * 0.7, t + aSeed.z * 9.73))
  );
  // Drift tightens as the orbs accelerate toward each other (act 3 reads as
  // focused energy, not fuzz).
  p += drift * (0.24 + 0.30 * aSeed.x) * (1.0 - 0.55 * uProgress);

  // Slow breathing.
  p *= 1.0 + 0.045 * sin(uTime * 0.6 + aSeed.y * 6.2831);

  // Narrative collapse: as uProgress approaches 1 the cloud condenses,
  // brightening the core for the collision bloom.
  p *= 1.0 - 0.35 * smoothstep(0.75, 1.0, uProgress);

  vec4 world = modelMatrix * vec4(p, 1.0);

  // Cursor attraction: particles within reach lean toward the pointer.
  vec3 toCursor = uCursor - world.xyz;
  float dist = length(toCursor);
  float pull = uCursorStrength * smoothstep(2.4, 0.0, dist);
  world.xyz += (toCursor / max(dist, 0.0001)) * pull * (0.30 + 0.45 * aSeed.z);

  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  float size = uSize * aScale * (34.0 / -mv.z);
  gl_PointSize = clamp(size, 1.0, 38.0);

  vGlow = smoothstep(0.35, 1.15, length(position));
  vSeed = aSeed.x;
}
`;

export const ORB_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColorCore;
uniform vec3 uColorEdge;
uniform float uOpacity;
uniform float uProgress;

varying float vGlow;
varying float vSeed;

void main() {
  // Soft round sprite with a hot centre.
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv) * 2.0;
  float disc = smoothstep(1.0, 0.25, d);
  float core = smoothstep(0.55, 0.0, d);

  vec3 color = mix(uColorCore, uColorEdge, vGlow * (0.75 + 0.25 * vSeed));
  // Collision heat: everything whitens as the orbs merge.
  color = mix(color, vec3(1.0), smoothstep(0.8, 1.0, uProgress) * 0.65);
  color += core * 0.2;

  float alpha = disc * uOpacity * (0.5 + 0.5 * vSeed);
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export const STARFIELD_VERTEX_SHADER = /* glsl */ `
attribute float aScale;
uniform float uTime;
uniform float uSize;
varying float vTwinkle;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uSize * aScale * (20.0 / -mv.z), 0.5, 3.0);
  vTwinkle = 0.55 + 0.45 * sin(uTime * 0.35 + position.x * 12.0 + position.y * 7.0);
}
`;

export const STARFIELD_FRAGMENT_SHADER = /* glsl */ `
uniform float uOpacity;
varying float vTwinkle;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float disc = smoothstep(0.5, 0.1, length(uv));
  float alpha = disc * uOpacity * vTwinkle;
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(vec3(0.9, 0.92, 1.0) * alpha, alpha);
}
`;

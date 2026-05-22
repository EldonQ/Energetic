// Subtle drifting dust particles.
// Each particle has a per-vertex random seed; we use it to offset phase & speed.

uniform float uTime;
uniform float uTreble;
uniform float uPixelRatio;
uniform float uSize;

attribute float aSeed;

varying float vAlpha;

void main() {
  vec3 p = position;
  float seed = aSeed;
  // gentle vertical drift
  p.y += sin(uTime * 0.15 + seed * 6.28) * 0.6;
  p.x += cos(uTime * 0.12 + seed * 4.2) * 0.4;
  // very subtle treble jitter
  p += normalize(vec3(sin(seed*7.0), cos(seed*5.3), sin(seed*9.1))) * uTreble * 0.4;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (200.0 / -mv.z);
  vAlpha = 0.15 + 0.85 * fract(seed * 13.7);
}

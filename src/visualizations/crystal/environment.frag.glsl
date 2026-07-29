// "Deep ice cavern" — the room the crystal hangs in.
// Fullscreen background layer, always behind the subject. Four strata:
//   1. void gradient  — near-black floor rising to a faint cold lift
//   2. backlight halo — soft glow behind the gem (display-case backlight)
//   3. ice curtains   — two slow vertical light veils, like light through ice
//   4. floor pool     — a dim pedestal glow that grounds the exhibit
// All colours derive from the crystal's own base/edge palette.

precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform vec3 uBaseColor;
uniform vec3 uEdgeColor;
uniform float uBassEnv;
uniform float uMidEnv;
uniform float uLevelNorm;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 c = (vUv - 0.5) * vec2(uAspect, 1.0); // centered, aspect-corrected
  float t = uTime;

  // ---- 1. void gradient: darkest below, faint cold lift above centre.
  //   Whole layer must stay BELOW the bloom threshold (0.12) — anything
  //   brighter gets amplified into fog by the post pipeline.
  vec3 deep = uBaseColor * 0.03;
  vec3 lift = uBaseColor * 0.10;
  vec3 col = mix(deep, lift, smoothstep(-0.65, 0.75, c.y));

  // ---- 2. backlight halo: a HOLLOW ring — light leaks around the gem's
  //   silhouette but the centre stays black, so the translucent core keeps
  //   its original look (never shine light through the subject).
  float haloR = 1.0 + uBassEnv * 0.25;
  float d = length(c - vec2(0.0, 0.02)) / haloR;
  float halo = exp(-d * d * 2.6) * smoothstep(0.18, 0.6, d);
  col += uEdgeColor * halo * (0.055 + 0.03 * uLevelNorm);

  // ---- 3. ice curtains: vertically stretched veils, drifting glacially
  float veilA = fbm(vec2(c.x * 2.1 + t * 0.020, c.y * 0.45 - t * 0.012));
  float veilB = fbm(vec2(c.x * 3.4 - t * 0.014 + 7.3, c.y * 0.60 + t * 0.009));
  float veil = smoothstep(0.45, 0.95, veilA) * 0.7 + smoothstep(0.5, 1.0, veilB) * 0.5;
  // stronger toward the upper half, faded at the very centre so the gem stays clean
  float veilMask = smoothstep(-0.55, 0.45, c.y) * smoothstep(0.25, 0.7, length(c));
  col += mix(uBaseColor, uEdgeColor, 0.45) * veil * veilMask * (0.045 + 0.03 * uMidEnv);

  // ---- 4. floor pool: dim pedestal light under the exhibit
  vec2 pc = (c - vec2(0.0, -0.46)) * vec2(1.3, 3.4);
  float pool = exp(-dot(pc, pc) * 2.4);
  col += uEdgeColor * pool * 0.045;

  // gentle corner falloff so the cavern closes around the frame
  col *= 1.0 - 0.35 * smoothstep(0.55, 1.15, length(c));

  // dither against banding on near-black gradients
  col += (hash(gl_FragCoord.xy) - 0.5) * (2.0 / 255.0);

  gl_FragColor = vec4(col, 1.0);
}

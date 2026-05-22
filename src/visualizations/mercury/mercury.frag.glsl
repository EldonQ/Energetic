// Raymarched SDF metaballs ("liquid mercury") with strong audio reactivity.
// Ball orbits are stretched by bass, radii inflated by mid, jittered by treble,
// and the whole field PULSES on detected beats.

precision highp float;

#define MAX_BALLS 6

uniform float uTime;
uniform vec2  uResolution;
uniform float uAspect;
uniform float uCamDist;
uniform int   uCount;
uniform float uRadius;
uniform float uK;            // smin smoothness
uniform float uBassSwell;
uniform float uMidInflation;
uniform float uTrebleRipple;

// rich audio features
uniform float uBassEnv;
uniform float uMidEnv;
uniform float uTrebleEnv;
uniform float uBeatPulse;
uniform float uOnset;
uniform float uLevelNorm;

uniform float uMetallic;
uniform float uExposure;
uniform vec3  uInnerColor;
uniform vec3  uRimColor;
uniform vec3  uBgColor;

varying vec2 vUv;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

vec3 ballPos(int i, float t) {
  float fi = float(i);
  // Orbit radius stretched by bass envelope
  float r = (0.95 + 0.3 * sin(t * 0.6 + fi)) * (1.0 + uBassEnv * 0.7);
  float a  = t * (0.4 + fi * 0.07) + fi * 1.7;
  float b  = t * (0.3 - fi * 0.05) + fi * 2.3;
  return vec3(
    cos(a) * r,
    sin(b) * r * 0.8,
    sin(a * 1.3 + fi) * 0.6 * (1.0 + uMidEnv * 0.5)
  );
}

float scene(vec3 p) {
  float d = 1e5;
  float t = uTime;
  // Mid envelope inflates everything, beat pulse SNAPS radii larger briefly.
  float rad = uRadius
    * (1.0 + uBassSwell * uBassEnv * 1.1
           + uMidInflation * uMidEnv * 0.45
           + uBeatPulse * 0.35);
  float k = max(0.001, uK * (1.0 + uBeatPulse * 0.6));

  for (int i = 0; i < MAX_BALLS; i++) {
    if (i >= uCount) break;
    vec3 pos = ballPos(i, t);
    // Treble-driven micro jitter (now uses trebleEnv: snappier)
    pos += vec3(
      sin(t * 8.0 + float(i)),
      cos(t * 7.3 + float(i)),
      sin(t * 6.1 + float(i))
    ) * uTrebleRipple * uTrebleEnv * 1.6;

    float r = rad * (0.85 + 0.25 * sin(t * 1.1 + float(i) * 0.8));
    float di = length(p - pos) - r;
    d = smin(d, di, k);
  }
  return d;
}

vec3 calcNormal(vec3 p) {
  const vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)
  ));
}

vec3 env(vec3 dir) {
  float upDot = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = mix(uBgColor * 1.2, uRimColor * 0.7, upDot);
  // Onset-driven sky brightening — sparkles on transients
  sky += uRimColor * 0.25 * pow(max(0.0, dot(dir, normalize(vec3(0.4, 0.8, 0.3)))), 8.0)
       * (1.0 + uOnset * 1.5);
  return sky;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uAspect;

  // Camera dolly: pulses INWARD slightly on each beat
  float camD = uCamDist - uBeatPulse * 0.25;
  vec3 ro = vec3(0.0, 0.0, camD);
  vec3 rd = normalize(vec3(uv, -1.4));

  float t = 0.0;
  float hit = 0.0;
  vec3 p = ro;
  for (int i = 0; i < 80; i++) {
    p = ro + rd * t;
    float d = scene(p);
    if (d < 0.0015) { hit = 1.0; break; }
    if (t > 12.0) break;
    t += d * 0.9;
  }

  vec3 col = uBgColor;
  if (hit > 0.5) {
    vec3 n = calcNormal(p);
    vec3 viewDir = normalize(ro - p);

    float fres = pow(1.0 - max(0.0, dot(n, viewDir)), 3.0);
    vec3 r = reflect(-viewDir, n);
    vec3 reflCol = env(r);

    float ndl = max(0.0, dot(n, normalize(vec3(0.3, 0.7, 0.5))));
    // Inner glow brightens with mid envelope — "core heating up"
    vec3 inner = mix(uInnerColor * 0.4, uInnerColor, ndl) * (1.0 + uMidEnv * 0.7);

    col = mix(inner, reflCol, uMetallic);
    // Beat pulse flashes the rim
    col = mix(col, uRimColor, fres * (0.85 + uBeatPulse * 0.5));

    // Bass envelope drives luminance pump
    col *= 1.0 + uBassEnv * 0.6 + uBeatPulse * 0.35;
  } else {
    float vign = smoothstep(1.4, 0.2, length(uv));
    col = uBgColor * (0.85 + vign * 0.2 + uLevelNorm * 0.1);
  }

  // Exposure
  col *= uExposure * (1.0 + uBeatPulse * 0.2);
  col = col / (col + vec3(1.0));
  col = pow(col, vec3(1.0 / 2.2));

  gl_FragColor = vec4(col, 1.0);
}

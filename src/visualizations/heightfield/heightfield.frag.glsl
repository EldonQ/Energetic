// "VIII · Heightfield" — Inigo Quilez "Elevated"-inspired procedural
// mountain flyover. Coarse-march raymarch over an fbm heightfield, sky with
// a sun disc + atmospheric scatter, beat-triggered lightning flash.
//
// Optimised:  ~120 march steps with adaptive step size; works on integrated GPUs.

precision highp float;

uniform float uTime;
uniform float uAspect;

uniform float uRidgeHeight;
uniform float uTerrainScale;
uniform float uCameraHeight;
uniform float uFogDensity;
uniform float uSunSize;

uniform float uBassEnv;
uniform float uMidEnv;
uniform float uTrebleEnv;
uniform float uBeatPulse;
uniform float uOnset;
uniform float uLevelNorm;

uniform float uBassLift;
uniform float uTrebleShimmer;
uniform float uBeatLightning;

uniform float uExposure;
uniform float uHueShift;

uniform vec3 uRidgeColor;
uniform vec3 uValleyColor;
uniform vec3 uSkyColor;
uniform vec3 uSunColor;
uniform vec3 uBeatColor;
uniform vec3 uBgColor;

varying vec2 vUv;

// ---------- noise (value-noise FBM) ----------
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += vnoise(p) * amp;
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

// Terrain height field. Camera moves along +Z over time.
float terrainH(vec2 xz) {
  vec2 p = xz * uTerrainScale;
  float h = fbm(p);
  // Ridged amplification on second octave for sharper ridges
  float r = abs(fbm(p * 2.0 + 5.7) - 0.5) * 2.0;
  h = mix(h, 1.0 - r, 0.35);
  return h * uRidgeHeight * (1.0 + uBassEnv * uBassLift);
}

// Sky colour, fades with sun disc
vec3 sky(vec3 rd, vec3 sunDir) {
  float t = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = mix(uBgColor, uSkyColor, smoothstep(0.0, 0.6, t));
  float sun = max(0.0, dot(rd, sunDir));
  float disc = pow(sun, 200.0 / max(0.1, uSunSize));
  float halo = pow(sun, 8.0 / max(0.1, uSunSize)) * 0.4;
  sky += uSunColor * (disc * 4.5 + halo);
  return sky;
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uAspect;

  // Camera setup — flying forward over the field
  float t = uTime;
  vec3 camPos = vec3(0.0, uCameraHeight + uBassEnv * 0.3, t * 1.0);
  // Look slightly forward and a bit down
  vec3 camFwd = normalize(vec3(sin(t * 0.08) * 0.18, -0.18, 1.0));
  vec3 worldUp = vec3(0.0, 1.0, 0.0);
  vec3 camRight = normalize(cross(camFwd, worldUp));
  vec3 camUp = normalize(cross(camRight, camFwd));

  vec3 rd = normalize(camFwd * 1.4 + camRight * p.x + camUp * p.y);
  vec3 sunDir = normalize(vec3(0.35, 0.25, 1.0));

  // ---------- raymarch heightfield with adaptive step ----------
  float depth = 0.0;
  float maxDist = 40.0;
  float lastH = -1e9;
  bool hit = false;
  vec3 hitPos = vec3(0.0);
  float hSlope = 0.0;

  // Cheap coarse march
  float step = 0.12;
  for (int i = 0; i < 110; i++) {
    vec3 pos = camPos + rd * depth;
    float h = terrainH(pos.xz);
    float dy = pos.y - h;
    if (dy < 0.0) {
      // Re-step back a fraction for better hit point
      depth -= step * 0.5;
      hitPos = camPos + rd * depth;
      hit = true;
      // approximate slope via small dx
      float hX = terrainH(hitPos.xz + vec2(0.1, 0.0));
      float hZ = terrainH(hitPos.xz + vec2(0.0, 0.1));
      vec3 n = normalize(vec3(h - hX, 0.4, h - hZ));
      hSlope = clamp(n.y, 0.0, 1.0);
      break;
    }
    // Step grows with distance for fast far-march, with small minimum near
    step = 0.08 + depth * 0.06;
    depth += step;
    if (depth > maxDist) break;
    lastH = h;
  }

  vec3 col;
  if (hit) {
    // Terrain shading
    float h01 = clamp((hitPos.y / max(0.001, uRidgeHeight) + 0.3), 0.0, 1.5);
    vec3 base = mix(uValleyColor, uRidgeColor, smoothstep(0.05, 0.95, h01));

    // Treble shimmer adds high-freq sparkle dust on slopes
    float sparkle = hash(hitPos.xz * 30.0 + uTime * 4.0);
    base += uRidgeColor * smoothstep(0.85, 1.0, sparkle) * uTrebleEnv * uTrebleShimmer * 0.7;

    // Lambert toward sun + ambient sky
    float lambert = max(0.0, dot(normalize(vec3(0.0, hSlope, 0.0)) + sunDir * 0.5, sunDir)) * 0.8 + 0.3;
    col = base * lambert;

    // Distance fog (atmospheric extinction)
    float fog = 1.0 - exp(-depth * uFogDensity * 0.12);
    vec3 fogCol = sky(rd, sunDir) * 0.9;
    col = mix(col, fogCol, fog);
  } else {
    col = sky(rd, sunDir);
  }

  // Beat lightning — a bright flash that picks a random colour mix
  float flash = uBeatPulse * uBeatLightning;
  col += uBeatColor * flash * 0.6;
  // Onset adds smaller "heat" pulses to sky
  col += uSunColor * uOnset * 0.18;

  // Mid drives subtle horizon shimmer
  col += uMidEnv * uRidgeColor * 0.05 * (1.0 - smoothstep(0.0, 0.35, abs(p.y)));

  // Hue shift (post)
  if (abs(uHueShift) > 0.001) {
    // Quick RGB rotation approx — cheap
    float s = sin(uHueShift * 6.28318);
    float c = cos(uHueShift * 6.28318);
    mat3 hue = mat3(
      vec3(0.299 + 0.701 * c + 0.168 * s, 0.587 - 0.587 * c + 0.330 * s, 0.114 - 0.114 * c - 0.497 * s),
      vec3(0.299 - 0.299 * c - 0.328 * s, 0.587 + 0.413 * c + 0.035 * s, 0.114 - 0.114 * c + 0.292 * s),
      vec3(0.299 - 0.300 * c + 1.250 * s, 0.587 - 0.588 * c - 1.050 * s, 0.114 + 0.886 * c - 0.203 * s)
    );
    col = clamp(hue * col, 0.0, 4.0);
  }

  // Exposure + tonemap
  col *= uExposure * (0.95 + uLevelNorm * 0.18);
  col = col / (col + vec3(1.0));
  col = pow(col, vec3(1.0 / 2.2));

  gl_FragColor = vec4(col, 1.0);
}

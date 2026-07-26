precision highp float;

uniform vec3 uBaseColor;
uniform float uGlow;
uniform float uLighting;
uniform float uBeatPulse;
uniform float uTrebleEnv;

varying float vKind;
varying float vSeed;
varying float vEnergy;
varying float vLight;
varying float vRim;
varying float vFront;
varying float vClump;
varying float vMask;

void main() {
  // Hard little grain with a soft skirt — ink stippling, not bokeh
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = length(uv);
  if (d > 1.0) discard;
  float alpha = smoothstep(1.0, 0.25, d);

  float isLattice = step(vKind, 0.5);
  float isTurb = step(0.5, vKind) * step(vKind, 1.5);
  float isHalo = step(1.5, vKind) * step(vKind, 3.0);
  float isInner = step(3.0, vKind);

  // Family base opacity
  float aBase = isLattice * 1.0 + isTurb * 0.55 + isHalo * 0.3 + isInner * 0.14;

  // --- ETCHED CONTRAST (the plate look) ------------------------------------
  // Crater voids: low-mask pockets go almost black — punched-out holes
  float crater = smoothstep(0.30, 0.46, vMask);
  aBase *= mix(mix(0.06, 1.0, crater), 1.0, isInner * 0.7);
  // Bright knots: high-mask ridges pile up and overshoot to white
  float knot = smoothstep(0.58, 0.78, vMask);

  // Filament clustering: wisps/halo condense into streaks, gaps go dark
  float clump = smoothstep(0.30, 0.70, vClump);
  aBase *= mix(1.0, 0.15 + 2.0 * clump, isTurb * 0.95 + isHalo * 0.9);
  // --------------------------------------------------------------------------

  // Depth: near hemisphere solid, far side sinks into the black
  aBase *= 0.22 + 0.78 * vFront;

  // Treble twinkle on loose grains
  float twinkle = smoothstep(0.55, 1.0, vSeed) * uTrebleEnv;
  aBase *= 1.0 + twinkle * (isHalo * 1.6 + isTurb * 0.6);

  alpha *= aBase;

  // --- monochrome light ------------------------------------------------------
  // Terminator: lit hemisphere falls hard into shadow
  float lam = 0.10 + 1.0 * smoothstep(-0.25, 0.85, vLight);
  float shade = mix(1.0, lam, clamp(uLighting, 0.0, 1.0) * (1.0 - isInner * 0.5));

  // Luminous limb ring — tangent-view edge burns bright; beats ignite it
  float rim = vRim * uLighting * (0.9 + uBeatPulse * 1.6);

  float lum = shade * (0.55 + knot * 1.1 + vEnergy * 0.55 + uBeatPulse * 0.2)
            + rim * (0.5 + knot * 0.5);
  // Far side cools off
  lum *= 0.7 + 0.3 * vFront;

  vec3 col = uBaseColor * uGlow * lum;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}

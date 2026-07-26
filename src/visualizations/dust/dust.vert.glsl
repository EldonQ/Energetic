// "VI · Dust" — monochrome particle-sphere study.
// Three particle families share one point cloud (aKind):
//   0 → lattice shell : regular fibonacci grid, the "engraved moon" body
//   1 → turbulent shell: fbm-torn wisps that shred outward with the mids
//   2 → dust           : half interior fill (volume), half outer halo
// The plate look comes from HIGH-CONTRAST etching (see dust.frag.glsl):
// crater voids punched into the shell, bright knots where grains pile up,
// a luminous limb ring, thin polar antenna needles, and a terminator from
// a slowly wandering key light. Music shreds the body open.

attribute vec3 aDir;
attribute vec3 aSeed;
attribute float aKind;

uniform float uTime;
uniform float uPixelRatio;
uniform float uPointSize;
uniform float uRadius;
uniform float uDust;
uniform float uGrain;
uniform float uRotation;
uniform float uBreath;
uniform float uTurbulence;
uniform float uShimmer;
uniform float uBeatBurst;
uniform float uBassEnv;
uniform float uMidEnv;
uniform float uTrebleEnv;
uniform float uBeatPulse;

varying float vKind;
varying float vSeed;
varying float vEnergy;
varying float vLight;
varying float vRim;
varying float vFront;
varying float vClump;
varying float vMask;

// --- compact 3D value noise + fbm -------------------------------------
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec3(11.7);
    a *= 0.5;
  }
  return v;
}
// -----------------------------------------------------------------------

void main() {
  // Slow rotation around Y. Surface features are sampled from the
  // UN-rotated aDir so craters/wisps stick to the body and ride along.
  float rot = uTime * uRotation;
  float cr = cos(rot);
  float sr = sin(rot);
  vec3 dir = vec3(aDir.x * cr - aDir.z * sr, aDir.y, aDir.x * sr + aDir.z * cr);

  float isLattice = step(aKind, 0.5);
  float isTurb = step(0.5, aKind) * step(aKind, 1.5);
  float isDust = step(1.5, aKind);
  // Dust family splits: half fills the interior (volume), half hovers outside
  float isInner = isDust * step(aSeed.y, 0.45);
  float isHalo = isDust - isInner;

  // Bass breath — the whole body swells on low end
  float breath = 1.0 + uBassEnv * uBreath * 0.2;
  float r = uRadius * breath;

  // Static etched relief: craters dent inward, ridges push out. The same
  // mask drives the frag crater/knot contrast, so geometry and brightness
  // agree — dents are dark, piles are bright.
  float mask = fbm(aDir * 3.1 * uGrain + aSeed.x * 0.15);
  float relief = (mask - 0.5) * (0.05 + 0.03 * uGrain);

  // Lattice shell: engraved sphere with crater dents
  float rLattice = r * (1.0 + relief * 0.9);

  // Turbulent shell: always crawling a little; the mids shred it open
  float turbAmp = 0.05 + uMidEnv * uTurbulence * 0.75;
  float turb = (fbm(aDir * 3.2 + vec3(0.0, uTime * 0.3, 0.0) + aSeed * 4.0) - 0.42);
  float rTurb = r * (1.0 + relief * 0.5 + turb * turbAmp * (0.6 + aSeed.y));
  // At peak energy the lattice itself starts to shred too
  rLattice *= 1.0 + turb * uMidEnv * uTurbulence * 0.18;

  // Interior dust: sparse grains filling the volume — reads as a solid mass
  float rInner = r * (0.35 + aSeed.z * 0.6);
  // Outer halo: loose grains hovering off the surface, stirred by treble
  float hover = 0.04 + aSeed.z * aSeed.z * 0.5 * uDust;
  float drift = noise(aDir * 2.0 + uTime * 0.15 + aSeed * 7.0) - 0.5;
  float rHalo = r * (1.0 + hover + drift * (0.06 + uTrebleEnv * 0.2));

  float radius = rLattice * isLattice + rTurb * isTurb
               + rInner * isInner + rHalo * isHalo;
  vec3 pos = dir * radius;

  // Polar antennas: thin constant needles on both poles (plate signature);
  // beats vent them into tall plumes.
  float pole = pow(abs(dir.y), 10.0);
  float needle = pole * (0.34 + uBeatPulse * uBeatBurst * 1.5) * (isTurb + isHalo * 0.7);
  pos.y += sign(dir.y) * needle * (0.3 + aSeed.x * 1.2)
         * (0.5 + noise(vec3(aSeed.xy * 20.0, uTime * 0.8)));
  // Pinch needles toward the axis so they read as fine antennas
  pos.xz *= 1.0 - pole * 0.55 * (isTurb + isHalo);

  // Treble shimmer: sub-pixel jitter on the loose families
  vec3 jitter = (aSeed - 0.5) * uTrebleEnv * uShimmer * 0.12;
  pos += jitter * (isTurb * 0.6 + isDust);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float dist = -mv.z;
  float sizeK = isLattice * 1.0 + isTurb * 0.85 + isInner * 0.55 + isHalo * 0.6;
  gl_PointSize = uPointSize * uPixelRatio * sizeK * (7.0 / max(0.1, dist));
  gl_PointSize *= 1.0 + uBassEnv * 0.2 + uBeatPulse * 0.25;

  // --- shading terms ----------------------------------------------------
  // Wandering key light; the body rotates beneath it, so the terminator
  // slowly sweeps across the sphere.
  vec3 lightDir = normalize(vec3(cos(uTime * 0.07) * 0.8, 0.45, sin(uTime * 0.07) * 0.8 + 0.6));
  vLight = dot(dir, lightDir);

  // View-space direction: luminous limb ring + near/far depth cue
  vec3 dirView = normalize((modelViewMatrix * vec4(dir, 0.0)).xyz);
  vRim = pow(1.0 - abs(dirView.z), 1.6);
  vFront = smoothstep(-0.7, 0.9, dirView.z);

  // Flowing clump field: wisps/halo condense into filament streaks
  vClump = fbm(aDir * 5.5 + aSeed.x * 3.0 + vec3(0.0, uTime * 0.08, 0.0));
  vMask = mask;
  // ------------------------------------------------------------------------

  vKind = aKind + isInner * 2.0; // 0 lattice, 1 turb, 2 halo→2, inner→4
  vSeed = aSeed.z;
  vEnergy = clamp(
    uBassEnv * 0.5 + uMidEnv * (isTurb + isLattice * 0.4) * 0.8 + uTrebleEnv * isDust,
    0.0, 1.6);
}

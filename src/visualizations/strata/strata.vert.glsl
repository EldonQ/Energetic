// "VI · Strata" — Quayola-inspired stratified point cloud.
// Per-vertex: aLayer (0..1 within the stack), aSeed (random vec3).
// Layer index drives the frequency band the point reacts to.
//   bottom layers → bassEnv  (vertical pump)
//   middle layers → midEnv   (radial wobble)
//   top layers    → trebleEnv (random sparkle)

attribute float aLayer;
attribute vec3 aSeed;
attribute float aRadial;
attribute float aAngle;

uniform float uTime;
uniform float uLayerThickness;
uniform float uBassLift;
uniform float uMidDisplace;
uniform float uTrebleShimmer;
uniform float uBeatSlice;
uniform float uBassEnv;
uniform float uMidEnv;
uniform float uTrebleEnv;
uniform float uBeatPulse;
uniform float uPointSize;
uniform float uPixelRatio;
uniform float uSpread;
uniform float uRotation;

varying float vLayer;
varying float vEnergy;
varying float vSeed;

void main() {
  // Reconstruct stratified disc position
  float angle = aAngle + uTime * uRotation * (1.0 + aLayer * 0.6);
  float radius = aRadial * uSpread * 0.5;

  vec3 pos;
  pos.x = cos(angle) * radius;
  pos.z = sin(angle) * radius;
  // Stack: aLayer 0..1 → y centred around 0, with small per-layer jitter
  float yBase = (aLayer - 0.5) * uSpread * 0.45;
  float thick = uLayerThickness * uSpread;
  pos.y = yBase + (aSeed.y - 0.5) * thick;

  // Frequency mapping by layer position
  float fBass = smoothstep(0.0, 0.55, 1.0 - aLayer);   // bottom strong on bass
  float fMid  = 1.0 - 2.0 * abs(aLayer - 0.5);          // middle strong on mid
  float fTreb = smoothstep(0.45, 1.0, aLayer);          // top strong on treble

  // Vertical "lift" — bass pushes whole strata up + radial widening
  float bassReact = uBassEnv * uBassLift;
  pos.y += bassReact * fBass * 0.8;
  pos.xz *= 1.0 + bassReact * 0.18;

  // Mid wobble: radial breathing per layer with phase offset
  float wobble = sin(uTime * 1.3 + aLayer * 8.0 + aSeed.x * 6.28) * uMidEnv * uMidDisplace;
  pos.xz *= 1.0 + wobble * 0.25;

  // Treble shimmer: random per-point jitter that grows with treble
  vec3 jitter = (aSeed - 0.5) * uTrebleEnv * uTrebleShimmer * 0.4;
  pos += jitter * fTreb;

  // Beat slice: an upward travelling scan line that briefly displaces points it touches
  float slicePos = fract(uTime * 0.55) * 2.0 - 1.0;
  float sliceDist = abs(yBase * 2.0 - slicePos);
  float sliceK = smoothstep(0.08, 0.0, sliceDist) * uBeatPulse * uBeatSlice;
  pos.y += sliceK * 0.6;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Distance-based size (proper "point in world" feel)
  float dist = -mv.z;
  gl_PointSize = uPointSize * uPixelRatio * (8.0 / max(0.1, dist));
  // Boost size on bass / beat ever so slightly
  gl_PointSize *= 1.0 + uBassEnv * 0.25 + uBeatPulse * 0.15;

  // Pass to fragment
  vLayer = aLayer;
  vSeed = aSeed.z;
  vEnergy = clamp(fBass * uBassEnv + fMid * uMidEnv + fTreb * uTrebleEnv, 0.0, 1.5);
}

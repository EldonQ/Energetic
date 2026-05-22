precision highp float;

uniform vec3 uBaseColor;
uniform vec3 uAccentColor;
uniform vec3 uBeatColor;
uniform vec3 uBgColor;
uniform float uGlow;
uniform float uBeatPulse;

varying float vLayer;
varying float vEnergy;
varying float vSeed;

void main() {
  // Soft circular point sprite
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = length(uv);
  if (d > 1.0) discard;
  float alpha = pow(1.0 - d, 2.0);

  // Colour gradient by layer height + energy accent
  vec3 col = mix(uBaseColor, uAccentColor, clamp(vLayer + vEnergy * 0.35, 0.0, 1.0));
  // Beat colour bleeds in on every beat pulse, biased toward random points
  float beatMix = uBeatPulse * smoothstep(0.5, 1.0, vSeed) * 0.9;
  col = mix(col, uBeatColor, beatMix);

  // Brightness boost on hot points
  col *= uGlow * (0.55 + vEnergy * 1.4 + uBeatPulse * 0.4);

  gl_FragColor = vec4(col, alpha);
}

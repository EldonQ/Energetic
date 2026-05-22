// Soft round particle with radial falloff.
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  gl_FragColor = vec4(vec3(0.9, 0.95, 1.0), a * 0.55);
}

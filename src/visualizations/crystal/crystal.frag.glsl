// Fresnel edge glow + translucent core.
// Inner regions are dim and nearly transparent; rim is bright.

uniform float uBass;
uniform float uMid;
uniform vec3  uBaseColor;
uniform vec3  uEdgeColor;
uniform float uAlphaCore;
uniform float uAlphaEdge;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vDisplace;

void main() {
  float ndv = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
  float fres = pow(1.0 - ndv, 2.4);

  // Color: white base lerping to pale haze at edge
  vec3 col = mix(uBaseColor, uEdgeColor, fres);

  // Slight chromatic tint on displacement peaks (mid push)
  col += vec3(0.0, 0.02, 0.05) * (vDisplace * 6.0 + uMid * 0.5);

  // bass-driven luminance pump
  col += vec3(uBass * 0.35);

  float alpha = mix(uAlphaCore, uAlphaEdge, fres);
  gl_FragColor = vec4(col, alpha);
}

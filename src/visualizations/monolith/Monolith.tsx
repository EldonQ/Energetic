import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sharedFeaturesRef } from '@/audio/useAudioData';
import { useUIStore } from '@/store/uiStore';
import type { MonolithParams } from './params';

/**
 * "III · Monolith" — Ryoji Ikeda-style spectrum wall.
 * Bars driven by the log-spaced spectrum, with fast attack / slow release
 * envelopes per bar so transients PUNCH up and decay visibly.
 */
export function Monolith({ params }: { params: MonolithParams }) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const reducedMotion = useUIStore((s) => s.reducedMotion);

  const MAX_BARS = 512;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const baseColorObj = useMemo(() => new THREE.Color(), []);
  const peakColorObj = useMemo(() => new THREE.Color(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const { geometry, material, heights, peaks } = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    // Translate origin to the BOTTOM of the box so scale.y grows upward only.
    g.translate(0, 0.5, 0);
    const m = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const h = new Float32Array(MAX_BARS);
    const p = new Float32Array(MAX_BARS); // "peak hold" markers that fall slowly
    return { geometry: g, material: m, heights: h, peaks: p };
  }, []);

  const instance = useMemo(() => {
    const mesh = new THREE.InstancedMesh(geometry, material, MAX_BARS);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = Math.min(Math.round(params.bars), MAX_BARS);
    const obj = new THREE.Object3D();
    obj.position.set(0, -9999, 0);
    obj.updateMatrix();
    for (let i = 0; i < MAX_BARS; i++) mesh.setMatrixAt(i, obj.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, material]);

  useEffect(() => {
    instance.count = Math.max(4, Math.min(Math.round(params.bars), MAX_BARS));
  }, [params.bars, instance]);

  // Beat flash brightness booster
  const beatFlashRef = useRef(0);

  useFrame((_state, delta) => {
    const f = sharedFeaturesRef.current;
    const n = instance.count;
    const dt = Math.min(delta, 0.05);

    // Use the rich log-spaced spectrum if available, falling back to nothing.
    const spec = f.spectrum;
    const specN = spec.length;

    const lo = Math.max(0, Math.min(params.freqLow, params.freqHigh - 0.05));
    const hi = Math.min(1, Math.max(params.freqHigh, lo + 0.05));

    // Asymmetric env: fast attack so bars JUMP, slow release so bars HANG.
    const attackK = 1 - Math.exp(-0.95 * dt * 60); // very fast
    const releaseK = 1 - Math.exp(-params.smooth * dt * 30); // tuned by `smooth` param
    const peakFallRate = 0.55; // height units per second

    const maxH = params.maxHeight;
    const w = params.width;
    const sp = params.spacing + w;
    const halfTotal = (n - 1) * sp * 0.5;
    const invert = params.invertY ? -1 : 1;

    baseColorObj.set(params.baseColor);
    peakColorObj.set(params.peakColor);

    // Beat flash
    if (f.beat) beatFlashRef.current = 1;
    beatFlashRef.current = Math.max(0, beatFlashRef.current - dt * 3.0);
    const beatBoost = 1 + beatFlashRef.current * 0.9;

    for (let i = 0; i < n; i++) {
      // Map bar index → log-spectrum band index (linear within freqLow..freqHigh range)
      let v = 0;
      if (specN > 0) {
        const t = i / Math.max(1, n - 1);
        const idxF = (lo + t * (hi - lo)) * (specN - 1);
        const a = Math.floor(idxF);
        const b = Math.min(specN - 1, a + 1);
        const fr = idxF - a;
        v = spec[a] * (1 - fr) + spec[b] * fr;
      }

      // Threshold gate
      if (v < params.threshold) v = 0;

      // Asymmetric envelope per bar
      const prev = heights[i];
      let next: number;
      if (reducedMotion) {
        next = prev * 0.92;
      } else if (v > prev) {
        next = prev + (v - prev) * attackK;   // SNAP up
      } else {
        next = prev + (v - prev) * releaseK;  // HANG, drift down
      }
      heights[i] = next;

      // Peak-hold marker — sits above the bar and falls slowly
      if (next > peaks[i]) peaks[i] = next;
      else peaks[i] = Math.max(next, peaks[i] - peakFallRate * dt);

      // Final height in world units.
      // NOTE: the box geometry is bottom-anchored (g.translate(0, 0.5, 0)) so
      // bars grow upward from y=0 only — that DOUBLES their visual height vs.
      // the old centered geometry. We apply a fixed 0.5× compensation here
      // (independent of the user-facing `maxHeight` slider) so the on-screen
      // proportions match the early reference build.
      const h = Math.max(0.0005, next * maxH * 0.5);
      const x = -halfTotal + i * sp;
      const baseY = invert * 0;
      // bar
      dummy.position.set(x, baseY, 0);
      dummy.scale.set(w, invert * h, w);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      instance.setMatrixAt(i, dummy.matrix);

      // Per-instance colour: ramp base → peak by amplitude, gain by brightness + beat flash
      tmpColor.copy(baseColorObj).lerp(peakColorObj, Math.min(1, next * 1.7));
      tmpColor.multiplyScalar(params.brightness * beatBoost * (0.45 + next * 1.1));
      instance.setColorAt(i, tmpColor);
    }

    instance.instanceMatrix.needsUpdate = true;
    if (instance.instanceColor) instance.instanceColor.needsUpdate = true;

    if (groupRef.current && !reducedMotion) {
      // Lateral scroll + slight bass-pulled forward sway
      groupRef.current.position.x = -((performance.now() * 0.001 * params.scrollSpeed) % 4);
      groupRef.current.position.z = f.bassEnv * 0.3;
      groupRef.current.rotation.y = params.rotateY * Math.PI * 0.25;
      groupRef.current.rotation.x = -0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive ref={meshRef} object={instance} renderOrder={1} />
    </group>
  );
}

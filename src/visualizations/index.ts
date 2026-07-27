import { crystalViz } from './crystal';
import { monolithViz } from './monolith';
import { mercuryViz } from './mercury';
import { strataViz } from './strata';
import { heightfieldViz } from './heightfield';
import { dustViz } from './dust';
import type { VizModule } from './types';

/**
 * Registry of all available visualization modules.
 * Order here determines the order in the switcher (I, II, III, IV, V, VI).
 *
 * To add a new visualization:
 *   1. Create a new folder under src/visualizations/<id>/
 *   2. Export a VizModule from its index.ts
 *   3. Add the import here and append to VIZ_MODULES
 */
export const VIZ_MODULES: VizModule<any>[] = [
  crystalViz,
  monolithViz,
  mercuryViz,
  strataViz,
  heightfieldViz,
  dustViz,
];

function getVizById(id: string): VizModule<any> | undefined {
  return VIZ_MODULES.find((v) => v.id === id);
}

export function getVizOrDefault(id: string): VizModule<any> {
  return getVizById(id) ?? VIZ_MODULES[0];
}

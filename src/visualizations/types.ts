import type { ComponentType } from 'react';

/** Localized string for UI labels. */
export interface I18nText {
  zh: string;
  en: string;
}

/** Parameter schema entries — drive the auto-generated param panel. */
export type ParamDef =
  | {
      type: 'range';
      label: I18nText;
      min: number;
      max: number;
      step: number;
      group?: string;
    }
  | { type: 'color'; label: I18nText; group?: string }
  | { type: 'select'; label: I18nText; options: string[]; group?: string }
  | { type: 'toggle'; label: I18nText; group?: string };

export type ParamSchema = Record<string, ParamDef>;

/** Concrete value types a param can hold. */
export type ParamValue = number | string | boolean;
export type ParamValues = Record<string, ParamValue>;

/** A self-contained visualization module. */
export interface VizModule<P extends ParamValues = ParamValues> {
  id: string;
  /** Roman numeral or short label for the switcher (I, II, III, IV) */
  numeral: string;
  name: I18nText;
  description: I18nText;
  /** Schema describing controllable params; ParamPanel renders sliders/colors/etc from this. */
  params: ParamSchema;
  /** Default values for each declared param. */
  defaults: P;
  /** Whether the ambient particle background should render behind this viz. */
  useAmbientParticles: boolean;
  /** The R3F component that renders the scene contents. Receives merged params. */
  Component: ComponentType<{ params: P }>;
}

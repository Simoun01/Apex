/* ============================================================================
   Parts manifest — the sub-assemblies each 3D model is built from, in the
   order they come apart in the exploded view.

   It lives in the data layer, with no three.js import, so pages that only need
   to price or list a unit (the showroom hero, a quote) can use it without
   pulling in the 3D bundle. `src/components/scene/airconModels.tsx` re-exports
   it, and its ids must stay in step with the <Part id="…"> ids in that file.
   ============================================================================ */

import type { UnitKind } from './airconBrands';
import { partPrice } from './partPrices';

/* ── Parts list per model ───────────────────────────────────────────────────
   The same sub-assemblies the models above are built from, in the order they
   come apart. Used for the exploded-view parts list (quantity + indicative
   price) in the inspector. Keep in step with the <Part id="…"> ids.
   ──────────────────────────────────────────────────────────────────────── */

export interface ModelPart {
  id: string;
  en: string;
  tl: string;
}

const p = (id: string, en: string, tl = en): ModelPart => ({ id, en, tl });

export const MODEL_PARTS: Record<string, ModelPart[]> = {
  wall: [
    p('panel', 'Front cover & panel', 'Front cover at panel'),
    p('filter', 'Washable air filters', 'Air filter (nalalabhan)'),
    p('louver', 'Motorised swing louver', 'Swing louver'),
    p('coil', 'Evaporator coil', 'Evaporator coil'),
    p('crossflow', 'Cross-flow fan', 'Cross-flow fan'),
    p('motor', 'Fan motor', 'Motor ng fan'),
    p('pcb', 'Control board (PCB)', 'Control board (PCB)'),
    p('drain', 'Condensate drain pan', 'Drain pan'),
    p('chassis', 'Rear chassis & mounting plate', 'Likod na chassis at mounting plate'),
  ],
  outdoor: [
    p('casing', 'Outdoor cabinet', 'Outdoor cabinet'),
    p('fan', 'Condenser fan & guard', 'Condenser fan'),
    p('coil', 'Condenser coil', 'Condenser coil'),
    p('compressor', 'Inverter compressor', 'Inverter compressor'),
    p('ports', 'Service valves', 'Service valves'),
  ],
  floor: [
    p('panel', 'Front panel & display', 'Front panel at display'),
    p('louver', 'Swing vanes', 'Swing vanes'),
    p('filter', 'Lower intake filter', 'Filter sa ibaba'),
    p('coil', 'Evaporator coil', 'Evaporator coil'),
    p('blower', 'Vertical blower fan', 'Blower fan'),
    p('pcb', 'Control board', 'Control board'),
    p('casing', 'Cabinet & base', 'Cabinet at base'),
  ],
  window: [
    p('panel', 'Front grille & controls', 'Front grille at controls'),
    p('filter', 'Washable filter', 'Filter'),
    p('coil', 'Evaporator coil', 'Evaporator coil'),
    p('blower', 'Indoor blower wheel', 'Blower wheel'),
    p('motor', 'Dual-shaft fan motor', 'Dual-shaft motor'),
    p('fan', 'Condenser fan', 'Condenser fan'),
    p('condenser', 'Condenser coil', 'Condenser coil'),
    p('compressor', 'Rotary compressor', 'Rotary compressor'),
    p('pcb', 'Control board', 'Control board'),
    p('casing', 'Outer cabinet (sleeve)', 'Cabinet (sleeve)'),
    p('base', 'Base pan', 'Base pan'),
  ],
  cassette: [
    p('grille', 'Centre intake grille', 'Intake grille'),
    p('panel', 'Decoration panel & 4-way louvers', 'Panel at 4-way louvers'),
    p('filter', 'Washable filter', 'Filter'),
    p('fan', 'Turbo (centrifugal) fan', 'Turbo fan'),
    p('coil', 'Square evaporator coil', 'Square evaporator coil'),
    p('casing', 'Body & drain pan', 'Body at drain pan'),
  ],
  ducted: [
    p('top', 'Top access cover', 'Top access cover'),
    p('filter', 'Return-air filter', 'Return-air filter'),
    p('coil', 'Evaporator coil', 'Evaporator coil'),
    p('blower', 'Twin centrifugal blowers', 'Twin centrifugal blowers'),
    p('controls', 'Control box', 'Control box'),
    p('ports', 'Supply-air flange', 'Supply-air flange'),
    p('casing', 'Galvanised casing', 'Galvanised casing'),
  ],
  vrf: [
    p('top', 'Top cover & fan guard', 'Top cover at fan guard'),
    p('fan', 'Top-discharge propeller fan', 'Propeller fan'),
    p('panel', 'Front service panel', 'Front service panel'),
    p('coil', 'Three-sided condenser coil', 'Three-sided condenser coil'),
    p('compressor', 'Inverter scroll compressor', 'Inverter scroll compressor'),
    p('controls', 'Inverter PCB & control box', 'Inverter PCB at control box'),
    p('ports', 'Brass service valves', 'Brass service valves'),
    p('frame', 'Base frame & rear panel', 'Base frame at likod na panel'),
  ],
  packaged: [
    p('top', 'Top cover & fan guards', 'Top cover'),
    p('fan', 'Condenser fans', 'Condenser fans'),
    p('panel', 'Hinged access panels', 'Access panels'),
    p('coil', 'Condenser coil', 'Condenser coil'),
    p('compressor', 'Twin scroll compressors', 'Twin scroll compressors'),
    p('blower', 'Supply-air blower', 'Supply-air blower'),
    p('controls', 'Control panel', 'Control panel'),
    p('casing', 'Cabinet & roof curb rail', 'Cabinet at curb rail'),
  ],
};

/** Kinds that are half of a split system: priced together with an outdoor condenser. */
export const SPLIT_KINDS: UnitKind[] = ['wall', 'floor'];
/** Indoor-only commercial kinds whose condensing unit is quoted separately. */
export const NEEDS_SEPARATE_OUTDOOR: UnitKind[] = ['cassette', 'ducted'];

export interface Tally {
  low: number;
  high: number;
  /** Distinct part types counted */
  lines: number;
  /** Individual pieces counted (quantities added up) */
  pieces: number;
}

/**
 * Complete indicative parts tally for one product: every part of the unit,
 * multiplied by its quantity — plus the outdoor condenser for a split system,
 * because a split is two machines and pricing only half of it would mislead.
 */
export function unitTally(kind: string, variant?: string): Tally {
  const figures = [kind, ...(SPLIT_KINDS.includes(kind as UnitKind) ? ['outdoor'] : [])];
  const t: Tally = { low: 0, high: 0, lines: 0, pieces: 0 };
  for (const fk of figures) {
    for (const part of MODEL_PARTS[fk] ?? []) {
      const price = partPrice(fk, part.id, variant);
      if (!price) continue;
      t.low += price.low * price.qty;
      t.high += price.high * price.qty;
      t.lines += 1;
      t.pieces += price.qty;
    }
  }
  return t;
}

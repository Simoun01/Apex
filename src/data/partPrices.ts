/* ============================================================================
   Indicative part prices & quantities for the exploded view.
   ----------------------------------------------------------------------------
   HONESTY NOTE — read before changing these numbers:
   These are *mock, indicative* supply-only ranges in Philippine pesos, written
   for the showroom so a visitor can see roughly what a component costs and how
   many of it sit inside a unit. They are NOT quotations, NOT brand price lists,
   and they do not include labour, refrigerant, vacuum, brackets or delivery.
   Every screen that shows them says so.

   A real price always comes from the supplier list for the exact model, so if
   you connect a parts catalogue later, replace `partPrice()` with that lookup.

   base    — range for a 1.5 HP wall-mounted split (the reference unit)
   KIND_X  — multiplier per unit kind (bigger machines, bigger components)
   QTY     — how many of that part the 3D model actually contains, per kind
   ============================================================================ */

import type { UnitKind } from './airconBrands';
import { btuFromVariant } from './airconBrands';

export interface PartPrice {
  /** How many of this part the unit contains */
  qty: number;
  /** Indicative supply-only range, Philippine pesos, per piece */
  low: number;
  high: number;
}

/** Reference range per part id, for a 1.5 HP wall split. */
const BASE: Record<string, [number, number]> = {
  /* Casing & structure */
  chassis: [900, 1600],
  casing: [1800, 3400],
  base: [900, 1500],
  frame: [1600, 2800],
  top: [900, 1800],
  panel: [1200, 2600],
  grille: [600, 1400],
  louver: [800, 1800],
  drain: [700, 1500],

  /* Air path */
  filter: [450, 950],
  crossflow: [1600, 3200],
  blower: [2400, 4800],
  fan: [1400, 3200],
  motor: [1800, 3800],

  /* Refrigeration */
  coil: [3500, 7500],
  condenser: [4200, 8800],
  compressor: [8500, 16000],
  ports: [900, 1900],

  /* Electronics */
  pcb: [3200, 7000],
  controls: [4500, 9500],
  display: [900, 2200],
  sensor: [450, 1200],
};

/** Bigger kinds use bigger, heavier components. */
const KIND_X: Record<UnitKind, number> = {
  wall: 1,
  window: 0.85,
  floor: 1.4,
  cassette: 1.8,
  ducted: 2.2,
  vrf: 3.6,
  packaged: 4.2,
};

/** Quantities that differ from one, matching what each 3D model actually shows. */
const QTY: Partial<Record<UnitKind, Record<string, number>>> = {
  wall: { filter: 2 },
  window: { filter: 1 },
  floor: { filter: 1, louver: 2 },
  cassette: { louver: 4, filter: 1, sensor: 1 },
  ducted: { blower: 2, filter: 2 },
  vrf: { fan: 1, ports: 2, coil: 3 },
  packaged: { fan: 2, compressor: 2, panel: 2 },
};

/** The outdoor condenser of a split system, shown as its own figure. */
const OUTDOOR_X = 1.6;

const round = (n: number) => Math.round(n / 50) * 50;

/**
 * Indicative price and quantity for one part of one unit.
 * `kind` may also be 'outdoor' (the split-type condenser).
 * `variant` ("1.5 HP", "7.5 TR") nudges the range with capacity.
 */
export function partPrice(kind: string, partId: string, variant?: string): PartPrice | null {
  const base = BASE[partId];
  if (!base) return null;

  const mult = kind === 'outdoor' ? OUTDOOR_X : (KIND_X[kind as UnitKind] ?? 1);

  // Capacity nudge: a 2.5 HP coil costs more than a 1.0 HP coil, but not linearly.
  const btu = variant ? btuFromVariant(variant) : 13500;
  const cap = Math.min(1.9, Math.max(0.7, Math.pow(btu / 13500, 0.42)));

  const qty = QTY[kind as UnitKind]?.[partId] ?? 1;
  return {
    qty,
    low: round(base[0] * mult * cap),
    high: round(base[1] * mult * cap),
  };
}

const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`;

/** "₱3,500 – ₱7,500" */
export function priceRange(p: PartPrice): string {
  return `${peso(p.low)} – ${peso(p.high)}`;
}

/** Range for the whole quantity: "2 × ₱450 – ₱950" collapses to the line total. */
export function priceLineTotal(p: PartPrice): string {
  return `${peso(p.low * p.qty)} – ${peso(p.high * p.qty)}`;
}

/** Sum of every priced part in a unit, as an indicative range. */
export function partsTotal(kind: string, partIds: string[], variant?: string): { low: number; high: number; counted: number } {
  let low = 0;
  let high = 0;
  let counted = 0;
  for (const id of partIds) {
    const p = partPrice(kind, id, variant);
    if (!p) continue;
    low += p.low * p.qty;
    high += p.high * p.qty;
    counted += 1;
  }
  return { low, high, counted };
}

export { peso };

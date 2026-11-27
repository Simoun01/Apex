/* ============================================================================
   "Our Products" catalogue cards.
   ----------------------------------------------------------------------------
   Mirrored from the Apex Mechanical & Cooling site's OUR PRODUCTS section:
   same six cards, same badges, same spec chips, same filter groups.

   WHERE THE NUMBERS CAME FROM — be straight with visitors about this:
   • `priceFrom` on the first three cards is the figure shown on that page.
   • The last three cards' prices were cut off in the screenshots this section
     was rebuilt from, so they are marked `priceAssumed: true`: they are our
     own estimates, consistent with EQUIPMENT_CATALOG in hvacData.ts, and the
     section labels them as estimates until the real figures are filled in.
   • `blurbCut: true` marks a description whose opening words were cut off in
     the same screenshots and were written here to fit the visible ending.
   Replace either and delete the flag once you have the real copy.
   ============================================================================ */

import type { BrandId, UnitKind } from './airconBrands';

export type ProductFilter = 'all' | 'split' | 'window' | 'commercial' | 'portable';

export interface ProductCard {
  id: string;
  /** Pill in the top-left corner of the card */
  badge: string;
  /** Colour of that pill */
  badgeTone: 'blue' | 'slate' | 'amber';
  name: string;
  blurb: string;
  /** The opening of this blurb was unreadable in the source screenshot */
  blurbCut?: boolean;
  /** Small spec chips under the blurb */
  chips: string[];
  priceFrom: string;
  /** This price is our estimate, not a figure read off the source page */
  priceAssumed?: boolean;
  filter: Exclude<ProductFilter, 'all'>;
  /** Opens the 3D inspector with this unit; null when no 3D model exists yet */
  model: { catalogId: string; kind: UnitKind; brandId: BrandId; variant: string } | null;
}

export const PRODUCT_CARDS: ProductCard[] = [
  {
    id: 'split-inverter',
    badge: 'Best Seller',
    badgeTone: 'blue',
    name: 'Inverter Split-Type',
    blurb: 'Quiet, steady cooling with up to 60% energy savings vs. non-inverter.',
    blurbCut: true,
    chips: ['1.0 – 2.5 HP', 'Inverter', 'R32'],
    priceFrom: '₱28,500',
    filter: 'split',
    model: { catalogId: 'res_split_inv', kind: 'wall', brandId: 'daikin', variant: '1.5 HP' },
  },
  {
    id: 'window',
    badge: 'Budget Pick',
    badgeTone: 'blue',
    name: 'Window-Type Aircon',
    blurb: 'Simple, affordable and quick to fit — ideal for bedrooms and small rooms.',
    blurbCut: true,
    chips: ['0.6 – 1.5 HP', 'Remote', 'Timer'],
    priceFrom: '₱15,900',
    filter: 'window',
    model: { catalogId: 'res_window_inv', kind: 'window', brandId: 'carrier', variant: '1.0 HP' },
  },
  {
    id: 'cassette',
    badge: 'Commercial',
    badgeTone: 'blue',
    name: 'Ceiling Cassette',
    blurb: 'Recessed into the ceiling with four-way airflow for clean, modern interiors.',
    blurbCut: true,
    chips: ['2.0 – 5.0 HP', '4-way flow', 'Inverter'],
    priceFrom: '₱68,000',
    filter: 'commercial',
    model: { catalogId: 'com_cassette', kind: 'cassette', brandId: 'daikin', variant: '3.0 HP' },
  },
  {
    id: 'floor-standing',
    badge: 'Commercial',
    badgeTone: 'blue',
    name: 'Floor-Standing Unit',
    blurb: 'High-capacity cooling for offices, shops, halls and function rooms.',
    chips: ['3.0 – 5.0 HP', 'Auto swing', 'LED panel'],
    priceFrom: '₱68,000',
    priceAssumed: true,
    filter: 'commercial',
    model: { catalogId: 'res_floor_mounted', kind: 'floor', brandId: 'mitsubishi', variant: '3.0 HP' },
  },
  {
    id: 'portable',
    badge: 'Plug & Play',
    badgeTone: 'slate',
    name: 'Portable Aircon',
    blurb: 'No installation needed — roll it to any room. Great for renters.',
    chips: ['1.0 – 1.5 HP', 'Dehumidifier', 'Wheels'],
    priceFrom: '₱18,900',
    priceAssumed: true,
    filter: 'portable',
    // No 3D model of a portable unit exists in this app yet, so this card says so.
    model: null,
  },
  {
    id: 'heat-pump',
    badge: 'Heat Pump',
    badgeTone: 'amber',
    name: 'Inverter Heat Pump / Multi-Split',
    blurb: 'One outdoor unit, multiple rooms. Cooling and heating in a single system.',
    chips: ['2.0 – 4.0 HP', 'Cool + Heat', 'Multi-zone'],
    priceFrom: '₱95,000',
    priceAssumed: true,
    filter: 'split',
    model: { catalogId: 'com_vrf', kind: 'vrf', brandId: 'daikin', variant: '4.0 HP' },
  },
];

export const PRODUCT_FILTERS: { id: ProductFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'split', label: 'Split-Type' },
  { id: 'window', label: 'Window-Type' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'portable', label: 'Portable' },
];

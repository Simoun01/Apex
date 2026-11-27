/* ============================================================================
   Home hero slides.
   ----------------------------------------------------------------------------
   Copy mirrored from the Apex Mechanical & Cooling site hero (5 slides,
   auto-advancing). Every headline, sub-headline, badge and button label below
   is the wording from that page.

   PHOTOGRAPHS — how to switch them on:
   each slide looks for `public/hero/<slide id>.jpg` first and only falls back
   to the rendered 3D room if that file is missing. So dropping five photos
   named living-room.jpg, bedroom.jpg, clean-installs.jpg, lofts.jpg and
   floor-standing.jpg into public/hero/ replaces every room with a real photo,
   with no code change at all. See public/hero/README.md for sizes and
   licensing. To point a slide somewhere else, set `photo` below.
   ============================================================================ */

import type { BrandId, UnitKind } from './airconBrands';

export interface HomeSlide {
  id: string;
  /** Small pill above the headline */
  badge: string;
  /** Headline, split across two lines exactly as the site sets it */
  line1: string;
  line2: string;
  /** Slide 1 sets its second line in brand blue */
  line2Accent?: boolean;
  body: string;
  /** Overrides the default `/hero/<id>.jpg` lookup; falls back to the 3D room */
  photo?: string;
  /** Unit rendered behind the slide when there is no photo */
  kind: UnitKind;
  brandId: BrandId;
  /** Camera angle for that render: [yaw, pitch] in radians */
  yaw: number;
  pitch: number;
}

export const HOME_SLIDES: HomeSlide[] = [
  {
    id: 'living-room',
    badge: 'Inverter Split-Type · Living Room',
    line1: 'Cool comfort,',
    line2: 'installed right.',
    line2Accent: true,
    body: 'Quiet, energy-saving inverter split-types fitted cleanly into modern living spaces — neat piping, no mess.',
    kind: 'wall',
    brandId: 'daikin',
    yaw: -0.5,
    pitch: 0.18,
  },
  {
    id: 'bedroom',
    badge: 'Wall-Mounted Inverter · Bedroom',
    line1: 'Sleep cool all night,',
    line2: 'pay less every month.',
    body: 'Whisper-quiet bedroom units with sleep mode and smart temperature control for restful Pampanga nights.',
    kind: 'wall',
    brandId: 'mitsubishi',
    yaw: 0.46,
    pitch: 0.24,
  },
  {
    id: 'clean-installs',
    badge: 'Clean Installs · Modern Homes',
    line1: 'Neat work',
    line2: 'you can see.',
    body: 'Level mounting, hidden piping and tidy finishing — every unit tested before we leave your home.',
    kind: 'wall',
    brandId: 'carrier',
    yaw: -0.82,
    pitch: 0.3,
  },
  {
    id: 'lofts',
    badge: 'Lofts, Studios & Home Offices',
    line1: 'Quiet cooling',
    line2: 'for work and rest.',
    body: 'Right-sized inverter units for condos, lofts and home offices — cool, quiet and easy on your electric bill.',
    kind: 'wall',
    brandId: 'gree',
    yaw: 0.6,
    pitch: 0.26,
  },
  {
    id: 'floor-standing',
    badge: 'Floor-Standing · Offices & Shops',
    line1: 'Big rooms.',
    line2: 'Strong, steady cooling.',
    body: 'High-capacity floor-standing units for offices, shops, clinics and function rooms — supplied and installed by our team.',
    kind: 'floor',
    brandId: 'mitsubishi',
    yaw: -0.3,
    pitch: 0.2,
  },
];

export const SLIDE_CTA_PRIMARY = 'Book a Service';
export const SLIDE_CTA_SECONDARY = 'View Products';

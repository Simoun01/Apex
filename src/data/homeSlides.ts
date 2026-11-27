/* ============================================================================
   Home hero slides.
   ----------------------------------------------------------------------------
   Copy mirrored from the Apex Mechanical & Cooling site hero. Every headline,
   sub-headline, badge and button label below is the wording from that page.

   PHOTOGRAPHS ONLY — there is no 3D fallback any more.
   Each slide shows a real photograph from `public/hero/`. A slide only belongs
   in this list once its photo exists, otherwise the hero shows an empty navy
   panel. To add a slide back, put its photo in public/hero/ and add its entry
   here. See public/hero/README.md for sizes, cropping and licensing.
   ============================================================================ */

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
  /** Photograph behind the slide; defaults to /hero/<id>.jpg */
  photo?: string;
}

export const HOME_SLIDES: HomeSlide[] = [
  {
    id: 'living-room',
    badge: 'Inverter Split-Type · Living Room',
    line1: 'Cool comfort,',
    line2: 'installed right.',
    line2Accent: true,
    body: 'Quiet, energy-saving inverter split-types fitted cleanly into modern living spaces — neat piping, no mess.',
  },
  {
    id: 'bedroom',
    badge: 'Wall-Mounted Inverter · Bedroom',
    line1: 'Sleep cool all night,',
    line2: 'pay less every month.',
    body: 'Whisper-quiet bedroom units with sleep mode and smart temperature control for restful nights.',
  },
  {
    id: 'clean-installs',
    badge: 'Clean Installs · Modern Homes',
    line1: 'Neat work',
    line2: 'you can see.',
    body: 'Level mounting, hidden piping and tidy finishing — every unit tested before we leave your home.',
  },
];

/* Slides waiting on a photograph — add them back above once the file exists:

  {
    id: 'lofts',
    badge: 'Lofts, Studios & Home Offices',
    line1: 'Quiet cooling',
    line2: 'for work and rest.',
    body: 'Right-sized inverter units for condos, lofts and home offices — cool, quiet and easy on your electric bill.',
  },
  {
    id: 'floor-standing',
    badge: 'Floor-Standing · Offices & Shops',
    line1: 'Big rooms.',
    line2: 'Strong, steady cooling.',
    body: 'High-capacity floor-standing units for offices, shops, clinics and function rooms — supplied and installed by our team.',
  },
*/

export const SLIDE_CTA_PRIMARY = 'Book a Service';
export const SLIDE_CTA_SECONDARY = 'View Products';

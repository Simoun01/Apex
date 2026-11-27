/**
 * APEX MECHANICAL & COOLING — CENTRAL SITE CONFIGURATION
 * ======================================================
 * Edit this file to update business contact info, service areas,
 * trust points, pricing disclaimers, and response time promises.
 */

export const siteConfig = {
  brand: {
    name: 'Apex Mechanical & Cooling',
    shortName: 'Apex Mechanical',
    taglineEn: 'Cool Air. Engineered Right.',
    taglineTaglish: 'Malamig at Maasahang Aircon. Engineered Right.',
    locationLabel: 'San Matias, Pampanga, Philippines',
  },

  /**
   * PLACEHOLDER CONTACT DETAILS — Replace with your actual business numbers & links.
   */
  contact: {
    // [PLACEHOLDER] Replace with real mobile/landline number
    phoneDisplay: '+63 917 000 0000',
    phoneHref: 'tel:+639170000000',
    // [PLACEHOLDER] Replace with your Facebook Page username for m.me deep links
    messengerPageId: 'ApexMechanicalCoolingPH',
    // [PLACEHOLDER] Replace with your WhatsApp number (country code + number, no +)
    whatsappNumber: '639170000000',
    // [PLACEHOLDER] Replace with your Viber number
    viberNumber: '+639170000000',
    // [PLACEHOLDER] Replace with your business email
    email: 'inquiries@apexmechanical-pampanga.example.com',
    // [PLACEHOLDER] Expected callback window shown after submitting a quote request
    responseHours: '2 to 4 business hours',
    businessHours: 'Mon–Sat · 8:00 AM – 6:00 PM',
  },

  /**
   * SOCIAL LINKS — shown in the footer.
   * [PLACEHOLDER] Replace both URLs with your real pages before going live.
   * WhatsApp and email are built from `contact` above, so they update with it.
   */
  social: {
    facebookUrl: 'https://www.facebook.com/ApexMechanicalCoolingPH',
    tiktokUrl: 'https://www.tiktok.com/@apexmechanicalcooling',
  },

  /**
   * PAMPANGA & CENTRAL LUZON SERVICE AREAS — Shown in the Service Area strip and Quote dropdown.
   */
  serviceAreas: [
    'San Matias',
    'Santo Tomas',
    'City of San Fernando',
    'Angeles City',
    'Mabalacat',
    'Mexico',
    'Sta. Ana',
    'Arayat',
    'Magalang',
    'Bacolor',
    'Guagua',
    'San Simon',
    'Apalit',
    'Candaba',
    'Clark Freeport Zone',
    'Central Luzon Region III',
  ],

  /**
   * TRUST STRIP CLAIMS — Placeholder operational commitments; edit or remove as needed.
   * No invented awards, certifications, testimonials, or years in business.
   */
  trustPoints: [
    {
      id: 'technicians',
      en: 'Trained Aircon Technicians',
      taglish: 'Trained Aircon Technicians',
      detailEn: 'Dedicated residential & commercial cooling specialists.',
      detailTaglish: 'Mga espesyalista para sa bahay at negosyo.',
    },
    {
      id: 'assessment',
      en: 'Libreng Site Assessment',
      taglish: 'Libreng Site Assessment',
      detailEn: 'On-site heat load & piping inspection before final quote.',
      detailTaglish: 'Libreng ocular check bago ang final quote.',
    },
    {
      id: 'warranty',
      en: 'Workmanship Warranty',
      taglish: 'May Workmanship Warranty',
      detailEn: 'Clear service terms on installation & repair work.',
      detailTaglish: 'Malinaw na warranty sa gawa at installation.',
    },
    {
      id: 'local',
      en: 'Local San Matias Team',
      taglish: 'Local Team sa Pampanga',
      detailEn: 'Fast dispatch across San Matias & Pampanga.',
      detailTaglish: 'Mabilis puntahan sa San Matias at karatig-bayan.',
    },
  ],

  /**
   * [PLACEHOLDER] KEY STATS BAND FIGURES — Replace values and labels with your
   * verified business numbers (years operating, units serviced/commissioned,
   * average dispatch response time, and warranty coverage).
   */
  keyMetrics: [
    {
      id: 'years',
      value: '10+', // [PLACEHOLDER] Replace with actual years of service
      labelEn: 'Years Serving Pampanga',
      labelTaglish: 'Taon ng Serbisyo sa Pampanga',
    },
    {
      id: 'units',
      value: '2,400+', // [PLACEHOLDER] Replace with actual units serviced/commissioned
      labelEn: 'Units Installed & Serviced',
      labelTaglish: 'Aircon na Na-install at Naayos',
    },
    {
      id: 'response',
      value: '2–4 HRS', // [PLACEHOLDER] Replace with actual average callback/dispatch window
      labelEn: 'Avg. Dispatch Response',
      labelTaglish: 'Karaniwang Bilis ng Tugon',
    },
    {
      id: 'warranty',
      value: '90-DAY', // [PLACEHOLDER] Replace with actual workmanship warranty period
      labelEn: 'Workmanship Warranty',
      labelTaglish: 'Workmanship Warranty',
    },
  ],

  pricingDisclaimer: {
    en: 'All ₱ prices shown are estimates only. Final quote is provided after a free site assessment.',
    taglish: 'Lahat ng ₱ presyo ay estimate lamang. Ang final quote ay ibibigay pagkatapos ng libreng site assessment.',
  },
} as const;

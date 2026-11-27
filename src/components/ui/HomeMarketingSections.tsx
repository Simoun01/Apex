import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Facebook,
  Clock,
  Droplets,
  HelpCircle,
  Home,
  Mail,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { siteConfig } from '../../config/siteConfig';
import { HOME_FAQ_ITEMS, getFaqAnswer, getFaqQuestion } from '../../data/homeFaqData';
import { ServiceMode } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';
import { tr } from '../../i18n/tr';

/* ── Social marks ──────────────────────────────────────────────────────────
   lucide ships Facebook and Mail but no TikTok or WhatsApp glyph, so those two
   are drawn here in the same 24 × 24 stroke style. They sit next to a text
   label, so they read as the right service without pretending to be the
   official brand artwork. Drop in licensed brand SVGs if you prefer.
   ──────────────────────────────────────────────────────────────────────── */

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9.5 9.2a4.4 4.4 0 1 0 4.4 4.4V3.5c.7 2.3 2.6 3.9 5.1 4.1" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3.4 20.6l1.3-4.2A8.4 8.4 0 1 1 7.9 19.4l-4.5 1.2Z" />
      <path d="M9 9.1c.3 1.8 1.9 3.5 3.8 3.9l.8-1.1 1.7.8-.3 1.5c-2.7.4-5.9-2.6-6.3-5.4l1.4-.4.9.7Z" />
    </svg>
  );
}

interface ServiceMarketingCard {
  id: ServiceMode;
  num: string;
  headingEn: string;
  headingTaglish: string;
  bodyEn: string;
  bodyTaglish: string;
  targetAudience: 'residential' | 'commercial';
  ctaEn: string;
  ctaTaglish: string;
  icon: typeof Wrench;
}

const SERVICE_CARDS: ServiceMarketingCard[] = [
  {
    id: 'repair',
    num: 'SVC-01',
    headingEn: 'Aircon Repair Pampanga & Troubleshooting',
    headingTaglish: 'Aircon Repair Pampanga & Troubleshooting',
    bodyEn:
      'Fast aircon repair in Pampanga for split-type inverter, window-type, floor-mounted, and commercial HVAC systems. Our technicians diagnose compressor faults, refrigerant leaks, clogged drain lines, fan motor wear, and PCB errors across San Matias, City of San Fernando, Bacolor, Guagua, San Simon, Apalit, and Candaba.',
    bodyTaglish:
      'Mabilis na aircon repair sa Pampanga para sa split-type inverter, window-type, floor-mounted, at commercial HVAC. Inaayos namin ang tagas sa freon, baradong drain, sira ng compressor, fan motor, at inverter PCB sa San Matias, City of San Fernando, Bacolor, Guagua, San Simon, Apalit, at Candaba.',
    targetAudience: 'residential',
    ctaEn: 'Inspect Repair Issues in 3D',
    ctaTaglish: 'Tingnan ang Repair Diagnostics sa 3D',
    icon: Wrench,
  },
  {
    id: 'cleaning',
    num: 'SVC-02',
    headingEn: 'Aircon Cleaning San Fernando Pampanga & Central Luzon',
    headingTaglish: 'Aircon Cleaning San Fernando Pampanga & Central Luzon',
    bodyEn:
      'Deep aircon cleaning in San Fernando Pampanga, Mexico, Sta. Ana, Arayat, and Magalang for evaporator coils, cross-flow blower wheels, intake filters, drain pans, and outdoor condensers. Routine aircon maintenance clears mold and road dust so units cool faster on lower kWh.',
    bodyTaglish:
      'Malalimang aircon cleaning sa San Fernando Pampanga, Mexico, Sta. Ana, Arayat, at Magalang para sa evaporator coil, blower wheel, filter, drain pan, at outdoor condenser. Nakakabawas ng alikabok at konsumo sa kuryente tuwing tag-init.',
    targetAudience: 'residential',
    ctaEn: 'Preview Dirty vs Clean Airflow in 3D',
    ctaTaglish: 'Ikumpara ang Linis vs Marumi sa 3D',
    icon: Droplets,
  },
  {
    id: 'equipment',
    num: 'SVC-03',
    headingEn: 'Inverter Aircon Units & Commercial HVAC Supply',
    headingTaglish: 'Inverter Aircon Units & Commercial HVAC Equipment',
    bodyEn:
      'Compare wall-mounted split inverters, compact window inverters, floor-mounted towers, 4-way ceiling cassettes, concealed ducted AHUs, and VRF HVAC clusters with room-size HP and BTU guidance built for Pampanga’s 36–40 °C summer peaks.',
    bodyTaglish:
      'Ikumpara ang wall-mounted split inverter, window inverter, floor-mounted, 4-way ceiling cassette, ducted AHU, at commercial VRF HVAC gamit ang tamang HP at BTU sizing para sa init ng Pampanga.',
    targetAudience: 'residential',
    ctaEn: 'Open 3D Unit Sizing & Comparison',
    ctaTaglish: 'Buksan ang 3D Sizing & Comparison',
    icon: Package,
  },
  {
    id: 'installation',
    num: 'SVC-04',
    headingEn: 'Split Type Aircon Installation Angeles City, Clark & Region III',
    headingTaglish: 'Split Type Aircon Installation Angeles City, Clark & Region III',
    bodyEn:
      'Engineered split type aircon installation in Angeles City, Mabalacat, Clark Freeport Zone, and Pampanga, alongside commercial HVAC ductwork and branch piping. Includes free site assessment, UV-insulated copper piping, dry-nitrogen leak testing, deep micron vacuuming, and workmanship warranty.',
    bodyTaglish:
      'Maayos na split type aircon installation sa Angeles City, Mabalacat, Clark Freeport Zone, at Pampanga, pati commercial HVAC ductwork. May libreng site assessment, makapal na copper pipe insulation, nitrogen leak test, deep vacuum, at warranty.',
    targetAudience: 'commercial',
    ctaEn: 'Walk Through 7-Step Installation in 3D',
    ctaTaglish: 'Tingnan ang 7-Step Installation sa 3D',
    icon: Building2,
  },
];

const PRIMARY_MARKETS = new Set([
  'City of San Fernando',
  'Angeles City',
  'Clark Freeport Zone',
  'San Matias',
]);

const SECONDARY_HUBS = new Set([
  'Mabalacat',
  'Mexico',
  'Guagua',
  'Bacolor',
  'Apalit',
  'Central Luzon Region III',
]);

export function HomeMarketingSections() {
  const language = useHVACStore((s) => s.language);
  const enterExperience = useHVACStore((s) => s.enterExperience);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);

  const [openFaqIds, setOpenFaqIds] = useState<Record<string, boolean>>(() => ({
    [HOME_FAQ_ITEMS[0].id]: true,
  }));

  const toggleFaq = (id: string) => {
    setOpenFaqIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const featureService = SERVICE_CARDS[0];
  const secondaryServices = SERVICE_CARDS.slice(1);
  const FeatureIcon = featureService.icon;
  const messengerUrl = `https://m.me/${siteConfig.contact.messengerPageId}`;

  return (
    <div className="relative z-10 bg-[#08172c] border-t border-cyan-300/15 text-slate-100">
      {/* 1. SERVICES — ASYMMETRIC FEATURE CARD (SVC-01) + 3-UP NARROWER ROW (SVC-02..04) */}
      <section
        id="services"
        aria-labelledby="home-services-heading"
        className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-16 sm:pt-24 sm:pb-20"
      >
        <div className="max-w-2xl space-y-2.5 mb-10 sm:mb-12">
          <p className="text-xs font-semibold tracking-wide text-[#67E8F9]">
            {tr('San Matias, Pampanga · Residential & Commercial Cooling', 'San Matias, Pampanga · Serbisyo sa Bahay at Negosyo')}
          </p>
          <h2
            id="home-services-heading"
            className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance"
          >
            {tr('Aircon Repair, Cleaning & Installation Services', 'Mga Serbisyong Aircon Repair, Cleaning & Installation')}
          </h2>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            {tr('From bedroom inverter aircons to multi-zone commercial HVAC plants across Central Luzon Region III—inspect every system in 3D or book a technician.', 'Mula inverter aircon sa kwarto hanggang commercial HVAC sa Central Luzon Region III—silipin bawat sistema sa 3D o magpa-schedule ng technician.')}
          </p>
        </div>

        {/* SVC-01 Wide Feature Card — Full Blueprint Detailing */}
        <article className="bp-card p-6 sm:p-9 lg:p-10 mb-6">
          <span className="bp-grid" aria-hidden="true" />
          <span className="bp-tick bp-tick--tl" aria-hidden="true" />
          <span className="bp-tick bp-tick--tr" aria-hidden="true" />
          <span className="bp-tick bp-tick--bl" aria-hidden="true" />
          <span className="bp-tick bp-tick--br" aria-hidden="true" />
          <span className="bp-ruler-edge" aria-hidden="true" />

          <div className="relative z-[1] grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end pr-2">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="bp-code">{featureService.num}</span>
                <FeatureIcon
                  className="w-7 h-7 sm:w-8 sm:h-8 text-[#67E8F9] lg:hidden"
                  strokeWidth={1}
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-display text-xl sm:text-2xl lg:text-[1.7rem] font-bold text-white leading-snug">
                {tr(featureService.headingEn, featureService.headingTaglish)}
              </h3>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
                {tr(featureService.bodyEn, featureService.bodyTaglish)}
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col lg:items-end justify-between gap-6">
              <FeatureIcon
                className="hidden lg:block w-10 h-10 text-[#67E8F9]"
                strokeWidth={1}
                aria-hidden="true"
              />
              <div className="w-full space-y-4 lg:flex lg:flex-col lg:items-end">
                <div className="bp-divider lg:w-4/5" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() =>
                    enterExperience(featureService.targetAudience, {
                      service: featureService.id,
                    })
                  }
                  className="bp-callout-btn group/btn text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <span>
                    {tr(featureService.ctaEn, featureService.ctaTaglish)}
                  </span>
                  <span className="inline-flex items-center gap-1 shrink-0" aria-hidden="true">
                    <span className="bp-leader-line" />
                    <ArrowRight
                      className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5"
                      strokeWidth={1}
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </article>

        {/* SVC-02..04 Tighter 3-Up Row — Lighter Blueprint Treatment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {secondaryServices.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.id}
                className="bp-card bp-card--compact flex flex-col justify-between p-5 sm:p-6"
              >
                <span className="bp-grid" aria-hidden="true" />
                <span className="bp-tick bp-tick--tl" aria-hidden="true" />
                <span className="bp-tick bp-tick--br" aria-hidden="true" />

                <div className="relative z-[1] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="bp-code">{card.num}</span>
                    <Icon
                      className="w-4.5 h-4.5 text-[#67E8F9]"
                      strokeWidth={1}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-white leading-snug">
                    {tr(card.headingEn, card.headingTaglish)}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {tr(card.bodyEn, card.bodyTaglish)}
                  </p>
                </div>

                <div className="relative z-[1] mt-5 space-y-3.5">
                  <div className="bp-divider" aria-hidden="true" />
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        enterExperience(card.targetAudience, { service: card.id })
                      }
                      className="bp-callout-btn group/btn text-xs font-semibold text-left cursor-pointer"
                    >
                      <span>{tr(card.ctaEn, card.ctaTaglish)}</span>
                      <span className="inline-flex items-center gap-1 shrink-0" aria-hidden="true">
                        <span className="bp-leader-line" />
                        <ArrowRight
                          className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5"
                          strokeWidth={1}
                        />
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 2. WHY APEX — CONTINUOUS HORIZONTAL DRAFTED PROCESS STRIP */}
      <section
        id="why-apex"
        aria-labelledby="home-why-apex-heading"
        className="border-t border-cyan-300/15 bg-[#0B1F3A]/85"
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 sm:mb-12">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold tracking-wide text-[#F97316]">
                {tr('Engineering Discipline', 'Maayos at Garantisadong Gawa')}
              </p>
              <h2
                id="home-why-apex-heading"
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance"
              >
                {tr('Why Pampanga Homes & Businesses Choose Apex Mechanical', 'Bakit Pinipili ang Apex Mechanical sa Pampanga')}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => enterExperience('residential')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[2px] bg-slate-900 border border-cyan-300/25 hover:border-[#22D3EE]/60 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 text-[#22D3EE]" strokeWidth={1.5} aria-hidden="true" />
                <span>{tr('Residential 3D')}</span>
              </button>
              <button
                type="button"
                onClick={() => enterExperience('commercial')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[2px] bg-slate-900 border border-cyan-300/25 hover:border-[#F97316]/60 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-[#F97316]" strokeWidth={1.5} aria-hidden="true" />
                <span>{tr('Commercial 3D')}</span>
              </button>
            </div>
          </div>

          <div className="relative">
            {/* Continuous horizontal drafted baseline across stations on desktop */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-[21px] left-0 right-0 h-px bg-cyan-300/35"
            >
              <span className="absolute left-0 -top-[3px] w-px h-[7px] bg-[#22D3EE]" />
              <span className="absolute right-0 -top-[3px] w-px h-[7px] bg-[#22D3EE]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6 lg:gap-0">
              {siteConfig.trustPoints.map((pt, idx) => (
                <div
                  key={pt.id}
                  className="relative border-l border-cyan-300/25 pl-4 lg:border-l-0 lg:pl-0 lg:px-6 lg:first:pl-0 lg:last:pr-0 lg:border-r lg:border-cyan-300/15 lg:last:border-r-0"
                >
                  {/* Station node header aligned to drafted baseline */}
                  <div className="flex items-center justify-between gap-2 pb-4 lg:pb-5">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="relative z-[1] w-2.5 h-2.5 border border-[#22D3EE] bg-[#0B1F3A] shrink-0"
                      />
                      <span className="bp-code bg-[#0B1F3A] pr-2">{`QA-0${idx + 1}`}</span>
                    </div>
                    <ShieldCheck
                      className="w-4.5 h-4.5 text-[#67E8F9] shrink-0 bg-[#0B1F3A]"
                      strokeWidth={1}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Connector tick between stations on desktop */}
                  {idx < siteConfig.trustPoints.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="hidden lg:block absolute top-[17px] -right-[4px] z-[2] w-2 h-2 border-t border-r border-[#67E8F9]/70 rotate-45 bg-transparent"
                    />
                  )}

                  <h3 className="font-display text-base font-bold text-white leading-snug">
                    {tr(pt.en, pt.taglish)}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {tr(pt.detailEn, pt.detailTaglish)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. THIN FULL-BLEED STATS BAND — VISUAL BREATHER */}
      {/* [PLACEHOLDER] Key metrics values in siteConfig.keyMetrics — replace with verified company figures */}
      <section
        aria-label={tr('Apex Mechanical Key Figures', 'Mahahalagang Datos ng Apex Mechanical')}
        className="w-full bg-[#061325] border-y border-cyan-300/20"
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-9 sm:py-11">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-7 md:gap-y-0">
            {siteConfig.keyMetrics.map((metric, idx) => (
              <div
                key={metric.id}
                className={`relative px-3 sm:px-6 text-center md:text-left ${
                  idx > 0 ? 'md:border-l md:border-cyan-300/20' : 'md:pl-0'
                }`}
              >
                {idx > 0 && (
                  <span
                    aria-hidden="true"
                    className="hidden md:block absolute -left-[3px] top-0 w-[5px] h-px bg-[#22D3EE]/70"
                  />
                )}
                {idx > 0 && (
                  <span
                    aria-hidden="true"
                    className="hidden md:block absolute -left-[3px] bottom-0 w-[5px] h-px bg-[#22D3EE]/70"
                  />
                )}
                <div className="font-mono-tabular text-2xl sm:text-3xl lg:text-[2.1rem] font-bold tracking-tight text-white">
                  {metric.value}
                </div>
                <div
                  style={{ fontFamily: 'var(--font-tech-mono)' }}
                  className="mt-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-[#67E8F9]"
                >
                  {tr(metric.labelEn, metric.labelTaglish)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SERVICE AREAS — FULL-BLEED BLUEPRINT FIELD + VARIED ANNOTATION LABELS */}
      <section
        id="service-areas"
        aria-labelledby="home-areas-heading"
        className="relative w-full overflow-hidden bg-[#0A1D37]"
      >
        <div className="bp-band-grid" aria-hidden="true" />

        <div className="relative z-[1] max-w-7xl mx-auto px-5 sm:px-10 py-16 sm:py-24">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-14">
            <div className="max-w-2xl space-y-2.5">
              <p className="text-xs font-semibold tracking-wide text-[#67E8F9]">
                {tr('Local Dispatch From San Matias', 'Mabilis na Dispatch Mula San Matias')}
              </p>
              <h2
                id="home-areas-heading"
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance"
              >
                {tr('Serving San Matias, Pampanga & Central Luzon Region III', 'Sakop na Lugar sa Pampanga at Central Luzon Region III')}
              </h2>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed max-w-md">
              {tr('Fast residential aircon maintenance, cleaning, repair, and commercial HVAC project coverage across every major town, city, and business zone:', 'Abot ang residential aircon cleaning, repair, installation, at commercial HVAC sa mga sumusunod na bayan at lungsod:')}
            </p>
          </div>

          <ul className="flex flex-wrap items-baseline gap-x-7 gap-y-5 sm:gap-x-11 sm:gap-y-6 border-y border-cyan-300/18 py-8 sm:py-10">
            {siteConfig.serviceAreas.map((area) => {
              const isPrimary = PRIMARY_MARKETS.has(area);
              const isSecondary = SECONDARY_HUBS.has(area);

              return (
                <li
                  key={area}
                  className={
                    isPrimary
                      ? 'relative inline-flex items-center gap-2.5 pr-2'
                      : isSecondary
                        ? 'relative inline-flex items-center gap-2 pr-1'
                        : 'relative inline-flex items-center gap-1.5'
                  }
                >
                  {isPrimary ? (
                    <span
                      aria-hidden="true"
                      className="inline-block w-2 h-2 border-t border-l border-[#67E8F9] shrink-0 -mt-2"
                    />
                  ) : isSecondary ? (
                    <span
                      aria-hidden="true"
                      className="inline-block w-2.5 h-px bg-[#22D3EE]/70 shrink-0"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="text-[11px] leading-none text-[#22D3EE]/70 select-none"
                      style={{ fontFamily: 'var(--font-tech-mono)' }}
                    >
                      +
                    </span>
                  )}

                  <span
                    className={
                      isPrimary
                        ? 'font-display text-base sm:text-xl font-bold tracking-tight text-white border-b border-[#22D3EE]/55 pb-0.5'
                        : isSecondary
                          ? 'font-display text-sm sm:text-base font-semibold text-slate-100'
                          : 'text-xs sm:text-sm font-medium text-slate-300'
                    }
                  >
                    {area}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 5. FAQ — NARROW CENTERED COLUMN ACCORDION DRAWING NOTES */}
      <section
        id="faq"
        aria-labelledby="home-faq-heading"
        className="border-t border-cyan-300/15 bg-[#071529]"
      >
        <div className="max-w-[52rem] mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-10 sm:mb-12">
            <p className="text-xs font-semibold tracking-wide text-[#67E8F9]">
              {tr('Common Questions', 'Mga Madalas Itanong')}
            </p>
            <h2
              id="home-faq-heading"
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance"
            >
              {tr('Frequently Asked Questions About Aircon Service in Pampanga', 'FAQ Tungkol sa Aircon Service sa Pampanga')}
            </h2>
          </div>

          <div className="border-t border-cyan-300/18">
            {HOME_FAQ_ITEMS.map((item, idx) => {
              const isOpen = Boolean(openFaqIds[item.id]);
              const btnId = `faq-btn-${item.id}`;
              const panelId = `faq-panel-${item.id}`;

              return (
                <article
                  key={item.id}
                  data-open={isOpen}
                  className="bp-faq-note"
                >
                  <span className="bp-tick bp-tick--tl" aria-hidden="true" />

                  <button
                    type="button"
                    id={btnId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleFaq(item.id)}
                    className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-4 cursor-pointer"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <span className="bp-code block">{`Q-${String(idx + 1).padStart(2, '0')}`}</span>
                      <h3 className="font-display text-base sm:text-[17px] font-bold text-white flex items-start gap-2.5 leading-snug">
                        <HelpCircle
                          className="w-4 h-4 text-[#67E8F9] shrink-0 mt-1"
                          strokeWidth={1}
                          aria-hidden="true"
                        />
                        <span>{getFaqQuestion(item, language)}</span>
                      </h3>
                    </div>

                    <span
                      aria-hidden="true"
                      className="mt-6 shrink-0 inline-flex items-center justify-center w-6 h-6 border border-cyan-300/30 text-[#67E8F9]"
                    >
                      {isOpen ? (
                        <Minus className="w-3.5 h-3.5" strokeWidth={1.25} />
                      ) : (
                        <Plus className="w-3.5 h-3.5" strokeWidth={1.25} />
                      )}
                    </span>
                  </button>

                  {/* Always kept in DOM for SEO crawlers; collapsed visually with CSS grid */}
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    aria-hidden={!isOpen}
                    className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 sm:px-6 pb-5 pt-0.5 pl-[2.95rem] sm:pl-[3.2rem]">
                        <div className="bp-divider mb-3" aria-hidden="true" />
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {getFaqAnswer(item, language)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. CONTACT & QUOTE CONVERSION SECTION */}
      <section
        id="contact"
        aria-labelledby="home-contact-heading"
        className="border-t border-cyan-300/15 bg-[#091930]"
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
          <div className="bp-card p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <span className="bp-tick bp-tick--tl" aria-hidden="true" />
            <span className="bp-tick bp-tick--tr" aria-hidden="true" />
            <span className="bp-tick bp-tick--bl" aria-hidden="true" />
            <span className="bp-tick bp-tick--br" aria-hidden="true" />

            <div className="relative z-[1] lg:col-span-7 space-y-3">
              <h2
                id="home-contact-heading"
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance"
              >
                {tr('Book a Free Aircon Site Assessment in Pampanga', 'Magpa-Schedule ng Libreng Aircon Site Assessment sa Pampanga')}
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
                {tr(`Need fast aircon repair, deep cleaning, or a new inverter or commercial HVAC quote? Our San Matias team responds within ${siteConfig.contact.responseHours}.`, `Kailangan ng aircon repair, cleaning, o bagong inverter / commercial HVAC quote? Sasagot ang San Matias team sa loob ng ${siteConfig.contact.responseHours}.`, `需要快速维修、深度清洗，或新的变频空调/商用暖通报价？我们的 San Matias 团队会在 ${siteConfig.contact.responseHours} 内回复。`)}
              </p>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-200">
                <a
                  href={siteConfig.contact.phoneHref}
                  className="inline-flex items-center gap-2 hover:text-[#67E8F9] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#67E8F9]" strokeWidth={1.25} aria-hidden="true" />
                  <span className="font-mono-tabular">{siteConfig.contact.phoneDisplay}</span>
                </a>
                <div className="inline-flex items-center gap-2 text-slate-200">
                  <Clock className="w-4 h-4 text-[#67E8F9]" strokeWidth={1.25} aria-hidden="true" />
                  <span>{siteConfig.contact.businessHours}</span>
                </div>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="inline-flex items-center gap-2 hover:text-[#67E8F9] transition-colors truncate"
                >
                  <Mail className="w-4 h-4 text-[#67E8F9] shrink-0" strokeWidth={1.25} aria-hidden="true" />
                  <span className="truncate">{siteConfig.contact.email}</span>
                </a>
                <a
                  href={messengerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-[#67E8F9] transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#67E8F9]" strokeWidth={1.25} aria-hidden="true" />
                  <span>Facebook Messenger</span>
                </a>
              </div>
            </div>

            <div className="relative z-[1] lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-stretch gap-3">
              <button
                type="button"
                onClick={() => setQuoteModalOpen(true)}
                aria-label="Open free aircon quote and site assessment form"
                className="px-6 py-3.5 rounded-[2px] bg-[#F97316] hover:bg-[#ea580c] text-white font-display font-bold text-sm sm:text-base transition-colors shadow-lg cursor-pointer"
              >
                {tr('Get a Free Quote', 'Humiling ng Libreng Quote')}
              </button>
              <a
                href={siteConfig.contact.phoneHref}
                className="px-6 py-3 rounded-[2px] bg-slate-900 hover:bg-slate-800 border border-cyan-300/25 text-center text-sm font-semibold text-slate-100 transition-colors"
              >
                {tr(`Call ${siteConfig.contact.phoneDisplay}`, `Tumawag: ${siteConfig.contact.phoneDisplay}`, `致电 ${siteConfig.contact.phoneDisplay}`)}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-cyan-300/15 bg-[#071325]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1">
              <p className="font-display text-base font-bold text-white">{siteConfig.brand.name}</p>
              <p className="text-xs text-slate-400">{tr(siteConfig.brand.taglineEn, siteConfig.brand.taglineTaglish)}</p>
            </div>

            <nav aria-label={tr('Social and contact links', 'Social at contact links')} className="flex flex-wrap items-center gap-2.5">
              <a
                href={siteConfig.social.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white hover:border-[#67E8F9]/60 transition-colors"
              >
                <Facebook className="w-4 h-4 text-[#67E8F9]" strokeWidth={1.5} aria-hidden="true" />
                Facebook
              </a>
              <a
                href={siteConfig.social.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white hover:border-[#67E8F9]/60 transition-colors"
              >
                <TikTokIcon className="w-4 h-4 text-[#67E8F9]" />
                TikTok
              </a>
              <a
                href={`https://wa.me/${siteConfig.contact.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white hover:border-[#67E8F9]/60 transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#67E8F9]" />
                WhatsApp
              </a>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/80 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white hover:border-[#67E8F9]/60 transition-colors"
              >
                <Mail className="w-4 h-4 text-[#67E8F9]" strokeWidth={1.5} aria-hidden="true" />
                {tr('Email', 'Email', '电子邮件')}
              </a>
            </nav>
          </div>

          <div className="mt-7 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-slate-400">
            <p>© {new Date().getFullYear()} {siteConfig.brand.name}</p>
            <p>{tr(siteConfig.pricingDisclaimer.en, siteConfig.pricingDisclaimer.taglish)}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

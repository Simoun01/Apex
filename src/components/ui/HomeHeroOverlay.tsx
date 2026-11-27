import { Building2, ChevronDown, Home } from 'lucide-react';
import { siteConfig } from '../../config/siteConfig';
import { useHVACStore } from '../../store/useHVACStore';
import { tr } from '../../i18n/tr';

let chunksPreloaded = false;
function preloadStage2Chunks() {
  if (chunksPreloaded) return;
  chunksPreloaded = true;
  void import('../scene/RoomShell');
  void import('../scene/ExperienceUnits');
  void import('../scene/DuctedAHU');
  void import('../scene/CommercialVRFOutdoor');
  void import('../scene/PipingAndDuctRoute');
  void import('../scene/AirflowParticles');
}

export function HomeHeroOverlay() {
  const stage = useHVACStore((s) => s.stage);
  const language = useHVACStore((s) => s.language);
  const enterExperience = useHVACStore((s) => s.enterExperience);
  const setHoveredHomeBuilding = useHVACStore((s) => s.setHoveredHomeBuilding);

  if (stage === 'experience') return null;

  const isEntering = stage === 'entering';

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex flex-col justify-between transition-opacity duration-300 ${
        isEntering ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Top Headline & Tagline Scrim:
          1) Soft vertical dusk gradient from top canvas edge fading out around rooflines
          2) Subtle radial darkening behind the text block itself for >= 4.5:1 WCAG AA contrast */}
      <div className="relative w-full pt-3 sm:pt-5 pb-14 px-4 sm:px-8 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[135%] bg-gradient-to-b from-[#050e1c]/95 via-[#071427]/78 via-60% to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[125%]"
          style={{
            background:
              'radial-gradient(ellipse 74% 78% at 50% 34%, rgba(4, 11, 24, 0.88) 0%, rgba(4, 11, 24, 0.56) 56%, rgba(4, 11, 24, 0) 100%)',
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto space-y-1.5 sm:space-y-2">
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#67e8f9]">
            {tr(siteConfig.brand.taglineEn, siteConfig.brand.taglineTaglish)}
          </p>

          <h2
            className="font-display font-extrabold tracking-tight text-white text-balance mx-auto max-w-3xl leading-[1.1]"
            style={{ fontSize: 'clamp(1.75rem, 3.85vw, 3.15rem)' }}
          >
            {tr('Aircon Repair, Cleaning & Installation in Pampanga', 'Aircon Repair, Cleaning & Installation sa Pampanga')}
          </h2>

          <p className="text-xs sm:text-sm md:text-[15px] text-slate-100 max-w-[45rem] mx-auto leading-relaxed font-normal">
            {tr('Explore a Filipino home split-type setup or a two-storey commercial HVAC building in real-time 3D before booking your free Pampanga site assessment.', 'Silipin ang 3D residential split-type aircon o commercial HVAC building bago magpa-book ng libreng site assessment sa Pampanga.')}
          </p>
        </div>
      </div>

      {/* Bottom Glowing Dual CTA Bar + Scroll-Down Affordance */}
      <div className="w-full bg-gradient-to-t from-[#050e1c]/95 via-[#071427]/72 to-transparent pt-12 pb-4 sm:pb-6 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-3.5">
          <div className="pointer-events-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 sm:gap-5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                preloadStage2Chunks();
                enterExperience('residential');
              }}
              onMouseEnter={() => {
                preloadStage2Chunks();
                setHoveredHomeBuilding('residential');
              }}
              onMouseLeave={() => setHoveredHomeBuilding(null)}
              onFocus={() => {
                preloadStage2Chunks();
                setHoveredHomeBuilding('residential');
              }}
              onBlur={() => setHoveredHomeBuilding(null)}
              aria-label="Explore Residential split-type and home aircon systems in interactive 3D"
              className="cta-glow-cyan cta-shimmer inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#0891b2] via-[#06b6d4] to-[#22D3EE] border border-[#a5f3fc]/80 text-[#04182b] font-display font-bold text-sm sm:text-base whitespace-nowrap shrink-0 min-h-[48px] cursor-pointer"
            >
              <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>✦ Explore Residential in 3D</span>
            </button>

            <button
              type="button"
              onClick={() => {
                preloadStage2Chunks();
                enterExperience('commercial');
              }}
              onMouseEnter={() => {
                preloadStage2Chunks();
                setHoveredHomeBuilding('commercial');
              }}
              onMouseLeave={() => setHoveredHomeBuilding(null)}
              onFocus={() => {
                preloadStage2Chunks();
                setHoveredHomeBuilding('commercial');
              }}
              onBlur={() => setHoveredHomeBuilding(null)}
              aria-label="Explore Commercial ceiling cassette, ducted AHU, and VRF HVAC systems in interactive 3D"
              className="cta-glow-amber cta-shimmer inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#c2410c] via-[#ea580c] to-[#F97316] border border-[#fdba74]/80 text-white font-display font-bold text-sm sm:text-base whitespace-nowrap shrink-0 min-h-[48px] cursor-pointer"
            >
              <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>✦ Explore Commercial in 3D</span>
            </button>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-300 text-center">
            {tr('Drag street scene to orbit · Scroll page down for details · Ctrl/Pinch to zoom', 'I-drag ang 3D street para umikot · Mag-scroll pababa para sa detalye · Ctrl/Pinch para mag-zoom')}
          </p>

          {/* Visible Scroll-Down Affordance */}
          <a
            href="#services"
            aria-label="Scroll down to see aircon services and Pampanga service areas"
            className="pointer-events-auto group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-[#67e8f9] hover:text-white transition-colors"
          >
            <span>
              {tr('See services & service areas', 'Tingnan ang mga serbisyo at lugar')}
            </span>
            <ChevronDown
              className="w-4 h-4 animate-bounce text-[#22D3EE] group-hover:text-white"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </div>
  );
}

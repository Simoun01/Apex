/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * APEX MECHANICAL & COOLING — DEVELOPER & OWNER GUIDE
 * ============================================================================
 * 1. CONTACT INFO, SERVICE AREAS & TRUST STRIP:
 *    Edit `src/config/siteConfig.ts` to update your phone number, Messenger
 *    username, WhatsApp/Viber numbers, business email, response window,
 *    Pampanga service area towns, and "Why Apex" trust points.
 *
 * 2. EQUIPMENT PRICES, SYMPTOMS, PARTS & INSTALLATION COPY:
 *    Edit `src/data/hvacData.ts` to adjust indicative Philippine peso (₱)
 *    estimates, equipment specs, symptom diagnostics, or EN / Taglish labels.
 *
 * 3. CONNECTING A REAL LEAD / QUOTE BACKEND:
 *    Edit `src/services/leadService.ts` -> `submitLead(payload)` to POST form
 *    submissions to Formspree, Google Apps Script, Supabase, or your CRM
 *    (currently stores to `localStorage` and generates prefilled Messenger,
 *    WhatsApp, Viber, and email deep links).
 * ============================================================================
 */

import { Component, ErrorInfo, ReactNode, Suspense, lazy, useEffect } from 'react';
import { DesktopHud } from './components/ui/DesktopHud';
import { HomeHeroOverlay } from './components/ui/HomeHeroOverlay';
import { HomeMarketingSections } from './components/ui/HomeMarketingSections';
import { MobileSheet } from './components/ui/MobileSheet';
import { Non3DFallback } from './components/ui/Non3DFallback';
import { ProductShowroomHero } from './components/ui/ProductShowroomHero';
import { htmlLang, tr } from './i18n/tr';
import { usePartGuide } from './store/usePartGuide';
import { QuoteModal } from './components/ui/QuoteModal';
import { TopBar } from './components/ui/TopBar';
import { parseRouteFromLocation, useHVACStore } from './store/useHVACStore';

const HVACCanvas = lazy(() =>
  import('./components/scene/HVACCanvas').then((m) => ({ default: m.HVACCanvas })),
);
const PartGuideCard = lazy(() => import('./components/ui/PartGuideCard'));

interface ErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D Viewport fallback triggered:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <Non3DFallback />;
    }
    return this.props.children;
  }
}

function SceneLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1F3A] text-slate-200 gap-3">
      <div className="w-10 h-10 rounded-xl border-2 border-[#22D3EE]/30 border-t-[#22D3EE] animate-spin" />
      <p className="text-xs font-medium tracking-wide text-slate-300">
        Loading 3D Aircon Environment…
      </p>
    </div>
  );
}

function OnboardingHint() {
  const hasInteracted = useHVACStore((s) => s.hasInteracted);
  const non3dMode = useHVACStore((s) => s.non3dMode);
  const hudCollapsed = useHVACStore((s) => s.hudCollapsed);
  const language = useHVACStore((s) => s.language);

  if (hasInteracted || non3dMode || hudCollapsed) return null;

  return (
    <div
      aria-live="polite"
      lang={htmlLang(language)}
      className="pointer-events-none fixed top-[70px] left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-[#0B1F3A]/90 border border-[#22D3EE]/40 text-[11px] sm:text-xs font-medium text-slate-100 shadow-lg whitespace-nowrap"
    >
      {tr(
        'Drag to rotate · Pinch or scroll to zoom · Tap + markers to inspect',
        'I-drag para umikot · Pinch/scroll para mag-zoom · Pindutin ang + markers',
      )}
    </div>
  );
}

function SemanticSeoContent() {
  return (
    <section aria-label="Apex Mechanical and Cooling Aircon Services" className="sr-only">
      <h1>Aircon Repair, Cleaning &amp; Installation in Pampanga</h1>
      <p>
        Apex Mechanical &amp; Cooling in San Matias delivers trusted residential and commercial
        aircon repair, aircon cleaning, split type and inverter aircon installation, and routine
        maintenance across Pampanga province and Central Luzon Region III, including City of San
        Fernando, Angeles City, Mabalacat, Clark Freeport Zone, Mexico, Sta. Ana, Arayat, Magalang,
        Bacolor, Guagua, San Simon, Apalit, and Candaba.
      </p>

      <h2>Aircon Services in Pampanga &amp; Central Luzon</h2>

      <article>
        <h3>Aircon Repair Pampanga &amp; Troubleshooting</h3>
        <p>
          Fast aircon repair in Pampanga for split-type inverter, window-type, floor-mounted,
          ceiling cassette, and commercial HVAC systems. Our technicians diagnose compressor faults,
          refrigerant leaks, clogged drain lines, fan motor wear, and PCB errors across San Matias,
          City of San Fernando, Bacolor, Guagua, San Simon, Apalit, and Candaba.
        </p>
      </article>

      <article>
        <h3>Aircon Cleaning San Fernando Pampanga &amp; Nearby Towns</h3>
        <p>
          Deep aircon cleaning in San Fernando Pampanga, Mexico, Sta. Ana, Arayat, and Magalang for
          evaporator coils, cross-flow blower wheels, intake filters, drain pans, and outdoor
          condensers. Regular aircon maintenance keeps indoor air fresh and cuts electricity costs in
          hot, humid Pampanga weather.
        </p>
      </article>

      <article>
        <h3>Split Type &amp; Inverter Aircon Units for Sale</h3>
        <p>
          Compare energy-saving wall-mounted split inverters, window inverters, floor-mounted
          towers, 4-way ceiling cassettes, concealed ducted units, and commercial HVAC VRF systems
          with transparent room-size HP and BTU estimates for homes and businesses across Pampanga
          and Central Luzon Region III.
        </p>
      </article>

      <article>
        <h3>Aircon Installation Angeles City, Clark &amp; Central Luzon</h3>
        <p>
          Engineered split type aircon installation in Angeles City, Mabalacat, Clark Freeport Zone,
          and across Pampanga, plus commercial HVAC ductwork installation. Every job includes a
          free site assessment, BTU load sizing, insulated copper linesets, nitrogen pressure leak
          testing, deep micron vacuuming, and workmanship warranty handover.
        </p>
      </article>
    </section>
  );
}

export default function App() {
  const stage = useHVACStore((s) => s.stage);
  const transitionVeil = useHVACStore((s) => s.transitionVeil);
  const non3dMode = useHVACStore((s) => s.non3dMode);
  const language = useHVACStore((s) => s.language);
  const applyPopStateRoute = useHVACStore((s) => s.applyPopStateRoute);
  const partGuideOpen = usePartGuide((s) => s.open !== null);

  useEffect(() => {
    document.documentElement.lang = htmlLang(language);
  }, [language]);

  useEffect(() => {
    document.body.style.overflow = stage === 'home' ? 'auto' : 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [stage]);

  useEffect(() => {
    const onPopState = () => {
      applyPopStateRoute(parseRouteFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyPopStateRoute]);

  useEffect(() => {
    const url = window.location.origin + window.location.pathname;
    const ogImgUrl = `${window.location.origin}/og-image.svg`;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', url);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', url);
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.setAttribute('content', ogImgUrl);
    const twImg = document.querySelector('meta[name="twitter:image"]');
    if (twImg) twImg.setAttribute('content', ogImgUrl);
  }, []);

  const isLockedStage = stage === 'entering' || stage === 'experience';

  return (
    <div
      className={
        isLockedStage
          ? 'relative w-screen h-screen overflow-hidden bg-[#0B1F3A] select-none'
          : 'relative w-full min-h-screen bg-[#0B1F3A]'
      }
    >
      <TopBar />

      <main className="relative w-full">
        {/* Product showroom hero sits above the 3D Residential / Commercial street scene */}
        {stage === 'home' && <ProductShowroomHero />}

        <div
          id="explore-3d"
          className={
            isLockedStage
              ? 'relative w-full h-[calc(100vh-58px)]'
              : 'relative w-full h-[calc(100vh-58px)] min-h-[540px]'
          }
        >
          {stage === 'experience' && <SemanticSeoContent />}

          {non3dMode ? (
            <Non3DFallback />
          ) : (
            <CanvasErrorBoundary>
              <Suspense fallback={<SceneLoader />}>
                <HVACCanvas />
              </Suspense>

              {stage !== 'experience' && <HomeHeroOverlay />}

              {stage === 'experience' && (
                <>
                  <OnboardingHint />
                  <DesktopHud />
                  <MobileSheet />
                </>
              )}
            </CanvasErrorBoundary>
          )}

          {/* Smooth cross-dissolve curtain during final doorway pass-through */}
          <div
            aria-hidden="true"
            style={{ opacity: transitionVeil }}
            className="pointer-events-none fixed inset-0 z-40 bg-[#0B1F3A] transition-opacity duration-300"
          />
        </div>

        {stage === 'home' && <HomeMarketingSections />}
      </main>

      <QuoteModal />

      {/* "How it works" card for any clicked aircon part (experience + showroom) */}
      {partGuideOpen && (
        <Suspense fallback={null}>
          <PartGuideCard />
        </Suspense>
      )}
    </div>
  );
}

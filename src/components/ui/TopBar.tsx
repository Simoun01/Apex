import { useState } from 'react';
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  Building2,
  Home,
  Phone,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { siteConfig } from '../../config/siteConfig';
import type { Language } from '../../data/hvacData';
import { tr } from '../../i18n/tr';
import { QualityTier, useHVACStore } from '../../store/useHVACStore';
import { ApexLogo } from './ApexLogo';

const LANGS: { id: Language; label: string; lang: string; title: string }[] = [
  { id: 'en', label: 'EN', lang: 'en', title: 'English' },
  { id: 'zh', label: '中文', lang: 'zh-Hans', title: '简体中文 (Simplified Chinese)' },
];

export function TopBar() {
  const stage = useHVACStore((s) => s.stage);
  const audience = useHVACStore((s) => s.audience);
  const language = useHVACStore((s) => s.language);
  const quality = useHVACStore((s) => s.quality);
  const reduceMotion = useHVACStore((s) => s.reduceMotion);
  const non3dMode = useHVACStore((s) => s.non3dMode);
  const whyApexOpen = useHVACStore((s) => s.whyApexOpen);

  const backToHome = useHVACStore((s) => s.backToHome);
  const setAudience = useHVACStore((s) => s.setAudience);
  const setLanguage = useHVACStore((s) => s.setLanguage);
  const setQuality = useHVACStore((s) => s.setQuality);
  const setReduceMotion = useHVACStore((s) => s.setReduceMotion);
  const setNon3dMode = useHVACStore((s) => s.setNon3dMode);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const setWhyApexOpen = useHVACStore((s) => s.setWhyApexOpen);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const isHome = stage === 'home';

  return (
    <header
      className={`${
        isHome ? 'sticky top-0' : 'relative'
      } z-30 flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 bg-[#0B1F3A]/92 backdrop-blur-md border-b border-white/12`}
    >
      {/* Zone 1: Brand Mark */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
        {!isHome ? (
          <button
            type="button"
            onClick={() => backToHome()}
            aria-label="Back to Home exterior 3D view"
            className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-[2px] bg-slate-900/90 border border-white/15 text-xs font-semibold text-slate-100 hover:text-white hover:border-[#22D3EE]/50 transition-colors whitespace-nowrap shrink-0 min-h-[36px] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#22D3EE]" aria-hidden="true" />
            <span className="hidden sm:inline">
              {tr('Back to Home', 'Balik sa Home')}
            </span>
          </button>
        ) : (
          <ApexLogo
            size={34}
            className="shrink-0 text-slate-200 -my-0.5"
            label="Apex Mechanical & Cooling logo"
          />
        )}
        <div className={isHome ? 'min-w-0 leading-none' : 'hidden sm:block min-w-0 leading-none'}>
          <div className="font-display text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap truncate leading-tight">
            {siteConfig.brand.name}
          </div>
          <div className="hidden md:block text-[11px] text-slate-300 whitespace-nowrap mt-0.5 leading-tight">
            {tr(siteConfig.brand.taglineEn, siteConfig.brand.taglineTaglish)}
          </div>
        </div>
      </div>

      {/* Zone 2: Stage-aware Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {isHome ? (
          <nav
            aria-label="Home page sections"
            className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-300 mr-1"
          >
            {/* Mirrors the Apex site menu, with one deliberate swap: where that
                site has "Portfolio", this build has no portfolio, so the slot
                goes to the Residential & Commercial 3D buildings instead. */}
            <a href="#top" className="text-white transition-colors whitespace-nowrap">
              {tr('Home', 'Home')}
            </a>
            <a href="#why-apex" className="hover:text-white transition-colors whitespace-nowrap">
              {tr('About Us', 'Tungkol Sa Amin')}
            </a>
            <a href="#products" className="hover:text-white transition-colors whitespace-nowrap">
              {tr('Products', 'Produkto')}
            </a>
            <a href="#services" className="hover:text-white transition-colors whitespace-nowrap">
              {tr('Services', 'Serbisyo')}
            </a>
            <a href="#explore-3d" className="hover:text-white transition-colors whitespace-nowrap">
              {tr('Residential & Commercial', 'Bahay at Negosyo', '住宅与商用')}
            </a>
            <a href="#contact" className="hover:text-white transition-colors whitespace-nowrap">
              {tr('Contact Us', 'Kontakin Kami')}
            </a>
          </nav>
        ) : (
          <>
            {/* Audience Switch */}
            <div
              role="group"
              aria-label="Property type"
              className="flex items-center p-0.5 rounded-lg bg-slate-900/90 border border-white/12"
            >
              <button
                type="button"
                onClick={() => setAudience('residential')}
                aria-label="Switch to Residential 3D aircon scene"
                aria-pressed={audience === 'residential'}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px] cursor-pointer ${
                  audience === 'residential'
                    ? 'bg-[#22D3EE] text-[#0B1F3A]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Home className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tr('Residential')}</span>
              </button>
              <button
                type="button"
                onClick={() => setAudience('commercial')}
                aria-label="Switch to Commercial 3D HVAC scene"
                aria-pressed={audience === 'commercial'}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px] cursor-pointer ${
                  audience === 'commercial'
                    ? 'bg-[#22D3EE] text-[#0B1F3A]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tr('Commercial')}</span>
              </button>
            </div>
          </>
        )}

        {/* Language switch: English / 中文 */}
        <div
          role="radiogroup"
          aria-label="Language"
          className="hidden sm:inline-flex items-center p-0.5 rounded-lg bg-slate-900/90 border border-white/12 shrink-0 min-h-[36px]"
        >
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={language === l.id}
              lang={l.lang}
              title={l.title}
              onClick={() => setLanguage(l.id)}
              className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                language === l.id ? 'bg-[#22D3EE]/20 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Why Apex / Pampanga Area Drawer Trigger (Stage 2) */}
        {!isHome && (
          <button
            type="button"
            onClick={() => setWhyApexOpen(!whyApexOpen)}
            aria-expanded={whyApexOpen}
            aria-label="Toggle Why Apex Mechanical and Service Areas panel"
            className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[36px] cursor-pointer ${
              whyApexOpen
                ? 'bg-[#22D3EE]/20 border-[#22D3EE]/60 text-[#22D3EE]'
                : 'bg-slate-900/90 border-white/12 text-slate-200 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{tr('Why Apex & Area', 'Why Apex & Lugar')}</span>
          </button>
        )}

        {/* Settings / Accessibility Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Display quality and accessibility settings"
            aria-expanded={settingsOpen}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900/90 border border-white/12 text-slate-200 hover:text-white hover:border-[#22D3EE]/50 transition-colors cursor-pointer"
          >
            {settingsOpen ? <X className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
          </button>

          {settingsOpen && (
            <div className="absolute right-0 mt-2 w-64 p-3.5 rounded-xl bg-[#0B1F3A] border border-white/15 shadow-2xl z-50 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#22D3EE]" />
                  {tr('Scene & Accessibility')}
                </span>
              </div>

              {/* Language on mobile */}
              <div className="sm:hidden flex items-center justify-between">
                <span className="text-xs text-slate-300">{tr('Language', 'Wika', '语言')}</span>
                <div role="radiogroup" aria-label="Language" className="inline-flex p-0.5 rounded bg-slate-800 border border-white/15">
                  {LANGS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      role="radio"
                      aria-checked={language === l.id}
                      lang={l.lang}
                      onClick={() => setLanguage(l.id)}
                      className={`px-2 py-0.5 rounded text-xs ${language === l.id ? 'bg-[#22D3EE]/25 text-white' : 'text-slate-300'}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Tier */}
              <div className="space-y-1.5">
                <span className="block text-[11px] text-slate-300">3D Graphics Quality</span>
                <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-900 border border-white/10" role="group" aria-label="3D Graphics Quality">
                  {(['low', 'medium', 'high'] as QualityTier[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      aria-label={`Set 3D graphics quality to ${q}`}
                      aria-pressed={quality === q}
                      onClick={() => setQuality(q)}
                      className={`py-1 rounded text-[11px] font-medium capitalize ${
                        quality === q
                          ? 'bg-[#22D3EE] text-[#0B1F3A] font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] leading-tight text-slate-400">
                  {quality === 'low'
                    ? '0.65× res · Shadows off · Simplified LOD'
                    : quality === 'medium'
                      ? '1× res · 512px shadows · Physical glass'
                      : 'Up to 2× res · 2K shadows · Reflections & bloom'}
                </p>
              </div>

              {/* Reduce Motion */}
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-xs text-slate-200">{tr('Reduce Motion')}</span>
                <input
                  type="checkbox"
                  aria-label="Reduce 3D motion and animations"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                  className="w-4 h-4 accent-[#22D3EE]"
                />
              </label>

              {/* Non-3D Accessible View */}
              <button
                type="button"
                aria-label={non3dMode ? 'Switch to 3D interactive view' : 'Switch to accessible 2D list view'}
                onClick={() => {
                  setNon3dMode(!non3dMode);
                  setSettingsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-medium text-white transition-colors"
              >
                <Accessibility className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>{non3dMode ? 'Switch to 3D View' : 'Switch to 2D List View'}</span>
              </button>

              {!isHome && (
                <button
                  type="button"
                  aria-label="Toggle Why Apex Mechanical and Service Areas panel"
                  onClick={() => {
                    setWhyApexOpen(!whyApexOpen);
                    setSettingsOpen(false);
                  }}
                  className="lg:hidden w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-medium text-white transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>{tr('Why Apex & Service Area')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Phone + Primary Action CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={siteConfig.contact.phoneHref}
          aria-label={`Call Apex Mechanical & Cooling at ${siteConfig.contact.phoneDisplay}`}
          className="inline-flex items-center justify-center gap-1.5 px-2.5 h-9 rounded-lg bg-slate-900/90 border border-white/15 text-slate-200 hover:text-[#22D3EE] transition-colors text-xs font-mono-tabular whitespace-nowrap shrink-0"
        >
          <Phone className="w-3.5 h-3.5 text-[#22D3EE]" aria-hidden="true" />
          <span className="hidden xl:inline">{siteConfig.contact.phoneDisplay}</span>
        </a>
        <button
          type="button"
          onClick={() => setQuoteModalOpen(true)}
          aria-label="Open free aircon quote and site assessment form"
          className={
            isHome
              ? 'inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-b from-[#3f93f7] to-[#1d6fe0] hover:from-[#5aa3f9] hover:to-[#2a7cea] border border-[#5aa3f9]/70 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[38px] shadow-lg cursor-pointer'
              : 'px-3 sm:px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#ea580c] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[38px] shadow-md cursor-pointer'
          }
        >
          {isHome ? tr('Book a Service', 'Mag-book ng Serbisyo', '预约服务') : tr('Get a Free Quote', 'Libreng Quote')}
          {isHome && <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

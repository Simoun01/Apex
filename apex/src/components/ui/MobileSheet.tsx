import {
  ChevronUp,
  Eye,
  Flame,
  Hammer,
  Layers,
  MapPin,
  Package,
  Phone,
  Power,
  RotateCcw,
  Sparkles,
  Wind,
  Wrench,
  X,
} from 'lucide-react';
import { siteConfig } from '../../config/siteConfig';
import { ServiceMode } from '../../data/hvacData';
import { MobileSheetSnap, useHVACStore } from '../../store/useHVACStore';
import { ServiceContextPanel } from './ServiceContextPanel';

const SERVICE_TABS: { id: ServiceMode; label: string; Icon: typeof Wrench }[] = [
  { id: 'repair', label: 'Repair', Icon: Wrench },
  { id: 'cleaning', label: 'Cleaning', Icon: Sparkles },
  { id: 'equipment', label: 'Units', Icon: Package },
  { id: 'installation', label: 'Install', Icon: Hammer },
];

export function MobileSheet() {
  const service = useHVACStore((s) => s.service);
  const language = useHVACStore((s) => s.language);
  const cameraPreset = useHVACStore((s) => s.cameraPreset);
  const exploded = useHVACStore((s) => s.exploded);
  const xray = useHVACStore((s) => s.xray);
  const airflowOn = useHVACStore((s) => s.airflowOn);
  const heatMapOn = useHVACStore((s) => s.heatMapOn);
  const powerOn = useHVACStore((s) => s.powerOn);
  const mobileSheetSnap = useHVACStore((s) => s.mobileSheetSnap);
  const whyApexOpen = useHVACStore((s) => s.whyApexOpen);

  const setService = useHVACStore((s) => s.setService);
  const setCameraPreset = useHVACStore((s) => s.setCameraPreset);
  const setExploded = useHVACStore((s) => s.setExploded);
  const setXray = useHVACStore((s) => s.setXray);
  const setAirflowOn = useHVACStore((s) => s.setAirflowOn);
  const setHeatMapOn = useHVACStore((s) => s.setHeatMapOn);
  const setPowerOn = useHVACStore((s) => s.setPowerOn);
  const resetView = useHVACStore((s) => s.resetView);
  const setMobileSheetSnap = useHVACStore((s) => s.setMobileSheetSnap);
  const setWhyApexOpen = useHVACStore((s) => s.setWhyApexOpen);

  const isEn = language === 'en';

  const cycleSnap = () => {
    const next: Record<MobileSheetSnap, MobileSheetSnap> = {
      peek: 'half',
      half: 'full',
      full: 'peek',
    };
    setMobileSheetSnap(next[mobileSheetSnap]);
  };

  const sheetHeightClass =
    mobileSheetSnap === 'full'
      ? 'h-[78vh]'
      : mobileSheetSnap === 'half'
        ? 'h-[45vh]'
        : 'h-[118px]';

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-20 flex flex-col pointer-events-none">
      {/* Why Apex Modal Sheet on Mobile */}
      {whyApexOpen && (
        <div className="pointer-events-auto mx-3 mb-2 p-3.5 rounded-2xl bg-[#0B1F3A]/95 border border-[#22D3EE]/40 shadow-2xl space-y-2.5 max-h-[55vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-white">
              {isEn ? 'Why Apex & Service Area' : 'Bakit Apex & Lugar'}
            </h3>
            <button
              type="button"
              onClick={() => setWhyApexOpen(false)}
              aria-label="Close Why Apex"
              className="p-2 rounded-lg bg-white/10 text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {siteConfig.trustPoints.map((tp) => (
              <div key={tp.id} className="text-xs">
                <div className="font-semibold text-[#22D3EE]">{isEn ? tp.en : tp.taglish}</div>
                <div className="text-slate-300 text-[11px]">
                  {isEn ? tp.detailEn : tp.detailTaglish}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-white/10 text-[11px] text-slate-300">
            <div className="flex items-center gap-1 font-semibold text-white mb-1">
              <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Pampanga Service Areas</span>
            </div>
            {siteConfig.serviceAreas.join(' · ')}
          </div>
        </div>
      )}

      {/* Horizontally Scrollable 44px Touch Toolbar */}
      <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar">
        {(['overview', 'indoor', 'outdoor', 'piping'] as const).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setCameraPreset(preset)}
            aria-label={`Move camera to ${preset} view`}
            aria-pressed={cameraPreset === preset}
            className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold capitalize whitespace-nowrap shrink-0 border ${
              cameraPreset === preset
                ? 'bg-[#22D3EE] text-[#0B1F3A] border-[#22D3EE]'
                : 'bg-[#0B1F3A]/92 text-slate-200 border-white/15'
            }`}
          >
            {preset}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setExploded(!exploded)}
          aria-label="Toggle exploded view"
          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 border ${
            exploded
              ? 'bg-[#22D3EE] text-[#0B1F3A] border-[#22D3EE]'
              : 'bg-[#0B1F3A]/92 text-slate-200 border-white/15'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Explode</span>
        </button>

        <button
          type="button"
          onClick={() => setXray(!xray)}
          aria-label="Toggle X-Ray view"
          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 border ${
            xray
              ? 'bg-[#22D3EE] text-[#0B1F3A] border-[#22D3EE]'
              : 'bg-[#0B1F3A]/92 text-slate-200 border-white/15'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>X-Ray</span>
        </button>

        <button
          type="button"
          onClick={() => setAirflowOn(!airflowOn)}
          aria-label="Toggle airflow"
          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 border ${
            airflowOn
              ? 'bg-[#22D3EE] text-[#0B1F3A] border-[#22D3EE]'
              : 'bg-[#0B1F3A]/92 text-slate-200 border-white/15'
          }`}
        >
          <Wind className="w-4 h-4" />
          <span>Airflow</span>
        </button>

        <button
          type="button"
          onClick={() => setHeatMapOn(!heatMapOn)}
          aria-label="Toggle thermal heatmap"
          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 border ${
            heatMapOn
              ? 'bg-[#F97316] text-white border-[#F97316]'
              : 'bg-[#0B1F3A]/92 text-slate-200 border-white/15'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Heat</span>
        </button>

        <button
          type="button"
          onClick={() => setPowerOn(!powerOn)}
          aria-label="Toggle AC power"
          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 border ${
            powerOn
              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50'
              : 'bg-[#0B1F3A]/92 text-slate-300 border-white/15'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{powerOn ? 'On' : 'Off'}</span>
        </button>

        <button
          type="button"
          onClick={resetView}
          aria-label="Reset 3D view"
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 border bg-[#0B1F3A]/92 text-slate-200 border-white/15"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Mobile Bottom Sheet */}
      <div
        className={`pointer-events-auto flex flex-col bg-[#0B1F3A]/96 border-t border-white/15 rounded-t-2xl shadow-2xl transition-all duration-200 ${sheetHeightClass}`}
      >
        {/* Drag / Snap Handle Bar */}
        <button
          type="button"
          onClick={cycleSnap}
          aria-label="Expand or collapse service drawer"
          className="w-full flex items-center justify-between px-4 py-2 border-b border-white/10 min-h-[44px]"
        >
          <div className="flex items-center gap-2">
            <span className="w-8 h-1 rounded-full bg-slate-500 inline-block" />
            <span className="text-xs font-semibold text-slate-200">
              {mobileSheetSnap === 'peek'
                ? isEn
                  ? 'Tap to explore services & details'
                  : 'Pindutin para makita ang detalye'
                : isEn
                  ? 'Tap to resize panel'
                  : 'Baguhin ang laki ng panel'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={siteConfig.contact.phoneHref}
              onClick={(e) => e.stopPropagation()}
              aria-label="Call Apex Mechanical & Cooling"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-white/15 text-[11px] font-semibold text-[#22D3EE]"
            >
              <Phone className="w-3 h-3" />
              <span>Call</span>
            </a>
            <ChevronUp
              className={`w-4 h-4 text-[#22D3EE] transition-transform ${
                mobileSheetSnap === 'full' ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* 4 Service Tabs */}
        <div className="grid grid-cols-4 gap-1 px-3 py-1.5 border-b border-white/10 shrink-0" role="tablist" aria-label="Aircon Services">
          {SERVICE_TABS.map(({ id, label, Icon }) => {
            const active = service === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Open ${label} service panel`}
                onClick={() => {
                  setService(id);
                  if (mobileSheetSnap === 'peek') setMobileSheetSnap('half');
                }}
                className={`min-h-[44px] flex items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#22D3EE] text-[#0B1F3A]'
                    : 'bg-slate-900/70 text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Service Content */}
        {mobileSheetSnap !== 'peek' && (
          <div className="flex-1 overflow-y-auto p-4 apex-scroll">
            <ServiceContextPanel />
          </div>
        )}
      </div>
    </div>
  );
}

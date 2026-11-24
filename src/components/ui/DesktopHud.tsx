import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  Flame,
  Hammer,
  Layers,
  MapPin,
  Package,
  Power,
  RotateCcw,
  Sparkles,
  Wind,
  Wrench,
  X,
} from 'lucide-react';
import { siteConfig } from '../../config/siteConfig';
import { CameraPreset, ServiceMode } from '../../data/hvacData';
import { FanSpeed, useHVACStore } from '../../store/useHVACStore';
import { ServiceContextPanel } from './ServiceContextPanel';
import { tr } from '../../i18n/tr';

const SERVICE_ITEMS: {
  id: ServiceMode;
  num: string;
  en: string;
  taglish: string;
  Icon: typeof Wrench;
}[] = [
  { id: 'repair', num: '01', en: 'Service & Repair', taglish: 'Service & Repair', Icon: Wrench },
  { id: 'cleaning', num: '02', en: 'Cleaning', taglish: 'Linis / Cleaning', Icon: Sparkles },
  { id: 'equipment', num: '03', en: 'Equipment Sale', taglish: 'Benta ng Units', Icon: Package },
  { id: 'installation', num: '04', en: 'Full Installation', taglish: 'Full Installation', Icon: Hammer },
];

const CAMERA_PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'indoor', label: 'Indoor' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'piping', label: 'Piping' },
  { id: 'top', label: 'Top Plan' },
];

export function DesktopHud() {
  const service = useHVACStore((s) => s.service);
  const language = useHVACStore((s) => s.language);
  const cameraPreset = useHVACStore((s) => s.cameraPreset);
  const exploded = useHVACStore((s) => s.exploded);
  const xray = useHVACStore((s) => s.xray);
  const airflowOn = useHVACStore((s) => s.airflowOn);
  const fanSpeed = useHVACStore((s) => s.fanSpeed);
  const powerOn = useHVACStore((s) => s.powerOn);
  const heatMapOn = useHVACStore((s) => s.heatMapOn);
  const hudCollapsed = useHVACStore((s) => s.hudCollapsed);
  const whyApexOpen = useHVACStore((s) => s.whyApexOpen);

  const setService = useHVACStore((s) => s.setService);
  const setCameraPreset = useHVACStore((s) => s.setCameraPreset);
  const setExploded = useHVACStore((s) => s.setExploded);
  const setXray = useHVACStore((s) => s.setXray);
  const setAirflowOn = useHVACStore((s) => s.setAirflowOn);
  const setFanSpeed = useHVACStore((s) => s.setFanSpeed);
  const setPowerOn = useHVACStore((s) => s.setPowerOn);
  const setHeatMapOn = useHVACStore((s) => s.setHeatMapOn);
  const resetView = useHVACStore((s) => s.resetView);
  const setHudCollapsed = useHVACStore((s) => s.setHudCollapsed);
  const setWhyApexOpen = useHVACStore((s) => s.setWhyApexOpen);

  const [drawerOpen, setDrawerOpen] = useState(true);
  const isEn = language === 'en';

  return (
    <div className="hidden md:block pointer-events-none fixed inset-0 top-[58px] z-20">
      {/* Left Rail: Service Mode Selector */}
      {!hudCollapsed && (
        <aside
          aria-label="Aircon Services"
          className="pointer-events-auto absolute left-4 top-4 w-52 p-2 rounded-2xl bg-[#0B1F3A]/88 border border-white/12 shadow-xl space-y-1"
        >
          <div className="px-2.5 py-1 text-[11px] font-medium text-slate-300">
            {tr('Explore Services', 'Piliin ang Serbisyo')}
          </div>
          {SERVICE_ITEMS.map(({ id, num, en, taglish, Icon }) => {
            const active = service === id;
            return (
              <button
                key={id}
                type="button"
                aria-label={`Select service ${num}: ${en}`}
                aria-pressed={active}
                onClick={() => {
                  setService(id);
                  setDrawerOpen(true);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#22D3EE] text-[#0B1F3A]'
                    : 'text-slate-200 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {num}. {tr(en, taglish)}
                </span>
              </button>
            );
          })}
        </aside>
      )}

      {/* Why Apex & Pampanga Service Area Overlay Card (on demand) */}
      {whyApexOpen && (
        <section
          aria-label="Why Apex Mechanical and Service Areas"
          className="pointer-events-auto absolute left-4 top-[236px] w-72 p-4 rounded-2xl bg-[#0B1F3A]/95 border border-[#22D3EE]/35 shadow-2xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-white">
              {tr('Why Apex Mechanical', 'Bakit Apex Mechanical?')}
            </h3>
            <button
              type="button"
              onClick={() => setWhyApexOpen(false)}
              aria-label="Close Why Apex panel"
              className="p-1 rounded hover:bg-white/10 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-2">
            {siteConfig.trustPoints.map((tp) => (
              <li key={tp.id} className="text-xs">
                <div className="font-semibold text-[#22D3EE]">
                  {tr(tp.en, tp.taglish)}
                </div>
                <div className="text-slate-300 text-[11px]">
                  {tr(tp.detailEn, tp.detailTaglish)}
                </div>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-white mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
              <span>{tr('Pampanga Service Areas', 'Lugar na Sineserbisyuhan')}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {siteConfig.serviceAreas.join(' · ')}
            </p>
          </div>
        </section>
      )}

      {/* Right Contextual Drawer */}
      {!hudCollapsed && (
        <aside
          aria-label="Service details and part inspector"
          className="pointer-events-auto absolute right-4 top-4 bottom-24 flex items-start"
        >
          {!drawerOpen ? (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Expand service details drawer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B1F3A]/92 border border-white/15 text-xs font-semibold text-white shadow-xl hover:border-[#22D3EE]/50"
            >
              <ChevronRight className="w-4 h-4 rotate-180 text-[#22D3EE]" />
              <span>{tr('Details', 'Detalye')}</span>
            </button>
          ) : (
            <div className="w-[328px] max-h-full flex flex-col rounded-2xl bg-[#0B1F3A]/90 border border-white/12 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                <span className="text-xs font-semibold text-slate-200">
                  {tr('Interactive Inspector', 'Interactive Inspector')}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Collapse inspector drawer"
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto apex-scroll">
                <ServiceContextPanel />
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Bottom-Center Dock: Camera Presets + 3D Manipulation Tools */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 max-w-[94vw]">
        <button
          type="button"
          onClick={() => setHudCollapsed(!hudCollapsed)}
          aria-label={hudCollapsed ? 'Show 3D viewer controls' : 'Hide 3D viewer controls'}
          aria-expanded={!hudCollapsed}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0B1F3A]/92 border border-white/15 text-[11px] font-medium text-slate-200 hover:text-white shadow"
        >
          {hudCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{tr('Show Controls')}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{tr('Hide Controls')}</span>
            </>
          )}
        </button>

        {!hudCollapsed && (
          <div className="flex items-center flex-wrap justify-center gap-1.5 px-3 py-2 rounded-2xl bg-[#0B1F3A]/92 border border-white/12 shadow-2xl">
            {/* Camera Presets */}
            <div className="flex items-center gap-1 pr-2 border-r border-white/12" role="group" aria-label="3D Camera Presets">
              {CAMERA_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCameraPreset(p.id)}
                  aria-label={`Move camera to ${p.label} view`}
                  aria-pressed={cameraPreset === p.id}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    cameraPreset === p.id
                      ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/50'
                      : 'text-slate-300 hover:text-white hover:bg-white/8'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Inspection Toggles */}
            <button
              type="button"
              onClick={() => setExploded(!exploded)}
              title="Toggle exploded view"
              aria-label="Toggle exploded aircon unit layer view"
              aria-pressed={exploded}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                exploded
                  ? 'bg-[#22D3EE] text-[#0B1F3A] font-semibold'
                  : 'text-slate-200 hover:bg-white/8'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{tr('Exploded')}</span>
            </button>

            <button
              type="button"
              onClick={() => setXray(!xray)}
              title="Toggle X-Ray cutaway casing"
              aria-label="Toggle X-Ray transparent unit casing"
              aria-pressed={xray}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                xray
                  ? 'bg-[#22D3EE] text-[#0B1F3A] font-semibold'
                  : 'text-slate-200 hover:bg-white/8'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{tr('X-Ray')}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAirflowOn(!airflowOn)}
                title="Toggle 3D airflow particles"
                aria-label="Toggle 3D cooling airflow visualization"
                aria-pressed={airflowOn}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  airflowOn
                    ? 'bg-[#22D3EE] text-[#0B1F3A] font-semibold'
                    : 'text-slate-200 hover:bg-white/8'
                }`}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>{tr('Airflow')}</span>
              </button>
              {airflowOn && (
                <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-white/10" role="group" aria-label="Fan speed">
                  {(['low', 'med', 'high'] as FanSpeed[]).map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setFanSpeed(spd)}
                      aria-label={`Set airflow fan speed to ${spd}`}
                      aria-pressed={fanSpeed === spd}
                      className={`px-1.5 py-1 rounded text-[10px] font-semibold uppercase ${
                        fanSpeed === spd
                          ? 'bg-[#22D3EE]/30 text-[#22D3EE]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setHeatMapOn(!heatMapOn)}
              title="Toggle thermal room heat-map"
              aria-label="Toggle room temperature heat-map overlay"
              aria-pressed={heatMapOn}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                heatMapOn
                  ? 'bg-[#F97316] text-white font-semibold'
                  : 'text-slate-200 hover:bg-white/8'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{tr('Heat Map')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPowerOn(!powerOn)}
              title="Toggle AC Power ON/OFF"
              aria-label={powerOn ? 'Turn aircon unit off' : 'Turn aircon unit on'}
              aria-pressed={powerOn}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                powerOn
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                  : 'bg-slate-800 border border-white/10 text-slate-300'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{powerOn ? 'AC On' : 'AC Off'}</span>
            </button>

            <button
              type="button"
              onClick={resetView}
              title="Reset camera and view"
              aria-label="Reset 3D camera and view to default overview"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-white/8 transition-colors whitespace-nowrap border-l border-white/12 pl-3"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{tr('Reset View')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

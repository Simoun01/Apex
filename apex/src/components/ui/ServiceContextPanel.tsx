import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Droplets,
  Play,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { siteConfig } from '../../config/siteConfig';
import {
  EQUIPMENT_CATALOG,
  HVAC_PARTS,
  INSTALLATION_STEPS,
  SYMPTOM_ITEMS,
} from '../../data/hvacData';
import { computeRecommendedCapacity, useHVACStore } from '../../store/useHVACStore';

export function ServiceContextPanel() {
  const audience = useHVACStore((s) => s.audience);
  const service = useHVACStore((s) => s.service);
  const language = useHVACStore((s) => s.language);
  const selectedPart = useHVACStore((s) => s.selectedPart);
  const selectedSymptom = useHVACStore((s) => s.selectedSymptom);
  const cleaningBeforeAfter = useHVACStore((s) => s.cleaningBeforeAfter);
  const dirtyAirflowMode = useHVACStore((s) => s.dirtyAirflowMode);
  const selectedEquipmentId = useHVACStore((s) => s.selectedEquipmentId);
  const compareMode = useHVACStore((s) => s.compareMode);
  const compareEquipmentIds = useHVACStore((s) => s.compareEquipmentIds);
  const roomCalc = useHVACStore((s) => s.roomCalc);
  const installStep = useHVACStore((s) => s.installStep);

  const setSelectedPart = useHVACStore((s) => s.setSelectedPart);
  const setSelectedSymptom = useHVACStore((s) => s.setSelectedSymptom);
  const setCleaningBeforeAfter = useHVACStore((s) => s.setCleaningBeforeAfter);
  const setDirtyAirflowMode = useHVACStore((s) => s.setDirtyAirflowMode);
  const setSelectedEquipmentId = useHVACStore((s) => s.setSelectedEquipmentId);
  const setCompareMode = useHVACStore((s) => s.setCompareMode);
  const toggleCompareEquipment = useHVACStore((s) => s.toggleCompareEquipment);
  const updateRoomCalc = useHVACStore((s) => s.updateRoomCalc);
  const setInstallStep = useHVACStore((s) => s.setInstallStep);
  const setCameraPreset = useHVACStore((s) => s.setCameraPreset);
  const flyToPart = useHVACStore((s) => s.flyToPart);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);

  const isEn = language === 'en';
  const partInfo = selectedPart ? HVAC_PARTS[selectedPart] : null;

  const audienceEquipment = EQUIPMENT_CATALOG.filter((e) => e.audience === audience);
  const selectedEquip =
    audienceEquipment.find((e) => e.id === selectedEquipmentId) ?? audienceEquipment[0];
  const comparedItems = audienceEquipment.filter((e) => compareEquipmentIds.includes(e.id));
  const capacityEst = computeRecommendedCapacity(roomCalc);

  const activeSymptomObj = SYMPTOM_ITEMS.find((s) => s.id === selectedSymptom);
  const activeInstallStep =
    INSTALLATION_STEPS.find((st) => st.step === installStep) ?? INSTALLATION_STEPS[0];

  const handleSymptomClick = (symId: string) => {
    const next = selectedSymptom === symId ? null : symId;
    setSelectedSymptom(next);
    if (next) {
      const sym = SYMPTOM_ITEMS.find((s) => s.id === next);
      if (sym) {
        const focusPart = HVAC_PARTS[sym.focusPartId];
        const pos =
          audience === 'residential'
            ? focusPart?.positionResidential
            : focusPart?.positionCommercial;
        if (focusPart && pos) {
          const [x, y, z] = pos;
          const [ox, oy, oz] = focusPart.cameraOffset;
          flyToPart([x + ox, y + oy, z + oz], [x, y, z]);
          setSelectedPart(sym.focusPartId);
        }
      }
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      {/* Compact Selected 3D Part Inspector Card */}
      {partInfo && (
        <div className="p-3 rounded-xl bg-slate-900/95 border border-[#22D3EE]/50 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium text-[#22D3EE]">
                {isEn ? 'Selected Component' : 'Napiling Piyesa'}
              </div>
              <h3 className="font-display text-sm font-bold text-white">
                {isEn ? partInfo.nameEn : partInfo.nameTaglish}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPart(null)}
              aria-label="Close part details"
              className="p-1 rounded hover:bg-white/10 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {isEn ? partInfo.whatItDoesEn : partInfo.whatItDoesTaglish}
          </p>
          <div className="pt-1.5 border-t border-white/10">
            <div className="text-[11px] font-semibold text-[#F97316] mb-0.5">
              {isEn ? 'Common Issues in Pampanga Climate' : 'Madalas na Problema sa Init at Alinsangan'}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isEn ? partInfo.tropicalIssuesEn : partInfo.tropicalIssuesTaglish}
            </p>
          </div>
        </div>
      )}

      {/* SERVICE 1: REPAIR & DIAGNOSTICS */}
      {service === 'repair' && (
        <div className="space-y-3.5">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              {isEn ? '01. Service & Repair' : '01. Serbisyo at Repair'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isEn
                ? 'Tap a symptom below to locate likely fault parts in 3D.'
                : 'Pindutin ang sintomas para makita sa 3D ang posibleng may sira.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#F97316]" />
              <span>{isEn ? 'Symptom Finder' : 'Hanapin ang Sintomas'}</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {SYMPTOM_ITEMS.map((sym) => {
                const active = selectedSymptom === sym.id;
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => handleSymptomClick(sym.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors min-h-[40px] ${
                      active
                        ? 'bg-[#F97316]/20 border-[#F97316] text-white'
                        : 'bg-slate-900/75 border-white/10 text-slate-200 hover:border-[#22D3EE]/50'
                    }`}
                  >
                    {isEn ? sym.labelEn : sym.labelTaglish}
                  </button>
                );
              })}
            </div>
          </div>

          {activeSymptomObj && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-[#F97316]/45 space-y-2">
              <div className="text-xs font-semibold text-[#F97316]">
                {isEn ? 'Likely Causes' : 'Mga Posibleng Dahilan'}
              </div>
              <ul className="space-y-1 text-xs text-slate-200 list-disc pl-4">
                {(isEn ? activeSymptomObj.causesEn : activeSymptomObj.causesTaglish).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <div className="pt-1.5 border-t border-white/10 text-xs text-[#22D3EE]">
                <strong>{isEn ? 'Recommended:' : 'Rekomendasyon:'}</strong>{' '}
                {isEn ? activeSymptomObj.actionEn : activeSymptomObj.actionTaglish}
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10 space-y-1.5 text-xs text-slate-300">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{isEn ? 'Included Diagnostics' : 'Kasama sa Check-up'}</span>
            </div>
            <p>
              {isEn
                ? 'Refrigerant pressure & superheat/subcooling check, supply-return ΔT test, capacitor & ampere draw reading, and preventive maintenance plans.'
                : 'Pressure at freon check, lamig temperature drop test, capacitor at ampere reading, at preventive maintenance.'}
            </p>
          </div>
        </div>
      )}

      {/* SERVICE 2: CLEANING */}
      {service === 'cleaning' && (
        <div className="space-y-3.5">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              {isEn ? '02. Deep AC Cleaning' : '02. Deep AC Cleaning'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isEn
                ? 'Drag the slider to compare clogged vs. clean coils, filter, and blower.'
                : 'I-drag ang slider para makita ang marumi vs. malinis na coil, filter, at blower.'}
            </p>
          </div>

          {/* Before / After Slider */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-white/12 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#F97316]">
                {isEn ? 'Dirty / Dusty' : 'Marumi / Barado'}
              </span>
              <span className="font-mono-tabular text-[#22D3EE]">
                {Math.round(cleaningBeforeAfter * 100)}% {isEn ? 'Clean' : 'Linis'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={cleaningBeforeAfter}
              onChange={(e) => setCleaningBeforeAfter(parseFloat(e.target.value))}
              aria-label="Before and after coil and filter cleaning comparison"
              className="w-full accent-[#22D3EE] cursor-pointer"
            />

            {/* Dirty vs Clean Airflow Toggle */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="text-[11px] text-slate-300">
                {isEn ? '3D Airflow Simulation' : '3D Airflow Simulation'}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDirtyAirflowMode(true)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors min-h-[38px] ${
                    dirtyAirflowMode
                      ? 'bg-[#F97316]/20 border-[#F97316] text-white'
                      : 'bg-slate-800/80 border-white/10 text-slate-300'
                  }`}
                >
                  {isEn ? 'Weak / Dirty' : 'Mahina / Barado'}
                </button>
                <button
                  type="button"
                  onClick={() => setDirtyAirflowMode(false)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors min-h-[38px] ${
                    !dirtyAirflowMode
                      ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-[#22D3EE]'
                      : 'bg-slate-800/80 border-white/10 text-slate-300'
                  }`}
                >
                  {isEn ? 'Strong / Clean' : 'Malakas / Malinis'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10 space-y-2 text-xs text-slate-300">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{isEn ? 'Cleaning Frequency Guide' : 'Gaano Kadalas Magpalinis?'}</span>
            </div>
            <p>
              {isEn
                ? 'Residential: every 3–6 months. Commercial or dusty roadside locations in Pampanga: every 1–3 months to protect indoor air quality and keep inverter kWh low.'
                : 'Bahay: tuwing 3–6 months. Commercial o malapit sa maalikabok na kalsada: tuwing 1–3 months para malinis ang hangin at tipid sa kuryente.'}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#22D3EE]">
              <Droplets className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isEn
                  ? 'Includes coil wash, blower wheel, drain line flush & outdoor condenser.'
                  : 'Kasama ang evaporator, blower wheel, drain flush, at outdoor condenser.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE 3: EQUIPMENT SALE */}
      {service === 'equipment' && (
        <div className="space-y-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-white">
                {isEn ? '03. Equipment Sale' : '03. Benta ng Aircon Units'}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {isEn
                  ? 'Select a unit to inspect in 3D or compare models.'
                  : 'Pumili ng unit para makita sa 3D o i-compare.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCompareMode(!compareMode)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium shrink-0 ${
                compareMode
                  ? 'bg-[#22D3EE] text-[#0B1F3A] border-[#22D3EE]'
                  : 'bg-slate-900 border-white/15 text-slate-200 hover:border-[#22D3EE]/50'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>{compareMode ? 'Exit Compare' : 'Compare'}</span>
            </button>
          </div>

          {/* Equipment Selector Cards */}
          <div className="space-y-1.5">
            {audienceEquipment.map((item) => {
              const isSelected = selectedEquip.id === item.id;
              const isCompared = compareEquipmentIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isSelected && !compareMode
                      ? 'bg-[#22D3EE]/12 border-[#22D3EE]'
                      : 'bg-slate-900/75 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEquipmentId(item.id);
                        if (compareMode) toggleCompareEquipment(item.id);
                      }}
                      className="text-left flex-1 min-w-0"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        {isEn ? item.nameEn : item.nameTaglish}
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono-tabular mt-0.5">
                        {item.capacityRange} · {item.inverter ? 'Inverter' : 'Fixed-Speed'}
                      </div>
                      <div className="text-[11px] text-[#22D3EE] font-mono-tabular mt-0.5">
                        {item.priceEstimatePhp}
                      </div>
                    </button>
                    {compareMode && (
                      <button
                        type="button"
                        onClick={() => toggleCompareEquipment(item.id)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold shrink-0 ${
                          isCompared
                            ? 'bg-[#22D3EE] text-[#0B1F3A]'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {isCompared ? 'Picked' : '+ Add'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Side-by-Side Comparison Table when Compare Mode active */}
          {compareMode && comparedItems.length >= 2 && (
            <div className="p-2.5 rounded-xl bg-slate-900/95 border border-[#22D3EE]/40 overflow-x-auto apex-scroll">
              <div className="text-[11px] font-semibold text-[#22D3EE] mb-2">
                {isEn ? 'Side-by-Side Comparison (Estimates)' : 'Paghahambing ng Units (Estimate)'}
              </div>
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-300">
                    <th className="py-1 pr-2 font-medium">Spec</th>
                    {comparedItems.map((c) => (
                      <th key={c.id} className="py-1 px-1.5 font-semibold text-white">
                        {c.nameEn.split(' ').slice(0, 2).join(' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-slate-200 font-mono-tabular">
                  <tr>
                    <td className="py-1.5 pr-2 text-slate-400 font-sans">Capacity</td>
                    {comparedItems.map((c) => (
                      <td key={c.id} className="py-1.5 px-1.5">
                        {c.hpMin}–{c.hpMax} HP
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-slate-400 font-sans">Inverter</td>
                    {comparedItems.map((c) => (
                      <td key={c.id} className="py-1.5 px-1.5">
                        {c.inverter ? 'Yes' : 'No'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-slate-400 font-sans">Noise</td>
                    {comparedItems.map((c) => (
                      <td key={c.id} className="py-1.5 px-1.5">
                        {c.noiseDba}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-slate-400 font-sans">Est. Price</td>
                    {comparedItems.map((c) => (
                      <td key={c.id} className="py-1.5 px-1.5 text-[#22D3EE]">
                        {c.priceEstimatePhp.split('(')[0].trim()}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Room Size -> Recommended HP/BTU Helper */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-white/12 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Calculator className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>
                {isEn ? 'Room Size → HP/BTU Helper (Estimate)' : 'Room Size → HP/BTU Calculator (Estimate)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="space-y-1">
                <span className="text-[11px] text-slate-300">Floor Area (sqm)</span>
                <input
                  type="number"
                  min={8}
                  max={400}
                  value={roomCalc.sqm}
                  onChange={(e) =>
                    updateRoomCalc({ sqm: Math.max(8, Number(e.target.value) || 10) })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/15 text-white font-mono-tabular"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-slate-300">Sun Exposure</span>
                <select
                  value={roomCalc.sunExposure}
                  onChange={(e) =>
                    updateRoomCalc({
                      sunExposure: e.target.value as 'shaded' | 'normal' | 'direct_sun',
                    })
                  }
                  className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/15 text-white text-xs"
                >
                  <option value="shaded">Shaded</option>
                  <option value="normal">Normal</option>
                  <option value="direct_sun">Direct Sun (West)</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-slate-300">Occupants</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={roomCalc.occupants}
                  onChange={(e) =>
                    updateRoomCalc({ occupants: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/15 text-white font-mono-tabular"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-slate-300">Heat Appliances</span>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={roomCalc.appliances}
                  onChange={(e) =>
                    updateRoomCalc({ appliances: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/15 text-white font-mono-tabular"
                />
              </label>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-300">
                {isEn ? 'Suggested Capacity (Est.):' : 'Estimate na HP/BTU:'}
              </span>
              <span className="font-mono-tabular font-bold text-[#22D3EE]">
                {capacityEst.recommendedHp} HP · {capacityEst.estimatedBtu.toLocaleString()} BTU
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            {isEn ? siteConfig.pricingDisclaimer.en : siteConfig.pricingDisclaimer.taglish}
          </p>

          <button
            type="button"
            onClick={() => setQuoteModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-lg bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-semibold transition-colors min-h-[42px]"
          >
            {isEn
              ? `Request a Quote for ${selectedEquip.nameEn}`
              : `Magpa-Quote para sa ${selectedEquip.nameTaglish}`}
          </button>
        </div>
      )}

      {/* SERVICE 4: FULL INSTALLATION */}
      {service === 'installation' && (
        <div className="space-y-3.5">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              {isEn ? '04. Full Installation' : '04. Kumpletong Pagkabit'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isEn
                ? 'Step through our 7-stage engineered installation workflow.'
                : 'Sundan ang 7 hakbang ng maayos na pagkabit sa 3D.'}
            </p>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-[#22D3EE]/40">
            <button
              type="button"
              disabled={installStep <= 1}
              onClick={() => {
                const next = Math.max(1, installStep - 1);
                setInstallStep(next);
                const s = INSTALLATION_STEPS.find((x) => x.step === next);
                if (s) setCameraPreset(s.cameraPreset);
              }}
              aria-label="Previous installation step"
              className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-white hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="text-[11px] font-mono-tabular text-[#22D3EE]">
                Step {activeInstallStep.step} of 7
              </div>
              <div className="text-xs font-semibold text-white">
                {isEn ? activeInstallStep.titleEn : activeInstallStep.titleTaglish}
              </div>
            </div>
            <button
              type="button"
              disabled={installStep >= 7}
              onClick={() => {
                const next = Math.min(7, installStep + 1);
                setInstallStep(next);
                const s = INSTALLATION_STEPS.find((x) => x.step === next);
                if (s) setCameraPreset(s.cameraPreset);
              }}
              aria-label="Next installation step"
              className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-white hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-2 text-xs text-slate-200">
            <p className="leading-relaxed">
              {isEn ? activeInstallStep.summaryEn : activeInstallStep.summaryTaglish}
            </p>
            {activeInstallStep.readings && (
              <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-white/10">
                {activeInstallStep.readings.map((r) => (
                  <div key={r.label} className="flex items-center justify-between font-mono-tabular">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="text-[#22D3EE] font-semibold">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
            {installStep === 3 && (
              <button
                type="button"
                onClick={() => {
                  setInstallStep(2);
                  setTimeout(() => setInstallStep(3), 50);
                  setCameraPreset('piping');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#22D3EE]/15 border border-[#22D3EE]/50 text-[#22D3EE] text-xs font-medium mt-1"
              >
                <Play className="w-3 h-3" />
                <span>{isEn ? 'Replay Pipe Route Draw' : 'Ulitin ang Pipe Route'}</span>
              </button>
            )}
          </div>

          {/* All 7 Steps Compact List */}
          <div className="space-y-1">
            {INSTALLATION_STEPS.map((st) => {
              const done = st.step <= installStep;
              const current = st.step === installStep;
              return (
                <button
                  key={st.step}
                  type="button"
                  onClick={() => {
                    setInstallStep(st.step);
                    setCameraPreset(st.cameraPreset);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                    current
                      ? 'bg-[#22D3EE]/20 border border-[#22D3EE]/60 text-white font-semibold'
                      : done
                        ? 'bg-slate-900/60 text-slate-200 hover:bg-slate-800/80'
                        : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      done ? 'text-[#22D3EE]' : 'text-slate-600'
                    }`}
                  />
                  <span className="truncate">
                    {st.step}. {isEn ? st.titleEn : st.titleTaglish}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { MapPin, Phone, ShieldCheck } from 'lucide-react';
import { siteConfig } from '../../config/siteConfig';
import { ServiceMode } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';
import { ServiceContextPanel } from './ServiceContextPanel';

export function Non3DFallback() {
  const service = useHVACStore((s) => s.service);
  const language = useHVACStore((s) => s.language);
  const setService = useHVACStore((s) => s.setService);
  const setNon3dMode = useHVACStore((s) => s.setNon3dMode);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);

  const isEn = language === 'en';

  return (
    <div className="fixed inset-0 top-[58px] z-10 overflow-y-auto bg-[#0B1F3A] px-4 py-6 sm:px-8 apex-scroll">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-white/12">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              {siteConfig.brand.name} — {isEn ? 'Accessible Service Directory' : 'Direktoryo ng Serbisyo'}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              {isEn
                ? 'Explore all four aircon services, calculate recommended HP, and request a free site assessment in Pampanga.'
                : 'Tingnan ang apat na serbisyo ng aircon, mag-compute ng tamang HP, at mag-request ng libreng site assessment sa Pampanga.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setNon3dMode(false)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 border border-white/15 text-xs font-semibold text-[#22D3EE] hover:bg-slate-700"
            >
              {isEn ? 'Try 3D View' : 'Buksan ang 3D View'}
            </button>
            <button
              type="button"
              onClick={() => setQuoteModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-bold"
            >
              {isEn ? 'Get a Free Quote' : 'Libreng Quote'}
            </button>
          </div>
        </div>

        {/* Service Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { id: 'repair', label: '01. Service & Repair' },
              { id: 'cleaning', label: '02. Deep Cleaning' },
              { id: 'equipment', label: '03. Equipment Sale' },
              { id: 'installation', label: '04. Full Installation' },
            ] as { id: ServiceMode; label: string }[]
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setService(s.id)}
              className={`py-3 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                service === s.id
                  ? 'bg-[#22D3EE] text-[#0B1F3A] border-[#22D3EE]'
                  : 'bg-slate-900/80 text-slate-200 border-white/12 hover:border-[#22D3EE]/50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/75 border border-white/12">
            <ServiceContextPanel />
          </div>

          <aside className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900/75 border border-white/12 space-y-3">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-[#22D3EE]" />
                <span>{isEn ? 'Why Apex Mechanical' : 'Bakit Apex Mechanical?'}</span>
              </div>
              <ul className="space-y-2.5 text-xs">
                {siteConfig.trustPoints.map((tp) => (
                  <li key={tp.id}>
                    <div className="font-semibold text-[#22D3EE]">
                      {isEn ? tp.en : tp.taglish}
                    </div>
                    <div className="text-slate-300">
                      {isEn ? tp.detailEn : tp.detailTaglish}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/75 border border-white/12 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-white">
                <MapPin className="w-4 h-4 text-[#F97316]" />
                <span>Pampanga Service Areas</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {siteConfig.serviceAreas.join(' · ')}
              </p>
              <a
                href={siteConfig.contact.phoneHref}
                className="inline-flex items-center gap-2 mt-2 px-3.5 py-2 rounded-lg bg-[#F97316] text-white font-semibold"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call {siteConfig.contact.phoneDisplay}</span>
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

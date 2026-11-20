import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  X,
} from 'lucide-react';
import { siteConfig } from '../../config/siteConfig';
import { Audience, SYMPTOM_ITEMS, ServiceMode } from '../../data/hvacData';
import {
  ContactChannel,
  LeadPayload,
  buildChannelDeepLinks,
  submitLead,
  validatePHMobile,
} from '../../services/leadService';
import {
  computeRecommendedCapacity,
  getEquipmentById,
  useHVACStore,
} from '../../store/useHVACStore';

export function QuoteModal() {
  const open = useHVACStore((s) => s.quoteModalOpen);
  const setOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const storeAudience = useHVACStore((s) => s.audience);
  const storeService = useHVACStore((s) => s.service);
  const selectedEquipmentId = useHVACStore((s) => s.selectedEquipmentId);
  const compareMode = useHVACStore((s) => s.compareMode);
  const compareEquipmentIds = useHVACStore((s) => s.compareEquipmentIds);
  const selectedSymptom = useHVACStore((s) => s.selectedSymptom);
  const roomCalc = useHVACStore((s) => s.roomCalc);
  const language = useHVACStore((s) => s.language);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [audience, setAudience] = useState<Audience>(storeAudience);
  const [service, setService] = useState<ServiceMode>(storeService);
  const [town, setTown] = useState<string>(siteConfig.serviceAreas[0]);
  const [barangay, setBarangay] = useState('');
  const [propertyType, setPropertyType] = useState('House / Bedroom');
  const [roomSizeOrUnits, setRoomSizeOrUnits] = useState(`${roomCalc.sqm} sqm · 1 unit`);
  const [preferredSchedule, setPreferredSchedule] = useState('Weekday Morning');
  const [notes, setNotes] = useState('');

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<ContactChannel>('messenger');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<LeadPayload | null>(null);

  const isEn = language === 'en';

  const selectionSummary = useMemo(() => {
    const parts: string[] = [];
    const equip = getEquipmentById(selectedEquipmentId);
    if (storeService === 'equipment') {
      if (compareMode && compareEquipmentIds.length >= 2) {
        const names = compareEquipmentIds.map((id) => getEquipmentById(id).nameEn).join(' vs ');
        parts.push(`Comparing: ${names}`);
      } else {
        parts.push(`Unit: ${equip.nameEn} (${equip.capacityRange})`);
      }
      const cap = computeRecommendedCapacity(roomCalc);
      parts.push(`Calc Est: ${cap.recommendedHp} HP (~${cap.estimatedBtu} BTU) for ${roomCalc.sqm} sqm`);
    }
    if (storeService === 'repair' && selectedSymptom) {
      const sym = SYMPTOM_ITEMS.find((s) => s.id === selectedSymptom);
      if (sym) parts.push(`Symptom: ${sym.labelEn}`);
    }
    return parts.join(' | ');
  }, [
    selectedEquipmentId,
    storeService,
    compareMode,
    compareEquipmentIds,
    roomCalc,
    selectedSymptom,
  ]);

  if (!open) return null;

  const handleClose = () => {
    setOpen(false);
    setSubmittedRecord(null);
    setStep(1);
    setErrorMsg('');
  };

  const handleCopySummary = async () => {
    const text = `Apex Mechanical & Cooling Selection\nAudience: ${audience}\nService: ${service}\n${selectionSummary || 'General Aircon Inquiry'}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg(isEn ? 'Please enter your name.' : 'Pakilagay ang iyong pangalan.');
      return;
    }
    if (!validatePHMobile(mobile)) {
      setErrorMsg(
        isEn
          ? 'Enter a valid PH mobile number (e.g., 0917 123 4567).'
          : 'Maglagay ng tamang PH mobile number (hal. 0917 123 4567).',
      );
      return;
    }

    const res = await submitLead({
      audience,
      service,
      town,
      barangay,
      propertyType,
      roomSizeOrUnits,
      preferredSchedule,
      notes,
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      preferredChannel,
      selectionSummary,
    });
    setSubmittedRecord(res.record);
  };

  const links = submittedRecord ? buildChannelDeepLinks(submittedRecord) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80"
    >
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-[#0B1F3A] border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div>
            <h2 id="quote-modal-title" className="font-display text-base font-bold text-white">
              {isEn ? 'Request a Free Site Assessment & Quote' : 'Libreng Site Assessment & Quote'}
            </h2>
            <p className="text-[11px] text-slate-300">
              {siteConfig.brand.locationLabel} · {siteConfig.contact.businessHours}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close quote modal"
            className="p-2 rounded-lg hover:bg-white/10 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto apex-scroll space-y-4">
          {submittedRecord && links ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-400/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>
                    {isEn
                      ? `Inquiry Prepared (Ref: ${submittedRecord.id})`
                      : `Handa na ang Inquiry (Ref: ${submittedRecord.id})`}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {isEn
                    ? `Your details are saved in this browser and formatted below. Tap your preferred channel to send it directly to our San Matias team — we typically reply within ${siteConfig.contact.responseHours}.`
                    : `Naka-save na sa browser ang detalye. Pindutin ang napiling channel sa ibaba para direktang maipadala sa aming San Matias team — sasagot kami sa loob ng ${siteConfig.contact.responseHours}.`}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={links.messenger}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#22D3EE] text-[#0B1F3A] text-xs font-bold hover:opacity-90"
                >
                  <span>Send via Messenger</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={links.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:opacity-90"
                >
                  <span>Send via WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={links.viber}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 border border-white/15 text-white text-xs font-semibold hover:bg-slate-700"
                >
                  <span>Open in Viber</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#F97316] text-white text-xs font-bold hover:bg-[#ea580c]"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {siteConfig.contact.phoneDisplay}</span>
                </a>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2 rounded-lg border border-white/15 text-xs text-slate-300 hover:text-white"
              >
                {isEn ? 'Back to 3D Explorer' : 'Bumalik sa 3D Explorer'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Progress Indicator */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { n: 1, label: isEn ? '1. Service' : '1. Serbisyo' },
                  { n: 2, label: isEn ? '2. Details' : '2. Detalye' },
                  { n: 3, label: isEn ? '3. Contact' : '3. Contact' },
                ].map((item) => (
                  <button
                    key={item.n}
                    type="button"
                    onClick={() => setStep(item.n as 1 | 2 | 3)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      step === item.n
                        ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-[#22D3EE]'
                        : step > item.n
                          ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900/60 border-white/10 text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Carry-over 3D Selection Summary */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/12 flex items-start justify-between gap-2">
                <div className="text-xs min-w-0">
                  <div className="text-[11px] font-semibold text-[#22D3EE]">
                    {isEn ? 'Your 3D Selection' : 'Napili sa 3D Scene'}
                  </div>
                  <div className="text-slate-200 mt-0.5 break-words">
                    {selectionSummary ||
                      `${audience.toUpperCase()} · ${service.toUpperCase()}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-white/15 text-[11px] text-slate-200 hover:text-white shrink-0"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Share'}</span>
                </button>
              </div>

              {step === 1 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-200">Property Type</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['residential', 'commercial'] as Audience[]).map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setAudience(a)}
                          className={`py-2.5 rounded-xl text-xs font-semibold capitalize border ${
                            audience === a
                              ? 'bg-[#22D3EE] text-[#0B1F3A] border-[#22D3EE]'
                              : 'bg-slate-900 text-slate-300 border-white/12'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-200">Service Needed</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'repair', label: 'Service & Repair' },
                          { id: 'cleaning', label: 'Deep Cleaning' },
                          { id: 'equipment', label: 'Equipment Sale' },
                          { id: 'installation', label: 'Full Installation' },
                        ] as { id: ServiceMode; label: string }[]
                      ).map((srv) => (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => setService(srv.id)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-semibold border ${
                            service === srv.id
                              ? 'bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]'
                              : 'bg-slate-900 text-slate-300 border-white/12'
                          }`}
                        >
                          {srv.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full py-2.5 rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-bold"
                  >
                    Continue to Location &amp; Details
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="space-y-1">
                      <span className="text-slate-300">Pampanga City / Town</span>
                      <select
                        value={town}
                        onChange={(e) => setTown(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white"
                      >
                        {siteConfig.serviceAreas.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-300">Barangay / Subdivision</span>
                      <input
                        type="text"
                        placeholder="e.g., Brgy. San Matias"
                        value={barangay}
                        onChange={(e) => setBarangay(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="space-y-1">
                      <span className="text-slate-300">Space Type</span>
                      <input
                        type="text"
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        placeholder="Bedroom, Office, Storefront..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-300">Approx. Size / Units</span>
                      <input
                        type="text"
                        value={roomSizeOrUnits}
                        onChange={(e) => setRoomSizeOrUnits(e.target.value)}
                        placeholder="e.g., 25 sqm / 2 units"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-slate-300">Preferred Visit Schedule</span>
                    <select
                      value={preferredSchedule}
                      onChange={(e) => setPreferredSchedule(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white"
                    >
                      <option value="Weekday Morning">Weekday Morning (8 AM – 12 PM)</option>
                      <option value="Weekday Afternoon">Weekday Afternoon (1 PM – 5 PM)</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Urgent / Earliest Slot">Earliest Available Slot</option>
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-slate-300">Brief Description / Issue</span>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="AC model, symptoms, or installation notes..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white"
                    />
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-bold"
                    >
                      Continue to Contact Info
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3 text-xs">
                  <label className="block space-y-1">
                    <span className="text-slate-300">Full Name *</span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="space-y-1">
                      <span className="text-slate-300">PH Mobile Number *</span>
                      <input
                        type="tel"
                        required
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="0917 000 0000"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white font-mono-tabular"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-300">Email (Optional)</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@email.com"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white"
                      />
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-slate-300">Preferred Contact Channel</span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {(
                        [
                          { id: 'messenger', label: 'Messenger' },
                          { id: 'whatsapp', label: 'WhatsApp' },
                          { id: 'viber', label: 'Viber' },
                          { id: 'call', label: 'Call' },
                          { id: 'sms', label: 'SMS' },
                        ] as { id: ContactChannel; label: string }[]
                      ).map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setPreferredChannel(ch.id)}
                          className={`py-2 rounded-lg text-[11px] font-semibold border ${
                            preferredChannel === ch.id
                              ? 'bg-[#22D3EE] text-[#0B1F3A] border-[#22D3EE]'
                              : 'bg-slate-900 text-slate-300 border-white/12'
                          }`}
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {errorMsg && (
                    <div role="alert" className="p-2.5 rounded-lg bg-red-500/20 border border-red-400/50 text-red-200 text-xs">
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-bold"
                    >
                      Prepare Free Quote Request
                    </button>
                  </div>
                </div>
              )}

              {/* Pampanga Service Area Strip */}
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>Pampanga Service Coverage</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-300">
                  {siteConfig.serviceAreas.slice(0, -1).map((area) => (
                    <span
                      key={area}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-white/10"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

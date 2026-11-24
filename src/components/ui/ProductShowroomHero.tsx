import { Boxes, CalendarCheck, ChevronDown, Maximize2, Settings2 } from 'lucide-react';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, ErrorInfo, MouseEvent, ReactNode } from 'react';
import { siteConfig } from '../../config/siteConfig';
import { BRANDS, KINDS, btuFromVariant } from '../../data/airconBrands';
import type { BrandId, UnitKind } from '../../data/airconBrands';
import { EQUIPMENT_CATALOG } from '../../data/hvacData';
import { productPhoto } from '../../data/productPhotos';
import { useHVACStore } from '../../store/useHVACStore';
import { getShot, subscribeShots } from '../scene/shotStore';
import type { Shot } from '../scene/ProductStudio';
import type { InspectTarget } from './AirconInspector';

const AirconInspector = lazy(() => import('./AirconInspector'));
const ProductStudio = lazy(() => import('../scene/ProductStudio'));
const ShowroomFeature = lazy(() => import('../scene/ShowroomFeature'));

/* ============================================================================
   Product showroom hero
   ----------------------------------------------------------------------------
   Centre: one featured unit in live 3D on a podium, with an exploded view.
   Sides: four vertical carousels, one per variety, running in alternating
   directions. Each card is a studio render of a detailed 3D model from its
   own angle (or a real photo, see src/data/productPhotos.ts). Any card opens
   the 3D inspector with specs, brands, fan speed and the exploded view.
   ============================================================================ */

const KIND_CATALOG: Record<UnitKind, string> = {
  wall: 'res_split_inv',
  floor: 'res_floor_mounted',
  window: 'res_window_inv',
  cassette: 'com_cassette',
  ducted: 'com_ducted',
  vrf: 'com_vrf',
  packaged: 'com_packaged',
};

const VARIANTS: Record<UnitKind, string[]> = {
  wall: ['1.0 HP', '1.5 HP', '2.0 HP', '2.5 HP', '1.5 HP'],
  window: ['0.75 HP', '1.0 HP', '1.5 HP'],
  floor: ['3.0 HP', '4.0 HP'],
  cassette: ['2.0 HP', '3.0 HP', '4.0 HP'],
  ducted: ['3.0 HP', '5.0 HP'],
  vrf: ['10 HP', '16 HP', '20 HP'],
  packaged: ['7.5 TR', '10 TR'],
};

/** Different viewing angle for every card: [yaw, pitch] in radians. */
const ANGLES: [number, number][] = [
  [-0.55, 0.22],
  [0.5, 0.3],
  [-0.2, 0.16],
  [0.78, 0.25],
  [-0.85, 0.2],
  [0.28, 0.36],
  [-0.4, 0.42],
];

interface CardDef extends Shot {
  variant: string;
  catalogId: string;
}

interface ColumnDef {
  id: string;
  en: string;
  tl: string;
  subEn: string;
  subTl: string;
  dir: 'up' | 'down';
  dur: number;
  accent: 'cyan' | 'amber';
  cards: CardDef[];
}

function buildColumn(
  id: string,
  copy: { en: string; tl: string; subEn: string; subTl: string },
  dir: 'up' | 'down',
  dur: number,
  accent: 'cyan' | 'amber',
  items: [UnitKind, BrandId][],
  angleOffset: number,
): ColumnDef {
  const seen: Partial<Record<UnitKind, number>> = {};
  return {
    id,
    ...copy,
    dir,
    dur,
    accent,
    cards: items.map(([kind, brandId], i) => {
      const n = (seen[kind] = (seen[kind] ?? -1) + 1);
      const [yaw, pitch] = ANGLES[(i + angleOffset) % ANGLES.length];
      const variant = VARIANTS[kind][n % VARIANTS[kind].length];
      return { key: `${id}-${i}-${kind}-${brandId}`, kind, brandId, yaw, pitch, variant, catalogId: KIND_CATALOG[kind] };
    }),
  };
}

const COLUMNS: ColumnDef[] = [
  buildColumn(
    'split',
    { en: 'Split-Type', tl: 'Split-Type', subEn: 'Wall-mounted', subTl: 'Wall-mounted' },
    'up',
    46,
    'cyan',
    [
      ['wall', 'daikin'],
      ['wall', 'mitsubishi'],
      ['wall', 'carrier'],
      ['wall', 'gree'],
      ['wall', 'trane'],
    ],
    0,
  ),
  buildColumn(
    'window',
    { en: 'Window & Floor', tl: 'Window at Floor', subEn: 'Residential', subTl: 'Pambahay' },
    'down',
    52,
    'cyan',
    [
      ['window', 'carrier'],
      ['floor', 'daikin'],
      ['window', 'gree'],
      ['floor', 'mitsubishi'],
      ['window', 'daikin'],
    ],
    2,
  ),
  buildColumn(
    'ceiling',
    { en: 'Cassette & Ducted', tl: 'Cassette at Ducted', subEn: 'Commercial indoor', subTl: 'Pang-negosyo (indoor)' },
    'up',
    49,
    'amber',
    [
      ['cassette', 'daikin'],
      ['ducted', 'trane'],
      ['cassette', 'mitsubishi'],
      ['ducted', 'carrier'],
      ['cassette', 'gree'],
    ],
    4,
  ),
  buildColumn(
    'outdoor',
    { en: 'VRF & Packaged', tl: 'VRF at Packaged', subEn: 'Commercial outdoor', subTl: 'Pang-negosyo (outdoor)' },
    'down',
    55,
    'amber',
    [
      ['vrf', 'daikin'],
      ['packaged', 'carrier'],
      ['vrf', 'mitsubishi'],
      ['packaged', 'trane'],
      ['vrf', 'gree'],
    ],
    1,
  ),
];

const SHOTS: Shot[] = COLUMNS.flatMap((c) =>
  c.cards
    .filter((d) => !productPhoto(d.brandId, d.kind))
    .map(({ key, kind, brandId, yaw, pitch }) => ({ key, kind, brandId, yaw, pitch })),
);

const FEATURE_ORDER: UnitKind[] = ['wall', 'window', 'floor', 'cassette', 'ducted', 'vrf', 'packaged'];
const FEATURE_BRAND: Record<UnitKind, BrandId> = {
  wall: 'daikin',
  window: 'carrier',
  floor: 'mitsubishi',
  cassette: 'daikin',
  ducted: 'trane',
  vrf: 'daikin',
  packaged: 'carrier',
};
const FEATURE_VARIANT: Record<UnitKind, string> = {
  wall: '1.5 HP',
  window: '1.0 HP',
  floor: '3.0 HP',
  cassette: '3.0 HP',
  ducted: '5.0 HP',
  vrf: '10 HP',
  packaged: '7.5 TR',
};
const SHORT_KIND: Record<UnitKind, [string, string]> = {
  wall: ['Split-type', 'Split-type'],
  window: ['Window', 'Window'],
  floor: ['Floor-standing', 'Floor-standing'],
  cassette: ['Cassette', 'Cassette'],
  ducted: ['Ducted', 'Ducted'],
  vrf: ['VRF', 'VRF'],
  packaged: ['Packaged', 'Packaged'],
};

const brandName = (id: BrandId) => (id === 'mitsubishi' ? 'Mitsubishi Electric' : BRANDS.find((b) => b.id === id)!.name);
const fmt = (n: number) => n.toLocaleString('en-US');
const isInverter = (catalogId: string) => EQUIPMENT_CATALOG.find((e) => e.id === catalogId)?.inverter ?? true;

/* ── Error boundary: if WebGL is unavailable, keep the page working ── */
class Quiet extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Showroom 3D unavailable:', error, info);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ============================================================================
   Carousel card + column
   ============================================================================ */

function ProductCard({ def, en, hidden, onOpen }: { def: CardDef; en: boolean; hidden?: boolean; onOpen: (d: CardDef, e: MouseEvent<HTMLElement>) => void }) {
  const rendered = useSyncExternalStore(subscribeShots, () => getShot(def.key), () => null);
  const src = productPhoto(def.brandId, def.kind) ?? rendered;
  const k = KINDS[def.kind];
  const btu = btuFromVariant(def.variant);
  const brand = BRANDS.find((b) => b.id === def.brandId)!;
  return (
    <button
      type="button"
      className="ph-card"
      style={{ '--ph-brand': brand.accent } as CSSProperties}
      onClick={(e) => onOpen(def, e)}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden || undefined}
      aria-label={hidden ? undefined : `${brandName(def.brandId)} ${en ? k.labelEn : k.labelTl}, ${def.variant}. ${en ? 'View in 3D with exploded parts' : 'Tingnan sa 3D kasama ang mga piyesa'}`}
    >
      <span className="ph-card-media">
        {src ? <img src={src} alt="" decoding="async" draggable={false} /> : <span className="ph-skel" />}
        <span className="ph-card-hover">
          <Boxes className="w-3.5 h-3.5" aria-hidden="true" />
          {en ? '3D & parts' : '3D at piyesa'}
        </span>
      </span>
      <span className="ph-card-body">
        <span className="ph-card-brand">{brandName(def.brandId)}</span>
        <span className="ph-card-name">{en ? k.labelEn : k.labelTl}</span>
        <span className="ph-card-meta">
          {def.variant} · {fmt(btu)} BTU/h
          {isInverter(def.catalogId) && def.kind !== 'window' ? <em>Inverter</em> : null}
        </span>
      </span>
    </button>
  );
}

function CarouselColumn({ col, en, reduce, onOpen }: { col: ColumnDef; en: boolean; reduce: boolean; onOpen: (d: CardDef, e: MouseEvent<HTMLElement>) => void }) {
  return (
    <section className="ph-col" data-dir={col.dir} data-accent={col.accent} aria-label={en ? col.en : col.tl}>
      <header className="ph-col-head">
        <span className="ph-col-title">{en ? col.en : col.tl}</span>
        <span className="ph-col-sub">{en ? col.subEn : col.subTl}</span>
      </header>
      <div className="ph-viewport" data-static={reduce || undefined}>
        <div className="ph-track" style={{ '--ph-dur': `${col.dur}s` } as CSSProperties}>
          {col.cards.map((d) => (
            <ProductCard key={d.key} def={d} en={en} onOpen={onOpen} />
          ))}
          {!reduce && col.cards.map((d) => <ProductCard key={`${d.key}-b`} def={d} en={en} hidden onOpen={onOpen} />)}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   Section
   ============================================================================ */

export function ProductShowroomHero() {
  const language = useHVACStore((s) => s.language);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const enterExperience = useHVACStore((s) => s.enterExperience);
  const storeReduce = useHVACStore((s) => s.reduceMotion);
  const prefersReduce = useReducedMotion();
  const reduce = Boolean(storeReduce || prefersReduce);
  const en = language === 'en';

  const [kind, setKind] = useState<UnitKind>('wall');
  const [brandId, setBrandId] = useState<BrandId>(FEATURE_BRAND.wall);
  const [exploded, setExploded] = useState(false);
  const [held, setHeld] = useState(false); // visitor took control: stop auto-cycling
  const [inspecting, setInspecting] = useState<InspectTarget | null>(null);
  const [studioOn, setStudioOn] = useState(false);
  const featureRef = useRef<HTMLDivElement>(null);

  // Start the photo studio once the page has painted.
  useEffect(() => {
    const t = window.setTimeout(() => setStudioOn(true), 250);
    return () => window.clearTimeout(t);
  }, []);

  // Auto-cycle the featured variety until the visitor interacts.
  useEffect(() => {
    if (held || exploded || reduce || inspecting) return;
    const t = window.setInterval(() => {
      setKind((k) => {
        const next = FEATURE_ORDER[(FEATURE_ORDER.indexOf(k) + 1) % FEATURE_ORDER.length];
        setBrandId(FEATURE_BRAND[next]);
        return next;
      });
    }, 9000);
    return () => window.clearInterval(t);
  }, [held, exploded, reduce, inspecting]);

  const pickKind = (k: UnitKind) => {
    setHeld(true);
    setKind(k);
    setBrandId(FEATURE_BRAND[k]);
  };

  const openFromCard = useCallback((d: CardDef, e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setInspecting({
      catalogId: d.catalogId,
      variant: d.variant,
      brandId: d.brandId,
      origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
    });
  }, []);

  const openFeature = (withExplode: boolean) => {
    const r = featureRef.current?.getBoundingClientRect();
    setInspecting({
      catalogId: KIND_CATALOG[kind],
      variant: FEATURE_VARIANT[kind],
      brandId,
      exploded: withExplode,
      origin: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    });
  };

  const k = KINDS[kind];
  const item = EQUIPMENT_CATALOG.find((e) => e.id === KIND_CATALOG[kind]);
  const featureBtu = btuFromVariant(FEATURE_VARIANT[kind]);
  const featureAccent = BRANDS.find((b) => b.id === brandId)!.accent;

  const featureFallback = (
    <div className="ph-feature-fallback">
      <p>{en ? '3D preview is not available on this device.' : 'Hindi available ang 3D preview sa device na ito.'}</p>
    </div>
  );

  return (
    <section aria-labelledby="showroom-heading" className="ph-section relative w-full">
      <div aria-hidden="true" className="ph-backdrop" />

      <div className="relative z-10 mx-auto max-w-[1480px] px-3 sm:px-6 pt-8 sm:pt-10 pb-8">
        <header className="ph-header">
          <p className="ph-eyebrow">
            {siteConfig.brand.name} <span aria-hidden="true">·</span> {siteConfig.brand.locationLabel}
          </p>
          <h1 id="showroom-heading" className="ph-title">
            {en ? 'Professional HVAC Services & High-Quality Aircon Products' : 'Propesyonal na HVAC Services at De-kalidad na Aircon'}
          </h1>
          <p className="ph-lede">
            {en
              ? 'From top-tier split-type, window, and commercial AC units to expert installation and emergency repairs, we have your comfort covered. Get high-efficiency systems backed by certified local technicians. Explore our products and book today.'
              : 'Mula split-type, window, at commercial AC hanggang expert installation at emergency repair, sagot namin ang ginhawa mo. High-efficiency systems na may certified local technicians. Silipin ang mga produkto at mag-book ngayon.'}
          </p>
        </header>

        <div className="ph-stage">
          <CarouselColumn col={COLUMNS[0]} en={en} reduce={reduce} onOpen={openFromCard} />
          <CarouselColumn col={COLUMNS[1]} en={en} reduce={reduce} onOpen={openFromCard} />

          {/* ── Featured unit ── */}
          <div className="ph-feature" ref={featureRef} style={{ '--ph-brand': featureAccent } as CSSProperties}>
            <div className="ph-feature-top">
              <div>
                <p className="ph-feature-eyebrow">
                  {en ? 'Featured' : 'Tampok'} · {en ? k.labelEn : k.labelTl}
                </p>
                <h2 className="ph-feature-title">
                  {brandName(brandId)} <span>{en ? item?.nameEn : item?.nameTaglish}</span>
                </h2>
                <p className="ph-feature-meta">
                  {FEATURE_VARIANT[kind]} · {fmt(featureBtu)} BTU/h · {item?.efficiencyTier}
                </p>
              </div>
              <div className="ph-brands" role="radiogroup" aria-label={en ? 'Brand' : 'Brand'}>
                {BRANDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={b.id === brandId}
                    className={`ph-brand${b.id === brandId ? ' is-on' : ''}`}
                    style={{ '--ph-brand': b.accent } as CSSProperties}
                    onClick={() => {
                      setHeld(true);
                      setBrandId(b.id);
                    }}
                  >
                    {b.id === 'mitsubishi' ? 'Mitsubishi' : b.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="ph-canvas">
              <Quiet fallback={featureFallback}>
                <Suspense fallback={<div className="ph-canvas-loading" />}>
                  <ShowroomFeature kind={kind} brandId={brandId} exploded={exploded} en={en} reduceMotion={reduce} onInteract={() => setHeld(true)} />
                </Suspense>
              </Quiet>
              {exploded && <p className="ph-canvas-hint">{en ? 'Drag to turn · each part is labelled' : 'I-drag para iikot · may label ang bawat piyesa'}</p>}
            </div>

            <div className="ph-feature-bar">
              <div className="ph-kinds" role="tablist" aria-label={en ? 'Variety' : 'Uri'}>
                {FEATURE_ORDER.map((kk) => (
                  <button key={kk} type="button" role="tab" aria-selected={kk === kind} className={`ph-kind${kk === kind ? ' is-on' : ''}`} onClick={() => pickKind(kk)}>
                    {en ? SHORT_KIND[kk][0] : SHORT_KIND[kk][1]}
                  </button>
                ))}
              </div>
              <div className="ph-feature-actions">
                <button
                  type="button"
                  className={`ph-act${exploded ? ' is-on' : ''}`}
                  aria-pressed={exploded}
                  onClick={() => {
                    setHeld(true);
                    setExploded((v) => !v);
                  }}
                >
                  <Boxes className="w-4 h-4" aria-hidden="true" />
                  {exploded ? (en ? 'Assemble' : 'Ibalik') : en ? 'Exploded view' : 'Exploded view'}
                </button>
                <button type="button" className="ph-act ph-act--solid" onClick={() => openFeature(exploded)}>
                  <Maximize2 className="w-4 h-4" aria-hidden="true" />
                  {en ? 'Full specs' : 'Buong specs'}
                </button>
              </div>
            </div>
          </div>

          <CarouselColumn col={COLUMNS[2]} en={en} reduce={reduce} onOpen={openFromCard} />
          <CarouselColumn col={COLUMNS[3]} en={en} reduce={reduce} onOpen={openFromCard} />
        </div>

        <div className="ph-cta">
          <button type="button" onClick={() => enterExperience('residential', { service: 'equipment' })} className="ph-cta-btn">
            <Settings2 className="w-5 h-5" aria-hidden="true" />
            {en ? 'Browse Aircon Products' : 'Tingnan ang mga Aircon'}
          </button>
          <button type="button" onClick={() => setQuoteModalOpen(true)} className="ph-cta-btn ph-cta-btn--primary">
            <CalendarCheck className="w-5 h-5" aria-hidden="true" />
            {en ? 'Book a Service Appointment' : 'Mag-book ng Serbisyo'}
          </button>
        </div>
        <div className="mt-4 flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-slate-300">
            {en ? 'Explore products & service areas · Scroll down for full details' : 'Silipin ang mga produkto at lugar · Mag-scroll pababa para sa detalye'}
          </p>
          <a href="#explore-3d" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold text-[#7dd3fc] hover:text-white transition-colors">
            {en ? 'See our product range & service coverage' : 'Tingnan ang aming mga produkto at serbisyo'}
            <ChevronDown className="w-4 h-4 animate-bounce" aria-hidden="true" />
          </a>
        </div>
      </div>

      {studioOn && SHOTS.length > 0 && (
        <Quiet fallback={null}>
          <Suspense fallback={null}>
            <ProductStudio shots={SHOTS} />
          </Suspense>
        </Quiet>
      )}

      <Suspense fallback={null}>
        <AnimatePresence>
          {inspecting && (
            <AirconInspector
              key={`${inspecting.catalogId}${inspecting.variant}${inspecting.brandId ?? ''}`}
              target={inspecting}
              onClose={() => setInspecting(null)}
            />
          )}
        </AnimatePresence>
      </Suspense>
    </section>
  );
}

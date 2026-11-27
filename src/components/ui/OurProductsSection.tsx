import { Boxes, Maximize2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Suspense, lazy, useMemo, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { PRODUCT_CARDS, PRODUCT_FILTERS } from '../../data/productCards';
import type { ProductCard, ProductFilter } from '../../data/productCards';
import { productPhoto } from '../../data/productPhotos';
import { unitTally } from '../../data/modelParts';
import { peso } from '../../data/partPrices';
import { useHVACStore } from '../../store/useHVACStore';
import { getShot, subscribeShots } from '../scene/shotStore';
import type { Shot } from '../scene/ProductStudio';
import type { InspectTarget } from './AirconInspector';
import { tr } from '../../i18n/tr';

const AirconInspector = lazy(() => import('./AirconInspector'));
const ProductStudio = lazy(() => import('../scene/ProductStudio'));

/* ============================================================================
   "Our Products" — the catalogue section mirrored from the Apex site: eyebrow,
   headline, filter pills and a grid of white product cards with a badge, spec
   chips, a "Starts at" price and an Inquire button.

   Two things are ours rather than theirs, on purpose:
   • every card with a 3D model opens the inspector, assembled or exploded, so
     a visitor can look inside the unit and see each part priced;
   • the card art is a render of that model (or a licensed photo once one is
     added to src/data/productPhotos.ts) and is labelled as such.
   ============================================================================ */

const CARD_SHOTS: Shot[] = PRODUCT_CARDS.filter((c) => c.model && !productPhoto(c.model.brandId, c.model.kind)).map(
  (c) => ({
    key: `cat-${c.id}`,
    kind: c.model!.kind,
    brandId: c.model!.brandId,
    yaw: -0.35,
    pitch: 0.2,
  }),
);

/** Flat illustration for a product we do not model in 3D (the portable unit). */
function PortableArt() {
  return (
    <svg viewBox="0 0 220 165" className="op-illus" role="img" aria-label={tr('Illustration of a portable air conditioner', 'Ilustrasyon ng portable aircon')}>
      <defs>
        <linearGradient id="op-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dde5ef" />
        </linearGradient>
      </defs>
      <path d="M150 48c22-6 40 6 46 22" stroke="#c3cedd" strokeWidth="9" fill="none" strokeLinecap="round" />
      <rect x="62" y="34" width="84" height="104" rx="12" fill="url(#op-body)" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="76" y="46" width="56" height="20" rx="6" fill="#16263c" />
      <text x="104" y="61" textAnchor="middle" fill="#7dd3fc" fontSize="13" fontFamily="monospace">20°C</text>
      {[82, 94, 106].map((y) => (
        <rect key={y} x="78" y={y} width="52" height="6" rx="3" fill="#e2e8f0" />
      ))}
      <circle cx="78" cy="144" r="6" fill="#334155" />
      <circle cx="130" cy="144" r="6" fill="#334155" />
    </svg>
  );
}

function CardArt({ card }: { card: ProductCard }) {
  const key = `cat-${card.id}`;
  const rendered = useSyncExternalStore(subscribeShots, () => getShot(key), () => null);
  if (!card.model) return <PortableArt />;
  const photo = productPhoto(card.model.brandId, card.model.kind);
  const src = photo ?? rendered;
  return (
    <>
      {src ? <img src={src} alt="" decoding="async" draggable={false} /> : <span className="op-skel" />}
      <span className="op-tag">{photo ? tr('Photo', 'Larawan', '实物照片') : tr('3D render', '3D render', '3D 渲染图')}</span>
    </>
  );
}

export function OurProductsSection() {
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const [filter, setFilter] = useState<ProductFilter>('all');
  const [inspecting, setInspecting] = useState<InspectTarget | null>(null);

  const cards = useMemo(
    () => (filter === 'all' ? PRODUCT_CARDS : PRODUCT_CARDS.filter((c) => c.filter === filter)),
    [filter],
  );

  const open = (card: ProductCard, e: MouseEvent<HTMLElement>, exploded?: boolean) => {
    if (!card.model) return;
    const r = e.currentTarget.getBoundingClientRect();
    setInspecting({
      catalogId: card.model.catalogId,
      variant: card.model.variant,
      brandId: card.model.brandId,
      exploded,
      origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
    });
  };

  return (
    <section id="products" className="op" aria-labelledby="op-heading">
      <div className="op-inner">
        <p className="op-eyebrow">
          <span aria-hidden="true" />
          {tr('Our Products', 'Mga Produkto', '我们的产品')}
        </p>
        <h2 id="op-heading" className="op-h2">
          {tr('Aircon units for every room and budget', 'Aircon para sa bawat kwarto at budget', '适合每个房间与预算的空调')}
        </h2>
        <p className="op-lede">
          {tr(
            'Sample units we supply and install — brand-new, with manufacturer warranty and professional installation by our own team.',
            'Mga sample na unit na sinusupply at ini-install namin — brand-new, may manufacturer warranty at propesyonal na installation ng sarili naming team.',
            '我们供应并安装的样机 — 全新机、原厂保修，由我们自己的团队专业安装。',
          )}
        </p>

        <div className="op-filters" role="tablist" aria-label={tr('Filter products', 'I-filter ang produkto')}>
          {PRODUCT_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`op-filter${filter === f.id ? ' is-on' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="op-grid">
          {cards.map((card) => {
            const tally = card.model ? unitTally(card.model.kind, card.model.variant) : null;
            return (
              <article key={card.id} className="op-card">
                <span className={`op-badge op-badge--${card.badgeTone}`}>{card.badge}</span>

                {card.model ? (
                  <button
                    type="button"
                    className="op-media op-media--btn"
                    onClick={(e) => open(card, e)}
                    aria-label={`${card.name} — ${tr('view specs and the 3D model', 'tingnan ang specs at 3D model')}`}
                  >
                    <CardArt card={card} />
                    <span className="op-hover">
                      <Boxes className="w-3.5 h-3.5" aria-hidden="true" />
                      {tr('View specs · 3D & parts', 'Specs · 3D at piyesa')}
                    </span>
                  </button>
                ) : (
                  <div className="op-media">
                    <CardArt card={card} />
                  </div>
                )}

                <div className="op-body">
                  <h3 className="op-name">{card.name}</h3>
                  <p className="op-blurb">{card.blurb}</p>

                  <ul className="op-chips">
                    {card.chips.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>

                  <div className="op-foot">
                    <p className="op-price">
                      <small>
                        {tr('Starts at', 'Mula sa', '起价')}
                        {card.priceAssumed ? ` · ${tr('estimate', 'tantiya', '估价')}` : ''}
                      </small>
                      <strong>{card.priceFrom}</strong>
                    </p>
                    <button type="button" className="op-inquire" onClick={() => setQuoteModalOpen(true)}>
                      {tr('Inquire', 'Magtanong', '咨询')}
                    </button>
                  </div>

                  {card.model && tally ? (
                    <div className="op-extra">
                      <button type="button" className="op-act" onClick={(e) => open(card, e)}>
                        <Maximize2 className="w-3 h-3" aria-hidden="true" />
                        {tr('View specs', 'Tingnan ang specs', '查看规格')}
                      </button>
                      <button type="button" className="op-act" onClick={(e) => open(card, e, true)}>
                        <Boxes className="w-3 h-3" aria-hidden="true" />
                        {tr('Exploded', 'Exploded', '爆炸图')}
                      </button>
                      <span className="op-tally" title={tr('Indicative total of every part in this unit', 'Tinatayang kabuuan ng lahat ng piyesa')}>
                        {tr('Parts tally', 'Tally ng piyesa', '部件合计')} {peso(tally.low)}–{peso(tally.high)}
                      </span>
                    </div>
                  ) : (
                    <p className="op-nomodel">
                      {tr(
                        'No 3D model of this one yet — ask us and we will walk you through it.',
                        'Wala pang 3D model nito — tanungin mo kami at ipapaliwanag namin.',
                        '这一款暂无 3D 模型 — 可直接咨询我们。',
                      )}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <p className="op-note">
          {tr(
            'Prices are starting points for the unit only and move with capacity, brand and site conditions; the parts tally is an indicative total of every component inside, not a quotation. Product pictures are our own 3D renders unless marked as a photo. We confirm the exact model, its data sheet and a written price with your free site assessment.',
            'Panimulang presyo ito ng unit lamang at nagbabago ayon sa kapasidad, brand at kalagayan ng site; ang parts tally ay tinatayang kabuuan ng mga piyesa sa loob, hindi quotation. Sarili naming 3D render ang mga larawan maliban kung nakasaad na photo. Kinukumpirma namin ang eksaktong model, data sheet at nakasulat na presyo sa libreng site assessment.',
            '所示价格仅为机组起价，会随匹数、品牌与现场情况变动；部件合计为内部全部组件的参考总额，并非报价。除标注为实物照片外，产品图均为我方 3D 渲染图。具体型号、规格书与书面报价将在免费现场勘查后确认。',
          )}
        </p>
      </div>

      {CARD_SHOTS.length > 0 && (
        <Suspense fallback={null}>
          <ProductStudio shots={CARD_SHOTS} />
        </Suspense>
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

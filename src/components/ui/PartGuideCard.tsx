import { Bounds, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Boxes, CalendarCheck, Cog, Lightbulb, ShieldAlert, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { BRANDS, KINDS } from '../../data/airconBrands';
import type { UnitKind } from '../../data/airconBrands';
import { guideFor } from '../../data/partGuides';
import { partPrice, priceLineTotal, priceRange } from '../../data/partPrices';
import type { L } from '../../data/partGuides';
import { tr } from '../../i18n/tr';
import { useHVACStore } from '../../store/useHVACStore';
import { usePartGuide } from '../../store/usePartGuide';
import { FIGURE_MODELS, InteractionCtx, StudioEnvironment } from '../scene/airconModels';
import type { FigureKind } from '../scene/airconModels';

/* ============================================================================
   "How it works" card for a clicked part.
   The illustration is the real part from the same 3D model — same shape,
   same colours — drawn on its own and turning slowly.
   ============================================================================ */

const t = (l: L) => tr(l.en, undefined, l.zh);

function kindLabel(kind: string) {
  if (kind === 'outdoor') return tr('Split-type outdoor unit', undefined, '分体式室外机');
  const k = KINDS[kind as UnitKind];
  return k ? tr(k.labelEn, k.labelTl) : kind;
}

function PartFigure({ kind, brandId, partId }: { kind: FigureKind; brandId: string; partId: string }) {
  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];
  const Model = FIGURE_MODELS[kind];
  const reduce = useReducedMotion();
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [1.4, 0.9, 2.2], fov: 32 }} gl={{ antialias: true, alpha: true }}>
      <StudioEnvironment intensity={1} />
      <hemisphereLight args={['#f1f5f9', '#1e293b', 0.5]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.6} />
      <directionalLight position={[-3, 1.5, -2]} intensity={0.5} color="#bfdbfe" />
      <Bounds fit clip observe margin={1.25}>
        <InteractionCtx.Provider value={{ isolate: partId }}>
          <Model brand={brand} />
        </InteractionCtx.Provider>
      </Bounds>
      <OrbitControls makeDefault enablePan={false} enableZoom={false} autoRotate={!reduce} autoRotateSpeed={2.2} />
    </Canvas>
  );
}

export default function PartGuideCard() {
  const open = usePartGuide((s) => s.open);
  const close = usePartGuide((s) => s.close);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  useHVACStore((s) => s.language); // re-render on language change

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const guide = open ? guideFor(open.kind, open.partId) : null;
  // Indicative, supply-only price and how many of this part the unit holds.
  const price = open ? partPrice(open.kind, open.partId, open.variant) : null;
  const brand = open ? BRANDS.find((b) => b.id === open.brandId) : null;

  return (
    <AnimatePresence>
      {open && guide && (
        <motion.aside
          key={`${open.kind}-${open.partId}`}
          className="pg-card"
          role="dialog"
          aria-labelledby="pg-title"
          initial={{ opacity: 0, x: -24, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -24, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          style={{ ['--pg-accent' as string]: brand?.accent ?? '#22d3ee' }}
        >
          <button type="button" className="pg-close" onClick={close} aria-label={tr('Close')}>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="pg-figure" aria-hidden="true">
            <PartFigure kind={open.kind as FigureKind} brandId={open.brandId} partId={open.partId} />
          </div>

          <div className="pg-body">
            <p className="pg-eyebrow">{kindLabel(open.kind)}</p>
            <h2 id="pg-title" className="pg-title">
              {t(guide.name)}
            </h2>
            <p className="pg-role">{t(guide.role)}</p>

            {price && (
              <div className="pg-price">
                <span className="pg-price-k">
                  <Boxes className="w-3.5 h-3.5" aria-hidden="true" />
                  {tr('In this unit', 'Sa unit na ito', '本机数量')}
                </span>
                <span className="pg-price-q">
                  ×{price.qty}
                </span>
                <span className="pg-price-v">
                  {priceRange(price)}
                  <small>
                    {price.qty > 1
                      ? `${tr('for all', 'lahat', '合计')} ${priceLineTotal(price)}`
                      : tr('per piece, supply only', 'kada piraso, piyesa lang', '每件，仅部件')}
                  </small>
                </span>
              </div>
            )}
            {price && (
              <p className="pg-price-note">
                {tr(
                  'Mock showroom figure: part only, no labour or refrigerant, and not a quotation.',
                  'Mock na presyo sa showroom: piyesa lang, walang labor o refrigerant, hindi ito quotation.',
                  '展厅模拟价：仅部件本身，不含人工或冷媒，不构成报价。',
                )}
              </p>
            )}

            <h3 className="pg-h">
              <Cog className="w-3.5 h-3.5" aria-hidden="true" />
              {tr('How it works', undefined, '工作原理')}
            </h3>
            <ol className="pg-steps">
              {guide.steps.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.07 }}
                >
                  <span className="pg-n">{i + 1}</span>
                  <span>{t(s)}</span>
                </motion.li>
              ))}
            </ol>

            <div className="pg-note pg-note--warn">
              <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              <div>
                <strong>{tr('Watch out for', undefined, '注意事项')}</strong>
                <p>{t(guide.watch)}</p>
              </div>
            </div>
            <div className="pg-note">
              <Lightbulb className="w-4 h-4 shrink-0" aria-hidden="true" />
              <div>
                <strong>{tr('Care tip', undefined, '保养建议')}</strong>
                <p>{t(guide.care)}</p>
              </div>
            </div>

            <button
              type="button"
              className="pg-cta"
              onClick={() => {
                close();
                setQuoteModalOpen(true);
              }}
            >
              <CalendarCheck className="w-4 h-4" aria-hidden="true" />
              {tr('Book a check for this part', undefined, '预约检查此部件')}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { HOME_SLIDES, SLIDE_CTA_PRIMARY, SLIDE_CTA_SECONDARY } from '../../data/homeSlides';
import { useHVACStore } from '../../store/useHVACStore';
import { getShot, subscribeShots } from '../scene/shotStore';
import type { RoomShot } from '../scene/HeroRoomStudio';
import type { RoomId } from '../scene/HeroRooms';
import { tr } from '../../i18n/tr';

const HeroRoomStudio = lazy(() => import('../scene/HeroRoomStudio'));

/* ============================================================================
   Home hero slider.
   Five auto-advancing slides, mirroring the Apex site hero: badge pill,
   two-line display headline, supporting line, a solid and a ghost button,
   progress dashes on the left and a counter with arrows on the right.

   Where that site shows an interior photograph, this one shows the rendered
   3D unit the slide is about — until a licensed photo is set on the slide
   (see `photo` in src/data/homeSlides.ts), which then takes over.
   ============================================================================ */

const SLIDE_MS = 2500;

/* Each slide without a photo is rendered as a room: the part of the house the
   slide is about, with the unit installed in it. */
const HERO_SHOTS: RoomShot[] = HOME_SLIDES.filter((s) => !s.photo).map((s) => ({
  key: `heroroom-${s.id}`,
  id: s.id as RoomId,
  brandId: s.brandId,
}));

/* Photo first, render second.
   Each slide tries a real photograph at `public/hero/<slide id>.jpg` (or the
   explicit `photo` path set on the slide). If that file is not there — or
   fails to load — the slide silently falls back to the rendered room, so the
   hero is never blank and photos can be dropped in without touching code. */
function SlideArt({ slideId, photo }: { slideId: string; photo?: string }) {
  const rendered = useSyncExternalStore(subscribeShots, () => getShot(`heroroom-${slideId}`), () => null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const candidate = photo ?? `/hero/${slideId}.jpg`;

  if (!photoFailed) {
    return (
      <img
        className="hs-photo"
        src={candidate}
        alt=""
        decoding="async"
        draggable={false}
        onError={() => setPhotoFailed(true)}
      />
    );
  }
  if (!rendered) return <span className="hs-render" aria-hidden="true" />;
  return <img className="hs-photo" src={rendered} alt="" decoding="async" draggable={false} />;
}

export function HomeHeroSlider() {
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const storeReduce = useHVACStore((s) => s.reduceMotion);
  const prefersReduce = useReducedMotion();
  const reduce = Boolean(storeReduce || prefersReduce);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [studioOn, setStudioOn] = useState(false);
  const total = HOME_SLIDES.length;
  const rootRef = useRef<HTMLElement>(null);

  const go = useCallback((n: number) => setIndex(((n % total) + total) % total), [total]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Render the slide art once the page has painted.
  useEffect(() => {
    const t = window.setTimeout(() => setStudioOn(true), 200);
    return () => window.clearTimeout(t);
  }, []);

  // Auto-advance, unless the visitor is on the hero or asked for less motion.
  useEffect(() => {
    if (reduce || paused) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % total), SLIDE_MS);
    return () => window.clearInterval(t);
  }, [reduce, paused, total]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  };

  const viewProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <section
      ref={rootRef}
      id="top"
      className="hs"
      aria-roledescription="carousel"
      aria-label={tr('Apex Mechanical & Cooling highlights', 'Mga highlight ng Apex Mechanical & Cooling')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      onKeyDown={onKeyDown}
    >
      {HOME_SLIDES.map((s, i) => {
        const on = i === index;
        return (
          <article
            key={s.id}
            className={`hs-slide${on ? ' is-on' : ''}`}
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${total}: ${s.badge}`}
            aria-hidden={!on}
            inert={!on || undefined}
          >
            <div className="hs-art">
              <SlideArt slideId={s.id} photo={s.photo} />
            </div>
            <div className="hs-scrim" aria-hidden="true" />

            <div className="hs-body">
              <p className="hs-badge">
                <i aria-hidden="true" />
                {s.badge}
              </p>
              {/* The first slide carries the page's h1; the rest are plain text. */}
              {i === 0 ? (
                <h1 className="hs-h">
                  <span>{s.line1}</span>
                  <span className={s.line2Accent ? 'hs-h-accent' : undefined}>{s.line2}</span>
                </h1>
              ) : (
                <p className="hs-h" role="presentation">
                  <span>{s.line1}</span>
                  <span className={s.line2Accent ? 'hs-h-accent' : undefined}>{s.line2}</span>
                </p>
              )}
              <p className="hs-sub">{s.body}</p>
              <div className="hs-cta">
                <button type="button" className="hs-btn hs-btn--solid" onClick={() => setQuoteModalOpen(true)}>
                  {tr(SLIDE_CTA_PRIMARY, 'Mag-book ng Serbisyo', '预约服务')}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button type="button" className="hs-btn hs-btn--ghost" onClick={viewProducts}>
                  {tr(SLIDE_CTA_SECONDARY, 'Tingnan ang Produkto', '查看产品')}
                </button>
              </div>
            </div>
          </article>
        );
      })}

      {/* Progress dashes */}
      <div className="hs-dots" role="tablist" aria-label={tr('Choose a slide', 'Pumili ng slide')}>
        {HOME_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`${i + 1} / ${total}: ${s.badge}`}
            className={`hs-dot${i === index ? ' is-on' : ''}`}
            style={{ '--hs-ms': `${SLIDE_MS}ms` } as CSSProperties}
            onClick={() => go(i)}
          />
        ))}
      </div>

      {/* Counter + arrows */}
      <div className="hs-nav">
        <span className="hs-count" aria-live="polite">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <button type="button" className="hs-arrow" onClick={prev} aria-label={tr('Previous slide', 'Nakaraang slide')}>
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <button type="button" className="hs-arrow" onClick={next} aria-label={tr('Next slide', 'Susunod na slide')}>
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {studioOn && HERO_SHOTS.length > 0 && (
        <Suspense fallback={null}>
          <HeroRoomStudio shots={HERO_SHOTS} />
        </Suspense>
      )}
    </section>
  );
}

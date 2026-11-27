import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { HOME_SLIDES, SLIDE_CTA_PRIMARY, SLIDE_CTA_SECONDARY } from '../../data/homeSlides';
import { useHVACStore } from '../../store/useHVACStore';
import { tr } from '../../i18n/tr';

/* ============================================================================
   Home hero slider.
   Auto-advancing photographic slides, mirroring the Apex site hero: badge pill,
   two-line display headline, supporting line, a solid and a ghost button,
   progress dashes on the left and a counter with arrows on the right.

   Photographs only — the 3D room renders this used to fall back to are gone.
   Slides advance every 2.5 s and keep advancing while the pointer rests on
   the hero; only keyboard focus or using the arrows pauses the run.
   ============================================================================ */

const SLIDE_MS = 2500;

/** The slide's photograph: `/hero/<slide id>.jpg` unless the slide names one. */
function SlideArt({ slideId, photo, eager }: { slideId: string; photo?: string; eager: boolean }) {
  return (
    <img
      className="hs-photo"
      src={photo ?? `/hero/${slideId}.jpg`}
      alt=""
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      draggable={false}
    />
  );
}

export function HomeHeroSlider() {
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const storeReduce = useHVACStore((s) => s.reduceMotion);
  const prefersReduce = useReducedMotion();
  const reduce = Boolean(storeReduce || prefersReduce);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = HOME_SLIDES.length;
  const rootRef = useRef<HTMLElement>(null);

  const go = useCallback((n: number) => setIndex(((n % total) + total) % total), [total]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  /* Auto-advance. Reduced-motion does NOT stop the run — it only removes the
     drift and cross-fade (see .hs-photo in index.css), so the slides still
     change but nothing moves. Pausing is still available: keyboard focus holds
     the run, and the arrows take manual control. */
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % total), SLIDE_MS);
    return () => window.clearInterval(t);
  }, [paused, total]);

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
      /* Deliberately no pause on hover: the hero covers the viewport, so the
         pointer sits on it most of the time and the run would never advance.
         Keyboard focus still pauses it, which is what assistive use needs. */
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
              <SlideArt slideId={s.id} photo={s.photo} eager={i === 0} />
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

    </section>
  );
}

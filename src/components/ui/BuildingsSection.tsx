import { ArrowRight, Building2, Home } from 'lucide-react';
import { siteConfig } from '../../config/siteConfig';
import { useHVACStore } from '../../store/useHVACStore';
import { tr } from '../../i18n/tr';

/* ============================================================================
   Residential & Commercial.
   The section header for the 3D street below it: two buildings a visitor can
   walk into. It takes the menu slot the mirrored site gives to "Portfolio",
   because this build has these two 3D walk-throughs and no portfolio.

   Each card enters the 3D experience directly; hovering one lights its
   building in the street scene underneath, so the link between the card and
   the thing on screen is obvious before the click.
   ============================================================================ */

const CARDS = [
  {
    id: 'residential' as const,
    icon: Home,
    eyebrow: { en: 'For homes', tl: 'Para sa bahay', zh: '住宅' },
    title: { en: 'Residential', tl: 'Residential', zh: '住宅' },
    body: {
      en: 'A Filipino bungalow with a wall-mounted split system: indoor unit, lineset through the wall, and the condenser on its pad outside.',
      tl: 'Bungalow na may wall-mounted split system: indoor unit, lineset sa dingding, at condenser sa labas.',
      zh: '一栋菲式平房与壁挂分体系统：室内机、穿墙铜管，以及室外机。',
    },
    points: [
      { en: 'Split, window and floor-standing units in place', tl: 'Split, window at floor-standing na unit', zh: '壁挂、窗机与柜机' },
      { en: 'See the piping route and drain line', tl: 'Tingnan ang piping at drain line', zh: '查看管路与排水管' },
      { en: 'Click any part for how it works', tl: 'Pindutin ang piyesa para sa paliwanag', zh: '点击部件查看原理' },
    ],
    accent: '#22D3EE',
  },
  {
    id: 'commercial' as const,
    icon: Building2,
    eyebrow: { en: 'For business', tl: 'Para sa negosyo', zh: '商用' },
    title: { en: 'Commercial', tl: 'Commercial', zh: '商用' },
    body: {
      en: 'A two-storey shop and office with ceiling cassettes, a concealed ducted AHU and a rooftop VRF module serving both floors.',
      tl: 'Dalawang palapag na shop at opisina: ceiling cassette, ducted AHU, at rooftop VRF para sa dalawang palapag.',
      zh: '两层商铺与办公：天花机、暗装风管机，以及屋顶 VRF 机组。',
    },
    points: [
      { en: 'Ductwork, diffusers and VRF branch box', tl: 'Ductwork, diffuser at VRF branch box', zh: '风管、散流器与分歧箱' },
      { en: 'Rooftop condenser and service access', tl: 'Rooftop condenser at service access', zh: '屋顶冷凝机与检修通道' },
      { en: 'Sized for shops, clinics and offices', tl: 'Para sa tindahan, clinic at opisina', zh: '适用于商铺、诊所与办公' },
    ],
    accent: '#F97316',
  },
];

export function BuildingsSection() {
  const enterExperience = useHVACStore((s) => s.enterExperience);
  const setHovered = useHVACStore((s) => s.setHoveredHomeBuilding);

  return (
    <section id="buildings" className="bs" aria-labelledby="bs-heading">
      <div className="bs-inner">
        <p className="bs-eyebrow">
          <span aria-hidden="true" />
          {tr('Residential & Commercial', 'Bahay at Negosyo', '住宅与商用')}
        </p>
        <h2 id="bs-heading" className="bs-h2">
          {tr(
            'Two buildings. Step inside either one in 3D.',
            'Dalawang gusali. Pumasok sa alinman sa 3D.',
            '两栋建筑，任选一栋进入 3D 查看。',
          )}
        </h2>
        <p className="bs-lede">
          {tr(
            `The street below is live 3D, not a video. Pick a building to walk into its system, click any component to see what it does, and book a free ${siteConfig.brand.locationLabel} site assessment when you are ready.`,
            `Live 3D ang kalsada sa ibaba, hindi video. Pumili ng gusali, pindutin ang kahit anong piyesa para makita ang gamit nito, at mag-book ng libreng site assessment sa ${siteConfig.brand.locationLabel}.`,
            `下方街景是实时 3D，并非视频。选择一栋建筑进入其系统，点击任一部件查看作用，准备好即可预约 ${siteConfig.brand.locationLabel} 免费现场勘查。`,
          )}
        </p>

        <div className="bs-grid">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <article
                key={c.id}
                className="bs-card"
                style={{ ['--bs-accent' as string]: c.accent }}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="bs-icon" aria-hidden="true">
                  <Icon className="w-6 h-6" />
                </span>
                <p className="bs-card-eyebrow">{tr(c.eyebrow.en, c.eyebrow.tl, c.eyebrow.zh)}</p>
                <h3 className="bs-card-title">{tr(c.title.en, c.title.tl, c.title.zh)}</h3>
                <p className="bs-card-body">{tr(c.body.en, c.body.tl, c.body.zh)}</p>
                <ul className="bs-points">
                  {c.points.map((pt) => (
                    <li key={pt.en}>{tr(pt.en, pt.tl, pt.zh)}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="bs-btn"
                  onFocus={() => setHovered(c.id)}
                  onBlur={() => setHovered(null)}
                  onClick={() => {
                    setHovered(null);
                    enterExperience(c.id);
                  }}
                >
                  {tr(`Explore ${c.title.en} in 3D`, `Silipin ang ${c.title.en} sa 3D`, `以 3D 查看${tr(c.title.en, c.title.tl, c.title.zh)}`)}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { CalendarCheck, ChevronDown, Settings2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { siteConfig } from '../../config/siteConfig';
import { EQUIPMENT_CATALOG, EquipmentItem } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';

/* ============================================================================
   Geometry helpers
   ----------------------------------------------------------------------------
   Products use a cabinet-oblique box (front face square to the viewer, depth
   receding up-right) so every unit reads clearly at tile size. The centre
   workshop uses a true 2:1 isometric box.
   ============================================================================ */

type Pt = [number, number];
const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

interface ObliqueBox {
  x: number;
  y: number;
  w: number;
  h: number;
  d: number;
}

function oblique({ x, y, w, h, d }: ObliqueBox) {
  const dx = d * 0.6;
  const dy = -d * 0.4;
  return {
    front: pts([[x, y], [x + w, y], [x + w, y - h], [x, y - h]]),
    top: pts([[x, y - h], [x + w, y - h], [x + w + dx, y - h + dy], [x + dx, y - h + dy]]),
    side: pts([[x + w, y], [x + w + dx, y + dy], [x + w + dx, y - h + dy], [x + w, y - h]]),
    /** Map (u, v) in [0,1]² on the top face to screen space. */
    onTop: (u: number, v: number): Pt => [x + u * w + v * dx, y - h + v * dy],
  };
}

function ObBox({
  box,
  front,
  top,
  side,
  stroke = 'rgba(15,23,42,0.35)',
}: {
  box: ObliqueBox;
  front: string;
  top: string;
  side: string;
  stroke?: string;
}) {
  const f = oblique(box);
  return (
    <g strokeLinejoin="round" strokeWidth={0.8} stroke={stroke}>
      <polygon points={f.side} fill={side} />
      <polygon points={f.top} fill={top} />
      <polygon points={f.front} fill={front} />
    </g>
  );
}

/** Spinning fan seen on a top face (ellipse). */
function TopFan({ cx, cy, r, blade = '#334155', speed = 'sr-spin' }: { cx: number; cy: number; r: number; blade?: string; speed?: string }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(1 0.46)`}>
      <circle r={r} fill="#0f172a" />
      <circle r={r} fill="none" stroke="#64748b" strokeWidth={1.4} />
      <g className={speed}>
        {[0, 120, 240].map((a) => (
          <ellipse key={a} rx={r * 0.78} ry={r * 0.26} cx={r * 0.42} transform={`rotate(${a})`} fill={blade} />
        ))}
        <circle r={r * 0.2} fill="#94a3b8" />
      </g>
      {[0.45, 0.75].map((k) => (
        <circle key={k} r={r * k} fill="none" stroke="#475569" strokeWidth={0.7} opacity={0.8} />
      ))}
    </g>
  );
}

/** Cold-air streams that flow out of a unit on hover/focus. */
function AirStreams({ paths }: { paths: string[] }) {
  return (
    <g className="sr-air" fill="none" stroke="#67e8f9" strokeWidth={2} strokeLinecap="round">
      {paths.map((d, i) => (
        <path key={i} d={d} style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </g>
  );
}

/* ============================================================================
   Product illustrations: eight distinct units
   ============================================================================ */

function SplitInverterArt() {
  const box = { x: 18, y: 84, w: 152, h: 46, d: 22 };
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true">
      <rect x={14} y={34} width={170} height={6} rx={2} fill="#1e293b" opacity={0.55} />
      <ObBox box={box} front="#f8fafc" top="#ffffff" side="#cbd5e1" />
      {/* Curved fascia highlight + louver slot */}
      <path d="M22 50 Q94 44 166 50" stroke="#e2e8f0" strokeWidth={2} fill="none" />
      <rect x={28} y={72} width={132} height={7} rx={3.5} fill="#1e293b" />
      <rect x={30} y={73.5} width={128} height={2} rx={1} fill="#475569" />
      {/* Cyan display + badge */}
      <rect x={128} y={54} width={26} height={11} rx={2} fill="#0b1f3a" />
      <text x={141} y={62.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#22d3ee" fontFamily="ui-monospace,monospace">24°</text>
      <text x={30} y={63} fontSize={6.5} fontWeight={700} fill="#94a3b8" letterSpacing={1.2}>INVERTER</text>
      <circle cx={122} cy={59.5} r={1.8} className="sr-blink" fill="#22d3ee" />
      <AirStreams paths={['M45 90 q6 12 0 24', 'M80 90 q6 14 0 28', 'M115 90 q6 12 0 24', 'M148 90 q6 10 0 20']} />
    </svg>
  );
}

function SplitNonInverterArt() {
  const box = { x: 22, y: 86, w: 142, h: 50, d: 26 };
  const f = oblique(box);
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true">
      <ObBox box={box} front="#e2e8f0" top="#f1f5f9" side="#94a3b8" />
      {/* Intake slats on top face */}
      {Array.from({ length: 9 }, (_, i) => {
        const u = 0.08 + i * 0.105;
        const [x1, y1] = f.onTop(u, 0.15);
        const [x2, y2] = f.onTop(u, 0.85);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={1.4} />;
      })}
      {/* Front horizontal grille + grey accent band */}
      {[44, 49, 54].map((y) => (
        <rect key={y} x={30} y={y} width={126} height={2.2} rx={1} fill="#cbd5e1" />
      ))}
      <rect x={22} y={62} width={142} height={6} fill="#64748b" />
      <rect x={30} y={73} width={118} height={8} rx={2} fill="#334155" />
      <circle cx={155} cy={76.5} r={2.2} className="sr-blink" fill="#22c55e" />
      <text x={30} y={41} fontSize={6} fontWeight={700} fill="#64748b" letterSpacing={1}>STANDARD</text>
      <AirStreams paths={['M50 92 q-6 12 0 24', 'M90 92 q-6 14 0 28', 'M130 92 q-6 12 0 24']} />
    </svg>
  );
}

function WindowInverterArt() {
  const box = { x: 40, y: 124, w: 108, h: 80, d: 50 };
  const sideX = 148;
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true">
      <ObBox box={box} front="#f8fafc" top="#e2e8f0" side="#cbd5e1" />
      {/* Rear condenser fins on side face */}
      {Array.from({ length: 8 }, (_, i) => {
        const t = 0.12 + i * 0.1;
        const x = sideX + t * 30;
        const y = 124 - t * 20;
        return <line key={i} x1={x} y1={y - 6} x2={x} y2={y - 74} stroke="#94a3b8" strokeWidth={1.3} />;
      })}
      {/* Front intake grille (upper) */}
      <rect x={48} y={52} width={72} height={36} rx={3} fill="#e2e8f0" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={51} y={55 + i * 4.8} width={66} height={2} rx={1} fill="#94a3b8" />
      ))}
      {/* Louver discharge (lower) */}
      <rect x={48} y={94} width={72} height={20} rx={3} fill="#1e293b" />
      {[98, 103, 108].map((y) => (
        <rect key={y} x={51} y={y} width={66} height={2} rx={1} fill="#64748b" />
      ))}
      {/* Control strip */}
      <rect x={126} y={52} width={16} height={62} rx={3} fill="#e2e8f0" />
      <rect x={128} y={56} width={12} height={8} rx={1.5} fill="#0b1f3a" />
      <text x={134} y={62} textAnchor="middle" fontSize={5.5} fontWeight={700} fill="#22d3ee" fontFamily="ui-monospace,monospace">22</text>
      <circle cx={134} cy={76} r={4.2} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.8} />
      <circle cx={134} cy={92} r={4.2} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.8} />
      <line x1={134} y1={76} x2={134} y2={72.5} stroke="#334155" strokeWidth={1.2} />
      <AirStreams paths={['M60 118 q-4 8 -12 12', 'M84 118 q0 8 -4 14', 'M108 118 q4 8 0 14']} />
    </svg>
  );
}

function FloorMountedArt() {
  const box = { x: 74, y: 132, w: 50, h: 114, d: 24 };
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true">
      <ellipse cx={108} cy={134} rx={44} ry={4} fill="#020617" opacity={0.4} />
      <ObBox box={box} front="#f8fafc" top="#ffffff" side="#cbd5e1" />
      {/* Gold accent + display */}
      <rect x={74} y={26} width={50} height={3} fill="#d4a24c" />
      <rect x={84} y={34} width={30} height={14} rx={3} fill="#0b1f3a" />
      <text x={99} y={44} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#22d3ee" fontFamily="ui-monospace,monospace">18°</text>
      {/* Vertical swing louvers */}
      <rect x={80} y={56} width={38} height={44} rx={4} fill="#1e293b" />
      <g className="sr-sway">
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x={83 + i * 6} y={58} width={2.2} height={40} rx={1} fill="#64748b" />
        ))}
      </g>
      {/* Lower return grille */}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={80} y={106 + i * 3.6} width={38} height={1.6} rx={0.8} fill="#cbd5e1" />
      ))}
      <AirStreams paths={['M70 70 q-14 -4 -26 6', 'M70 80 q-16 0 -30 10', 'M70 90 q-14 4 -24 14']} />
    </svg>
  );
}

function CeilingCassetteArt() {
  const box = { x: 28, y: 108, w: 138, h: 16, d: 64 };
  const f = oblique(box);
  const quad = (u0: number, v0: number, u1: number, v1: number) =>
    pts([f.onTop(u0, v0), f.onTop(u1, v0), f.onTop(u1, v1), f.onTop(u0, v1)]);
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true">
      {/* Ceiling T-bar grid */}
      <g stroke="#334155" strokeWidth={1} opacity={0.7}>
        <line x1={6} y1={40} x2={194} y2={40} />
        <line x1={30} y1={20} x2={18} y2={60} />
        <line x1={190} y1={20} x2={178} y2={60} />
      </g>
      <ObBox box={box} front="#e2e8f0" top="#f8fafc" side="#cbd5e1" />
      {/* Four discharge slots around centre grille */}
      <polygon points={quad(0.1, 0.08, 0.9, 0.2)} fill="#1e293b" />
      <polygon points={quad(0.1, 0.8, 0.9, 0.92)} fill="#1e293b" />
      <polygon points={quad(0.04, 0.24, 0.12, 0.76)} fill="#1e293b" />
      <polygon points={quad(0.88, 0.24, 0.96, 0.76)} fill="#1e293b" />
      <polygon points={quad(0.26, 0.3, 0.74, 0.7)} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.8} />
      {Array.from({ length: 6 }, (_, i) => {
        const u = 0.3 + i * 0.08;
        const [x1, y1] = f.onTop(u, 0.33);
        const [x2, y2] = f.onTop(u, 0.67);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={1} />;
      })}
      <circle cx={f.onTop(0.82, 0.5)[0]} cy={f.onTop(0.82, 0.5)[1]} r={1.8} className="sr-blink" fill="#22d3ee" />
      <AirStreams paths={['M40 112 q-8 10 -16 14', 'M100 112 q0 10 0 18', 'M160 112 q8 10 16 14']} />
    </svg>
  );
}

function DuctedArt() {
  const box = { x: 14, y: 110, w: 112, h: 40, d: 44 };
  const duct = { x: 126, y: 100, w: 58, h: 26, d: 30 };
  const f = oblique(duct);
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true">
      {/* Hanger rods */}
      {[30, 110].map((x) => (
        <line key={x} x1={x} y1={6} x2={x} y2={70} stroke="#475569" strokeWidth={1.6} />
      ))}
      <ObBox box={box} front="#94a3b8" top="#cbd5e1" side="#64748b" />
      {/* Access panel + rating plate */}
      <rect x={22} y={78} width={56} height={26} rx={1.5} fill="#a8b5c6" stroke="#64748b" strokeWidth={0.8} />
      {[22, 78].map((x) => (
        <circle key={x} cx={x + (x === 22 ? 3 : -3)} cy={81} r={1.1} fill="#475569" />
      ))}
      <rect x={86} y={80} width={30} height={12} rx={1} fill="#e2e8f0" />
      <rect x={89} y={83} width={18} height={1.6} fill="#64748b" />
      <rect x={89} y={86.5} width={12} height={1.6} fill="#64748b" />
      {/* Insulated supply duct with foil ribs */}
      <ObBox box={duct} front="#cbd5e1" top="#e2e8f0" side="#94a3b8" />
      {[0.2, 0.4, 0.6, 0.8].map((u) => {
        const [x1, y1] = f.onTop(u, 0);
        const [x2, y2] = f.onTop(u, 1);
        return (
          <g key={u} stroke="#94a3b8" strokeWidth={1}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            <line x1={x1} y1={y1} x2={x1} y2={y1 + 26} />
          </g>
        );
      })}
      <AirStreams paths={['M190 82 q6 0 8 -4', 'M190 92 q6 0 8 0', 'M190 102 q6 0 8 4']} />
    </svg>
  );
}

function RooftopPackagedArt() {
  const box = { x: 18, y: 120, w: 146, h: 60, d: 50 };
  const f = oblique(box);
  const fan1 = f.onTop(0.3, 0.5);
  const fan2 = f.onTop(0.72, 0.5);
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true">
      {/* Roof curb rail */}
      <rect x={14} y={120} width={154} height={8} fill="#334155" />
      <ObBox box={box} front="#e5e7eb" top="#f3f4f6" side="#9ca3af" />
      <TopFan cx={fan1[0]} cy={fan1[1]} r={19} />
      <TopFan cx={fan2[0]} cy={fan2[1]} r={19} />
      {/* Condenser coil section (left) */}
      <rect x={24} y={66} width={62} height={48} rx={2} fill="#cbd5e1" />
      {Array.from({ length: 14 }, (_, i) => (
        <line key={i} x1={27 + i * 4.3} y1={68} x2={27 + i * 4.3} y2={112} stroke="#64748b" strokeWidth={1} />
      ))}
      {/* Access panels (right) */}
      {[92, 126].map((x) => (
        <g key={x}>
          <rect x={x} y={66} width={30} height={48} rx={2} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={0.9} />
          <rect x={x + 24} y={86} width={2.4} height={9} rx={1} fill="#475569" />
        </g>
      ))}
      <rect x={96} y={70} width={14} height={5} rx={1} fill="#f97316" />
    </svg>
  );
}

function VrfArt() {
  const left = { x: 22, y: 128, w: 64, h: 92, d: 34 };
  const right = { x: 96, y: 128, w: 64, h: 92, d: 34 };
  const fl = oblique(left);
  const fr = oblique(right);
  const grille = (x: number) => (
    <g>
      <rect x={x + 6} y={58} width={52} height={50} rx={2} fill="#cbd5e1" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={x + 8} y={61 + i * 5.2} width={48} height={2} rx={1} fill="#94a3b8" />
      ))}
      <rect x={x + 6} y={114} width={20} height={6} rx={1} fill="#0b1f3a" />
      <text x={x + 16} y={118.8} textAnchor="middle" fontSize={4.6} fontWeight={700} fill="#22d3ee" fontFamily="ui-monospace,monospace">VRF</text>
    </g>
  );
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true">
      <ObBox box={left} front="#f1f5f9" top="#f8fafc" side="#94a3b8" />
      <TopFan cx={fl.onTop(0.5, 0.5)[0]} cy={fl.onTop(0.5, 0.5)[1]} r={21} speed="sr-spin sr-spin--b" />
      {grille(22)}
      <ObBox box={right} front="#f1f5f9" top="#f8fafc" side="#94a3b8" />
      <TopFan cx={fr.onTop(0.5, 0.5)[0]} cy={fr.onTop(0.5, 0.5)[1]} r={21} />
      {grille(96)}
    </svg>
  );
}

const ART: Record<string, () => ReactNode> = {
  res_split_inv: SplitInverterArt,
  res_split_non_inv: SplitNonInverterArt,
  res_window_inv: WindowInverterArt,
  res_floor_mounted: FloorMountedArt,
  com_cassette: CeilingCassetteArt,
  com_ducted: DuctedArt,
  com_packaged: RooftopPackagedArt,
  com_vrf: VrfArt,
};

const LEFT_IDS = ['res_split_inv', 'res_split_non_inv', 'res_window_inv', 'res_floor_mounted'];
const RIGHT_IDS = ['com_cassette', 'com_ducted', 'com_packaged', 'com_vrf'];

/* ============================================================================
   Product tile → turns into a full card on hover / focus / tap
   ============================================================================ */

function ProductCard({ item, align }: { item: EquipmentItem; align: 'left' | 'right' }) {
  const language = useHVACStore((s) => s.language);
  const enterExperience = useHVACStore((s) => s.enterExperience);
  const setSelectedEquipmentId = useHVACStore((s) => s.setSelectedEquipmentId);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const Art = ART[item.id];
  const en = language === 'en';
  const accent = item.audience === 'residential' ? 'cyan' : 'amber';

  return (
    <div className="sr-unit" data-accent={accent} data-align={align}>
      <div
        className="sr-unit-card"
        tabIndex={0}
        role="group"
        aria-label={`${en ? item.nameEn : item.nameTaglish}: ${item.capacityRange}`}
      >
        <div className="sr-unit-art">
          <Art />
        </div>
        <p className="sr-unit-name">{en ? item.nameEn : item.nameTaglish}</p>

        <div className="sr-unit-info">
          <div className="sr-unit-info-inner">
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="sr-chip">{item.capacityRange.split(' (')[0]}</span>
              {item.inverter && <span className="sr-chip sr-chip--ok">Inverter</span>}
            </div>
            <dl className="mt-2 space-y-1.5 text-[11.5px] leading-snug text-slate-300">
              <div>
                <dt className="sr-dt">{en ? 'Best for' : 'Bagay sa'}</dt>
                <dd>{en ? item.bestForEn : item.bestForTaglish}</dd>
              </div>
              <div>
                <dt className="sr-dt">{en ? 'Noise' : 'Ingay'}</dt>
                <dd>{item.noiseDba}</dd>
              </div>
              <div>
                <dt className="sr-dt">{en ? 'Indicative price' : 'Tinatayang presyo'}</dt>
                <dd className="font-semibold text-white">{item.priceEstimatePhp}</dd>
              </div>
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className="sr-btn sr-btn--ghost"
                onClick={() => {
                  enterExperience(item.audience, { service: 'equipment' });
                  setSelectedEquipmentId(item.id);
                }}
              >
                {en ? 'View in 3D' : 'Tingnan sa 3D'}
              </button>
              <button type="button" className="sr-btn sr-btn--solid" onClick={() => setQuoteModalOpen(true)}>
                {en ? 'Get quote' : 'Magpa-quote'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   Centre workshop: animated isometric scene with technicians at work
   ============================================================================ */

const ISO_X = 0.866;
const ISO_Y = 0.5;

function IsoBox({
  x,
  y,
  w,
  d,
  h,
  top,
  left,
  right,
  className,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  top: string;
  left: string;
  right: string;
  className?: string;
}) {
  const R: Pt = [w * ISO_X, -w * ISO_Y];
  const L: Pt = [-d * ISO_X, -d * ISO_Y];
  const up = (a: Pt[]) => pts(a.map(([px, py]) => [px, py - h] as Pt));
  const P: Pt = [x, y];
  const PR: Pt = [x + R[0], y + R[1]];
  const PL: Pt = [x + L[0], y + L[1]];
  const PRL: Pt = [x + R[0] + L[0], y + R[1] + L[1]];
  return (
    <g className={className} stroke="rgba(2,6,23,0.35)" strokeWidth={0.8} strokeLinejoin="round">
      <polygon points={pts([P, PL, [PL[0], PL[1] - h], [P[0], P[1] - h]])} fill={left} />
      <polygon points={pts([P, PR, [PR[0], PR[1] - h], [P[0], P[1] - h]])} fill={right} />
      <polygon points={up([P, PR, PRL, PL])} fill={top} />
    </g>
  );
}

/** A stylised technician. Arm groups pivot at the shoulder (local 0,0). */
function Technician({
  x,
  y,
  flip = false,
  armLeft,
  armRight,
  armLeftClass,
  armRightClass,
  headClass,
  bodyClass = 'sr-breathe',
  legClass,
  prop,
  shirt = '#1d4ed8',
}: {
  x: number;
  y: number;
  flip?: boolean;
  armLeft: number;
  armRight: number;
  armLeftClass?: string;
  armRightClass?: string;
  headClass?: string;
  bodyClass?: string;
  legClass?: [string, string];
  prop?: ReactNode;
  shirt?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cx={0} cy={2} rx={16} ry={5} fill="#020617" opacity={0.45} />
      {/* Legs */}
      <g transform="translate(-5 -30)">
        <g className={legClass?.[0]}>
          <rect x={-3.5} y={0} width={7} height={30} rx={3} fill="#0f2a4a" />
          <rect x={-4} y={26} width={9} height={5} rx={2} fill="#111827" />
        </g>
      </g>
      <g transform="translate(5 -30)">
        <g className={legClass?.[1]}>
          <rect x={-3.5} y={0} width={7} height={30} rx={3} fill="#12355d" />
          <rect x={-4} y={26} width={9} height={5} rx={2} fill="#111827" />
        </g>
      </g>
      <g className={bodyClass}>
        {/* Back arm */}
        <g transform="translate(-9 -56)">
          <g className={armLeftClass} style={{ transform: armLeftClass ? undefined : `rotate(${armLeft}deg)` }}>
            <rect x={-3.2} y={0} width={6.4} height={24} rx={3.2} fill={shirt} style={{ filter: 'brightness(0.8)' }} />
            <circle cx={0} cy={25} r={3.6} fill="#c68b59" />
          </g>
        </g>
        {/* Torso */}
        <rect x={-11} y={-60} width={22} height={32} rx={7} fill={shirt} />
        <rect x={-11} y={-36} width={22} height={5} fill="#0f172a" opacity={0.55} />
        <rect x={2} y={-55} width={6} height={4} rx={1} fill="#22d3ee" opacity={0.9} />
        {/* Head */}
        <g transform="translate(0 -68)">
          <g className={headClass}>
            <rect x={-3} y={4} width={6} height={6} fill="#b97a4c" />
            <circle cx={0} cy={0} r={8} fill="#c68b59" />
            <path d="M-8.5 -1 Q0 -13 8.5 -1 Z" fill="#0b1f3a" />
            <rect x={2} y={-3} width={10} height={3} rx={1.5} fill="#0b1f3a" />
            <circle cx={3.5} cy={1} r={1} fill="#1e293b" />
          </g>
        </g>
        {/* Front arm */}
        <g transform="translate(9 -56)">
          <g className={armRightClass} style={{ transform: armRightClass ? undefined : `rotate(${armRight}deg)` }}>
            <rect x={-3.2} y={0} width={6.4} height={24} rx={3.2} fill={shirt} />
            <circle cx={0} cy={25} r={3.6} fill="#c68b59" />
            {prop}
          </g>
        </g>
      </g>
    </g>
  );
}

function Gauge({ cx, cy, r, color, needleClass }: { cx: number; cy: number; r: number; color: string; needleClass: string }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r} fill="#0b1f3a" stroke={color} strokeWidth={1.6} />
      <path d={`M${-r * 0.7} ${r * 0.3} A ${r * 0.76} ${r * 0.76} 0 1 1 ${r * 0.7} ${r * 0.3}`} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={2} />
      <g className={needleClass}>
        <line x1={0} y1={0} x2={0} y2={-r * 0.7} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </g>
      <circle r={1.6} fill={color} />
    </g>
  );
}

function WorkshopScene() {
  return (
    <svg viewBox="0 0 600 440" className="w-full h-auto" role="img" aria-label="Apex technicians at work: diagnosing an outdoor unit, running a system scan, and planning service schedules">
      <defs>
        <radialGradient id="sr-floor-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="sr-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e3a5f" />
          <stop offset="100%" stopColor="#0b1f3a" />
        </linearGradient>
        <linearGradient id="sr-holo" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Isometric platform */}
      <polygon points="300,150 560,300 300,450 40,300" fill="#1a2b45" />
      <polygon points="40,300 300,450 300,462 40,312" fill="#0f1c31" />
      <polygon points="560,300 300,450 300,462 560,312" fill="#13233c" />
      <g stroke="#2b4266" strokeWidth={0.8} opacity={0.7}>
        {Array.from({ length: 9 }, (_, i) => {
          const t = (i + 1) / 10;
          return (
            <g key={i}>
              <line x1={300 - 260 * t} y1={150 + 150 * t} x2={560 - 260 * t} y2={300 + 150 * t} />
              <line x1={300 + 260 * t} y1={150 + 150 * t} x2={40 + 260 * t} y2={300 + 150 * t} />
            </g>
          );
        })}
      </g>
      <ellipse cx={300} cy={315} rx={190} ry={95} fill="url(#sr-floor-glow)" className="sr-pulse" />

      {/* ── Back: diagnostics wall monitor ── */}
      <g transform="translate(214 40)">
        <rect x={84} y={150} width={8} height={60} fill="#334155" />
        <rect x={0} y={0} width={176} height={112} rx={8} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
        <rect x={6} y={6} width={164} height={100} rx={5} fill="url(#sr-screen)" />
        <text x={14} y={20} fontSize={10} fontWeight={800} fill="#e2e8f0" fontFamily="var(--font-display)">Apex</text>
        <text x={162} y={20} textAnchor="end" fontSize={6.5} fill="#67e8f9" fontFamily="ui-monospace,monospace" className="sr-blink">● LIVE</text>
        <Gauge cx={30} cy={48} r={13} color="#22d3ee" needleClass="sr-needle-a" />
        <Gauge cx={64} cy={48} r={13} color="#f97316" needleClass="sr-needle-b" />
        {/* Thermometer */}
        <rect x={88} y={33} width={6} height={28} rx={3} fill="#0f172a" stroke="#475569" />
        <rect x={89.5} y={40} width={3} height={20} rx={1.5} fill="#ef4444" className="sr-thermo" />
        {/* Live line graph */}
        <rect x={104} y={30} width={60} height={34} rx={3} fill="#0b1f3a" stroke="#1e3a5f" />
        <path d="M107 56 L116 50 L124 53 L132 42 L140 46 L148 36 L160 40" fill="none" stroke="#22d3ee" strokeWidth={1.6} className="sr-graph" />
        {/* Bar meters */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x={14 + i * 10} y={74} width={6} height={22} rx={1.5} fill={i % 3 === 2 ? '#f97316' : '#22d3ee'} className="sr-bar" style={{ animationDelay: `${i * 0.22}s` }} />
        ))}
        <rect x={92} y={74} width={72} height={6} rx={3} fill="#1e3a5f" />
        <rect x={92} y={74} width={72} height={6} rx={3} fill="#22d3ee" className="sr-progress" />
        <text x={92} y={93} fontSize={6.5} fill="#94a3b8" fontFamily="ui-monospace,monospace">SYS CHECK</text>
        <text x={164} y={93} textAnchor="end" fontSize={6.5} fill="#4ade80" fontFamily="ui-monospace,monospace">OK</text>
      </g>

      {/* Floating calendar chips */}
      {[
        { x: 430, y: 118, d: '0s' },
        { x: 470, y: 150, d: '0.8s' },
        { x: 120, y: 170, d: '1.4s' },
      ].map((c, i) => (
        <g key={i} className="sr-float" style={{ animationDelay: c.d }}>
          <g transform={`translate(${c.x} ${c.y})`}>
            <rect x={0} y={0} width={30} height={30} rx={4} fill="#f8fafc" />
            <rect x={0} y={0} width={30} height={9} rx={4} fill="#ef4444" />
            <rect x={0} y={5} width={30} height={4} fill="#ef4444" />
            {[0, 1, 2].map((r) =>
              [0, 1, 2, 3].map((k) => (
                <rect key={`${r}-${k}`} x={4 + k * 6} y={12 + r * 5.5} width={3.6} height={3.2} rx={0.6} fill={r === 1 && k === 2 ? '#22d3ee' : '#cbd5e1'} />
              )),
            )}
          </g>
        </g>
      ))}

      {/* ── Left: outdoor condenser under diagnosis ── */}
      <IsoBox x={170} y={300} w={66} d={56} h={64} top="#e2e8f0" left="#cbd5e1" right="#94a3b8" />
      {/* Fan on top face */}
      <g transform="translate(176 239)">
        <g transform="scale(1 0.58) rotate(0)">
          <circle r={24} fill="#0f172a" stroke="#64748b" strokeWidth={1.4} />
          <g className="sr-spin sr-spin--fast">
            {[0, 120, 240].map((a) => (
              <ellipse key={a} rx={18} ry={6} cx={9} transform={`rotate(${a})`} fill="#475569" />
            ))}
          </g>
          <circle r={4} fill="#94a3b8" />
        </g>
      </g>
      {/* Side coil fins */}
      <g stroke="#64748b" strokeWidth={1}>
        {Array.from({ length: 8 }, (_, i) => {
          const t = 0.1 + i * 0.1;
          const x = 170 - 56 * ISO_X * t;
          const y = 300 - 56 * ISO_Y * t;
          return <line key={i} x1={x} y1={y - 8} x2={x} y2={y - 56} />;
        })}
      </g>
      {/* Hot exhaust shimmer */}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={168 + i * 10} cy={226} r={3} fill="#fdba74" className="sr-rise-warm" style={{ animationDelay: `${i * 0.6}s` }} />
      ))}
      {/* Gauge hoses to service ports */}
      <path d="M214 290 C 226 300, 236 284, 246 262" fill="none" stroke="#3b82f6" strokeWidth={2.2} />
      <path d="M216 296 C 232 312, 244 290, 250 266" fill="none" stroke="#ef4444" strokeWidth={2.2} />

      {/* Technician A: manifold gauges at condenser */}
      <Technician
        x={262}
        y={330}
        flip
        armLeft={20}
        armRight={0}
        armRightClass="sr-arm-check"
        headClass="sr-head-look"
        prop={
          <g transform="translate(0 28)">
            <rect x={-10} y={-2} width={20} height={12} rx={3} fill="#334155" />
            <circle cx={-4.5} cy={4} r={4} fill="#0b1f3a" stroke="#3b82f6" strokeWidth={1.2} />
            <circle cx={4.5} cy={4} r={4} fill="#0b1f3a" stroke="#ef4444" strokeWidth={1.2} />
            <g transform="translate(-4.5 4)">
              <g className="sr-needle-a">
                <line x1={0} y1={0} x2={0} y2={-3} stroke="#93c5fd" strokeWidth={1} />
              </g>
            </g>
            <g transform="translate(4.5 4)">
              <g className="sr-needle-b">
                <line x1={0} y1={0} x2={0} y2={-3} stroke="#fca5a5" strokeWidth={1} />
              </g>
            </g>
          </g>
        }
      />

      {/* Refrigerant cylinders */}
      <g transform="translate(118 340)">
        <rect x={0} y={-34} width={16} height={34} rx={7} fill="#16a34a" />
        <rect x={5} y={-40} width={6} height={7} rx={1} fill="#334155" />
        <rect x={22} y={-42} width={18} height={42} rx={8} fill="#dc2626" />
        <rect x={28} y={-48} width={6} height={7} rx={1} fill="#334155" />
        <ellipse cx={20} cy={1} rx={24} ry={5} fill="#020617" opacity={0.35} />
      </g>

      {/* ── Centre: holographic service console ── */}
      <IsoBox x={300} y={392} w={70} d={70} h={34} top="#e2e8f0" left="#94a3b8" right="#cbd5e1" />
      {/* Holo projection beam */}
      <polygon points="262,322 338,322 322,250 278,250" fill="url(#sr-holo)" opacity={0.5} className="sr-pulse" />
      <g transform="translate(300 322)">
        <ellipse rx={48} ry={26} fill="#22d3ee" opacity={0.16} className="sr-pulse" />
        <g transform="scale(1 0.55)">
          <circle r={38} fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="4 5" className="sr-spin sr-spin--slow" />
          <g className="sr-spin">
            {[0, 90, 180, 270].map((a) => (
              <path key={a} d="M0 0 C 8 -18, 26 -22, 30 -8 C 18 -10, 10 -6, 0 0 Z" transform={`rotate(${a})`} fill="#67e8f9" opacity={0.85} />
            ))}
          </g>
          <circle r={6} fill="#ecfeff" />
        </g>
      </g>
      {/* Cool air particles rising */}
      {Array.from({ length: 7 }, (_, i) => (
        <circle
          key={i}
          cx={272 + i * 9}
          cy={318}
          r={2.4}
          fill="#a5f3fc"
          className="sr-rise"
          style={{ animationDelay: `${i * 0.42}s` }}
        />
      ))}

      {/* Technician B: running system scan on the console */}
      <Technician
        x={250}
        y={402}
        armLeft={-60}
        armRight={-70}
        armLeftClass="sr-arm-type-a"
        armRightClass="sr-arm-type-b"
        headClass="sr-head-nod"
        shirt="#1e40af"
      />

      {/* ── Right: equipment rack + tablet technician ── */}
      <IsoBox x={444} y={298} w={30} d={44} h={88} top="#94a3b8" left="#64748b" right="#475569" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <polygon
            points={pts([
              [444, 298 - 16 - i * 20],
              [444 + 30 * ISO_X, 298 - 16 - i * 20 - 30 * ISO_Y],
              [444 + 30 * ISO_X, 298 - 30 - i * 20 - 30 * ISO_Y],
              [444, 298 - 30 - i * 20],
            ])}
            fill="#334155"
          />
          <circle cx={450} cy={298 - 25 - i * 20} r={1.6} fill={i === 1 ? '#f97316' : '#22c55e'} className="sr-blink" style={{ animationDelay: `${i * 0.5}s` }} />
        </g>
      ))}
      {/* Tool chest */}
      <IsoBox x={392} y={392} w={40} d={26} h={36} top="#ef4444" left="#b91c1c" right="#dc2626" />
      {[0, 1, 2].map((i) => (
        <line key={i} x1={394} y1={386 - i * 10} x2={426} y2={368 - i * 10} stroke="#7f1d1d" strokeWidth={1.4} />
      ))}

      {/* Technician C: tablet inspection */}
      <Technician
        x={404}
        y={338}
        flip
        armLeft={-50}
        armRight={-80}
        armRightClass="sr-arm-tablet"
        headClass="sr-head-scan"
        shirt="#2563eb"
        prop={
          <g transform="translate(-2 22) rotate(70)">
            <rect x={-9} y={-12} width={18} height={24} rx={2.5} fill="#0f172a" />
            <rect x={-7} y={-10} width={14} height={20} rx={1.5} fill="#22d3ee" className="sr-screen-flicker" />
          </g>
        }
      />

      {/* Technician D: walks across the front carrying a new filter */}
      <g className="sr-walk-path">
        <g className="sr-walk-flip">
          <Technician
            x={0}
            y={0}
            armLeft={-40}
            armRight={-40}
            bodyClass="sr-walk-bob"
            legClass={['sr-leg-a', 'sr-leg-b']}
            shirt="#0e7490"
            prop={
              <g transform="translate(10 20) rotate(40)">
                <rect x={-14} y={-10} width={28} height={20} rx={2} fill="#e2e8f0" stroke="#64748b" />
                {[0, 1, 2, 3].map((k) => (
                  <line key={k} x1={-11 + k * 7} y1={-8} x2={-11 + k * 7} y2={8} stroke="#94a3b8" />
                ))}
              </g>
            }
          />
        </g>
      </g>
    </svg>
  );
}

/* ============================================================================
   Section
   ============================================================================ */

export function ProductShowroomHero() {
  const language = useHVACStore((s) => s.language);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const en = language === 'en';

  const byId = (id: string) => EQUIPMENT_CATALOG.find((e) => e.id === id)!;
  const left = LEFT_IDS.map(byId);
  const right = RIGHT_IDS.map(byId);

  return (
    <section aria-labelledby="showroom-heading" className="sr-section relative w-full">
      <div aria-hidden="true" className="bp-band-grid" />
      <div aria-hidden="true" className="sr-section-glow" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 sm:pt-8 pb-10">
        <header className="text-center max-w-4xl mx-auto">
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#67e8f9]">
            {siteConfig.brand.name} <span aria-hidden="true">·</span> {siteConfig.brand.locationLabel}
          </p>
          <h1
            id="showroom-heading"
            className="mt-2 font-display font-extrabold tracking-tight text-white text-balance leading-[1.08]"
            style={{ fontSize: 'clamp(1.75rem, 3.6vw, 3.1rem)' }}
          >
            {en
              ? 'Professional HVAC Services & High-Quality Aircon Products'
              : 'Propesyonal na HVAC Services at De-kalidad na Aircon'}
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {en
              ? 'From split-type, window and floor-mounted units to cassettes, ducted and VRF systems, our certified local technicians handle installation, cleaning and emergency repairs. Hover any unit to compare.'
              : 'Mula split-type, window at floor-mounted hanggang cassette, ducted at VRF, kami ang bahala sa installation, cleaning at emergency repair. I-hover ang unit para makita ang detalye.'}
          </p>
        </header>

        <div className="sr-stage mt-6 sm:mt-8">
          <div className="sr-col">
            <p className="sr-col-label">{en ? 'Residential' : 'Pambahay'}</p>
            <div className="sr-grid">
              {left.map((item) => (
                <ProductCard key={item.id} item={item} align="left" />
              ))}
            </div>
          </div>

          <div className="sr-center">
            <WorkshopScene />
          </div>

          <div className="sr-col">
            <p className="sr-col-label sr-col-label--amber">{en ? 'Commercial' : 'Pang-negosyo'}</p>
            <div className="sr-grid">
              {right.map((item) => (
                <ProductCard key={item.id} item={item} align="right" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <a
              href="#services"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl border border-[#22D3EE]/45 bg-[#0B1F3A]/80 text-white font-display font-bold text-sm sm:text-base min-h-[48px] hover:border-[#67e8f9] hover:bg-[#0e2a4d] transition-colors"
            >
              <Settings2 className="w-4 h-4" aria-hidden="true" />
              {en ? 'Browse Aircon Services' : 'Tingnan ang mga Serbisyo'}
            </a>
            <button
              type="button"
              onClick={() => setQuoteModalOpen(true)}
              className="cta-glow-amber cta-shimmer inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#c2410c] via-[#ea580c] to-[#F97316] border border-[#fdba74]/80 text-white font-display font-bold text-sm sm:text-base min-h-[48px] cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" aria-hidden="true" />
              {en ? 'Book a Service Appointment' : 'Mag-book ng Serbisyo'}
            </button>
          </div>
          <a
            href="#explore-3d"
            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-[#67e8f9] hover:text-white transition-colors"
          >
            {en ? 'Explore a home or commercial building in 3D' : 'Silipin ang bahay o commercial building sa 3D'}
            <ChevronDown className="w-4 h-4 animate-bounce" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

import { Box as BoxIcon, CalendarCheck, ChevronDown, Settings2, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Suspense, createContext, lazy, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { siteConfig } from '../../config/siteConfig';
import { EQUIPMENT_CATALOG } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';
import type { InspectTarget } from './AirconInspector';

// three.js only loads when a visitor opens a unit in 3D.
const AirconInspector = lazy(() => import('./AirconInspector'));

/* ============================================================================
   Projection
   ----------------------------------------------------------------------------
   World space: +x runs toward the front-right, +y toward the front-left, +z up.
   The projection is affine, so every box face is an affine image of a flat
   rectangle. Face details are drawn as ordinary 2D SVG inside a `matrix()`
   group and land on the face with correct perspective, including spinning fans.
   ============================================================================ */

type Pt = [number, number];

const VB_W = 1400;
const VB_H = 700;
const OX = 655;
const OY = 170;
const KX = 0.9;
const KY = 0.34;
const KZ = 0.95;

const P = (x: number, y: number, z = 0): Pt => [OX + (x - y) * KX, OY + (x + y) * KY - z * KZ];
const mat = (o: Pt, a: Pt, b: Pt) =>
  `matrix(${a[0]} ${a[1]} ${b[0]} ${b[1]} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;
const AX: Pt = [KX, KY]; // +x
const AYN: Pt = [KX, -KY]; // -y
const AY: Pt = [-KX, KY]; // +y
const AZN: Pt = [0, KZ]; // -z

const FLOOR_M = mat(P(0, 0, 0), AX, AY);

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)),
  );
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

interface BlockProps {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  color: string;
  /** Drawn in local coords: top = w × d, left (+y face) = w × h, right (+x face) = d × h */
  top?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  shadow?: boolean;
}

const EDGE = { stroke: 'rgba(15,23,42,0.28)', strokeWidth: 0.7, vectorEffect: 'non-scaling-stroke' as const };

function Block({ x, y, z = 0, w, d, h, color, top, left, right, shadow }: BlockProps) {
  const castShadow = shadow ?? z === 0;
  return (
    <g>
      {castShadow && (
        <g transform={FLOOR_M}>
          <rect x={x + 4} y={y - 2} width={w + 22} height={d + 10} rx={12} fill="#020617" opacity={0.3} filter="url(#sr-blur)" />
        </g>
      )}
      <g transform={mat(P(x + w, y + d, z + h), AYN, AZN)}>
        <rect width={d} height={h} fill={shade(color, -0.22)} {...EDGE} />
        {right}
        <rect width={d} height={h} fill="url(#sr-g-right)" />
      </g>
      <g transform={mat(P(x, y + d, z + h), AX, AZN)}>
        <rect width={w} height={h} fill={color} {...EDGE} />
        {left}
        <rect width={w} height={h} fill="url(#sr-g-left)" />
      </g>
      <g transform={mat(P(x, y, z + h), AX, AY)}>
        <rect width={w} height={d} fill={shade(color, 0.2)} {...EDGE} />
        {top}
        <rect width={w} height={d} fill="url(#sr-g-top)" />
      </g>
    </g>
  );
}

/* ── Small drawing primitives (local face coords) ── */

function Slats({ x, y, w, h, gap, color, vertical = false, sw = 1.2 }: { x: number; y: number; w: number; h: number; gap: number; color: string; vertical?: boolean; sw?: number }) {
  const n = Math.floor((vertical ? w : h) / gap);
  return (
    <g stroke={color} strokeWidth={sw}>
      {Array.from({ length: n }, (_, i) =>
        vertical ? (
          <line key={i} x1={x + gap * (i + 0.5)} y1={y} x2={x + gap * (i + 0.5)} y2={y + h} />
        ) : (
          <line key={i} x1={x} y1={y + gap * (i + 0.5)} x2={x + w} y2={y + gap * (i + 0.5)} />
        ),
      )}
    </g>
  );
}

function Fan({ cx, cy, r, blade = '#475569', cls = 'sr-spin' }: { cx: number; cy: number; r: number; blade?: string; cls?: string }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r} fill="#0b1220" />
      <g className={cls}>
        {[0, 120, 240].map((a) => (
          <path
            key={a}
            d={`M0 0 C ${r * 0.2} ${-r * 0.55}, ${r * 0.75} ${-r * 0.62}, ${r * 0.88} ${-r * 0.2} C ${r * 0.6} ${-r * 0.08}, ${r * 0.3} 0, 0 0 Z`}
            transform={`rotate(${a})`}
            fill={blade}
          />
        ))}
      </g>
      <circle r={r * 0.16} fill="#94a3b8" />
      <g fill="none" stroke="#64748b" strokeWidth={0.9}>
        {[0.38, 0.64, 0.9].map((k) => (
          <circle key={k} r={r * k} />
        ))}
        <circle r={r} stroke="#94a3b8" strokeWidth={1.6} />
        {[0, 45, 90, 135].map((a) => (
          <line key={a} x1={-r} x2={r} transform={`rotate(${a})`} strokeWidth={0.6} />
        ))}
      </g>
    </g>
  );
}

/* ============================================================================
   Hover / focus → product card
   ============================================================================ */

type Zone = 'left' | 'right';

interface HotMeta {
  id: string;
  catalogId: string;
  variant: string;
  zone: Zone;
  anchor: Pt;
}

interface HotCtx {
  active: HotMeta | null;
  open: (m: HotMeta) => void;
  inspect: (m: HotMeta) => void;
  scheduleClose: () => void;
  cancelClose: () => void;
}

const HotContext = createContext<HotCtx | null>(null);

function Hot({ meta, children }: { meta: HotMeta; children: ReactNode }) {
  const ctx = useContext(HotContext)!;
  const item = EQUIPMENT_CATALOG.find((e) => e.id === meta.catalogId);
  const isActive = ctx.active?.id === meta.id;
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctx.inspect(meta);
    }
  };
  return (
    <g
      className={`sr-item${isActive ? ' is-active' : ''}`}
      data-accent={item?.audience === 'commercial' ? 'amber' : 'cyan'}
      tabIndex={0}
      role="button"
      aria-label={`${meta.variant}: ${item?.nameEn ?? ''}. Open in 3D`}
      aria-expanded={isActive}
      onMouseEnter={() => ctx.open(meta)}
      onMouseLeave={ctx.scheduleClose}
      onFocus={() => ctx.open(meta)}
      onBlur={ctx.scheduleClose}
      onClick={() => ctx.inspect(meta)}
      onKeyDown={onKey}
    >
      {children}
    </g>
  );
}

function ProductPopover({ meta, onClose }: { meta: HotMeta; onClose: () => void }) {
  const ctx = useContext(HotContext)!;
  const language = useHVACStore((s) => s.language);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const item = EQUIPMENT_CATALOG.find((e) => e.id === meta.catalogId);
  if (!item) return null;
  const en = language === 'en';
  const accent = item.audience === 'commercial' ? 'amber' : 'cyan';

  return (
    <div
      className="sr-pop"
      data-zone={meta.zone}
      data-accent={accent}
      role="dialog"
      aria-label={en ? item.nameEn : item.nameTaglish}
      style={{ left: `${(meta.anchor[0] / VB_W) * 100}%`, top: `${(meta.anchor[1] / VB_H) * 100}%` }}
      onMouseEnter={ctx.cancelClose}
      onMouseLeave={ctx.scheduleClose}
      onFocus={ctx.cancelClose}
      onBlur={ctx.scheduleClose}
    >
      <button type="button" className="sr-pop-close" onClick={onClose} aria-label={en ? 'Close' : 'Isara'}>
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <p className="sr-pop-eyebrow">
        {item.audience === 'commercial' ? (en ? 'Commercial' : 'Pang-negosyo') : en ? 'Residential' : 'Pambahay'} · {meta.variant}
      </p>
      <h3 className="mt-1 pr-6 font-display text-[15px] font-bold leading-snug text-white">
        {en ? item.nameEn : item.nameTaglish}
      </h3>
      <p className="mt-1 text-[11px] text-slate-400">{en ? 'Click the unit to see it in 3D with brand specs' : 'I-click ang unit para makita sa 3D kasama ang specs'}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="sr-chip">{item.capacityRange.split(' (')[0]}</span>
        {item.inverter && <span className="sr-chip sr-chip--ok">Inverter</span>}
        <span className="sr-chip sr-chip--muted">{item.noiseDba.split(' (')[0]}</span>
      </div>
      <dl className="mt-2.5 space-y-1.5 text-[12px] leading-snug text-slate-300">
        <div>
          <dt className="sr-dt">{en ? 'Best for' : 'Bagay sa'}</dt>
          <dd>{en ? item.bestForEn : item.bestForTaglish}</dd>
        </div>
        <div>
          <dt className="sr-dt">{en ? 'Why choose it' : 'Bakit ito'}</dt>
          <dd>{en ? item.notesEn : item.notesTaglish}</dd>
        </div>
        <div>
          <dt className="sr-dt">{en ? 'Indicative price' : 'Tinatayang presyo'}</dt>
          <dd className="font-semibold text-white">{item.priceEstimatePhp}</dd>
        </div>
      </dl>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="sr-btn sr-btn--ghost" onClick={() => ctx.inspect(meta)}>
          <BoxIcon className="w-3.5 h-3.5" aria-hidden="true" />
          {en ? 'Inspect in 3D' : 'Silipin sa 3D'}
        </button>
        <button type="button" className="sr-btn sr-btn--solid" onClick={() => setQuoteModalOpen(true)}>
          {en ? 'Get a quote' : 'Magpa-quote'}
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   Aircon units
   ============================================================================ */

/** Wall-mounted split, mounted on the pegboard. Its front is the +x face. */
function WallSplit({ x, y, z, d, h, body, style }: { x: number; y: number; z: number; d: number; h: number; body: string; style: 'premium' | 'standard' | 'onyx' | 'slim' }) {
  const dark = style === 'onyx';
  const right = (
    <g>
      {style === 'premium' && <path d={`M4 ${h * 0.2} Q${d / 2} ${h * 0.05} ${d - 4} ${h * 0.2}`} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={1.4} fill="none" />}
      {style === 'standard' && <Slats x={6} y={4} w={d - 12} h={h * 0.38} gap={3.4} color="#cbd5e1" />}
      {style === 'slim' && <rect x={0} y={h * 0.42} width={d} height={3} fill="#94a3b8" />}
      {style === 'standard' && <rect x={0} y={h * 0.5} width={d} height={4} fill="#64748b" />}
      <rect x={5} y={h - 10} width={d - 10} height={6} rx={3} fill={dark ? '#000000' : '#1f2937'} />
      <g className="sr-louver">
        <rect x={7} y={h - 8.8} width={d - 14} height={1.6} rx={0.8} fill={dark ? '#334155' : '#94a3b8'} />
      </g>
      {[0.25, 0.5, 0.75].map((t, i) => (
        <path key={t} d={`M${d * t} ${h - 3} q-3 6 0 12 q3 6 0 12`} stroke="#bae6fd" strokeWidth={1.1} fill="none" strokeLinecap="round" className="sr-cool" style={{ animationDelay: `${i * 0.5}s` }} />
      ))}
      <rect x={d - 30} y={h * 0.28} width={18} height={8} rx={1.5} fill="#0b1f3a" />
      <text x={d - 21} y={h * 0.28 + 6.2} textAnchor="middle" fontSize={6} fontWeight={700} fill={style === 'standard' ? '#4ade80' : '#22d3ee'} fontFamily="ui-monospace,monospace">
        {style === 'standard' ? 'ON' : '24°'}
      </text>
      <circle cx={d - 35} cy={h * 0.28 + 4} r={1.3} className="sr-blink" fill={style === 'standard' ? '#22c55e' : '#22d3ee'} />
      <text x={7} y={h * 0.38} fontSize={5} fontWeight={800} letterSpacing={1} fill={dark ? '#64748b' : '#94a3b8'}>
        APEX
      </text>
    </g>
  );
  const top = <Slats x={3} y={4} w={24} h={d - 8} gap={4} color={dark ? '#1f2937' : '#cbd5e1'} />;
  return <Block x={x} y={y} z={z} w={28} d={d} h={h} color={body} right={right} top={top} />;
}

function OutdoorUnit({ x, y, w, d, h }: { x: number; y: number; w: number; d: number; h: number }) {
  return (
    <Block
      x={x}
      y={y}
      w={w}
      d={d}
      h={h}
      color="#e5e9ef"
      right={
        <g>
          <Fan cx={d * 0.42} cy={h * 0.5} r={Math.min(d, h) * 0.36} cls="sr-spin sr-spin--fast" />
          <rect x={d * 0.82} y={6} width={d * 0.14} height={h - 12} rx={1.5} fill="#cbd5e1" />
          <Slats x={d * 0.83} y={8} w={d * 0.12} h={h - 16} gap={4} color="#94a3b8" />
        </g>
      }
      left={<Slats x={4} y={6} w={w - 8} h={h - 12} gap={3} color="#94a3b8" vertical sw={0.9} />}
      top={<Slats x={4} y={4} w={w - 8} h={d - 8} gap={6} color="#cbd5e1" />}
    />
  );
}

function FloorTower() {
  const d = 52;
  const h = 170;
  return (
    <Block
      x={20}
      y={345}
      w={30}
      d={d}
      h={h}
      color="#f4f6f9"
      right={
        <g>
          <rect x={0} y={16} width={d} height={3} fill="#d4a24c" />
          <rect x={11} y={26} width={30} height={13} rx={3} fill="#0b1f3a" />
          <text x={26} y={35.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#22d3ee" fontFamily="ui-monospace,monospace">18°</text>
          <rect x={7} y={48} width={38} height={60} rx={5} fill="#1f2937" />
          <g className="sr-sway">
            <Slats x={9} y={50} w={34} h={56} gap={5.5} color="#64748b" vertical sw={2} />
          </g>
          <Slats x={8} y={118} w={36} h={44} gap={4} color="#cbd5e1" />
          {[14, 26, 38].map((cx, i) => (
            <path key={cx} d={`M${cx} 78 q5 -3 10 0 q5 3 10 0`} stroke="#bae6fd" strokeWidth={1.2} fill="none" strokeLinecap="round" className="sr-cool sr-cool--side" style={{ animationDelay: `${i * 0.45}s` }} />
          ))}
        </g>
      }
    />
  );
}

/** Window-type unit. Its front is the +y (left) face. */
function WindowUnit({ x, y, z, body = '#f4f6f9', grille = 'h', display = false, w = 80, d = 60, h = 58 }: { x: number; y: number; z: number; body?: string; grille?: 'h' | 'v' | 'mesh'; display?: boolean; w?: number; d?: number; h?: number }) {
  const gw = w - 26;
  const left = (
    <g>
      <rect x={5} y={5} width={gw} height={h * 0.48} rx={2} fill={shade(body, -0.07)} />
      {grille === 'h' && <Slats x={7} y={6} w={gw - 4} h={h * 0.46} gap={3.6} color="#94a3b8" />}
      {grille === 'v' && <Slats x={6} y={7} w={gw - 2} h={h * 0.44} gap={3.6} color="#94a3b8" vertical />}
      {grille === 'mesh' && (
        <>
          <Slats x={7} y={6} w={gw - 4} h={h * 0.46} gap={4} color="#a3b1c2" sw={0.7} />
          <Slats x={6} y={7} w={gw - 2} h={h * 0.44} gap={4} color="#a3b1c2" vertical sw={0.7} />
        </>
      )}
      <rect x={5} y={h * 0.58} width={gw} height={h * 0.3} rx={2} fill="#1f2937" />
      <Slats x={7} y={h * 0.6} w={gw - 4} h={h * 0.26} gap={4.5} color="#64748b" sw={1.4} />
      <rect x={w - 18} y={5} width={13} height={h - 10} rx={2} fill={shade(body, -0.05)} />
      {display ? (
        <>
          <rect x={w - 16.5} y={8} width={10} height={7} rx={1} fill="#0b1f3a" />
          <text x={w - 11.5} y={13.6} textAnchor="middle" fontSize={5} fontWeight={700} fill="#22d3ee" fontFamily="ui-monospace,monospace">22</text>
        </>
      ) : (
        <circle cx={w - 11.5} cy={13} r={3.6} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.7} />
      )}
      <circle cx={w - 11.5} cy={h * 0.5} r={3.6} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.7} />
      <line x1={w - 11.5} y1={h * 0.5} x2={w - 11.5} y2={h * 0.5 - 3} stroke="#334155" strokeWidth={1} />
      <text x={w - 11.5} y={h - 8} textAnchor="middle" fontSize={3.6} fontWeight={800} fill="#94a3b8">APEX</text>
      {display && <circle cx={w - 6} cy={h - 6} r={1} fill="#22c55e" className="sr-blink" />}
    </g>
  );
  const right = <Slats x={5} y={6} w={d - 10} h={h - 12} gap={3.2} color={shade(body, -0.3)} vertical sw={0.9} />;
  return <Block x={x} y={y} z={z} w={w} d={d} h={h} color={body} left={left} right={right} shadow={z === 0} />;
}

function Pallet({ x, y, z = 0, w, d }: { x: number; y: number; z?: number; w: number; d: number }) {
  const gaps = (len: number) =>
    [0.2, 0.62].map((t) => <rect key={t} x={len * t} y={3} width={len * 0.18} height={5} fill="#3f2a17" />);
  return (
    <Block
      x={x}
      y={y}
      z={z}
      w={w}
      d={d}
      h={10}
      color="#a8743f"
      left={gaps(w)}
      right={gaps(d)}
      top={<Slats x={0} y={0} w={w} h={d} gap={d / 6} color="#7c5229" sw={1.4} />}
    />
  );
}

/* ============================================================================
   People
   ============================================================================ */

function Technician({
  x,
  y,
  flip = false,
  scale = 1.3,
  armLeft,
  armRight,
  armLeftClass,
  armRightClass,
  headClass,
  bodyClass = 'sr-breathe',
  legClass,
  prop,
}: {
  x: number;
  y: number;
  flip?: boolean;
  scale?: number;
  armLeft: number;
  armRight: number;
  armLeftClass?: string;
  armRightClass?: string;
  headClass?: string;
  bodyClass?: string;
  legClass?: [string, string];
  prop?: ReactNode;
}) {
  const leg = (fill: string) => (
    <>
      <rect x={-3.8} y={0} width={7.6} height={30} rx={3.4} fill={fill} />
      <path d="M-4.4 26 h10.6 a3 3 0 0 1 3 3 v2.4 h-13.6 z" fill="#111827" />
    </>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <ellipse cx={2} cy={2} rx={17} ry={4.5} fill="#020617" opacity={0.4} filter="url(#sr-soft)" />
      <g transform="translate(-5 -30)">
        <g className={legClass?.[0]}>{leg('#16365c')}</g>
      </g>
      <g transform="translate(5 -30)">
        <g className={legClass?.[1]}>{leg('url(#sr-pants)')}</g>
      </g>
      <g className={bodyClass}>
        <g transform="translate(-9 -56)">
          <g className={armLeftClass} style={armLeftClass ? undefined : { transform: `rotate(${armLeft}deg)` }}>
            <rect x={-3.4} y={0} width={6.8} height={23} rx={3.4} fill="#1e3a8a" />
            <circle cx={0} cy={24} r={3.6} fill="#a86f45" />
          </g>
        </g>
        <rect x={-11.5} y={-60} width={23} height={32} rx={7.5} fill="url(#sr-uniform)" />
        <path d="M-4 -60 L0 -54 L4 -60" fill="none" stroke="#bfdbfe" strokeWidth={1.1} />
        <rect x={-11.5} y={-35} width={23} height={4.5} fill="#0f172a" />
        <rect x={-2} y={-35} width={4} height={4.5} fill="#cbd5e1" />
        <rect x={3} y={-54} width={6} height={4} rx={1} fill="#22d3ee" />
        <g transform="translate(0 -68)">
          <g className={headClass}>
            <rect x={-3} y={4} width={6} height={6} fill="#94603b" />
            <circle cx={0} cy={0} r={8} fill="url(#sr-skin)" />
            <path d="M-8.6 -0.5 Q-8 -11 0 -11 Q8 -11 8.6 -0.5 Z" fill="#1e3a8a" />
            <rect x={2} y={-3.2} width={10.5} height={3} rx={1.5} fill="#172554" />
            <circle cx={-1} cy={-6} r={1.6} fill="#22d3ee" />
            <circle cx={4} cy={1} r={0.95} fill="#1e293b" />
            <path d="M3 4.4 q2 1 3.6 -0.2" stroke="#6b3f22" strokeWidth={0.7} fill="none" />
          </g>
        </g>
        <g transform="translate(9 -56)">
          <g className={armRightClass} style={armRightClass ? undefined : { transform: `rotate(${armRight}deg)` }}>
            <rect x={-3.4} y={0} width={6.8} height={23} rx={3.4} fill="#2563eb" />
            <circle cx={0} cy={24} r={3.6} fill="#b97a4c" />
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

function Cylinder({ x, y, h, r, grad, valve = '#334155' }: { x: number; y: number; h: number; r: number; grad: string; valve?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={4} cy={1} rx={r + 6} ry={4} fill="#020617" opacity={0.35} filter="url(#sr-soft)" />
      <path d={`M${-r} 0 V${-h + r} A ${r} ${r * 0.9} 0 0 1 ${r} ${-h + r} V0 A ${r} ${r * 0.35} 0 0 1 ${-r} 0 Z`} fill={`url(#${grad})`} />
      <rect x={-r * 0.35} y={-h - 6} width={r * 0.7} height={8} rx={1.5} fill={valve} />
      <rect x={-r * 0.6} y={-h - 9} width={r * 1.2} height={3} rx={1.5} fill="#64748b" />
      <rect x={-r} y={-h * 0.45} width={r * 2} height={6} fill="#ffffff" opacity={0.22} />
    </g>
  );
}

/** Clipboard with a checklist; the ticks fill in one by one. */
function Clipboard() {
  return (
    <g transform="translate(-4 20) rotate(-8)">
      <rect x={-9} y={-12} width={18} height={24} rx={1.6} fill="#a16207" />
      <rect x={-7.5} y={-9.5} width={15} height={20} rx={0.8} fill="#f8fafc" />
      <rect x={-3.5} y={-13.5} width={7} height={3.6} rx={1} fill="#64748b" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={-5.5} y={-6.5 + i * 4.4} width={2.4} height={2.4} rx={0.4} fill="none" stroke="#94a3b8" strokeWidth={0.5} />
          <path d={`M-5.2 ${-5.4 + i * 4.4} l0.8 0.9 l1.6 -1.9`} stroke="#16a34a" strokeWidth={0.8} fill="none" className="sr-tick" style={{ animationDelay: `${i * 0.9}s` }} />
          <rect x={-1.6} y={-6 + i * 4.4} width={i % 2 ? 6 : 7.5} height={1.2} rx={0.6} fill="#cbd5e1" />
        </g>
      ))}
    </g>
  );
}

/** Hand-pallet truck with a boxed unit, pushed by its handle (local x grows forward). */
function PalletJack() {
  return (
    <g>
      <ellipse cx={-34} cy={2} rx={30} ry={5} fill="#020617" opacity={0.35} filter="url(#sr-soft)" />
      {/* forks + wheels */}
      <rect x={-62} y={-6} width={50} height={4} rx={1} fill="#f59e0b" />
      <rect x={-14} y={-14} width={7} height={12} rx={1.5} fill="#f59e0b" />
      <circle cx={-58} cy={0} r={2.6} fill="#111827" />
      <circle cx={-12} cy={0} r={3.4} fill="#111827" />
      <circle cx={-12} cy={0} r={1.2} fill="#9ca3af" />
      {/* handle up to the worker's hands */}
      <path d="M-10 -12 L4 -44" stroke="#f59e0b" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M0 -46 h9" stroke="#111827" strokeWidth={3} strokeLinecap="round" />
      {/* pallet + boxed condenser, rocking slightly as it rolls */}
      <g className="sr-cargo">
        <rect x={-62} y={-12} width={50} height={6} fill="#a8743f" />
        <rect x={-58} y={-11} width={8} height={4} fill="#3f2a17" />
        <rect x={-24} y={-11} width={8} height={4} fill="#3f2a17" />
        <rect x={-60} y={-48} width={46} height={36} rx={1.5} fill="#c8955c" />
        <rect x={-60} y={-48} width={46} height={6} fill="#e0b47f" />
        <rect x={-39} y={-48} width={4} height={36} fill="#e0b47f" opacity={0.8} />
        <text x={-56} y={-26} fontSize={6.5} fontWeight={800} fill="#7c4f22" letterSpacing={0.8}>APEX</text>
        <text x={-56} y={-18} fontSize={4} fontWeight={700} fill="#7c4f22">OUTDOOR 1.5HP</text>
        <rect x={-30} y={-28} width={12} height={8} fill="#f8fafc" />
        <g stroke="#111827" strokeWidth={0.5}>
          {[0, 1.5, 2.5, 4, 5, 7, 8.5, 9.5].map((x) => (
            <line key={x} x1={-29 + x} y1={-27} x2={-29 + x} y2={-22} />
          ))}
        </g>
      </g>
    </g>
  );
}

/* ============================================================================
   Scene
   ============================================================================ */

function ShowroomScene() {
  // Hoverable product placements
  const H = {
    u1: { id: 'u1', catalogId: 'res_split_inv', variant: '1.5 HP Premium White', zone: 'left' as Zone, anchor: P(44, 620, 232) },
    u2: { id: 'u2', catalogId: 'res_split_non_inv', variant: '1.0 HP Standard', zone: 'left' as Zone, anchor: P(44, 465, 228) },
    u3: { id: 'u3', catalogId: 'res_split_inv', variant: '2.0 HP Onyx Black', zone: 'left' as Zone, anchor: P(44, 616, 160) },
    u4: { id: 'u4', catalogId: 'res_split_non_inv', variant: '1.5 HP Slim', zone: 'left' as Zone, anchor: P(44, 452, 158) },
    u5: { id: 'u5', catalogId: 'res_floor_mounted', variant: '3.0 HP Tower', zone: 'left' as Zone, anchor: P(50, 371, 172) },
    c1: { id: 'c1', catalogId: 'com_vrf', variant: '10 HP Outdoor Module', zone: 'left' as Zone, anchor: P(245, 360, 152) },
    c2: { id: 'c2', catalogId: 'com_packaged', variant: '7.5 TR Packaged', zone: 'right' as Zone, anchor: P(540, 145, 192) },
    w1: { id: 'w1', catalogId: 'res_window_inv', variant: '1.5 HP Digital', zone: 'right' as Zone, anchor: P(695, 170, 128) },
    w2: { id: 'w2', catalogId: 'res_window_inv', variant: '1.0 HP Manual', zone: 'right' as Zone, anchor: P(695, 170, 70) },
    w3: { id: 'w3', catalogId: 'res_window_inv', variant: '2.0 HP Mesh Grille', zone: 'right' as Zone, anchor: P(745, 290, 70) },
    w4: { id: 'w4', catalogId: 'res_window_inv', variant: '0.75 HP Compact', zone: 'right' as Zone, anchor: P(745, 40, 70) },
    w5: { id: 'w5', catalogId: 'res_window_inv', variant: '1.5 HP Beige', zone: 'right' as Zone, anchor: P(742, 40, 170) },
    w6: { id: 'w6', catalogId: 'res_window_inv', variant: '1.0 HP Digital', zone: 'right' as Zone, anchor: P(642, 40, 270) },
    w7: { id: 'w7', catalogId: 'res_window_inv', variant: '2.0 HP Mesh Grille', zone: 'right' as Zone, anchor: P(742, 40, 270) },
    r3: { id: 'r3', catalogId: 'com_ducted', variant: '5 HP Ducted Indoor', zone: 'right' as Zone, anchor: P(642, 38, 140) },
    r4: { id: 'r4', catalogId: 'com_cassette', variant: '3 HP 4-Way Cassette', zone: 'right' as Zone, anchor: P(560, 560, 40) },
  };

  const rackUprightsX = [590, 692, 792];
  const deckZ = [100, 200];

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block w-full h-auto" role="img" aria-label="Apex aircon showroom: wall-mounted split units on the left, window-type and commercial units on the right, and technicians at work in the centre">
      <defs>
        <filter id="sr-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="sr-soft" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <linearGradient id="sr-g-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.04} />
        </linearGradient>
        <linearGradient id="sr-g-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#0f172a" stopOpacity={0.14} />
        </linearGradient>
        <linearGradient id="sr-g-right" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" stopOpacity={0.06} />
          <stop offset="100%" stopColor="#0f172a" stopOpacity={0.3} />
        </linearGradient>
        <radialGradient id="sr-floor" cx="45%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#e7edf4" />
          <stop offset="60%" stopColor="#c7d2df" />
          <stop offset="100%" stopColor="#8d9db2" />
        </radialGradient>
        <pattern id="sr-peg" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="1.4" fill="#334155" fillOpacity={0.55} />
        </pattern>
        <linearGradient id="sr-uniform" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="sr-pants" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0f2544" />
        </linearGradient>
        <radialGradient id="sr-skin" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#d9a173" />
          <stop offset="100%" stopColor="#9c6640" />
        </radialGradient>
        {[
          ['sr-cyl-red', '#7f1d1d', '#ef4444', '#991b1b'],
          ['sr-cyl-green', '#14532d', '#22c55e', '#166534'],
          ['sr-cyl-teal', '#134e4a', '#2dd4bf', '#115e59'],
        ].map(([id, a, b, c]) => (
          <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={a} />
            <stop offset="38%" stopColor={b} />
            <stop offset="100%" stopColor={c} />
          </linearGradient>
        ))}
        <linearGradient id="sr-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e3a5f" />
          <stop offset="100%" stopColor="#0b1f3a" />
        </linearGradient>
        <linearGradient id="sr-holo" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* ── Floor platform ── */}
      <polygon points={[P(0, 700), P(800, 700)].map((p) => p.join(',')).join(' ') + ` ${P(800, 700)[0]},${P(800, 700)[1] + 16} ${P(0, 700)[0]},${P(0, 700)[1] + 16}`} fill="#1e2b40" />
      <polygon points={[P(800, 700), P(800, 0)].map((p) => p.join(',')).join(' ') + ` ${P(800, 0)[0]},${P(800, 0)[1] + 16} ${P(800, 700)[0]},${P(800, 700)[1] + 16}`} fill="#2a3a55" />
      <g transform={FLOOR_M}>
        <rect width={800} height={700} fill="url(#sr-floor)" />
        <g stroke="#9fb0c4" strokeWidth={0.8} vectorEffect="non-scaling-stroke" opacity={0.7}>
          {Array.from({ length: 15 }, (_, i) => (
            <line key={`a${i}`} x1={(i + 1) * 50} y1={0} x2={(i + 1) * 50} y2={700} vectorEffect="non-scaling-stroke" />
          ))}
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`b${i}`} x1={0} y1={(i + 1) * 50} x2={800} y2={(i + 1) * 50} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        <ellipse cx={400} cy={330} rx={260} ry={220} fill="#ffffff" opacity={0.18} filter="url(#sr-blur)" />
      </g>

      {/* ── Back centre: diagnostics monitor on pedestal ── */}
      <Block x={128} y={128} w={44} d={44} h={6} color="#334155" />
      <rect x={650} y={176} width={10} height={92} fill="#475569" />
      <rect x={655} y={176} width={5} height={92} fill="#334155" />
      <g transform="translate(540 34)">
        <rect x={-6} y={-6} width={242} height={158} rx={10} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
        <g transform="scale(1.307)">
          <rect x={0} y={0} width={176} height={112} rx={6} fill="url(#sr-screen)" />
          <text x={10} y={15} fontSize={10} fontWeight={800} fill="#e2e8f0" fontFamily="var(--font-display)">Apex</text>
          <text x={166} y={15} textAnchor="end" fontSize={6.5} fill="#67e8f9" fontFamily="ui-monospace,monospace" className="sr-blink">● LIVE</text>
          <Gauge cx={24} cy={44} r={13} color="#22d3ee" needleClass="sr-needle-a" />
          <Gauge cx={58} cy={44} r={13} color="#f97316" needleClass="sr-needle-b" />
          <rect x={82} y={29} width={6} height={28} rx={3} fill="#0f172a" stroke="#475569" />
          <rect x={83.5} y={36} width={3} height={20} rx={1.5} fill="#ef4444" className="sr-thermo" />
          <rect x={98} y={26} width={70} height={34} rx={3} fill="#0b1f3a" stroke="#1e3a5f" />
          <path d="M101 52 L112 46 L121 49 L131 38 L140 42 L150 32 L164 36" fill="none" stroke="#22d3ee" strokeWidth={1.6} className="sr-graph" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={10 + i * 10} y={72} width={6} height={26} rx={1.5} fill={i % 3 === 2 ? '#f97316' : '#22d3ee'} className="sr-bar" style={{ animationDelay: `${i * 0.22}s` }} />
          ))}
          <rect x={88} y={72} width={80} height={6} rx={3} fill="#1e3a5f" />
          <rect x={88} y={72} width={80} height={6} rx={3} fill="#22d3ee" className="sr-progress" />
          <text x={88} y={92} fontSize={6.5} fill="#94a3b8" fontFamily="ui-monospace,monospace">SYS CHECK</text>
          <text x={168} y={92} textAnchor="end" fontSize={6.5} fill="#4ade80" fontFamily="ui-monospace,monospace">OK</text>
        </g>
        <rect x={0} y={0} width={230} height={50} fill="#ffffff" opacity={0.05} />
      </g>

      {/* Server / control cabinet with status LEDs */}
      <Block
        x={300}
        y={40}
        w={50}
        d={50}
        h={140}
        color="#334155"
        left={
          <g>
            {Array.from({ length: 9 }, (_, i) => (
              <g key={i}>
                <rect x={5} y={8 + i * 14} width={40} height={10} rx={1} fill="#1e293b" />
                <circle cx={10} cy={13 + i * 14} r={1.6} fill={i % 4 === 1 ? '#f97316' : '#22c55e'} className="sr-blink" style={{ animationDelay: `${i * 0.3}s` }} />
                <rect x={16} y={12 + i * 14} width={22} height={2} fill="#475569" />
              </g>
            ))}
          </g>
        }
      />

      {/* ── Left: pegboard wall with wall-mounted splits ── */}
      <Block
        x={0}
        y={330}
        w={14}
        d={360}
        h={250}
        color="#c3ccd8"
        shadow={false}
        right={
          <g>
            <rect width={360} height={250} fill="url(#sr-peg)" />
            <rect x={2} y={2} width={356} height={246} fill="none" stroke="#94a3b8" strokeWidth={3} />
          </g>
        }
      />
      <Hot meta={H.u1}>
        <WallSplit x={14} y={560} z={190} d={120} h={38} body="#f6f8fb" style="premium" />
      </Hot>
      <Hot meta={H.u2}>
        <WallSplit x={14} y={410} z={186} d={110} h={40} body="#e8edf3" style="standard" />
      </Hot>
      <Hot meta={H.u3}>
        <WallSplit x={14} y={556} z={120} d={120} h={36} body="#1f2937" style="onyx" />
      </Hot>
      <Hot meta={H.u4}>
        <WallSplit x={14} y={400} z={118} d={104} h={34} body="#f1f5f9" style="slim" />
      </Hot>
      <Hot meta={H.u5}>
        <FloorTower />
      </Hot>
      <OutdoorUnit x={20} y={470} w={56} d={90} h={74} />

      {/* ── Right: pallet racking with window-type & ducted units ── */}
      {rackUprightsX.map((x) => (
        <Block key={`bu${x}`} x={x} y={0} w={8} d={8} h={290} color="#1d4ed8" shadow={false} />
      ))}
      {deckZ.map((z) => (
        <Block key={`bb${z}`} x={590} y={0} z={z - 10} w={210} d={6} h={10} color="#ea580c" shadow={false} />
      ))}
      {/* Level 0 */}
      <Pallet x={597} y={6} w={92} d={66} />
      <Hot meta={H.w4}>
        <WindowUnit x={603} y={10} z={10} w={78} d={56} h={54} body="#f1f5f9" grille="v" />
      </Hot>
      <Pallet x={700} y={6} w={90} d={66} />
      <WindowUnit x={706} y={10} z={10} w={78} d={56} h={56} body="#e2e8f0" grille="h" display />
      {/* Level 1 */}
      <Block x={590} y={0} z={100} w={210} d={80} h={3} color="#64748b" shadow={false} />
      <Hot meta={H.r3}>
        <Block
          x={598}
          y={8}
          z={103}
          w={88}
          d={60}
          h={34}
          color="#a7b3c2"
          shadow={false}
          left={
            <g>
              <rect x={4} y={4} width={40} height={26} rx={1.5} fill="#b9c4d1" stroke="#64748b" strokeWidth={0.8} />
              {[7, 41].map((cx) => (
                <circle key={cx} cx={cx} cy={7} r={1} fill="#475569" />
              ))}
              <rect x={50} y={6} width={32} height={13} rx={1} fill="#f1f5f9" />
              <rect x={53} y={9} width={20} height={1.6} fill="#64748b" />
              <rect x={53} y={13} width={14} height={1.6} fill="#64748b" />
              <rect x={50} y={23} width={10} height={5} rx={1} fill="#f97316" />
            </g>
          }
          right={
            <g>
              <circle cx={30} cy={17} r={12.5} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.8} />
              <circle cx={30} cy={17} r={9} fill="#1f2937" />
            </g>
          }
        />
      </Hot>
      <Pallet x={700} y={6} z={103} w={90} d={66} />
      <Hot meta={H.w5}>
        <WindowUnit x={706} y={10} z={113} w={78} d={56} h={54} body="#efe7d8" grille="h" />
      </Hot>
      {/* Level 2 */}
      <Block x={590} y={0} z={200} w={210} d={80} h={3} color="#64748b" shadow={false} />
      <Hot meta={H.w6}>
        <WindowUnit x={602} y={10} z={203} w={78} d={56} h={54} body="#f8fafc" grille="h" display />
      </Hot>
      <Hot meta={H.w7}>
        <WindowUnit x={704} y={10} z={203} w={78} d={56} h={56} body="#e5e7eb" grille="mesh" />
      </Hot>
      {[100, 200, 290].map((z) => (
        <Block key={`fb${z}`} x={590} y={72} z={z - 10} w={210} d={8} h={10} color="#f97316" shadow={false} />
      ))}
      {rackUprightsX.map((x) => (
        <Block key={`fu${x}`} x={x} y={72} w={8} d={8} h={290} color="#2563eb" shadow={false} />
      ))}

      {/* ── Centre-right: packaged commercial units ── */}
      <Hot meta={H.c2}>
        <Block
          x={480}
          y={90}
          w={120}
          d={110}
          h={110}
          color="#d9dee5"
          left={
            <g>
              <rect x={6} y={8} width={50} height={86} rx={2} fill="#c3ccd8" />
              <Slats x={7} y={9} w={48} h={84} gap={3.4} color="#7c8a9e" vertical sw={0.9} />
              {[62, 91].map((x) => (
                <g key={x}>
                  <rect x={x} y={8} width={25} height={86} rx={2} fill="#e5e9ef" stroke="#a3b1c2" strokeWidth={0.8} />
                  <rect x={x + 19} y={44} width={2.6} height={11} rx={1} fill="#475569" />
                </g>
              ))}
              <rect x={66} y={12} width={14} height={5} rx={1} fill="#f97316" />
              <rect x={0} y={100} width={120} height={10} fill="#334155" />
            </g>
          }
          right={<Slats x={5} y={6} w={100} h={92} gap={3.2} color="#8592a6" vertical sw={0.9} />}
          top={
            <g>
              <Fan cx={34} cy={55} r={24} />
              <Fan cx={88} cy={55} r={24} cls="sr-spin sr-spin--b" />
            </g>
          }
        />
        <Block
          x={490}
          y={100}
          z={110}
          w={100}
          d={90}
          h={72}
          color="#b8c1cd"
          shadow={false}
          left={
            <g>
              <Slats x={6} y={6} w={58} h={58} gap={5} color="#8592a6" sw={1.6} />
              <rect x={70} y={6} width={24} height={58} rx={2} fill="#c9d1db" stroke="#8592a6" strokeWidth={0.8} />
              <circle cx={89} cy={35} r={1.6} fill="#22c55e" className="sr-blink" />
            </g>
          }
          top={<Fan cx={50} cy={45} r={28} cls="sr-spin sr-spin--fast" />}
        />
      </Hot>

      {/* Floating schedule cards */}
      {[
        { x: 880, y: 118, d: '0s' },
        { x: 960, y: 150, d: '0.8s' },
        { x: 1030, y: 106, d: '1.5s' },
      ].map((c, i) => (
        <g key={i} className="sr-float" style={{ animationDelay: c.d }}>
          <g transform={`translate(${c.x} ${c.y})`}>
            <rect x={2} y={3} width={34} height={34} rx={5} fill="#020617" opacity={0.25} />
            <rect x={0} y={0} width={34} height={34} rx={5} fill="#f8fafc" />
            <rect x={0} y={0} width={34} height={10} rx={5} fill="#ef4444" />
            <rect x={0} y={6} width={34} height={4} fill="#ef4444" />
            {[0, 1, 2].map((r) =>
              [0, 1, 2, 3].map((k) => (
                <rect key={`${r}-${k}`} x={4.5 + k * 7} y={14 + r * 6.4} width={4.2} height={3.8} rx={0.7} fill={r === 1 && k === 2 ? '#22d3ee' : '#cbd5e1'} />
              )),
            )}
          </g>
        </g>
      ))}

      {/* ── Centre: holographic service console ── */}
      <Block
        x={330}
        y={230}
        w={140}
        d={100}
        h={70}
        color="#eef2f6"
        top={
          <g>
            <rect x={10} y={10} width={120} height={80} rx={8} fill="#0e3a5f" />
            <rect x={10} y={10} width={120} height={80} rx={8} fill="none" stroke="#22d3ee" strokeWidth={1.4} className="sr-pulse" />
            <g transform="translate(70 50)">
              <circle r={34} fill="none" stroke="#22d3ee" strokeWidth={1.2} strokeDasharray="4 5" className="sr-spin sr-spin--slow" />
              <circle r={26} fill="#22d3ee" opacity={0.12} className="sr-pulse" />
              <g className="sr-spin">
                {[0, 90, 180, 270].map((a) => (
                  <path key={a} d="M0 0 C 8 -18, 26 -22, 30 -8 C 18 -10, 10 -6, 0 0 Z" transform={`rotate(${a})`} fill="#67e8f9" opacity={0.9} />
                ))}
              </g>
              <circle r={5} fill="#ecfeff" />
            </g>
          </g>
        }
        left={
          <g>
            <rect x={0} y={3} width={140} height={2} fill="#22d3ee" className="sr-pulse" />
            <line x1={46} y1={10} x2={46} y2={70} stroke="#cbd5e1" />
            <line x1={94} y1={10} x2={94} y2={70} stroke="#cbd5e1" />
            <Slats x={8} y={50} w={30} h={14} gap={3.4} color="#94a3b8" />
            <rect x={56} y={18} width={28} height={12} rx={2} fill="#0b1f3a" />
            <text x={70} y={26.5} textAnchor="middle" fontSize={6.5} fontWeight={700} fill="#22d3ee" fontFamily="ui-monospace,monospace">SCAN</text>
          </g>
        }
      />
      <polygon points={`${P(400, 280, 70)[0] - 40},${P(400, 280, 70)[1]} ${P(400, 280, 70)[0] + 40},${P(400, 280, 70)[1]} ${P(400, 280, 70)[0] + 24},${P(400, 280, 70)[1] - 90} ${P(400, 280, 70)[0] - 24},${P(400, 280, 70)[1] - 90}`} fill="url(#sr-holo)" opacity={0.55} className="sr-pulse" />
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={i} cx={P(400, 280, 70)[0] - 27 + i * 9} cy={P(400, 280, 70)[1] - 4} r={2.4} fill="#a5f3fc" className="sr-rise" style={{ animationDelay: `${i * 0.42}s` }} />
      ))}

      {/* ── Centre-left: large VRF outdoor condenser ── */}
      <Hot meta={H.c1}>
        <Block
          x={190}
          y={300}
          w={110}
          d={120}
          h={150}
          color="#eceff3"
          top={
            <g>
              <rect x={6} y={6} width={98} height={108} rx={4} fill="#d5dbe3" />
              <Fan cx={55} cy={60} r={44} cls="sr-spin sr-spin--fast" />
            </g>
          }
          left={
            <g>
              <rect x={8} y={14} width={94} height={108} rx={2} fill="#dde3ea" />
              <Slats x={10} y={16} w={90} h={104} gap={5.2} color="#9aa8b9" sw={1.6} />
              <rect x={8} y={130} width={30} height={12} rx={1.5} fill="#0b1f3a" />
              <text x={23} y={138.6} textAnchor="middle" fontSize={7} fontWeight={800} fill="#22d3ee" fontFamily="ui-monospace,monospace">VRF</text>
              <text x={98} y={140} textAnchor="end" fontSize={6.5} fontWeight={800} letterSpacing={1.2} fill="#94a3b8">APEX</text>
            </g>
          }
          right={
            <g>
              <Slats x={6} y={10} w={108} h={112} gap={3.4} color="#8592a6" vertical sw={0.9} />
              <rect x={86} y={128} width={30} height={16} rx={2} fill="#cbd5e1" />
              <circle cx={94} cy={136} r={3.2} fill="#c08a2b" />
              <circle cx={106} cy={136} r={3.2} fill="#c08a2b" />
            </g>
          }
        />
      </Hot>
      {/* Hot exhaust shimmer above the condenser */}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={P(245, 360, 150)[0] - 12 + i * 12} cy={P(245, 360, 150)[1] - 8} r={3.2} fill="#fdba74" className="sr-rise-warm" style={{ animationDelay: `${i * 0.6}s` }} />
      ))}

      {/* Technician C: tablet inspection next to the packaged units */}
      <Technician
        x={968}
        y={462}
        flip
        armLeft={-50}
        armRight={-80}
        armRightClass="sr-arm-tablet"
        headClass="sr-head-scan"
        prop={
          <g transform="translate(-2 22) rotate(70)">
            <rect x={-9} y={-12} width={18} height={24} rx={2.5} fill="#0f172a" />
            <rect x={-7} y={-10} width={14} height={20} rx={1.5} fill="#22d3ee" className="sr-screen-flicker" />
          </g>
        }
      />

      {/* Technician A: manifold gauges at the condenser */}
      <Technician
        x={612}
        y={414}
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

      {/* Technician B: running a system scan on the console */}
      <Technician
        x={676}
        y={432}
        armLeft={-60}
        armRight={-70}
        armLeftClass="sr-arm-type-a"
        armRightClass="sr-arm-type-b"
        headClass="sr-head-nod"
      />

      {/* Red tool chest */}
      <Block
        x={200}
        y={470}
        w={50}
        d={46}
        h={92}
        color="#dc2626"
        top={<rect x={3} y={3} width={44} height={40} rx={2} fill="#1f2937" />}
        left={
          <g>
            {Array.from({ length: 5 }, (_, i) => (
              <g key={i}>
                <rect x={3} y={6 + i * 16} width={44} height={13} rx={1} fill="#ef4444" stroke="#991b1b" strokeWidth={0.8} />
                <rect x={15} y={10 + i * 16} width={20} height={2.6} rx={1.3} fill="#e5e7eb" />
              </g>
            ))}
          </g>
        }
      />

      {/* Floor pallet A: stacked window units */}
      <Pallet x={650} y={130} w={90} d={80} />
      <Hot meta={H.w2}>
        <WindowUnit x={655} y={138} z={10} w={80} d={64} h={58} body="#f4f6f9" grille="h" />
      </Hot>
      <Hot meta={H.w1}>
        <WindowUnit x={658} y={140} z={68} w={76} d={60} h={56} body="#fbfcfd" grille="v" display />
      </Hot>

      {/* Refrigerant cylinders */}
      <Cylinder x={468} y={448} h={56} r={11} grad="sr-cyl-red" />
      <Cylinder x={494} y={456} h={46} r={10} grad="sr-cyl-green" />
      <Cylinder x={515} y={444} h={40} r={9} grad="sr-cyl-teal" />

      {/* Cardboard boxes (new stock) */}
      <OutdoorUnit x={20} y={590} w={60} d={100} h={80} />
      <Block
        x={120}
        y={560}
        w={110}
        d={130}
        h={90}
        color="#c8955c"
        top={<rect x={0} y={58} width={110} height={14} fill="#e0b47f" opacity={0.85} />}
        left={
          <g>
            <rect x={0} y={0} width={110} height={10} fill="#e0b47f" opacity={0.8} />
            <text x={10} y={36} fontSize={13} fontWeight={800} fill="#7c4f22" letterSpacing={2}>APEX</text>
            <text x={10} y={50} fontSize={6.5} fontWeight={700} fill="#7c4f22">SPLIT-TYPE INVERTER</text>
            <path d="M80 30 v-12 m-5 5 l5 -5 l5 5 M94 30 v-12 m-5 5 l5 -5 l5 5" stroke="#7c4f22" strokeWidth={1.6} fill="none" />
            <rect x={10} y={60} width={34} height={16} fill="none" stroke="#7c4f22" strokeWidth={1} />
          </g>
        }
        right={<text x={14} y={40} fontSize={10} fontWeight={800} fill="#6b4420">1.5 HP</text>}
      />
      <Block
        x={138}
        y={585}
        z={90}
        w={76}
        d={86}
        h={56}
        color="#d1a16a"
        shadow={false}
        top={<rect x={0} y={36} width={76} height={12} fill="#e8c08f" opacity={0.85} />}
        left={<text x={8} y={30} fontSize={9} fontWeight={800} fill="#7c4f22" letterSpacing={1.5}>APEX</text>}
      />
      <Block
        x={248}
        y={600}
        w={84}
        d={90}
        h={64}
        color="#c08a52"
        top={<rect x={36} y={0} width={12} height={90} fill="#dcae78" opacity={0.85} />}
        left={<text x={8} y={30} fontSize={8} fontWeight={800} fill="#6b4420">WINDOW TYPE</text>}
      />

      {/* Floor pallet B */}
      <Pallet x={700} y={250} w={90} d={80} />
      <Hot meta={H.w3}>
        <WindowUnit x={705} y={258} z={10} w={80} d={64} h={58} body="#e7ebf0" grille="mesh" display />
      </Hot>

      {/* Logistics: pushing a boxed outdoor unit on a pallet jack, out and back */}
      <g className="sr-jack-path">
        <g className="sr-walk-flip sr-jack-flip">
          <g transform="translate(26 0)">
            <PalletJack />
          </g>
          <Technician
            x={0}
            y={0}
            armLeft={-62}
            armRight={-62}
            bodyClass="sr-walk-bob sr-lean"
            legClass={['sr-leg-a sr-leg--slow', 'sr-leg-b sr-leg--slow']}
            headClass="sr-head-look"
          />
        </g>
      </g>

      {/* Dispatch bay: boxed stock waiting to ship, with a logistics checker */}
      <Pallet x={705} y={392} w={70} d={66} />
      <Block x={710} y={398} z={10} w={58} d={54} h={44} color="#c8955c"
        top={<rect x={0} y={22} width={58} height={8} fill="#e0b47f" opacity={0.85} />}
        left={<g><text x={5} y={18} fontSize={7} fontWeight={800} fill="#7c4f22" letterSpacing={1}>APEX</text><rect x={34} y={24} width={18} height={12} fill="#f8fafc" /><rect x={36} y={27} width={14} height={1.2} fill="#111827" /><rect x={36} y={30} width={10} height={1.2} fill="#111827" /></g>}
      />
      <Block x={716} y={404} z={54} w={46} d={42} h={30} color="#d1a16a" shadow={false}
        top={<rect x={19} y={0} width={8} height={42} fill="#e8c08f" opacity={0.85} />}
        left={<text x={5} y={17} fontSize={5.5} fontWeight={800} fill="#7c4f22">FRAGILE ↑↑</text>}
      />
      <Technician
        x={P(700, 500)[0]}
        y={P(700, 500)[1]}
        armLeft={-70}
        armRight={-35}
        armLeftClass="sr-arm-write"
        headClass="sr-head-check"
        prop={<Clipboard />}
      />
      {/* Scanner beam from the checker's clipboard hand to the box label */}
      <line x1={P(700, 500)[0] + 22} y1={P(700, 500)[1] - 52} x2={P(722, 452, 30)[0]} y2={P(722, 452, 30)[1]} stroke="#ef4444" strokeWidth={1.2} className="sr-scan" />

      {/* Technician D: walks across the front carrying a replacement filter */}
      <g className="sr-walk-path">
        <g className="sr-walk-flip">
          <Technician
            x={0}
            y={0}
            armLeft={-40}
            armRight={-40}
            bodyClass="sr-walk-bob"
            legClass={['sr-leg-a', 'sr-leg-b']}
            prop={
              <g transform="translate(10 20) rotate(40)">
                <rect x={-14} y={-10} width={28} height={20} rx={2} fill="#e2e8f0" stroke="#64748b" />
                <Slats x={-12} y={-8} w={24} h={16} gap={5} color="#94a3b8" vertical sw={0.8} />
              </g>
            }
          />
        </g>
      </g>

      {/* Split indoor units (boxed stock) lying in front */}
      <Block
        x={340}
        y={620}
        w={130}
        d={56}
        h={32}
        color="#f4f6f9"
        left={
          <g>
            <rect x={6} y={20} width={118} height={6} rx={3} fill="#1f2937" />
            <path d="M8 6 Q65 2 122 6" stroke="#ffffff" strokeWidth={1.2} fill="none" />
            <text x={8} y={15} fontSize={4.6} fontWeight={800} fill="#94a3b8" letterSpacing={1}>APEX INVERTER</text>
          </g>
        }
      />

      {/* Front-right: 4-way ceiling cassette on a pallet */}
      <Pallet x={520} y={520} w={82} d={82} />
      <Hot meta={H.r4}>
        <Block
          x={524}
          y={524}
          z={10}
          w={74}
          d={74}
          h={24}
          color="#eef2f6"
          shadow={false}
          top={
            <g>
              <rect x={3} y={3} width={68} height={68} rx={4} fill="#f8fafc" stroke="#cbd5e1" />
              <rect x={10} y={7} width={54} height={7} rx={2} fill="#1f2937" />
              <rect x={10} y={60} width={54} height={7} rx={2} fill="#1f2937" />
              <rect x={7} y={18} width={7} height={38} rx={2} fill="#1f2937" />
              <rect x={60} y={18} width={7} height={38} rx={2} fill="#1f2937" />
              <rect x={20} y={20} width={34} height={34} rx={2} fill="#e5e7eb" />
              <Slats x={21} y={21} w={32} h={32} gap={3.6} color="#a3b1c2" vertical sw={0.9} />
              <circle cx={56} cy={58} r={1.4} fill="#22d3ee" className="sr-blink" />
            </g>
          }
        />
      </Hot>
    </svg>
  );
}

/* ============================================================================
   Section
   ============================================================================ */

export function ProductShowroomHero() {
  const language = useHVACStore((s) => s.language);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const enterExperience = useHVACStore((s) => s.enterExperience);
  const en = language === 'en';

  const [active, setActive] = useState<HotMeta | null>(null);
  const [inspecting, setInspecting] = useState<InspectTarget | null>(null);
  const timer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const cancelClose = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  const open = useCallback(
    (m: HotMeta) => {
      cancelClose();
      setActive(m);
    },
    [cancelClose],
  );
  // Clicking a unit brings it to the front as a 3D model, flying out from where it sits.
  const inspect = useCallback(
    (m: HotMeta) => {
      cancelClose();
      setActive(null);
      const r = wrapRef.current?.getBoundingClientRect();
      const origin = r
        ? { x: r.left + (m.anchor[0] / VB_W) * r.width, y: r.top + (m.anchor[1] / VB_H) * r.height }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      setInspecting({ catalogId: m.catalogId, variant: m.variant, origin });
    },
    [cancelClose],
  );
  const scheduleClose = useCallback(() => {
    cancelClose();
    timer.current = window.setTimeout(() => setActive(null), 220);
  }, [cancelClose]);

  // Tap/click outside closes; Escape closes.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el && !el.closest('.sr-item') && !el.closest('.sr-pop')) setActive(null);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [active]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <section aria-labelledby="showroom-heading" className="sr-section relative w-full">
      <div aria-hidden="true" className="bp-band-grid" />

      <div className="relative z-10 mx-auto max-w-[1440px] px-3 sm:px-6 pt-6 sm:pt-8 pb-6">
        <header className="text-center max-w-4xl mx-auto">
          <p className="text-sm sm:text-base font-semibold tracking-wide text-[#67e8f9]/90">
            {siteConfig.brand.name} <span aria-hidden="true">•</span> {siteConfig.brand.locationLabel}
          </p>
          <h1
            id="showroom-heading"
            className="mt-2 font-display font-extrabold tracking-tight text-white text-balance leading-[1.08]"
            style={{ fontSize: 'clamp(1.8rem, 3.8vw, 3.25rem)' }}
          >
            {en
              ? 'Professional HVAC Services & High-Quality Aircon Products'
              : 'Propesyonal na HVAC Services at De-kalidad na Aircon'}
          </h1>
          <p className="mt-3 text-sm sm:text-base md:text-lg text-slate-100 max-w-4xl mx-auto leading-snug">
            {en
              ? 'From top-tier split-type, window, and commercial AC units to expert installation and emergency repairs, we have your comfort covered. Get high-efficiency systems backed by certified local technicians. Explore our products and book today.'
              : 'Mula split-type, window, at commercial AC hanggang expert installation at emergency repair, sagot namin ang ginhawa mo. High-efficiency systems na may certified local technicians. Silipin ang mga produkto at mag-book ngayon.'}
          </p>
        </header>

        <HotContext.Provider value={{ active, open, inspect, scheduleClose, cancelClose }}>
          <div ref={wrapRef} className="sr-scene-wrap relative mt-2 sm:mt-0">
            <ShowroomScene />
            {active && <ProductPopover meta={active} onClose={() => setActive(null)} />}
            <Suspense fallback={null}>
              <AnimatePresence>
                {inspecting && <AirconInspector key={inspecting.catalogId + inspecting.variant} target={inspecting} onClose={() => setInspecting(null)} />}
              </AnimatePresence>
            </Suspense>

            <div className="sr-cta">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-5">
                <button
                  type="button"
                  onClick={() => enterExperience('residential', { service: 'equipment' })}
                  className="pointer-events-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl border border-[#22D3EE]/40 bg-[#0B1F3A]/92 text-white font-display font-bold text-sm sm:text-lg min-h-[52px] shadow-[0_12px_30px_rgba(2,6,23,0.6)] backdrop-blur hover:border-[#67e8f9] hover:bg-[#0e2a4d] transition-colors"
                >
                  <Settings2 className="w-5 h-5 text-[#67e8f9]" aria-hidden="true" />
                  {en ? 'Browse Aircon Products' : 'Tingnan ang mga Aircon'}
                </button>
                <button
                  type="button"
                  onClick={() => setQuoteModalOpen(true)}
                  className="pointer-events-auto cta-glow-amber cta-shimmer inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-b from-[#f5b544] to-[#e09a1f] border border-[#fcd34d]/80 text-white font-display font-bold text-sm sm:text-lg min-h-[52px] cursor-pointer"
                >
                  <CalendarCheck className="w-5 h-5" aria-hidden="true" />
                  {en ? 'Book a Service Appointment' : 'Mag-book ng Serbisyo'}
                </button>
              </div>
            </div>
          </div>
        </HotContext.Provider>

        <div className="mt-3 flex flex-col items-center gap-1.5 text-center">
          <p className="text-sm sm:text-base text-slate-100">
            {en
              ? 'Explore products & service areas • Scroll down for full details'
              : 'Silipin ang mga produkto at lugar • Mag-scroll pababa para sa detalye'}
          </p>
          <a
            href="#explore-3d"
            className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm sm:text-base font-semibold text-[#67e8f9] hover:text-white transition-colors"
          >
            {en ? 'See our product range & service coverage' : 'Tingnan ang aming mga produkto at serbisyo'}
            <ChevronDown className="w-4 h-4 animate-bounce" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

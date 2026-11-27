import { Html, OrbitControls, ContactShadows } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Boxes, CalendarCheck, Gauge, RotateCcw, Tag, Wind, X, Zap } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import * as THREE from 'three';
import { BRANDS, CATALOG_KIND, KINDS, featuresFor, specFor } from '../../data/airconBrands';
import type { Brand, BrandId, PartId, UnitKind } from '../../data/airconBrands';
import { EQUIPMENT_CATALOG } from '../../data/hvacData';
import { partPrice, peso, priceLineTotal, priceRange } from '../../data/partPrices';
import { MODEL_PARTS, NEEDS_SEPARATE_OUTDOOR, SPLIT_KINDS } from '../../data/modelParts';
import { useHVACStore } from '../../store/useHVACStore';
import { ExplodeProvider, InteractionCtx, MODELS, StudioEnvironment } from '../scene/airconModels';
import { usePartGuide } from '../../store/usePartGuide';
import type { ExplodeRef, Motion, MotionRef, V3 } from '../scene/airconModels';
import { tr } from '../../i18n/tr';

/* ============================================================================
   3D aircon inspector.
   A clicked showroom unit flies to the front as a real 3D model the visitor
   can turn around. Brand tabs re-skin it and change the spec sheet; the fan
   speed control drives the fans and the airflow; each brand's unique parts
   are numbered on the model and glow when picked.
   ============================================================================ */

export interface InspectTarget {
  catalogId: string;
  variant: string;
  /** Where the unit sits on screen, so the model flies out from it */
  origin: { x: number; y: number };
  /** Brand to show first (defaults to Daikin for homes, Trane for commercial) */
  brandId?: BrandId;
  /** Open straight into the exploded view */
  exploded?: boolean;
}

/* ============================================================================
   Part anchors — every unit faces +z, centred on the origin, about 1.2 m across.
   ANCHORS place the glowing highlight for each part (models: ../scene/airconModels).
   ============================================================================ */

type Anchor = { p: V3; s: V3 };

const ANCHORS: Record<UnitKind, Partial<Record<PartId | 'body', Anchor>>> = {
  wall: {
    body: { p: [0, 0, 0], s: [1.04, 0.34, 0.28] },
    louver: { p: [0, -0.125, 0.125], s: [0.88, 0.05, 0.06] },
    crossflow: { p: [0, -0.085, 0.07], s: [0.86, 0.08, 0.08] },
    filter: { p: [0, 0.165, -0.01], s: [0.92, 0.03, 0.22] },
    display: { p: [0.37, -0.02, 0.135], s: [0.13, 0.06, 0.03] },
    sensor: { p: [-0.4, -0.04, 0.135], s: [0.07, 0.07, 0.04] },
    coil: { p: [0, 0.04, 0.01], s: [0.9, 0.14, 0.16] },
    compressor: { p: [0.82, -0.72, -0.45], s: [0.2, 0.24, 0.2] },
    fan: { p: [0.62, -0.7, -0.29], s: [0.3, 0.3, 0.05] },
  },
  floor: {
    body: { p: [0, 0, 0], s: [0.56, 1.76, 0.36] },
    louver: { p: [0, 0.42, 0.17], s: [0.42, 0.62, 0.06] },
    display: { p: [0, 0.82, 0.17], s: [0.22, 0.08, 0.04] },
    filter: { p: [0, -0.5, 0.17], s: [0.46, 0.56, 0.05] },
    sensor: { p: [0.18, 0.82, 0.17], s: [0.06, 0.06, 0.04] },
    crossflow: { p: [0, 0.42, 0.06], s: [0.3, 0.62, 0.12] },
    coil: { p: [0, -0.1, 0], s: [0.46, 0.5, 0.26] },
    compressor: { p: [0.98, -0.6, -0.55], s: [0.2, 0.24, 0.2] },
    fan: { p: [0.78, -0.58, -0.39], s: [0.3, 0.3, 0.05] },
  },
  window: {
    body: { p: [0, 0, 0], s: [0.66, 0.44, 0.72] },
    grille: { p: [-0.07, 0.04, 0.36], s: [0.46, 0.34, 0.04] },
    louver: { p: [-0.07, 0.12, 0.36], s: [0.46, 0.16, 0.05] },
    controls: { p: [0.24, 0.02, 0.36], s: [0.13, 0.36, 0.04] },
    display: { p: [0.24, 0.13, 0.36], s: [0.1, 0.06, 0.04] },
    sensor: { p: [0.24, -0.12, 0.36], s: [0.08, 0.08, 0.04] },
    filter: { p: [-0.07, -0.08, 0.34], s: [0.46, 0.14, 0.04] },
    fan: { p: [0, 0, -0.36], s: [0.42, 0.38, 0.05] },
    compressor: { p: [0.18, -0.12, -0.18], s: [0.16, 0.18, 0.16] },
    coil: { p: [0, 0, 0.26], s: [0.6, 0.38, 0.06] },
    crossflow: { p: [-0.07, 0.04, 0.26], s: [0.3, 0.3, 0.1] },
  },
  vrf: {
    body: { p: [0, 0, 0], s: [1.0, 1.64, 0.8] },
    fan: { p: [0, 0.83, 0], s: [0.78, 0.06, 0.66] },
    coil: { p: [0, 0.05, 0.4], s: [0.9, 1.3, 0.04] },
    compressor: { p: [-0.18, -0.5, 0.05], s: [0.3, 0.42, 0.3] },
    ports: { p: [0.36, -0.68, 0.41], s: [0.18, 0.12, 0.05] },
    controls: { p: [-0.32, -0.66, 0.41], s: [0.22, 0.12, 0.04] },
    panel: { p: [0, -0.5, 0.41], s: [0.96, 0.5, 0.04] },
  },
  packaged: {
    body: { p: [0, 0, 0], s: [1.64, 0.86, 1.12] },
    fan: { p: [0, 0.44, -0.14], s: [1.3, 0.06, 0.66] },
    panel: { p: [0.3, -0.02, 0.56], s: [0.8, 0.72, 0.04] },
    compressor: { p: [-0.45, -0.2, 0.1], s: [0.4, 0.36, 0.36] },
    coil: { p: [-0.52, 0.0, 0.56], s: [0.56, 0.72, 0.04] },
    controls: { p: [0.6, 0.2, 0.57], s: [0.18, 0.14, 0.04] },
    filter: { p: [0.1, -0.1, 0.57], s: [0.3, 0.5, 0.04] },
  },
  ducted: {
    body: { p: [0, 0, 0], s: [1.14, 0.34, 0.74] },
    fan: { p: [0, 0, 0.36], s: [0.9, 0.24, 0.06] },
    ports: { p: [0, 0, 0.4], s: [1.0, 0.28, 0.06] },
    filter: { p: [0, 0, -0.37], s: [1.0, 0.28, 0.05] },
    coil: { p: [0, 0, 0.1], s: [1.0, 0.26, 0.12] },
    controls: { p: [0.53, 0.0, 0.1], s: [0.06, 0.2, 0.2] },
  },
  cassette: {
    body: { p: [0, 0, 0], s: [0.9, 0.3, 0.9] },
    louver: { p: [0, 0.14, 0], s: [0.86, 0.04, 0.86] },
    grille: { p: [0, 0.15, 0], s: [0.42, 0.03, 0.42] },
    sensor: { p: [0.34, 0.15, 0.34], s: [0.08, 0.04, 0.08] },
    filter: { p: [0, 0.1, 0], s: [0.4, 0.03, 0.4] },
    display: { p: [0.34, 0.15, 0.34], s: [0.08, 0.04, 0.08] },
    fan: { p: [0, 0.0, 0], s: [0.5, 0.1, 0.5] },
    coil: { p: [0, -0.02, 0], s: [0.7, 0.14, 0.7] },
  },
};

/* ── Airflow ─────────────────────────────────────────────────────────────────
   Three roles, so the visitor can see where air goes in and where it comes out:
     intake  — warm room air (or outdoor air) drawn INTO the unit, through the
               filter / intake grille. Particles travel toward the machine.
     supply  — cold, dehumidified air blown back into the room.
     reject  — the heat taken out of the room, thrown off the condenser.
   ──────────────────────────────────────────────────────────────────────── */

type FlowRole = 'intake' | 'supply' | 'reject';

interface Stream {
  from: V3;
  spread: V3;
  dir: V3;
  role: FlowRole;
  /** Put a floating label on this stream (one per role is enough) */
  tag?: boolean;
}

const ROLE_COLOR: Record<FlowRole, string> = {
  intake: '#a5b4c8',
  supply: '#7dd3fc',
  reject: '#fb923c',
};

const FLOW: Record<UnitKind, Stream[]> = {
  wall: [
    { from: [0, 0.3, -0.02], spread: [0.84, 0.02, 0.16], dir: [0, -1, 0], role: 'intake', tag: true },
    { from: [0, -0.13, 0.14], spread: [0.8, 0.01, 0.02], dir: [0, -0.5, 1], role: 'supply', tag: true },
    { from: [0.82, -0.72, -0.62], spread: [0.18, 0.2, 0.01], dir: [0, 0, -1], role: 'intake' },
    { from: [0.62, -0.7, -0.27], spread: [0.15, 0.15, 0.01], dir: [0, 0.2, 1], role: 'reject', tag: true },
  ],
  floor: [
    { from: [0, -0.5, 0.46], spread: [0.42, 0.26, 0.02], dir: [0, 0, -1], role: 'intake', tag: true },
    { from: [0, 0.42, 0.18], spread: [0.34, 0.5, 0.01], dir: [0, 0.05, 1], role: 'supply', tag: true },
    { from: [0.83, -0.6, -0.39], spread: [0.15, 0.15, 0.01], dir: [0, 0.2, 1], role: 'reject', tag: true },
  ],
  window: [
    { from: [-0.07, -0.1, 0.56], spread: [0.42, 0.08, 0.02], dir: [0, 0.05, -1], role: 'intake', tag: true },
    { from: [-0.07, 0.12, 0.37], spread: [0.4, 0.1, 0.01], dir: [0, 0.15, 1], role: 'supply', tag: true },
    { from: [0.38, 0, -0.1], spread: [0.02, 0.2, 0.3], dir: [-1, 0, 0], role: 'intake' },
    { from: [0, 0, -0.37], spread: [0.3, 0.25, 0.01], dir: [0, 0.1, -1], role: 'reject', tag: true },
  ],
  vrf: [
    { from: [0.62, 0.05, 0], spread: [0.02, 0.7, 0.4], dir: [-1, 0, 0], role: 'intake', tag: true },
    { from: [-0.62, 0.05, 0], spread: [0.02, 0.7, 0.4], dir: [1, 0, 0], role: 'intake' },
    { from: [0, 0.84, 0], spread: [0.5, 0.01, 0.5], dir: [0, 1, 0], role: 'reject', tag: true },
  ],
  packaged: [
    { from: [0.95, -0.1, 0.3], spread: [0.02, 0.3, 0.5], dir: [-1, 0, 0], role: 'intake', tag: true },
    { from: [0, 0.44, -0.14], spread: [1.1, 0.01, 0.4], dir: [0, 1, 0], role: 'reject', tag: true },
    { from: [0.45, -0.25, 0.62], spread: [0.3, 0.2, 0.01], dir: [0, -0.2, 1], role: 'supply', tag: true },
  ],
  ducted: [
    { from: [0, 0, -0.56], spread: [0.9, 0.22, 0.02], dir: [0, 0, 1], role: 'intake', tag: true },
    { from: [0, 0, 0.42], spread: [0.86, 0.18, 0.01], dir: [0, 0, 1], role: 'supply', tag: true },
  ],
  cassette: [
    { from: [0, 0.38, 0], spread: [0.34, 0.02, 0.34], dir: [0, -1, 0], role: 'intake', tag: true },
    { from: [0, 0.13, 0.33], spread: [0.5, 0.01, 0.01], dir: [0, 0.6, 1], role: 'supply', tag: true },
    { from: [0, 0.13, -0.33], spread: [0.5, 0.01, 0.01], dir: [0, 0.6, -1], role: 'supply' },
    { from: [0.33, 0.13, 0], spread: [0.01, 0.01, 0.5], dir: [1, 0.6, 0], role: 'supply' },
    { from: [-0.33, 0.13, 0], spread: [0.01, 0.01, 0.5], dir: [-1, 0.6, 0], role: 'supply' },
  ],
};

const ROLE_TEXT: Record<FlowRole, { en: string; tl: string; zh: string }> = {
  intake: { en: 'Intake · warm room air in', tl: 'Intake · pasok na maligamgam na hangin', zh: '进风 · 吸入室内热空气' },
  supply: { en: 'Outlet · cold air out', tl: 'Labasan · lumalabas na malamig na hangin', zh: '出风 · 送出冷风' },
  reject: { en: 'Condenser · hot air thrown out', tl: 'Condenser · init na itinatapon palabas', zh: '冷凝器 · 排出热空气' },
};

/** Floating tags on the model showing where air goes in and comes out. */
function AirTags({ kind, pinRoot }: { kind: UnitKind; pinRoot: RefObject<HTMLDivElement | null> }) {
  const seen = new Set<FlowRole>();
  return (
    <>
      {FLOW[kind].map((s, i) => {
        if (!s.tag || seen.has(s.role)) return null;
        seen.add(s.role);
        const t = ROLE_TEXT[s.role];
        // Sit the tag a little way along the stream, clear of the casing.
        const at: V3 = [s.from[0] + s.dir[0] * 0.22, s.from[1] + s.dir[1] * 0.22 + 0.03, s.from[2] + s.dir[2] * 0.22];
        return (
          <Html key={`${s.role}${i}`} position={at} center zIndexRange={[28, 0]} portal={pinRoot as RefObject<HTMLElement>} style={{ pointerEvents: 'none' }}>
            <span className="ai-flowtag" data-role={s.role}>
              <i aria-hidden="true" style={{ background: ROLE_COLOR[s.role] }} />
              {tr(t.en, t.tl, t.zh)}
            </span>
          </Html>
        );
      })}
    </>
  );
}

function Airflow({ kind, motionRef }: { kind: UnitKind; motionRef: MotionRef }) {
  const N = 70;
  const streams = FLOW[kind];
  const groups = useMemo(
    () =>
      streams.map((s) => {
        const pos = new Float32Array(N * 3);
        const life = new Float32Array(N).map(() => Math.random());
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const dir = new THREE.Vector3(...s.dir).normalize();
        const seeds = Array.from({ length: N }, () => [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
        return { s, pos, life, geo, dir, seeds };
      }),
    [kind], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => () => groups.forEach((g) => g.geo.dispose()), [groups]);
  useFrame((_, dt) => {
    const sp = motionRef.current.speed;
    groups.forEach(({ s, pos, life, geo, dir, seeds }) => {
      for (let i = 0; i < N; i++) {
        life[i] += dt * (0.25 + sp * 0.9);
        if (life[i] > 1) life[i] -= 1;
        const t = life[i];
        const reach = 0.25 + sp * 0.9;
        const [a, b, c] = seeds[i];
        pos[i * 3] = s.from[0] + a * s.spread[0] + dir.x * t * reach + a * t * 0.15;
        pos[i * 3 + 1] = s.from[1] + b * s.spread[1] + dir.y * t * reach + (s.role === 'supply' ? -t * t * 0.08 : 0);
        pos[i * 3 + 2] = s.from[2] + c * s.spread[2] + dir.z * t * reach + c * t * 0.15;
      }
      geo.attributes.position.needsUpdate = true;
    });
  });
  return (
    <>
      {groups.map(({ s, geo }, i) => (
        <points key={i} geometry={geo}>
          <pointsMaterial
            size={s.role === 'intake' ? 0.014 : 0.018}
            color={ROLE_COLOR[s.role]}
            transparent
            opacity={s.role === 'intake' ? 0.6 : 0.75}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      ))}
    </>
  );
}

/* ── Part highlight + numbered pins ── */

function Highlight({ a, color }: { a: Anchor; color: string }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.opacity = 0.18 + (Math.sin(clock.elapsedTime * 4) + 1) * 0.12;
  });
  return (
    <group position={a.p}>
      <mesh renderOrder={10}>
        <boxGeometry args={[a.s[0] + 0.02, a.s[1] + 0.02, a.s[2] + 0.02]} />
        <meshBasicMaterial ref={ref} color={color} transparent opacity={0.3} depthWrite={false} depthTest={false} />
      </mesh>
      <lineSegments renderOrder={11}>
        <edgesGeometry args={[new THREE.BoxGeometry(a.s[0] + 0.03, a.s[1] + 0.03, a.s[2] + 0.03)]} />
        <lineBasicMaterial color={color} depthTest={false} transparent />
      </lineSegments>
    </group>
  );
}

function anchorOf(kind: UnitKind, part: PartId): Anchor {
  return ANCHORS[kind][part] ?? ANCHORS[kind].body!;
}

/** Fit the model: big units scale down so every kind fills the view about the same. */
function fitScale(kind: UnitKind) {
  const b = ANCHORS[kind].body!.s;
  const extra = kind === 'wall' || kind === 'floor' ? 1.35 : 1;
  return (kind === 'wall' || kind === 'floor' ? 1.45 : 1.2) / (Math.max(b[0] * extra, b[1], b[2]) || 1);
}

function Stage({ kind, brand, motionRef, explodeRef, exploded, en, parts, picked, onPick, labelOf, pinRoot, variant, showFlow }: { pinRoot: RefObject<HTMLDivElement | null>; kind: UnitKind; brand: Brand; motionRef: MotionRef; explodeRef: ExplodeRef; exploded: boolean; en: boolean; parts: PartId[]; picked: number | null; onPick: (i: number) => void; labelOf: (i: number) => string; variant: string; showFlow: boolean }) {
  const Model = MODELS[kind];
  const s = fitScale(kind) * (exploded ? 0.72 : 1);
  const lift = kind === 'wall' ? 0.25 : 0;
  return (
    <group scale={s} position={[exploded ? 0 : kind === 'wall' ? -0.5 : kind === 'floor' ? -0.35 : 0, exploded ? 0 : lift, 0]}>
      <InteractionCtx.Provider value={{ onPick: (partId) => usePartGuide.getState().show({ kind, brandId: brand.id, partId, variant }) }}>
        <ExplodeProvider explodeRef={explodeRef} labels={exploded} en={en} spread={1.5} kind={kind} variant={variant} prices>
          <Model brand={brand} motionRef={motionRef} companion={!exploded} />
        </ExplodeProvider>
      </InteractionCtx.Provider>
      {!exploded && showFlow && <Airflow kind={kind} motionRef={motionRef} />}
      {!exploded && showFlow && <AirTags kind={kind} pinRoot={pinRoot} />}
      {!exploded && picked !== null && <Highlight a={anchorOf(kind, parts[picked])} color={brand.accent} />}
      {!exploded && parts.map((part, i) => {
        const a = anchorOf(kind, part);
        return (
          <Html key={`${part}${i}`} position={[a.p[0], a.p[1] + Math.min(a.s[1] / 2, 0.06), Math.max(a.p[2] + a.s[2] / 2, ANCHORS[kind].body!.p[2] + ANCHORS[kind].body!.s[2] / 2) + 0.03]} center zIndexRange={[30, 0]} portal={pinRoot as RefObject<HTMLElement>}>
            <button
              type="button"
              className={`ai-pin${picked === i ? ' is-on' : ''}`}
              style={{ ['--ai-accent' as string]: brand.accent }}
              onClick={() => onPick(i)}
              aria-label={labelOf(i)}
              aria-pressed={picked === i}
            >
              {i + 1}
            </button>
          </Html>
        );
      })}
    </group>
  );
}

/* ============================================================================
   Dialog
   ============================================================================ */

export default function AirconInspector({ target, onClose }: { target: InspectTarget; onClose: () => void }) {
  const language = useHVACStore((s) => s.language);
  const setQuoteModalOpen = useHVACStore((s) => s.setQuoteModalOpen);
  const reduce = useReducedMotion();
  const en = language === 'en';

  const item = EQUIPMENT_CATALOG.find((e) => e.id === target.catalogId);
  const kind: UnitKind = CATALOG_KIND[target.catalogId] ?? 'wall';
  const k = KINDS[kind];
  const [brandId, setBrandId] = useState<BrandId>(target.brandId ?? (k.commercial ? 'trane' : 'daikin'));
  const brand = BRANDS.find((b) => b.id === brandId)!;
  const spec = specFor(kind, brand, target.variant, item?.inverter ?? kind !== 'window');
  // Only parts this unit actually has; top up with the unit's standard parts.
  const features = (() => {
    const own = featuresFor(kind, brand).filter((f) => ANCHORS[kind][f.part]);
    for (const f of k.parts) if (own.length < 3 && !own.some((o) => o.part === f.part)) own.push(f);
    return own;
  })();
  const [picked, setPicked] = useState<number | null>(0);
  const [level, setLevel] = useState(Math.ceil(spec.fanSteps * 0.6));
  const [spinKey, setSpinKey] = useState(0);
  const [exploded, setExploded] = useState(Boolean(target.exploded));
  const [showFlow, setShowFlow] = useState(true);
  const explodeRef = useRef({ amount: 0, target: 0 });
  explodeRef.current.target = exploded ? 1 : 0;
  const motionRef = useRef<Motion>({ speed: 0.6, target: 0.6 });
  const closeBtn = useRef<HTMLButtonElement>(null);
  const pinRoot = useRef<HTMLDivElement>(null);

  const steps = spec.fanSteps;
  const lvl = Math.min(level, steps);
  const frac = lvl / steps;
  motionRef.current.target = frac;
  const rpmNow = Math.round(spec.rpm * (0.35 + 0.65 * frac));
  const airNow = Math.round((spec.airflow * (0.4 + 0.6 * frac)) / 10) * 10;
  const noiseNow = Math.round(spec.noiseLow + (spec.noiseHigh - spec.noiseLow) * frac);

  useEffect(() => setPicked(0), [brandId]);
  useEffect(() => {
    closeBtn.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const narrow = vw < 860;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const from = { x: target.origin.x - vw / 2, y: target.origin.y - vh / 2 };

  const name = tr(item?.nameEn, item?.nameTaglish);
  const fmt = (n: number) => n.toLocaleString('en-US');

  const stats = [
    { icon: <Zap className="w-3.5 h-3.5" />, label: tr('Cooling capacity', 'Lakas ng lamig'), value: `${fmt(spec.btu)} BTU/h`, sub: `${spec.kw} kW` },
    { icon: <Wind className="w-3.5 h-3.5" />, label: tr('Airflow (now)', 'Hangin (ngayon)'), value: `${fmt(airNow)} m³/h`, sub: `${tr('max', 'max')} ${fmt(spec.airflow)}` },
    { icon: <Gauge className="w-3.5 h-3.5" />, label: tr('Fan speed (now)', 'Bilis ng fan'), value: `${fmt(rpmNow)} rpm`, sub: `${tr('step', 'level')} ${lvl}/${steps}` },
    { icon: <Gauge className="w-3.5 h-3.5" />, label: tr('Sound level', 'Ingay'), value: `${noiseNow} dBA`, sub: `${spec.noiseLow}–${spec.noiseHigh} dBA` },
  ];
  /* ── Complete parts tally ──────────────────────────────────────────────
     A split system is two machines, so pricing only the indoor half would be
     a half-truth. Wall and floor units therefore tally the indoor unit AND
     the outdoor condenser they are paired with. Window and packaged units are
     one box, so they tally once. Commercial indoor units (cassette, ducted)
     need a condensing unit that this model does not show, and the panel says
     so rather than quietly leaving it out of the total.
     ──────────────────────────────────────────────────────────────────── */
  const bomGroups = (() => {
    const groups: { key: string; title: string; figureKind: string; rows: { id: string; en: string; tl: string; price: NonNullable<ReturnType<typeof partPrice>> }[] }[] = [];
    const build = (figureKind: string, key: string, title: string) => {
      const rows = (MODEL_PARTS[figureKind] ?? [])
        .map((mp) => ({ ...mp, price: partPrice(figureKind, mp.id, target.variant) }))
        .filter((r): r is typeof r & { price: NonNullable<typeof r.price> } => Boolean(r.price));
      if (rows.length) groups.push({ key, title, figureKind, rows });
    };
    build(kind, 'indoor', SPLIT_KINDS.includes(kind) ? tr('Indoor unit', 'Indoor unit', '室内机') : tr('Unit', 'Unit', '机组'));
    if (SPLIT_KINDS.includes(kind)) build('outdoor', 'outdoor', tr('Outdoor condenser', 'Outdoor condenser', '室外冷凝机'));
    return groups;
  })();

  const groupTotal = (g: (typeof bomGroups)[number]) =>
    g.rows.reduce(
      (acc, r) => ({ low: acc.low + r.price.low * r.price.qty, high: acc.high + r.price.high * r.price.qty }),
      { low: 0, high: 0 },
    );

  const bomTotal = bomGroups.reduce(
    (acc, g) => {
      const t = groupTotal(g);
      return {
        low: acc.low + t.low,
        high: acc.high + t.high,
        lines: acc.lines + g.rows.length,
        pieces: acc.pieces + g.rows.reduce((n, r) => n + r.price.qty, 0),
      };
    },
    { low: 0, high: 0, lines: 0, pieces: 0 },
  );

  const rows: [string, string][] = [
    [spec.effUnit === 'CSPF' ? 'CSPF' : 'EER', `${spec.eff.toFixed(2)}${spec.effUnit === 'EER' ? ' W/W' : ''}`],
    [tr('Compressor', 'Compressor'), spec.compressor],
    [tr('Refrigerant', 'Refrigerant'), spec.refrigerant],
    [tr('Inverter', 'Inverter'), spec.inverter ? (tr('Yes', 'Oo')) : tr('No (fixed speed)', 'Hindi (fixed speed)')],
    ...(spec.throwM ? ([[tr('Air throw', 'Abot ng hangin'), `up to ${spec.throwM} m`]] as [string, string][]) : []),
    [tr('Warranty', 'Warranty'), spec.warranty],
    [tr('Indicative price', 'Tinatayang presyo'), item?.priceEstimatePhp ?? '—'],
  ];

  return createPortal(
      <motion.div
        className="ai-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="ai-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-title"
          data-accent={k.commercial ? 'amber' : 'cyan'}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.18, x: from.x, y: from.y, rotateX: 18 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotateX: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.2, x: from.x, y: from.y }}
          transition={{ type: 'spring', stiffness: 160, damping: 22, mass: 0.9 }}
        >
          {/* ── 3D view ── */}
          <div className="ai-stage">
            {/* Honest labelling: this is our own 3D model, not the brand's own product */}
            <span className="ai-render-tag">
              {tr('Our 3D model · illustrative, not the brand’s photo', 'Sarili naming 3D model · pang-ilustrasyon lang', '我方自制 3D 模型 · 仅作示意，非品牌照片')}
            </span>
            {exploded && bomTotal.lines > 0 && (
              <div className="ai-stage-tally">
                <span>{tr('Complete parts tally', 'Buong tally ng piyesa', '全部部件合计')}</span>
                <strong>
                  {peso(bomTotal.low)} – {peso(bomTotal.high)}
                </strong>
                <small>
                  {bomTotal.lines} {tr('part types', 'uri ng piyesa', '种部件')} · {bomTotal.pieces} {tr('pieces', 'piraso', '件')}
                  {SPLIT_KINDS.includes(kind) ? ` · ${tr('indoor + outdoor', 'indoor + outdoor', '室内机 + 室外机')}` : ''}
                  {NEEDS_SEPARATE_OUTDOOR.includes(kind) ? ` · ${tr('indoor only', 'indoor lang', '仅室内机')}` : ''}
                </small>
              </div>
            )}
            <div ref={pinRoot} className="ai-pins" />
            <Canvas shadows resize={{ offsetSize: true }} dpr={[1, 2]} camera={{ position: narrow ? [2.1, 1.1, 3.9] : [1.5, 0.8, 2.7], fov: 36 }} gl={{ antialias: true, alpha: true }}>
              <StudioEnvironment intensity={0.9} />
              <hemisphereLight args={['#e0f2fe', '#0b1220', 0.45]} />
              <directionalLight position={[3, 5, 4]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
              <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#93c5fd" />
              <pointLight position={[0, 1.5, 2]} intensity={0.4} color={brand.accent} />
              <group key={spinKey}>
                <Stage
                  pinRoot={pinRoot}
                  kind={kind}
                  brand={brand}
                  motionRef={motionRef}
                  explodeRef={explodeRef}
                  exploded={exploded}
                  en={en}
                  parts={features.map((f) => f.part)}
                  picked={picked}
                  onPick={setPicked}
                  labelOf={(i) => tr(features[i].nameEn, features[i].nameTl)}
                  variant={target.variant}
                  showFlow={showFlow}
                />
              </group>
              <SpeedEaser motionRef={motionRef} />
              <ContactShadows position={[0, -1.0, 0]} opacity={0.5} scale={5} blur={2.4} far={2} />
              <OrbitControls
                key={`oc${spinKey}`}
                enablePan={false}
                minDistance={1.6}
                maxDistance={5}
                autoRotate={!reduce}
                autoRotateSpeed={1.1}
                target={[0, 0, 0]}
              />
            </Canvas>
            {/* Air path legend: where air goes in, where it comes out */}
            {!exploded && showFlow && (
              <div className="ai-flowkey" aria-hidden="true">
                {(['intake', 'supply', 'reject'] as FlowRole[])
                  .filter((r) => FLOW[kind].some((s) => s.role === r))
                  .map((r) => (
                    <span key={r}>
                      <i style={{ background: ROLE_COLOR[r] }} />
                      {tr(ROLE_TEXT[r].en, ROLE_TEXT[r].tl, ROLE_TEXT[r].zh)}
                    </span>
                  ))}
              </div>
            )}

            <div className="ai-stage-bar">
              <span>{tr('Drag to turn · scroll to zoom', 'I-drag para iikot · scroll para mag-zoom')}</span>
              {!exploded && (
                <button
                  type="button"
                  className={`ai-explode-btn ai-flow-btn${showFlow ? ' is-on' : ''}`}
                  onClick={() => setShowFlow((v) => !v)}
                  aria-pressed={showFlow}
                >
                  <Wind className="w-4 h-4" aria-hidden="true" />
                  {tr('Air path', 'Daloy ng hangin', '气流路径')}
                </button>
              )}
              <button
                type="button"
                className={`ai-explode-btn${exploded ? ' is-on' : ''}`}
                onClick={() => setExploded((v) => !v)}
                aria-pressed={exploded}
              >
                <Boxes className="w-4 h-4" aria-hidden="true" />
                {exploded ? (tr('Assemble', 'Ibalik')) : tr('Exploded view', 'Exploded view')}
              </button>
              <button type="button" className="ai-icon-btn" onClick={() => setSpinKey((n) => n + 1)} aria-label={tr('Reset view', 'I-reset ang view')}>
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ── Data ── */}
          <div className="ai-panel">
            <button ref={closeBtn} type="button" className="ai-close" onClick={onClose} aria-label={tr('Close', 'Isara')}>
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <p className="ai-eyebrow">
              {tr(k.labelEn, k.labelTl)} · {target.variant}
            </p>
            <h2 id="ai-title" className="ai-title">
              {brand.name} <span>{name}</span>
            </h2>

            <div className="ai-brands" role="tablist" aria-label={tr('Brand', 'Brand')}>
              {BRANDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={b.id === brandId}
                  className={`ai-brand${b.id === brandId ? ' is-on' : ''}`}
                  style={{ ['--ai-accent' as string]: b.accent }}
                  onClick={() => setBrandId(b.id)}
                  title={`${b.name} · ${b.origin}`}
                >
                  {b.id === 'mitsubishi' ? 'Mitsubishi' : b.name}
                </button>
              ))}
            </div>

            <div className="ai-stats">
              {stats.map((s) => (
                <div key={s.label} className="ai-stat">
                  <span className="ai-stat-l">
                    {s.icon}
                    {s.label}
                  </span>
                  <motion.strong key={s.value} initial={reduce ? false : { opacity: 0.3, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    {s.value}
                  </motion.strong>
                  <small>{s.sub}</small>
                </div>
              ))}
            </div>

            <div className="ai-speed">
              <div className="ai-speed-h">
                <span>{tr('Fan speed', 'Bilis ng fan')}</span>
                <span>{lvl === steps ? (tr('Turbo', 'Turbo')) : lvl === 1 ? (tr('Quiet', 'Tahimik')) : `${tr('Step', 'Level')} ${lvl}`}</span>
              </div>
              <div className="ai-steps" role="radiogroup" aria-label={tr('Fan speed', 'Bilis ng fan')}>
                {Array.from({ length: steps }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={lvl === i + 1}
                    aria-label={`${tr('Step', 'Level')} ${i + 1}`}
                    className={`ai-step${i < lvl ? ' is-on' : ''}`}
                    style={{ height: `${10 + (i / Math.max(steps - 1, 1)) * 18}px` }}
                    onClick={() => setLevel(i + 1)}
                  />
                ))}
              </div>
            </div>

            <h3 className="ai-h3">{tr('What makes it different', 'Ano ang kakaiba')}</h3>
            <ol className="ai-parts">
              {features.map((f, i) => (
                <li key={`${brandId}${i}`}>
                  <button type="button" className={`ai-part${picked === i ? ' is-on' : ''}`} onClick={() => setPicked(picked === i ? null : i)} aria-pressed={picked === i}>
                    <span className="ai-part-n">{i + 1}</span>
                    <span>
                      <strong>{tr(f.nameEn, f.nameTl)}</strong>
                      <AnimatePresence initial={false}>
                        {picked === i && (
                          <motion.span className="ai-part-t" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            {tr(f.textEn, f.textTl)}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            {/* ── Parts list: quantity + indicative price per part ── */}
            <h3 className="ai-h3">
              <Tag className="w-3.5 h-3.5 inline-block -mt-0.5 mr-1" aria-hidden="true" />
              {tr('Parts in this unit · indicative prices', 'Mga piyesa · tinatayang presyo', '部件清单 · 参考价格')}
            </h3>
            <p className="ai-bom-lead">
              {tr(
                exploded
                  ? 'Each part is labelled on the exploded model with its quantity and price. Tap a row to open how it works.'
                  : 'Open the exploded view to see each part labelled on the model. Tap a row to open how it works.',
                exploded
                  ? 'May label ang bawat piyesa sa exploded model kasama ang dami at presyo. Pindutin ang linya para sa paliwanag.'
                  : 'Buksan ang exploded view para makita ang label ng bawat piyesa. Pindutin ang linya para sa paliwanag.',
                exploded
                  ? '爆炸图上每个部件都标注了数量和价格。点击任一行查看工作原理。'
                  : '打开爆炸视图即可看到每个部件的标注。点击任一行查看工作原理。',
              )}
            </p>
            {bomGroups.map((g) => {
              const t = groupTotal(g);
              return (
                <section key={g.key} className="ai-bom-group">
                  {bomGroups.length > 1 && (
                    <h4 className="ai-bom-gh">
                      <span>{g.title}</span>
                      <span>
                        {peso(t.low)} – {peso(t.high)}
                      </span>
                    </h4>
                  )}
                  <ul className="ai-bom">
                    {g.rows.map((r) => (
                      <li key={`${g.key}-${r.id}`}>
                        <button
                          type="button"
                          className="ai-bom-row"
                          onClick={() => {
                            if (g.key === 'indoor') setExploded(true);
                            usePartGuide.getState().show({ kind: g.figureKind, brandId: brand.id, partId: r.id, variant: target.variant });
                          }}
                        >
                          <span className="ai-bom-name">{tr(r.en, r.tl)}</span>
                          <span className="ai-bom-qty">×{r.price.qty}</span>
                          <span className="ai-bom-price">
                            {priceRange(r.price)}
                            {r.price.qty > 1 && <small>{priceLineTotal(r.price)}</small>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            {bomTotal.lines > 0 && (
              <div className="ai-bom-total">
                <span>
                  {tr('Complete parts tally', 'Buong tally ng piyesa', '全部部件合计')}
                  <small>
                    {bomTotal.lines} {tr('part types', 'uri ng piyesa', '种部件')} · {bomTotal.pieces} {tr('pieces', 'piraso', '件')}
                    {bomGroups.length > 1 ? ` · ${tr('indoor + outdoor', 'indoor + outdoor', '室内机 + 室外机')}` : ''}
                  </small>
                </span>
                <strong>
                  {peso(bomTotal.low)} – {peso(bomTotal.high)}
                </strong>
              </div>
            )}

            {NEEDS_SEPARATE_OUTDOOR.includes(kind) && (
              <p className="ai-bom-lead">
                {tr(
                  'This tally covers the indoor unit only. A cassette or ducted unit also needs a matching condensing unit outside, which is quoted separately.',
                  'Indoor unit lang ang nasa tally na ito. Kailangan pa ng katugmang condensing unit sa labas, hiwalay ang quote nito.',
                  '此清单仅含室内机。天花机／风管机还需配套室外冷凝机组，另行报价。',
                )}
              </p>
            )}

            <p className="ai-note">
              {tr(
                'Mock, indicative supply-only figures for this showroom — parts only, no labour, refrigerant, brackets or delivery, and not a quotation. A real part price comes from the supplier list for your exact model; a whole new unit also usually costs far less than buying its parts one by one.',
                'Mock at tinatayang presyo ng piyesa lamang para sa showroom na ito — walang kasamang labor, refrigerant, bracket o delivery, at hindi ito quotation. Ang totoong presyo ay galing sa supplier list ng eksaktong model; mas mura rin ang bagong unit kaysa bilhin ang piyesa isa-isa.',
                '此处为展厅用的模拟参考价（仅部件本身），不含人工、冷媒、支架与运费，也不构成报价。实际价格以具体型号的供应商价目表为准；整机通常也远低于逐件购买部件的总和。',
              )}
            </p>

            <dl className="ai-rows">
              {rows.map(([t, d]) => (
                <div key={t}>
                  <dt>{t}</dt>
                  <dd>{d}</dd>
                </div>
              ))}
            </dl>
            <p className="ai-note">
              {tr(`Typical ${brand.name} figures for this size, for comparison. Exact ratings depend on the model; we confirm them on the data sheet with your quote.`, `Karaniwang figures ng ${brand.name} sa ganitong laki, pang-kumpara. Nakadepende sa model ang eksaktong rating; kinukumpirma namin sa data sheet kasama ng quote.`, `以上为 ${brand.name} 该匹数的典型参数，仅供比较。实际数值以具体型号为准，我们会随报价提供规格书确认。`)}
            </p>

            <button
              type="button"
              className="ai-cta"
              onClick={() => {
                onClose();
                setQuoteModalOpen(true);
              }}
            >
              <CalendarCheck className="w-4 h-4" aria-hidden="true" />
              {tr(`Get a quote for this ${brand.id === 'mitsubishi' ? 'Mitsubishi' : brand.name}`, `Magpa-quote ng ${brand.id === 'mitsubishi' ? 'Mitsubishi' : brand.name}`, `获取这款 ${brand.id === 'mitsubishi' ? 'Mitsubishi' : brand.name} 的报价`)}
            </button>
          </div>
        </motion.div>
      </motion.div>
    , document.body,
  );
}

/** Eases the live fan speed toward the chosen step so fans spin up and down smoothly. */
function SpeedEaser({ motionRef }: { motionRef: MotionRef }) {
  useFrame((_, dt) => {
    const m = motionRef.current;
    m.speed += (m.target - m.speed) * Math.min(1, dt * 2.2);
  });
  return null;
}

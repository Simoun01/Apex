import { Html, RoundedBox } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Brand, UnitKind } from '../../data/airconBrands';
import { partPrice, priceRange } from '../../data/partPrices';
import { tr } from '../../i18n/tr';

/* ============================================================================
   Shared, detailed aircon models.

   Every unit is built from real sub-assemblies (casing, filter, coil, fans,
   compressor, control board …). Each sub-assembly is wrapped in <Part>, which
   slides it out along its own direction when the exploded view is on, and can
   show a label naming it. Units face +z and are centred on the origin.

   Used by the showroom hero (live 3D), the carousel "photo studio" (renders
   still images) and the inspector dialog.
   ============================================================================ */

export type V3 = [number, number, number];

export interface Motion {
  speed: number; // 0..1 eased
  target: number;
}
export type MotionRef = { current: Motion };

/* ── Exploded view ─────────────────────────────────────────────────────────── */

export interface ExplodeState {
  amount: number; // eased 0..1
  target: number;
}
export type ExplodeRef = { current: ExplodeState };

interface ExplodeCtxValue {
  ref: ExplodeRef;
  labels: boolean;
  en: boolean;
  /** Multiplies every part's travel, so small views can spread parts further apart */
  spread: number;
  /** Unit kind + capacity: used to put an indicative price and quantity on each label */
  kind?: string;
  variant?: string;
  prices?: boolean;
}

const ExplodeCtx = createContext<ExplodeCtxValue | null>(null);

export function ExplodeProvider({
  explodeRef,
  labels = false,
  en = true,
  spread = 1,
  kind,
  variant,
  prices = false,
  children,
}: {
  explodeRef: ExplodeRef;
  labels?: boolean;
  en?: boolean;
  spread?: number;
  kind?: string;
  variant?: string;
  /** Show the indicative part price + quantity under each exploded label */
  prices?: boolean;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ ref: explodeRef, labels, en, spread, kind, variant, prices }),
    [explodeRef, labels, en, spread, kind, variant, prices],
  );
  useFrame((_, dt) => {
    const s = explodeRef.current;
    if (Math.abs(s.target - s.amount) > 0.0005) s.amount += (s.target - s.amount) * Math.min(1, dt * 3.2);
    else s.amount = s.target;
  });
  return <ExplodeCtx.Provider value={value}>{children}</ExplodeCtx.Provider>;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ── Interaction: click-to-explain, highlights, x-ray, dirt, isolate ──────── */

export interface ModelInteraction {
  /** Called with the part id when the visitor clicks a part */
  onPick?: (partId: string) => void;
  /** Part shown as selected (orange outline) */
  selected?: string | null;
  /** Parts lit by a symptom / service (cyan outline) */
  highlighted?: string[];
  /** Ghost the outer casing so the internals show */
  xray?: boolean;
  /** 0 = clean … 1 = heavily soiled coils, filters and fans */
  dirt?: number;
  /** Render only this part (used for the part illustration) */
  isolate?: string | null;
}

export const InteractionCtx = createContext<ModelInteraction>({});

/** Outer casing parts: ghosted in x-ray */
const SHELL_IDS = new Set(['panel', 'casing', 'top', 'frame']);
/** Parts that collect dust: tinted by `dirt` */
const DIRTY_IDS = new Set(['coil', 'filter', 'crossflow', 'blower', 'fan', 'condenser']);
const DIRT = new THREE.Color('#6b5b4b');

type MatLike = THREE.Material & { color?: THREE.Color; opacity: number };
function eachMaterial(root: THREE.Object3D, fn: (m: MatLike) => void) {
  root.traverse((o) => {
    if (o.userData.glow) return;
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => m && fn(m as MatLike));
  });
}

/** Outline box around a part, sized from the part's own geometry. */
function PartGlow({ host, color, pulse }: { host: THREE.Group; color: string; pulse: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const { size, center } = useMemo(() => {
    const box = new THREE.Box3();
    const inv = host.matrixWorld.clone().invert();
    host.children.forEach((c) => {
      if (c.userData.glow) return;
      const b = new THREE.Box3().setFromObject(c);
      if (!b.isEmpty()) box.union(b);
    });
    if (box.isEmpty()) return { size: new THREE.Vector3(), center: new THREE.Vector3() };
    box.applyMatrix4(inv);
    return { size: box.getSize(new THREE.Vector3()).addScalar(0.015), center: box.getCenter(new THREE.Vector3()) };
  }, [host]);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z)), [size]);
  useEffect(() => () => edges.dispose(), [edges]);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = pulse ? 0.12 + (Math.sin(clock.elapsedTime * 4) + 1) * 0.08 : 0.08;
  });
  if (size.lengthSq() === 0) return null;
  return (
    <group position={center} userData={{ glow: true }}>
      <mesh renderOrder={20} userData={{ glow: true }} raycast={() => null}>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshBasicMaterial ref={mat} color={color} transparent opacity={0.15} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <lineSegments geometry={edges} renderOrder={21} userData={{ glow: true }} raycast={() => null}>
        <lineBasicMaterial color={color} transparent depthTest={false} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

/** A sub-assembly that slides out along `dir` by `dist` (metres) in the exploded view.
 *  It is also the unit of interaction: clickable, highlightable, x-ray-able and isolatable. */
export function Part({
  id,
  en,
  tl,
  dir = [0, 0, 0],
  dist = 0,
  at = [0, 0, 0],
  children,
}: {
  id: string;
  en: string;
  tl?: string;
  dir?: V3;
  dist?: number;
  /** Where the label sits, in the part's own coordinates */
  at?: V3;
  children: ReactNode;
}) {
  const ctx = useContext(ExplodeCtx);
  const ix = useContext(InteractionCtx);
  const ref = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<THREE.Group | null>(null);
  const [hover, setHover] = useState(false);
  const n = useMemo(() => {
    const v = new THREE.Vector3(...dir);
    return v.lengthSq() > 0 ? v.normalize() : v;
  }, [dir[0], dir[1], dir[2]]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const a = ctx ? ease(ctx.ref.current.amount) * ctx.spread : 0;
    if (ref.current) ref.current.position.set(n.x * dist * a, n.y * dist * a, n.z * dist * a);
    if (label.current) {
      const raw = ctx ? ease(ctx.ref.current.amount) : 0;
      const o = Math.max(0, Math.min(1, (raw - 0.6) / 0.35));
      label.current.style.opacity = String(o);
      label.current.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    }
  });

  // X-ray: ghost the casing
  const ghost = Boolean(ix.xray && SHELL_IDS.has(id));
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    eachMaterial(g, (m) => {
      if (m.userData.xrayBase === undefined) m.userData.xrayBase = { o: m.opacity, t: m.transparent, d: m.depthWrite };
      const b = m.userData.xrayBase as { o: number; t: boolean; d: boolean };
      m.opacity = ghost ? Math.min(b.o, 0.14) : b.o;
      m.transparent = ghost ? true : b.t;
      m.depthWrite = ghost ? false : b.d;
      m.needsUpdate = true;
    });
    // A ghosted casing lets clicks through to the parts inside it
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || o.userData.glow) return;
      if (ghost) mesh.raycast = () => {};
      else delete (mesh as Partial<THREE.Mesh>).raycast;
    });
  }, [ghost]);

  // Dirt: tint dust-collecting parts
  const dirt = DIRTY_IDS.has(id) ? Math.max(0, Math.min(1, ix.dirt ?? 0)) : 0;
  useEffect(() => {
    const g = ref.current;
    if (!g || !DIRTY_IDS.has(id)) return;
    eachMaterial(g, (m) => {
      if (!m.color) return;
      if (!m.userData.dirtBase) m.userData.dirtBase = m.color.clone();
      m.color.copy(m.userData.dirtBase as THREE.Color).lerp(DIRT, dirt * 0.8);
    });
  }, [dirt, id]);

  if (ix.isolate && ix.isolate !== id) return null;

  const price = ctx?.prices && ctx.kind ? partPrice(ctx.kind, id, ctx.variant) : null;
  const selected = ix.selected === id;
  const lit = !selected && Boolean(ix.highlighted?.includes(id));
  const glowColor = selected ? '#f97316' : lit ? '#22d3ee' : hover ? '#e2e8f0' : null;
  const pickable = Boolean(ix.onPick) && !ix.isolate;

  return (
    <group
      ref={(g) => {
        ref.current = g;
        if (g && g !== host) setHost(g);
      }}
      name={id}
      onClick={
        pickable
          ? (e) => {
              e.stopPropagation();
              ix.onPick!(id);
            }
          : undefined
      }
      onPointerOver={
        pickable
          ? (e) => {
              e.stopPropagation();
              setHover(true);
              document.body.style.cursor = 'pointer';
            }
          : undefined
      }
      onPointerOut={
        pickable
          ? () => {
              setHover(false);
              document.body.style.cursor = 'auto';
            }
          : undefined
      }
    >
      {children}
      {host && glowColor && <PartGlow host={host} color={glowColor} pulse={selected || lit} />}
      {ctx?.labels && (
        <Html position={at} center zIndexRange={[25, 0]} style={{ pointerEvents: 'none' }}>
          <div ref={label} className="am-label" style={{ opacity: 0, visibility: 'hidden' }}>
            <span className="am-label-n">{tr(en, tl ?? en)}</span>
            {ctx.prices && price && (
              <span className="am-label-p">
                <em>×{price.qty}</em>
                {priceRange(price)}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ── Studio lighting environment (no network: RoomEnvironment → PMREM) ────── */

export function StudioEnvironment({ intensity = 1 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const rt = pmrem.fromScene(room, 0.035);
    const prev = scene.environment;
    scene.environment = rt.texture;
    room.dispose();
    pmrem.dispose();
    return () => {
      scene.environment = prev;
      rt.dispose();
    };
  }, [gl, scene]);
  useEffect(() => {
    scene.environmentIntensity = intensity;
  }, [scene, intensity]);
  return null;
}

/* ── Materials ─────────────────────────────────────────────────────────────── */

function Plastic({ color, gloss = 0.6, rough = 0.3 }: { color: string; gloss?: number; rough?: number }) {
  return <meshPhysicalMaterial color={color} roughness={rough} clearcoat={gloss} clearcoatRoughness={0.22} sheen={0.15} />;
}
function Metal({ color = '#c5ccd4', rough = 0.34, metal = 0.8 }: { color?: string; rough?: number; metal?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} />;
}
function Painted({ color, rough = 0.42 }: { color: string; rough?: number }) {
  return <meshPhysicalMaterial color={color} roughness={rough} metalness={0.25} clearcoat={0.35} clearcoatRoughness={0.4} />;
}
function Matte({ color, rough = 0.75 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0.05} />;
}
const COPPER = { color: '#b8733d', roughness: 0.26, metalness: 1 };
const BRASS = { color: '#c9a227', roughness: 0.3, metalness: 1 };

/* ── Primitives ────────────────────────────────────────────────────────────── */

type MatNode = ReactNode;

function B({ p = [0, 0, 0], s, r, m, shadow = true }: { p?: V3; s: V3; r?: V3; m: MatNode; shadow?: boolean }) {
  return (
    <mesh position={p} rotation={r} castShadow={shadow} receiveShadow>
      <boxGeometry args={s} />
      {m}
    </mesh>
  );
}

function RB({ p = [0, 0, 0], s, radius = 0.02, m, smooth = 6 }: { p?: V3; s: V3; radius?: number; m: MatNode; smooth?: number }) {
  return (
    <RoundedBox args={s} radius={radius} smoothness={smooth} position={p} castShadow receiveShadow>
      {m}
    </RoundedBox>
  );
}

function Cyl({ p = [0, 0, 0], r = [0, 0, 0], rad, len, m, seg = 32, open = false }: { p?: V3; r?: V3; rad: number | [number, number]; len: number; m: MatNode; seg?: number; open?: boolean }) {
  const [a, b] = Array.isArray(rad) ? rad : [rad, rad];
  return (
    <mesh position={p} rotation={r} castShadow receiveShadow>
      <cylinderGeometry args={[a, b, len, seg, 1, open]} />
      {m}
    </mesh>
  );
}

/** Many identical thin pieces (fins, slats) as one instanced draw call. */
function Fins({
  count,
  size,
  gap,
  axis = 'x',
  p = [0, 0, 0],
  r,
  color = '#d3d9e0',
  metal = 0.75,
  rough = 0.36,
}: {
  count: number;
  size: V3;
  gap: number;
  axis?: 'x' | 'y' | 'z';
  p?: V3;
  r?: V3;
  color?: string;
  metal?: number;
  rough?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const o = (i - (count - 1) / 2) * gap;
      m.makeTranslation(axis === 'x' ? o : 0, axis === 'y' ? o : 0, axis === 'z' ? o : 0);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, gap, axis]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} position={p} rotation={r} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metal} roughness={rough} />
    </instancedMesh>
  );
}

/** Copper pipe along a smooth path. */
function Pipe({ pts, r = 0.008, color }: { pts: V3[]; r?: number; color?: string }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
    return new THREE.TubeGeometry(curve, Math.max(24, pts.length * 12), r, 12, false);
  }, [JSON.stringify(pts), r]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} castShadow>
      {color ? <meshStandardMaterial color={color} roughness={0.5} /> : <meshStandardMaterial {...COPPER} />}
    </mesh>
  );
}

/** U-bend return pipes on the end of a coil. */
function HairpinEnds({ x, ys, z, r = 0.012 }: { x: number; ys: number[]; z: number; r?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
      {ys.map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[r, 0.0045, 10, 20, Math.PI]} />
          <meshStandardMaterial {...COPPER} />
        </mesh>
      ))}
    </group>
  );
}

function useSpin(motionRef: MotionRef | undefined, axis: 'x' | 'y' | 'z', rate: number) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const sp = motionRef ? motionRef.current.speed : 0.5;
    if (ref.current) ref.current.rotation[axis] += dt * rate * (0.15 + sp * 1.6);
  });
  return ref;
}

/** Axial propeller facing +z, with a guard. */
export function Propeller({
  r,
  motionRef,
  rate = 9,
  blades = 3,
  color = '#3b4452',
  guard = true,
}: {
  r: number;
  motionRef?: MotionRef;
  rate?: number;
  blades?: number;
  color?: string;
  guard?: boolean;
}) {
  const spin = useSpin(motionRef, 'z', rate);
  const blade = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(r * 0.22, r * 0.5, r * 0.82, r * 0.68, r * 0.92, r * 0.18);
    s.bezierCurveTo(r * 0.62, r * 0.04, r * 0.3, -r * 0.02, 0, 0);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.006,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 2,
      curveSegments: 24,
    });
  }, [r]);
  useEffect(() => () => blade.dispose(), [blade]);
  return (
    <group>
      <mesh position={[0, 0, -0.012]}>
        <circleGeometry args={[r * 1.03, 48]} />
        <meshStandardMaterial color="#0b1220" roughness={0.95} />
      </mesh>
      <group ref={spin}>
        {Array.from({ length: blades }, (_, i) => (
          <mesh key={i} geometry={blade} rotation={[0.28, 0, (i * Math.PI * 2) / blades]} castShadow>
            <meshPhysicalMaterial color={color} roughness={0.42} metalness={0.15} clearcoat={0.3} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <Cyl r={[Math.PI / 2, 0, 0]} rad={[r * 0.13, r * 0.16]} len={0.05} m={<Metal color="#9aa5b3" />} />
      </group>
      {guard && (
        <group position={[0, 0, 0.032]}>
          {[0.28, 0.48, 0.68, 0.86, 1].map((k) => (
            <mesh key={k}>
              <torusGeometry args={[r * k, 0.003, 6, 64]} />
              <Metal color="#6b7686" rough={0.3} />
            </mesh>
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 6]}>
              <B s={[r * 2, 0.004, 0.004]} m={<Metal color="#6b7686" />} shadow={false} />
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

/** Squirrel-cage cross-flow wheel along x. */
function CrossflowWheel({ len, r, motionRef, rate = 14 }: { len: number; r: number; motionRef?: MotionRef; rate?: number }) {
  const spin = useSpin(motionRef, 'x', rate);
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 32;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      e.set(a + 0.5, 0, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(0, Math.cos(a) * r, Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [r]);
  return (
    <group ref={spin}>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} castShadow>
        <boxGeometry args={[len, 0.003, 0.014]} />
        <meshStandardMaterial color="#3f4a5a" roughness={0.55} />
      </instancedMesh>
      {[-len / 2, -len / 6, len / 6, len / 2].map((x) => (
        <Cyl key={x} p={[x, 0, 0]} r={[0, 0, Math.PI / 2]} rad={r * 1.05} len={0.004} m={<Matte color="#334155" />} />
      ))}
      <Cyl r={[0, 0, Math.PI / 2]} rad={0.004} len={len + 0.03} m={<Metal />} />
    </group>
  );
}

/** Centrifugal (blower) wheel, axis along z. */
function BlowerWheel({ r, w, motionRef, rate = 12, axis = 'z' }: { r: number; w: number; motionRef?: MotionRef; rate?: number; axis?: 'x' | 'y' | 'z' }) {
  const spin = useSpin(motionRef, 'z', rate);
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 28;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      q.setFromEuler(new THREE.Euler(0, 0, a + 0.6));
      m.compose(new THREE.Vector3(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, 0), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [r]);
  const rot: V3 = axis === 'x' ? [0, Math.PI / 2, 0] : axis === 'y' ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <group rotation={rot}>
      <group ref={spin}>
        <instancedMesh ref={ref} args={[undefined, undefined, N]} castShadow>
          <boxGeometry args={[r * 0.28, 0.004, w]} />
          <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.3} />
        </instancedMesh>
        <Cyl p={[0, 0, -w / 2]} r={[Math.PI / 2, 0, 0]} rad={r} len={0.005} m={<Matte color="#334155" />} />
        <mesh position={[0, 0, w / 2]}>
          <torusGeometry args={[r * 0.9, 0.006, 8, 40]} />
          <Matte color="#334155" />
        </mesh>
        <Cyl r={[Math.PI / 2, 0, 0]} rad={r * 0.18} len={w * 0.9} m={<Metal color="#94a3b8" />} />
      </group>
    </group>
  );
}

function Motor({ p, r, rad = 0.04, len = 0.08 }: { p: V3; r?: V3; rad?: number; len?: number }) {
  return (
    <group position={p} rotation={r}>
      <Cyl r={[0, 0, Math.PI / 2]} rad={rad} len={len} m={<Painted color="#2b3442" rough={0.5} />} />
      {[-1, 1].map((s) => (
        <Cyl key={s} p={[(s * len) / 2, 0, 0]} r={[0, 0, Math.PI / 2]} rad={rad * 0.8} len={0.008} m={<Metal color="#8b95a3" />} />
      ))}
      <Cyl r={[0, 0, Math.PI / 2]} rad={0.006} len={len + 0.06} m={<Metal />} />
      <Fins count={6} size={[len * 0.8, 0.004, rad * 2.05]} gap={rad * 0.3} axis="y" color="#1f2733" metal={0.3} />
    </group>
  );
}

/** Hermetic compressor with accumulator and copper lines. */
function Compressor({ p, h = 0.26, rad = 0.09, scroll = false }: { p: V3; h?: number; rad?: number; scroll?: boolean }) {
  return (
    <group position={p}>
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[rad, h - rad * 2, 10, 32]} />
        <meshPhysicalMaterial color={scroll ? '#1d2a3a' : '#22303f'} roughness={0.38} metalness={0.55} clearcoat={0.5} />
      </mesh>
      <B p={[rad * 0.95, h * 0.18, 0]} s={[0.03, 0.05, 0.05]} m={<Matte color="#0f172a" />} />
      <Cyl p={[0, -h / 2 - 0.005, 0]} rad={rad * 1.3} len={0.012} m={<Metal color="#4b5563" />} />
      {[0, 1, 2].map((i) => (
        <Cyl key={i} p={[Math.cos((i * Math.PI * 2) / 3) * rad * 1.15, -h / 2 - 0.02, Math.sin((i * Math.PI * 2) / 3) * rad * 1.15]} rad={0.012} len={0.022} m={<Matte color="#111827" rough={0.95} />} />
      ))}
      {/* Accumulator */}
      <mesh position={[-rad * 1.7, 0.02, 0]} castShadow>
        <capsuleGeometry args={[rad * 0.45, h * 0.45, 8, 24]} />
        <meshPhysicalMaterial color="#26323f" roughness={0.4} metalness={0.5} clearcoat={0.4} />
      </mesh>
      <Pipe pts={[[-rad * 1.7, h * 0.36, 0], [-rad * 1.2, h * 0.5, 0], [-rad * 0.3, h * 0.42, 0], [0, h * 0.3, 0]]} r={0.007} />
      <Pipe pts={[[0, h / 2 + rad * 0.2, 0], [rad * 0.3, h / 2 + rad * 0.9, 0.02], [rad * 1.4, h / 2 + rad * 0.8, 0.04]]} r={0.006} />
    </group>
  );
}

function Pcb({ p, s, r }: { p: V3; s: [number, number]; r?: V3 }) {
  return (
    <group position={p} rotation={r}>
      <B s={[s[0], s[1], 0.004]} m={<meshStandardMaterial color="#0f5132" roughness={0.45} metalness={0.2} />} />
      {[
        [-0.3, 0.25, 0.22, 0.18],
        [0.15, 0.2, 0.3, 0.22],
        [-0.1, -0.2, 0.42, 0.16],
        [0.3, -0.25, 0.14, 0.2],
      ].map(([x, y, w, h], i) => (
        <B key={i} p={[x * s[0], y * s[1], 0.008]} s={[w * s[0], h * s[1], 0.012]} m={<Matte color={i === 1 ? '#111827' : '#334155'} />} shadow={false} />
      ))}
      <Cyl p={[0.32 * s[0], 0.25 * s[1], 0.018]} r={[Math.PI / 2, 0, 0]} rad={0.008} len={0.028} m={<Matte color="#1e3a8a" />} />
    </group>
  );
}

/* ============================================================================
   Models
   ============================================================================ */

export interface ModelProps {
  brand: Brand;
  motionRef?: MotionRef;
  /** Show the paired outdoor condenser next to wall / floor units (inspector) */
  companion?: boolean;
}

/* ── Wall-mounted split ── */

function useWallShell() {
  return useMemo(() => {
    const s = new THREE.Shape();
    // side profile: x = depth (z), y = height
    s.moveTo(-0.06, -0.15);
    s.lineTo(0.035, -0.15);
    s.lineTo(0.1, -0.088);
    s.quadraticCurveTo(0.13, 0.0, 0.119, 0.1);
    s.quadraticCurveTo(0.113, 0.15, 0.07, 0.15);
    s.lineTo(-0.06, 0.15);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.97,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.008,
      bevelOffset: -0.008,
      bevelSegments: 8,
      curveSegments: 36,
    });
  }, []);
}

function WallModel({ brand, motionRef, companion }: ModelProps) {
  const shell = useWallShell();
  useEffect(() => () => shell.dispose(), [shell]);
  const flap = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const sp = motionRef ? motionRef.current.speed : 0.5;
    if (flap.current) flap.current.rotation.x = 0.55 + Math.sin(clock.elapsedTime * (0.6 + sp * 0.6)) * 0.3;
  });

  return (
    <group>
      {/* Rear chassis + mounting plate */}
      <Part id="chassis" en="Rear chassis & mounting plate" tl="Likod na chassis at mounting plate" dir={[0, 0, -1]} dist={0.34} at={[0.3, 0.16, -0.09]}>
        <B p={[0, 0, -0.092]} s={[0.97, 0.29, 0.05]} m={<Plastic color={brand.trim} gloss={0.1} rough={0.6} />} />
        <B p={[0, 0.02, -0.122]} s={[0.8, 0.2, 0.008]} m={<Metal color="#9aa3ad" />} />
        {[-0.3, -0.1, 0.1, 0.3].map((x) => (
          <B key={x} p={[x, 0.02, -0.118]} s={[0.05, 0.02, 0.002]} m={<Matte color="#475569" />} shadow={false} />
        ))}
      </Part>

      {/* Evaporator coil: two fin packs with copper hairpins */}
      <Part id="coil" en="Evaporator coil" tl="Evaporator coil" dir={[0, 0.35, 1]} dist={0.32} at={[0, 0.13, 0.03]}>
        <group position={[0, 0.03, 0.035]} rotation={[-0.32, 0, 0]}>
          <Fins count={120} size={[0.0016, 0.17, 0.034]} gap={0.0072} />
          {[-0.05, -0.016, 0.018, 0.052].map((y) => (
            <Cyl key={y} p={[0, y, 0]} r={[0, 0, Math.PI / 2]} rad={0.0045} len={0.88} m={<meshStandardMaterial {...COPPER} />} seg={12} />
          ))}
          <HairpinEnds x={0.445} ys={[-0.033, 0.035]} z={0} r={0.017} />
          <HairpinEnds x={-0.445} ys={[-0.05, 0.002, 0.052]} z={0} r={0.008} />
        </group>
        <group position={[0, 0.095, -0.03]} rotation={[0.95, 0, 0]}>
          <Fins count={120} size={[0.0016, 0.09, 0.03]} gap={0.0072} />
          {[-0.02, 0.02].map((y) => (
            <Cyl key={y} p={[0, y, 0]} r={[0, 0, Math.PI / 2]} rad={0.0045} len={0.88} m={<meshStandardMaterial {...COPPER} />} seg={12} />
          ))}
        </group>
        <Pipe pts={[[0.45, 0.0, 0.04], [0.47, -0.04, 0.0], [0.47, -0.08, -0.08], [0.46, -0.12, -0.1]]} r={0.006} />
        <Pipe pts={[[0.45, 0.06, 0.02], [0.48, 0.0, -0.02], [0.48, -0.1, -0.09], [0.47, -0.13, -0.1]]} r={0.009} />
      </Part>

      {/* Drain pan */}
      <Part id="drain" en="Condensate drain pan" tl="Drain pan" dir={[0, -1, 0.15]} dist={0.26} at={[-0.3, -0.04, 0.06]}>
        <B p={[0, -0.035, 0.05]} s={[0.9, 0.012, 0.07]} m={<Plastic color="#b9c2cd" gloss={0.2} />} />
        <B p={[0, -0.025, 0.084]} s={[0.9, 0.03, 0.006]} m={<Plastic color="#b9c2cd" gloss={0.2} />} />
        <Cyl p={[-0.44, -0.05, 0.05]} rad={0.008} len={0.05} m={<Matte color="#64748b" />} />
      </Part>

      {/* Cross-flow fan + motor */}
      <Part id="crossflow" en="Cross-flow fan" tl="Cross-flow fan" dir={[0, -0.6, 1]} dist={0.2} at={[-0.15, -0.075, 0.02]}>
        <group position={[-0.02, -0.075, 0.0]}>
          <CrossflowWheel len={0.82} r={0.045} motionRef={motionRef} />
        </group>
      </Part>
      <Part id="motor" en="Fan motor" tl="Motor ng fan" dir={[1, 0, 0.4]} dist={0.36} at={[0.44, -0.02, 0]}>
        <Motor p={[0.44, -0.075, 0.0]} rad={0.036} len={0.06} />
      </Part>

      {/* Control board */}
      <Part id="pcb" en="Control board (PCB)" tl="Control board (PCB)" dir={[1, 0.25, 0.7]} dist={0.52} at={[0.43, 0.1, 0.02]}>
        <B p={[0.43, 0.04, -0.03]} s={[0.07, 0.15, 0.08]} m={<Plastic color="#e5e7eb" gloss={0.1} rough={0.6} />} />
        <Pcb p={[0.43, 0.04, 0.013]} s={[0.06, 0.13]} />
      </Part>

      {/* Filters */}
      <Part id="filter" en="Washable air filters" tl="Air filter (nalalabhan)" dir={[0, 0.55, 1]} dist={0.5} at={[0, 0.17, 0.05]}>
        {[-0.225, 0.225].map((x) => (
          <group key={x} position={[x, 0.12, 0.035]} rotation={[-0.45, 0, 0]}>
            <B s={[0.43, 0.004, 0.11]} m={<meshStandardMaterial color="#9aa8b8" transparent opacity={0.55} roughness={0.9} />} shadow={false} />
            <Fins count={30} size={[0.002, 0.006, 0.11]} gap={0.014} color="#cbd5e1" metal={0} rough={0.8} />
            <B p={[0, 0.002, 0.056]} s={[0.43, 0.008, 0.006]} m={<Plastic color={brand.trim} />} />
            <B p={[0, 0.002, -0.056]} s={[0.43, 0.008, 0.006]} m={<Plastic color={brand.trim} />} />
          </group>
        ))}
      </Part>

      {/* Front cover (outer shell) */}
      <Part id="panel" en="Front cover & panel" tl="Front cover at panel" dir={[0, 0.05, 1]} dist={0.68} at={[-0.25, 0.2, 0.12]}>
        <mesh geometry={shell} rotation={[0, -Math.PI / 2, 0]} position={[0.485, 0, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color={brand.body} roughness={0.24} clearcoat={0.85} clearcoatRoughness={0.12} sheen={0.2} sheenColor="#ffffff" />
        </mesh>
        {/* Top intake grille */}
        <Fins count={78} size={[0.004, 0.003, 0.12]} gap={0.0118} p={[0, 0.1515, 0.0]} color={brand.trim} metal={0} rough={0.6} />
        {/* Brand accent line + display */}
        <B p={[0, 0.118, 0.117]} s={[0.9, 0.004, 0.003]} m={<meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={1.1} />} shadow={false} />
        <RB p={[0.37, -0.025, 0.1175]} s={[0.11, 0.036, 0.004]} radius={0.0018} m={<meshPhysicalMaterial color="#0a0f1a" roughness={0.08} clearcoat={1} />} smooth={3} />
        <group position={[0.37, -0.025, 0.1202]}>
          <B p={[-0.017, 0, 0]} s={[0.022, 0.018, 0.001]} m={<meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={1.4} />} shadow={false} />
          <B p={[0.015, 0, 0]} s={[0.022, 0.018, 0.001]} m={<meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={1.4} />} shadow={false} />
        </group>
        <mesh position={[-0.4, -0.04, 0.115]}>
          <sphereGeometry args={[0.012, 24, 16]} />
          <meshPhysicalMaterial color="#0b0f17" roughness={0.05} metalness={0.4} clearcoat={1} />
        </mesh>
        <B p={[-0.33, 0.07, 0.1225]} s={[0.1, 0.012, 0.002]} m={<Metal color="#aab3bf" rough={0.25} />} shadow={false} />
        {/* Air outlet (dark slot on the chamfer) */}
        <B p={[0, -0.118, 0.07]} r={[-Math.PI / 4, 0, 0]} s={[0.9, 0.003, 0.078]} m={<Matte color="#0d121b" rough={0.95} />} shadow={false} />
      </Part>

      {/* Swing louver */}
      <Part id="louver" en="Motorised swing louver" tl="Swing louver" dir={[0, -1, 0.9]} dist={0.5} at={[0.2, -0.16, 0.11]}>
        <group position={[0, -0.128, 0.105]} ref={flap}>
          <B p={[0, 0, -0.034]} s={[0.88, 0.006, 0.068]} m={<Plastic color={brand.body} />} />
          <Fins count={9} size={[0.003, 0.03, 0.05]} gap={0.1} p={[0, 0.016, -0.03]} color={brand.trim} metal={0} rough={0.5} />
        </group>
      </Part>

      {companion && <CompanionOutdoor brand={brand} motionRef={motionRef} at={[0.78, -0.72, -0.5]} />}
    </group>
  );
}

/** Small outdoor condenser (inspector only), compressor visible through a cut-away. */
function CompanionOutdoor({ brand, motionRef, at }: ModelProps & { at: V3 }) {
  return (
    <group position={at} scale={0.62}>
      <RB s={[0.78, 0.56, 0.3]} radius={0.02} m={<Painted color={brand.body} />} />
      <group position={[-0.1, 0, 0.152]}>
        <Propeller r={0.21} motionRef={motionRef} rate={11} color="#4b5563" />
      </group>
      <Fins count={12} size={[0.07, 0.006, 0.01]} gap={0.036} axis="y" p={[0.29, 0, 0.152]} color={brand.trim} />
      <Compressor p={[0.3, -0.06, 0]} h={0.3} rad={0.09} />
      <B p={[0.395, -0.18, 0.08]} s={[0.04, 0.04, 0.04]} m={<meshStandardMaterial {...BRASS} />} />
    </group>
  );
}

/** Full-size split-type outdoor condenser (about 0.78 × 0.56 × 0.30 m), front facing +z. */
export function OutdoorCondenser({ brand, motionRef }: ModelProps) {
  return (
    <group>
      <Part id="casing" en="Outdoor cabinet" tl="Outdoor cabinet" dir={[0, 1, 0]} dist={0.42} at={[0.2, 0.3, 0.1]}>
        <RB s={[0.78, 0.56, 0.3]} radius={0.02} m={<Painted color={brand.body} />} />
        <Fins count={12} size={[0.18, 0.006, 0.01]} gap={0.036} axis="y" p={[0.27, 0, 0.152]} color={brand.trim} />
        <B p={[0.26, 0.18, 0.152]} s={[0.12, 0.05, 0.004]} m={<Matte color="#cbd5e1" />} shadow={false} />
      </Part>
      <Part id="fan" en="Condenser fan & guard" tl="Condenser fan" dir={[0, 0, 1]} dist={0.32} at={[-0.1, 0.24, 0.2]}>
        <group position={[-0.1, 0, 0.152]}>
          <Propeller r={0.21} motionRef={motionRef} rate={11} color="#4b5563" />
        </group>
      </Part>
      <Part id="compressor" en="Inverter compressor" tl="Inverter compressor" dir={[1, 0, 0.3]} dist={0.42} at={[0.27, 0.05, 0]}>
        <Compressor p={[0.25, -0.06, -0.02]} h={0.3} rad={0.075} />
      </Part>
      <Part id="coil" en="Condenser coil" tl="Condenser coil" dir={[0, 0, -1]} dist={0.3} at={[0, 0.3, -0.17]}>
        <Fins count={60} size={[0.0016, 0.5, 0.012]} gap={0.012} p={[0, 0, -0.152]} />
      </Part>
      <Part id="ports" en="Service valves" tl="Service valves" dir={[1, -0.3, 0.6]} dist={0.3} at={[0.35, -0.25, 0.18]}>
        {[0.33, 0.37].map((x) => (
          <Cyl key={x} p={[x, -0.2, 0.17]} r={[Math.PI / 2, 0, 0]} rad={0.012} len={0.04} m={<meshStandardMaterial {...BRASS} />} />
        ))}
      </Part>
    </group>
  );
}

/* ── Floor-standing tower ── */

function FloorModel({ brand, motionRef, companion }: ModelProps) {
  const vanes = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!vanes.current) return;
    const sp = motionRef ? motionRef.current.speed : 0.5;
    const a = Math.sin(clock.elapsedTime * (0.5 + sp * 0.5)) * 0.45;
    vanes.current.children.forEach((c) => (c.rotation.y = a));
  });
  return (
    <group>
      <Part id="casing" en="Cabinet & base" tl="Cabinet at base" at={[-0.22, -0.6, -0.1]}>
        <RB p={[0, 0, -0.04]} s={[0.52, 1.72, 0.24]} radius={0.05} m={<Plastic color={brand.trim} gloss={0.2} />} />
        <RB p={[0, -0.86, 0]} s={[0.56, 0.03, 0.34]} radius={0.012} m={<Matte color="#2a313c" />} />
      </Part>
      <Part id="coil" en="Evaporator coil" tl="Evaporator coil" dir={[0, 0, 1]} dist={0.16} at={[0, -0.05, 0.08]}>
        <Fins count={60} size={[0.0016, 0.6, 0.05]} gap={0.0072} p={[0, -0.1, 0.03]} />
        <HairpinEnds x={0.22} ys={[-0.3, -0.15, 0, 0.15]} z={0.03} r={0.018} />
      </Part>
      <Part id="blower" en="Vertical blower fan" tl="Blower fan" dir={[0, 0.2, 1]} dist={0.3} at={[0, 0.72, 0.08]}>
        <group position={[0, 0.42, 0.04]} rotation={[0, 0, Math.PI / 2]}>
          <CrossflowWheel len={0.58} r={0.06} motionRef={motionRef} />
        </group>
        <Motor p={[0, 0.76, 0.04]} r={[0, 0, Math.PI / 2]} rad={0.04} len={0.07} />
      </Part>
      <Part id="pcb" en="Control board" tl="Control board" dir={[1, 0, 0.5]} dist={0.4} at={[0.2, 0.62, 0.04]}>
        <Pcb p={[0.17, 0.62, 0.0]} s={[0.12, 0.18]} r={[0, -Math.PI / 2, 0]} />
      </Part>
      <Part id="filter" en="Lower intake filter" tl="Filter sa ibaba" dir={[0, -0.2, 1]} dist={0.46} at={[0, -0.5, 0.16]}>
        <B p={[0, -0.5, 0.13]} s={[0.44, 0.52, 0.006]} m={<meshStandardMaterial color="#9aa8b8" transparent opacity={0.6} roughness={0.9} />} shadow={false} />
        <Fins count={24} size={[0.44, 0.004, 0.006]} gap={0.021} axis="y" p={[0, -0.5, 0.133]} color="#cbd5e1" metal={0} />
      </Part>
      <Part id="panel" en="Front panel & display" tl="Front panel at display" dir={[0, 0, 1]} dist={0.62} at={[-0.18, 0.1, 0.2]}>
        <RB p={[0, 0, 0.12]} s={[0.52, 1.72, 0.08]} radius={0.035} m={<meshPhysicalMaterial color={brand.body} roughness={0.22} clearcoat={0.9} clearcoatRoughness={0.1} />} />
        <B p={[0, 0.72, 0.161]} s={[0.48, 0.008, 0.003]} m={<meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={1.1} />} shadow={false} />
        <RB p={[0, 0.83, 0.161]} s={[0.2, 0.07, 0.004]} radius={0.003} smooth={3} m={<meshPhysicalMaterial color="#0a0f1a" roughness={0.08} clearcoat={1} />} />
        <group position={[0, 0.83, 0.164]}>
          {[-0.032, 0.03].map((x) => (
            <B key={x} p={[x, 0, 0]} s={[0.046, 0.04, 0.001]} m={<meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={1.4} />} shadow={false} />
          ))}
        </group>
        <B p={[0, 0.42, 0.158]} s={[0.4, 0.6, 0.006]} m={<Matte color="#0f141c" />} shadow={false} />
        <Fins count={22} size={[0.44, 0.005, 0.008]} gap={0.024} axis="y" p={[0, -0.5, 0.162]} color={brand.trim} metal={0} rough={0.5} />
      </Part>
      <Part id="louver" en="Swing vanes" tl="Swing vanes" dir={[0, 0, 1]} dist={0.84} at={[0.12, 0.42, 0.18]}>
        <group ref={vanes} position={[0, 0.42, 0.17]}>
          {Array.from({ length: 9 }, (_, i) => (
            <group key={i} position={[(i - 4) * 0.042, 0, 0]}>
              <B s={[0.005, 0.58, 0.04]} m={<Plastic color="#c4cbd4" gloss={0.3} />} />
            </group>
          ))}
        </group>
      </Part>
      {companion && <CompanionOutdoor brand={brand} motionRef={motionRef} at={[0.95, -0.6, -0.6]} />}
    </group>
  );
}

/* ── Window type ── */

function WindowModel({ brand, motionRef }: ModelProps) {
  return (
    <group>
      <Part id="base" en="Base pan" tl="Base pan" dir={[0, -1, 0]} dist={0.2} at={[0.2, -0.22, 0.2]}>
        <B p={[0, -0.19, 0]} s={[0.62, 0.02, 0.7]} m={<Metal color="#8d97a4" rough={0.45} />} />
        <B p={[0, 0, 0.07]} s={[0.6, 0.36, 0.012]} m={<Matte color="#1f2937" rough={0.9} />} />
      </Part>
      <Part id="casing" en="Outer cabinet (sleeve)" tl="Cabinet (sleeve)" dir={[0, 1, 0]} dist={0.5} at={[0, 0.22, -0.1]}>
        <B p={[0, 0.195, 0]} s={[0.62, 0.012, 0.7]} m={<Painted color={brand.body} />} />
        {[-0.305, 0.305].map((x) => (
          <group key={x}>
            <B p={[x, 0, 0]} s={[0.012, 0.39, 0.7]} m={<Painted color={brand.body} />} />
            <Fins count={10} size={[0.004, 0.16, 0.012]} gap={0.026} axis="z" p={[x + Math.sign(x) * 0.008, 0.04, -0.15]} color={brand.trim} metal={0.2} />
          </group>
        ))}
      </Part>
      <Part id="condenser" en="Condenser coil" tl="Condenser coil" dir={[0, 0, -1]} dist={0.42} at={[0.15, 0.1, -0.34]}>
        <Fins count={80} size={[0.0016, 0.34, 0.05]} gap={0.0072} p={[0, 0, -0.31]} />
        <HairpinEnds x={-0.29} ys={[-0.12, -0.04, 0.04, 0.12]} z={-0.31} r={0.02} />
        <Fins count={14} size={[0.58, 0.006, 0.006]} gap={0.025} axis="y" p={[0, 0, -0.345]} color={brand.trim} metal={0.3} />
      </Part>
      <Part id="fan" en="Condenser fan" tl="Condenser fan" dir={[0, 0.1, -1]} dist={0.26} at={[-0.07, 0.2, -0.24]}>
        <group position={[-0.07, 0.0, -0.24]} rotation={[0, Math.PI, 0]}>
          <Propeller r={0.15} motionRef={motionRef} rate={10} guard={false} />
        </group>
      </Part>
      <Part id="motor" en="Dual-shaft fan motor" tl="Dual-shaft motor" dir={[0, 1, 0]} dist={0.28} at={[-0.07, 0.1, -0.08]}>
        <Motor p={[-0.07, 0.0, -0.08]} r={[0, Math.PI / 2, 0]} rad={0.06} len={0.12} />
      </Part>
      <Part id="compressor" en="Rotary compressor" tl="Rotary compressor" dir={[1, 0, 0]} dist={0.42} at={[0.2, 0.08, -0.12]}>
        <Compressor p={[0.19, -0.06, -0.12]} h={0.24} rad={0.068} />
        <Pipe pts={[[0.2, 0.08, -0.12], [0.22, 0.14, -0.2], [0.24, 0.12, -0.28]]} r={0.006} />
      </Part>
      <Part id="blower" en="Indoor blower wheel" tl="Blower wheel" dir={[0, 0.6, 1]} dist={0.2} at={[-0.07, 0.14, 0.15]}>
        <group position={[-0.07, 0.0, 0.15]}>
          <BlowerWheel r={0.1} w={0.07} motionRef={motionRef} />
        </group>
      </Part>
      <Part id="coil" en="Evaporator coil" tl="Evaporator coil" dir={[-0.3, 0.2, 1]} dist={0.3} at={[-0.07, 0.17, 0.25]}>
        <Fins count={58} size={[0.0016, 0.32, 0.045]} gap={0.0072} p={[-0.07, 0.0, 0.25]} />
        <HairpinEnds x={0.14} ys={[-0.1, 0, 0.1]} z={0.25} r={0.016} />
      </Part>
      <Part id="pcb" en="Control board" tl="Control board" dir={[1, 0.3, 0.6]} dist={0.36} at={[0.24, 0.1, 0.22]}>
        <B p={[0.24, 0.0, 0.24]} s={[0.1, 0.3, 0.08]} m={<Painted color="#cfd5dd" />} />
        <Pcb p={[0.24, 0.0, 0.283]} s={[0.08, 0.2]} />
      </Part>
      <Part id="filter" en="Washable filter" tl="Filter" dir={[0, 0.15, 1]} dist={0.4} at={[-0.07, 0.1, 0.32]}>
        <B p={[-0.07, 0.02, 0.31]} s={[0.44, 0.3, 0.006]} m={<meshStandardMaterial color="#9aa8b8" transparent opacity={0.6} roughness={0.9} />} shadow={false} />
        <Fins count={20} size={[0.002, 0.3, 0.007]} gap={0.022} p={[-0.07, 0.02, 0.312]} color="#cbd5e1" metal={0} />
      </Part>
      <Part id="panel" en="Front grille & controls" tl="Front grille at controls" dir={[0, 0, 1]} dist={0.56} at={[-0.2, 0.2, 0.36]}>
        <RB p={[0, 0, 0.338]} s={[0.63, 0.41, 0.03]} radius={0.012} m={<meshPhysicalMaterial color={brand.body} roughness={0.28} clearcoat={0.7} clearcoatRoughness={0.15} />} />
        <Fins count={11} size={[0.42, 0.008, 0.022]} gap={0.02} axis="y" p={[-0.07, 0.1, 0.356]} color={brand.trim} metal={0} rough={0.45} />
        <B p={[-0.07, -0.08, 0.354]} s={[0.42, 0.13, 0.004]} m={<Matte color="#151b25" />} shadow={false} />
        <Fins count={18} size={[0.004, 0.12, 0.02]} gap={0.022} p={[-0.07, -0.08, 0.362]} color="#4b5563" metal={0.2} />
        <B p={[0.24, 0.13, 0.355]} s={[0.08, 0.045, 0.004]} m={<meshPhysicalMaterial color="#0a0f1a" roughness={0.08} clearcoat={1} />} shadow={false} />
        <group position={[0.24, 0.13, 0.358]}>
          {[-0.013, 0.012].map((x) => (
            <B key={x} p={[x, 0, 0]} s={[0.018, 0.025, 0.001]} m={<meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={1.4} />} shadow={false} />
          ))}
        </group>
        {[0.03, -0.08].map((y) => (
          <Cyl key={y} p={[0.24, y, 0.362]} r={[Math.PI / 2, 0, 0]} rad={0.026} len={0.022} m={<Metal color="#cfd5dd" rough={0.25} metal={0.4} />} />
        ))}
      </Part>
    </group>
  );
}

/* ── VRF outdoor module ── */

function VrfModel({ brand, motionRef }: ModelProps) {
  return (
    <group>
      <Part id="frame" en="Base frame & rear panel" tl="Base frame at likod na panel" at={[0.36, -0.82, -0.2]}>
        <B p={[0, -0.775, 0]} s={[0.98, 0.05, 0.78]} m={<Painted color="#2a323e" />} />
        <B p={[0, 0, -0.375]} s={[0.96, 1.5, 0.012]} m={<Painted color={brand.body} />} />
        {[-0.47, 0.47].map((x) =>
          [-0.37, 0.37].map((z) => <B key={`${x}${z}`} p={[x, 0, z]} s={[0.025, 1.52, 0.025]} m={<Painted color={brand.body} />} />),
        )}
      </Part>
      <Part id="coil" en="Three-sided condenser coil" tl="Three-sided condenser coil" at={[-0.3, 0.55, 0.38]}>
        <Fins count={150} size={[0.0016, 0.9, 0.04]} gap={0.006} p={[0, 0.12, 0.34]} />
        {[-0.44, 0.44].map((x) => (
          <Fins key={x} count={110} size={[0.04, 0.9, 0.0016]} gap={0.006} axis="z" p={[x, 0.12, -0.02]} />
        ))}
        {[-0.25, 0.0, 0.25, 0.5].map((y) => (
          <Cyl key={y} p={[0, y, 0.34]} r={[0, 0, Math.PI / 2]} rad={0.006} len={0.9} m={<meshStandardMaterial {...COPPER} />} seg={12} />
        ))}
        <Fins count={32} size={[0.9, 0.006, 0.01]} gap={0.028} axis="y" p={[0, 0.12, 0.372]} color={brand.trim} metal={0.4} />
      </Part>
      <Part id="compressor" en="Inverter scroll compressor" tl="Inverter scroll compressor" dir={[-0.4, 0, 1]} dist={0.5} at={[-0.2, -0.26, 0.1]}>
        <Compressor p={[-0.2, -0.5, 0.05]} h={0.42} rad={0.13} scroll />
      </Part>
      <Part id="controls" en="Inverter PCB & control box" tl="Inverter PCB at control box" dir={[1, 0, 0.7]} dist={0.6} at={[0.3, -0.2, 0.3]}>
        <B p={[0.3, -0.34, 0.24]} s={[0.24, 0.2, 0.08]} m={<Painted color="#cfd6de" />} />
        <Pcb p={[0.3, -0.34, 0.283]} s={[0.2, 0.16]} />
      </Part>
      <Part id="ports" en="Brass service valves" tl="Brass service valves" dir={[1, -0.2, 0.6]} dist={0.42} at={[0.36, -0.62, 0.44]}>
        {[0.32, 0.41].map((x) => (
          <group key={x}>
            <Cyl p={[x, -0.68, 0.4]} r={[Math.PI / 2, 0, 0]} rad={0.022} len={0.06} m={<meshStandardMaterial {...BRASS} />} />
            <Cyl p={[x, -0.68, 0.435]} r={[Math.PI / 2, 0, 0]} rad={0.012} len={0.03} m={<meshStandardMaterial {...BRASS} />} />
          </group>
        ))}
      </Part>
      <Part id="panel" en="Front service panel" tl="Front service panel" dir={[0, 0, 1]} dist={0.62} at={[-0.25, -0.35, 0.4]}>
        <RB p={[0, -0.5, 0.385]} s={[0.94, 0.5, 0.012]} radius={0.005} smooth={3} m={<Painted color={brand.body} />} />
        <B p={[-0.32, -0.66, 0.393]} s={[0.2, 0.1, 0.004]} m={<Matte color="#0b1f3a" />} shadow={false} />
        <B p={[-0.32, -0.62, 0.396]} s={[0.04, 0.012, 0.002]} m={<meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.2} />} shadow={false} />
        <B p={[0.3, -0.3, 0.393]} s={[0.14, 0.02, 0.003]} m={<meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={0.9} />} shadow={false} />
        {[-0.44, 0.44].map((x) => (
          <B key={x} p={[x, -0.5, 0.394]} s={[0.012, 0.06, 0.004]} m={<Metal />} shadow={false} />
        ))}
      </Part>
      <Part id="fan" en="Top-discharge propeller fan" tl="Propeller fan" dir={[0, 1, 0]} dist={0.32} at={[0.3, 0.85, 0]}>
        <group position={[0, 0.76, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <Propeller r={0.32} motionRef={motionRef} rate={8} blades={4} guard={false} />
        </group>
        <Motor p={[0, 0.7, 0]} r={[0, 0, Math.PI / 2]} rad={0.06} len={0.1} />
      </Part>
      <Part id="top" en="Top cover & fan guard" tl="Top cover at fan guard" dir={[0, 1, 0]} dist={0.7} at={[-0.35, 0.9, 0.2]}>
        <B p={[0, 0.775, 0]} s={[0.98, 0.03, 0.78]} m={<Painted color={brand.body} />} />
        <Cyl p={[0, 0.82, 0]} rad={[0.34, 0.36]} len={0.07} open m={<meshPhysicalMaterial color={brand.body} roughness={0.4} side={THREE.DoubleSide} />} />
        <group position={[0, 0.857, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {[0.1, 0.18, 0.26, 0.34].map((k) => (
            <mesh key={k}>
              <torusGeometry args={[k, 0.004, 6, 64]} />
              <Metal color="#5b6676" />
            </mesh>
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 6]}>
              <B s={[0.68, 0.005, 0.005]} m={<Metal color="#5b6676" />} shadow={false} />
            </group>
          ))}
        </group>
      </Part>
    </group>
  );
}

/* ── Packaged rooftop unit ── */

function PackagedModel({ brand, motionRef }: ModelProps) {
  return (
    <group>
      <Part id="casing" en="Cabinet & roof curb rail" tl="Cabinet at curb rail" at={[0.7, -0.46, -0.4]}>
        <B p={[0, -0.43, 0]} s={[1.64, 0.05, 1.1]} m={<Painted color="#2a323e" />} />
        <B p={[0, 0, -0.535]} s={[1.6, 0.82, 0.012]} m={<Painted color={brand.body} />} />
        {[-0.795, 0.795].map((x) => (
          <B key={x} p={[x, 0, 0]} s={[0.012, 0.82, 1.08]} m={<Painted color={brand.body} />} />
        ))}
        <B p={[-0.05, 0, 0.0]} s={[0.012, 0.8, 1.06]} m={<Matte color="#9aa3ad" />} />
      </Part>
      <Part id="coil" en="Condenser coil" tl="Condenser coil" dir={[-0.4, 0, 1]} dist={0.32} at={[-0.52, 0.3, 0.52]}>
        <Fins count={90} size={[0.0016, 0.7, 0.04]} gap={0.0064} p={[-0.52, 0, 0.5]} />
        <Fins count={18} size={[0.004, 0.7, 0.008]} gap={0.03} p={[-0.52, 0, 0.535]} color={brand.trim} metal={0.3} />
      </Part>
      <Part id="compressor" en="Twin scroll compressors" tl="Twin scroll compressors" dir={[0, 0, 1]} dist={0.62} at={[-0.35, 0.02, 0.12]}>
        <Compressor p={[-0.55, -0.2, 0.0]} h={0.36} rad={0.11} scroll />
        <Compressor p={[-0.22, -0.2, 0.0]} h={0.36} rad={0.11} scroll />
      </Part>
      <Part id="blower" en="Supply-air blower" tl="Supply-air blower" dir={[0.3, 0, 1]} dist={0.5} at={[0.4, 0.14, 0.0]}>
        <group position={[0.4, -0.05, 0.0]}>
          <Cyl r={[0, 0, Math.PI / 2]} rad={0.2} len={0.3} open m={<meshPhysicalMaterial color="#5b6676" roughness={0.45} metalness={0.5} side={THREE.DoubleSide} />} />
          <BlowerWheel r={0.17} w={0.26} motionRef={motionRef} axis="x" />
        </group>
        <Motor p={[0.66, -0.05, 0.0]} rad={0.06} len={0.12} />
      </Part>
      <Part id="controls" en="Control panel" tl="Control panel" dir={[1, 0, 0.5]} dist={0.5} at={[0.62, 0.3, 0.42]}>
        <B p={[0.62, 0.2, 0.4]} s={[0.2, 0.24, 0.1]} m={<Painted color="#d6dce3" />} />
        <Pcb p={[0.62, 0.2, 0.452]} s={[0.17, 0.2]} />
      </Part>
      <Part id="panel" en="Hinged access panels" tl="Access panels" dir={[0, 0, 1]} dist={0.9} at={[0.3, 0.3, 0.56]}>
        {[0.0, 0.3, 0.6].map((x) => (
          <group key={x}>
            <RB p={[x, -0.02, 0.548]} s={[0.28, 0.72, 0.014]} radius={0.004} smooth={3} m={<Painted color={brand.body} />} />
            <B p={[x + 0.1, -0.02, 0.558]} s={[0.018, 0.08, 0.01]} m={<Metal color="#475569" />} />
            <Fins count={8} size={[0.2, 0.006, 0.004]} gap={0.016} axis="y" p={[x, 0.26, 0.557]} color={brand.trim} metal={0.2} />
          </group>
        ))}
        <B p={[0.6, 0.22, 0.558]} s={[0.1, 0.04, 0.003]} m={<meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={0.9} />} shadow={false} />
      </Part>
      <Part id="fan" en="Condenser fans" tl="Condenser fans" dir={[0, 1, 0]} dist={0.28} at={[-0.36, 0.5, 0.1]}>
        {[-0.36, 0.36].map((x) => (
          <group key={x} position={[x, 0.37, -0.14]} rotation={[-Math.PI / 2, 0, 0]}>
            <Propeller r={0.26} motionRef={motionRef} rate={8} blades={4} guard={false} />
          </group>
        ))}
      </Part>
      <Part id="top" en="Top cover & fan guards" tl="Top cover" dir={[0, 1, 0]} dist={0.62} at={[0.55, 0.48, 0.3]}>
        <RB p={[0, 0.415, 0]} s={[1.62, 0.03, 1.1]} radius={0.008} smooth={3} m={<Painted color={brand.body} />} />
        {[-0.36, 0.36].map((x) => (
          <group key={x} position={[x, 0.435, -0.14]} rotation={[-Math.PI / 2, 0, 0]}>
            {[0.1, 0.18, 0.27].map((k) => (
              <mesh key={k}>
                <torusGeometry args={[k, 0.004, 6, 64]} />
                <Metal color="#5b6676" />
              </mesh>
            ))}
            {Array.from({ length: 4 }, (_, i) => (
              <group key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
                <B s={[0.54, 0.005, 0.005]} m={<Metal color="#5b6676" />} shadow={false} />
              </group>
            ))}
          </group>
        ))}
      </Part>
    </group>
  );
}

/* ── Concealed ducted indoor unit ── */

function DuctedModel({ brand, motionRef }: ModelProps) {
  return (
    <group>
      <Part id="casing" en="Galvanised casing" tl="Galvanised casing" at={[-0.4, -0.17, 0.3]}>
        <B p={[0, -0.145, 0]} s={[1.1, 0.01, 0.7]} m={<Metal color="#a7b3c2" rough={0.5} metal={0.55} />} />
        {[-0.545, 0.545].map((x) => (
          <B key={x} p={[x, 0, 0]} s={[0.01, 0.3, 0.7]} m={<Metal color="#a7b3c2" rough={0.5} metal={0.55} />} />
        ))}
        {[-0.5, 0.5].map((x) =>
          [-0.3, 0.3].map((z) => <B key={`${x}${z}`} p={[x, 0.2, z]} s={[0.012, 0.12, 0.012]} m={<Metal color="#64748b" />} />),
        )}
      </Part>
      <Part id="coil" en="Evaporator coil" tl="Evaporator coil" dir={[0, 0.5, -0.4]} dist={0.22} at={[0, 0.06, -0.1]}>
        <group position={[0, 0, -0.1]} rotation={[0.5, 0, 0]}>
          <Fins count={140} size={[0.0016, 0.28, 0.05]} gap={0.0072} />
          <HairpinEnds x={0.51} ys={[-0.09, 0, 0.09]} z={0} r={0.018} />
        </group>
      </Part>
      <Part id="blower" en="Twin centrifugal blowers" tl="Twin centrifugal blowers" dir={[0, 1, 0.3]} dist={0.32} at={[0, 0.06, 0.18]}>
        {[-0.24, 0.24].map((x) => (
          <group key={x} position={[x, -0.01, 0.18]}>
            <Cyl r={[0, 0, Math.PI / 2]} rad={0.11} len={0.22} open m={<meshPhysicalMaterial color="#5b6676" roughness={0.45} metalness={0.5} side={THREE.DoubleSide} />} />
            <BlowerWheel r={0.095} w={0.2} motionRef={motionRef} axis="x" />
          </group>
        ))}
        <Motor p={[0, -0.01, 0.18]} rad={0.055} len={0.12} />
      </Part>
      <Part id="controls" en="Control box" tl="Control box" dir={[1, 0, 0]} dist={0.32} at={[0.6, 0.06, 0.1]}>
        <B p={[0.575, 0, 0.1]} s={[0.04, 0.2, 0.22]} m={<Painted color="#e5e7eb" />} />
        <B p={[0.597, 0.05, 0.1]} s={[0.004, 0.02, 0.12]} m={<meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={0.9} />} shadow={false} />
      </Part>
      <Part id="filter" en="Return-air filter" tl="Return-air filter" dir={[0, 0, -1]} dist={0.34} at={[0.3, 0.12, -0.37]}>
        <B p={[0, 0, -0.355]} s={[1.0, 0.26, 0.012]} m={<meshStandardMaterial color="#9aa8b8" transparent opacity={0.65} roughness={0.9} />} />
        <Fins count={30} size={[0.004, 0.24, 0.006]} gap={0.032} p={[0, 0, -0.362]} color="#64748b" metal={0.3} />
      </Part>
      <Part id="ports" en="Supply-air flange" tl="Supply-air flange" dir={[0, 0, 1]} dist={0.34} at={[-0.3, 0.12, 0.38]}>
        <B p={[0, 0, 0.37]} s={[0.98, 0.26, 0.04]} m={<Metal color="#8a98ab" rough={0.4} metal={0.6} />} />
        <B p={[0, 0, 0.392]} s={[0.92, 0.2, 0.004]} m={<Matte color="#0f172a" />} shadow={false} />
      </Part>
      <Part id="top" en="Top access cover" tl="Top access cover" dir={[0, 1, 0]} dist={0.6} at={[0.3, 0.18, 0.1]}>
        <B p={[0, 0.148, 0]} s={[1.1, 0.012, 0.7]} m={<Metal color="#b4bfcc" rough={0.45} metal={0.55} />} />
        <B p={[0.3, 0.156, 0.15]} s={[0.22, 0.004, 0.12]} m={<Matte color="#e5e7eb" />} shadow={false} />
      </Part>
    </group>
  );
}

/* ── 4-way ceiling cassette (shown panel-up, as displayed in a showroom) ── */

function CassetteModel({ brand, motionRef }: ModelProps) {
  const flaps = useRef<THREE.Group>(null);
  const fan = useSpin(motionRef, 'y', 10);
  useFrame(({ clock }) => {
    if (!flaps.current) return;
    const sp = motionRef ? motionRef.current.speed : 0.5;
    const a = 0.4 + Math.sin(clock.elapsedTime * (0.6 + sp * 0.5)) * 0.3;
    flaps.current.children.forEach((c) => ((c.children[0] as THREE.Object3D).rotation.x = a));
  });
  return (
    <group>
      <Part id="casing" en="Body & drain pan" tl="Body at drain pan" dir={[0, -1, 0]} dist={0.32} at={[0.38, -0.12, 0.3]}>
        <RB p={[0, -0.06, 0]} s={[0.72, 0.22, 0.72]} radius={0.012} smooth={3} m={<Metal color="#c3ccd6" rough={0.45} metal={0.5} />} />
        <B p={[0, 0.06, 0]} s={[0.7, 0.02, 0.7]} m={<Plastic color="#d8dee5" gloss={0.1} />} />
      </Part>
      <Part id="coil" en="Square evaporator coil" tl="Square evaporator coil" dir={[0, 0.1, 0]} dist={0.1} at={[0.28, 0.12, 0.28]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <Fins count={70} size={[0.0016, 0.12, 0.035]} gap={0.0072} p={[0, 0.0, 0.25]} />
          </group>
        ))}
      </Part>
      <Part id="fan" en="Turbo (centrifugal) fan" tl="Turbo fan" dir={[0, 1, 0]} dist={0.34} at={[0, 0.12, 0.15]}>
        <group ref={fan}>
          {Array.from({ length: 9 }, (_, i) => (
            <group key={i} rotation={[0, (i * Math.PI * 2) / 9, 0]}>
              <B p={[0.12, 0, 0]} r={[0, 0.5, 0]} s={[0.11, 0.08, 0.006]} m={<Painted color="#4b5563" />} />
            </group>
          ))}
          <Cyl p={[0, -0.04, 0]} rad={0.19} len={0.006} m={<Painted color="#374151" />} />
          <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.16, 0.006, 8, 48]} />
            <Painted color="#374151" />
          </mesh>
        </group>
      </Part>
      <Part id="filter" en="Washable filter" tl="Filter" dir={[0, 1, 0]} dist={0.52} at={[0.1, 0.16, -0.12]}>
        <B p={[0, 0.098, 0]} s={[0.4, 0.006, 0.4]} m={<meshStandardMaterial color="#9aa8b8" transparent opacity={0.6} roughness={0.9} />} shadow={false} />
      </Part>
      <Part id="panel" en="Decoration panel & 4-way louvers" tl="Panel at 4-way louvers" dir={[0, 1, 0]} dist={0.7} at={[-0.3, 0.16, 0.38]}>
        <RB p={[0, 0.1, 0]} s={[0.86, 0.05, 0.86]} radius={0.022} m={<meshPhysicalMaterial color={brand.body} roughness={0.25} clearcoat={0.8} clearcoatRoughness={0.12} />} />
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <B p={[0, 0.1265, 0.31]} s={[0.6, 0.004, 0.08]} m={<Matte color="#0f141c" />} shadow={false} />
          </group>
        ))}
        <group ref={flaps} position={[0, 0.13, 0]}>
          {[0, 1, 2, 3].map((i) => (
            <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
              <group position={[0, 0, 0.31]}>
                <B s={[0.56, 0.006, 0.06]} m={<Plastic color={brand.body} />} />
              </group>
            </group>
          ))}
        </group>
        <mesh position={[0.34, 0.13, 0.34]}>
          <sphereGeometry args={[0.012, 16, 12]} />
          <meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={1.2} />
        </mesh>
      </Part>
      <Part id="grille" en="Centre intake grille" tl="Intake grille" dir={[0, 1, 0]} dist={0.9} at={[0, 0.17, 0]}>
        <B p={[0, 0.128, 0]} s={[0.42, 0.008, 0.42]} m={<Plastic color={brand.trim} gloss={0.3} />} />
        <Fins count={16} size={[0.004, 0.006, 0.4]} gap={0.025} p={[0, 0.134, 0]} color="#94a3b8" metal={0} />
      </Part>
    </group>
  );
}

export const MODELS: Record<UnitKind, (p: ModelProps) => ReactNode> = {
  wall: WallModel,
  floor: FloorModel,
  window: WindowModel,
  vrf: VrfModel,
  packaged: PackagedModel,
  ducted: DuctedModel,
  cassette: CassetteModel,
};

/** Every model that can be explained part by part, including the split outdoor unit. */
export type FigureKind = UnitKind | 'outdoor';
export const FIGURE_MODELS: Record<FigureKind, (p: ModelProps) => ReactNode> = { ...MODELS, outdoor: OutdoorCondenser };

/* The parts manifest lives in src/data/modelParts.ts (no three.js dependency,
   so the showroom hero can price a unit without loading the 3D bundle). */
export { MODEL_PARTS, unitTally } from '../../data/modelParts';
export type { ModelPart } from '../../data/modelParts';

/** Overall size of each unit (width, height, depth) for framing the camera. */
export const UNIT_SIZE: Record<UnitKind, V3> = {
  wall: [1.04, 0.34, 0.28],
  floor: [0.56, 1.76, 0.36],
  window: [0.66, 0.44, 0.72],
  vrf: [1.0, 1.64, 0.8],
  packaged: [1.64, 0.86, 1.12],
  ducted: [1.14, 0.34, 0.74],
  cassette: [0.9, 0.3, 0.9],
};

/** Scale so every kind fills roughly the same view. */
export function productScale(kind: UnitKind, fill = 1.25) {
  const [w, h, d] = UNIT_SIZE[kind];
  return fill / Math.max(w, h, d * 0.9);
}

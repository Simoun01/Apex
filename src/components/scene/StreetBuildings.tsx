import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BRANDS } from '../../data/airconBrands';
import { MODELS, OutdoorCondenser } from './airconModels';
import type { MotionRef } from './airconModels';
import { createMatteWallBumpMap, createTileFloorMaps, createWoodGrainMaps } from './hvacSceneUtils';

/* ============================================================================
   Street buildings: a Filipino bungalow and a two-storey commercial building.

   Both are hollow, real structures: walls are extruded with true door and
   window openings, roofs and slabs have thickness, and each building has a
   furnished interior with its actual aircon system (indoor units, insulated
   refrigerant lines, outdoor units / rooftop VRF).

   X-ray: when the visitor hovers a building (or its "Explore" button), the
   shell — walls, roof, ceilings — fades to a ghost so the rooms and the
   cooling system inside show through; the refrigerant lines glow.
   ============================================================================ */

type V3 = [number, number, number];

/* ── X-ray controller ───────────────────────────────────────────────────── */

interface XrayEntry {
  base: number;
  min: number;
  glass: boolean;
}

function useXray(active: boolean) {
  const shell = useRef(new Map<THREE.Material, XrayEntry>());
  const glow = useRef(new Set<THREE.MeshStandardMaterial>());
  const amt = useRef(0);

  const api = useMemo(
    () => ({
      /** Register a material that fades away in x-ray. */
      shell<M extends THREE.Material>(m: M, min = 0.08): M {
        if (!shell.current.has(m)) shell.current.set(m, { base: m.opacity, min, glass: m.transparent });
        return m;
      },
      /** Register a material that lights up in x-ray (refrigerant lines, units). */
      glow<M extends THREE.MeshStandardMaterial>(m: M): M {
        glow.current.add(m);
        return m;
      },
    }),
    [],
  );

  useFrame((_, dt) => {
    const target = active ? 1 : 0;
    if (amt.current === target) return;
    amt.current += (target - amt.current) * Math.min(1, dt * 5);
    if (Math.abs(amt.current - target) < 0.002) amt.current = target;
    const a = amt.current;
    shell.current.forEach((e, m) => {
      const o = e.base + (e.min - e.base) * a;
      m.opacity = o;
      const tr = e.glass || o < 0.995;
      if (m.transparent !== tr) {
        m.transparent = tr;
        m.needsUpdate = true;
      }
      m.depthWrite = !tr || (e.glass ? false : o > 0.6);
    });
    glow.current.forEach((m) => {
      m.emissiveIntensity = 0.05 + a * 1.4;
    });
  });

  return api;
}

type Xray = ReturnType<typeof useXray>;

/* ── Geometry helpers ───────────────────────────────────────────────────── */

interface Hole {
  x: number; // centre, along the wall
  y: number; // bottom, from the wall base
  w: number;
  h: number;
}

/** Wall slab with real openings, extruded to thickness `t`, centred on its thickness. */
function useWallGeometry(w: number, h: number, t: number, holes: Hole[]) {
  const key = JSON.stringify([w, h, t, holes]);
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h);
    s.lineTo(-w / 2, h);
    s.closePath();
    holes.forEach((o) => {
      const p = new THREE.Path();
      p.moveTo(o.x - o.w / 2, o.y);
      p.lineTo(o.x - o.w / 2, o.y + o.h);
      p.lineTo(o.x + o.w / 2, o.y + o.h);
      p.lineTo(o.x + o.w / 2, o.y);
      p.closePath();
      s.holes.push(p);
    });
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
    g.translate(0, 0, -t / 2);
    return g;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

function Wall({ w, h, t = 0.12, holes = [], position, rotY = 0, material }: { w: number; h: number; t?: number; holes?: Hole[]; position: V3; rotY?: number; material: THREE.Material }) {
  const geo = useWallGeometry(w, h, t, holes);
  return <mesh geometry={geo} material={material} position={position} rotation={[0, rotY, 0]} castShadow receiveShadow />;
}

/** Cylinder spanning two points (gutters, ridge caps, posts, pipes). */
function Beam({ a, b, r, material, seg = 16 }: { a: V3; b: V3; r: number; material: THREE.Material; seg?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: va.add(vb).multiplyScalar(0.5), quat: q, len: dir.length() };
  }, [a[0], a[1], a[2], b[0], b[1], b[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh position={pos} quaternion={quat} material={material} castShadow>
      <cylinderGeometry args={[r, r, len, seg]} />
    </mesh>
  );
}

/** Smooth tube through points (refrigerant lines, downspouts). */
function Tube({ pts, r, material }: { pts: V3[]; r: number; material: THREE.Material }) {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.05);
    return new THREE.TubeGeometry(c, pts.length * 24, r, 12, false);
  }, [JSON.stringify(pts), r]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={material} castShadow />;
}

function RBox({ p, s, r = 0.02, material, smooth = 4, rot }: { p: V3; s: V3; r?: number; material: THREE.Material; smooth?: number; rot?: V3 }) {
  return <RoundedBox args={s} radius={r} smoothness={smooth} position={p} rotation={rot} material={material} castShadow receiveShadow />;
}

function Box({ p, s, material, rot, shadow = true }: { p: V3; s: V3; material: THREE.Material; rot?: V3; shadow?: boolean }) {
  return (
    <mesh position={p} rotation={rot} material={material} castShadow={shadow} receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

/** Hip roof: eaves rectangle (2·hx × 2·hz) at y=0 rising to a ridge `rise` high. UVs follow the eave so the
 *  corrugation runs down the slope. */
function useHipRoof(hx: number, hz: number, rise: number) {
  const geo = useMemo(() => {
    const ridge = Math.max(hx - hz, 0.05);
    const A = [-hx, 0, -hz];
    const B = [hx, 0, -hz];
    const C = [hx, 0, hz];
    const D = [-hx, 0, hz];
    const R1 = [-ridge, rise, 0];
    const R2 = [ridge, rise, 0];
    const pos: number[] = [];
    const uv: number[] = [];
    const tri = (p: number[][], u: number[][]) => {
      p.forEach((v) => pos.push(...v));
      u.forEach((v) => uv.push(...v));
    };
    const slope = Math.hypot(hz, rise);
    const slopeS = Math.hypot(hx - ridge, rise);
    // front (+z) and back (-z) trapezoids, u along x
    tri([D, C, R2], [[-hx, 0], [hx, 0], [ridge, slope]]);
    tri([D, R2, R1], [[-hx, 0], [ridge, slope], [-ridge, slope]]);
    tri([B, A, R1], [[hx, 0], [-hx, 0], [-ridge, slope]]);
    tri([B, R1, R2], [[hx, 0], [-ridge, slope], [ridge, slope]]);
    // sides, u along z
    tri([A, D, R1], [[-hz, 0], [hz, 0], [0, slopeS]]);
    tri([C, B, R2], [[hz, 0], [-hz, 0], [0, slopeS]]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return { geo: g, ridge };
  }, [hx, hz, rise]);
  useEffect(() => () => geo.geo.dispose(), [geo]);
  return geo;
}

/** Corrugated-sheet bump texture: one rib per texture repeat. */
function useCorrugation() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 8;
    const g = c.getContext('2d');
    if (g) {
      const grad = g.createLinearGradient(0, 0, 64, 0);
      grad.addColorStop(0, '#202020');
      grad.addColorStop(0.5, '#e8e8e8');
      grad.addColorStop(1, '#202020');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 0.16, 1);
    t.colorSpace = THREE.NoColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Aluminium window: frame, mullion, sill, glass. Faces +z. */
function WindowUnit({ w, h, depth = 0.12, frame, glass, sill, split = true }: { w: number; h: number; depth?: number; frame: THREE.Material; glass: THREE.Material; sill?: THREE.Material; split?: boolean }) {
  const f = 0.05;
  return (
    <group>
      <Box p={[0, h / 2 - f / 2, 0]} s={[w, f, depth]} material={frame} />
      <Box p={[0, -h / 2 + f / 2, 0]} s={[w, f, depth]} material={frame} />
      <Box p={[-w / 2 + f / 2, 0, 0]} s={[f, h, depth]} material={frame} />
      <Box p={[w / 2 - f / 2, 0, 0]} s={[f, h, depth]} material={frame} />
      {split && <Box p={[0, 0, 0.01]} s={[0.035, h - f, 0.05]} material={frame} />}
      <Box p={[0, 0, 0]} s={[w - f, h - f, 0.012]} material={glass} shadow={false} />
      {sill && <RBox p={[0, -h / 2 - 0.03, 0.06]} s={[w + 0.14, 0.05, 0.16]} r={0.012} material={sill} smooth={3} />}
    </group>
  );
}

function useStdMats() {
  return useMemo(() => {
    const copper = new THREE.MeshStandardMaterial({ color: '#b8733d', metalness: 1, roughness: 0.28, emissive: new THREE.Color('#22d3ee'), emissiveIntensity: 0.05 });
    const insul = new THREE.MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.7, emissive: new THREE.Color('#22d3ee'), emissiveIntensity: 0.05 });
    const alu = new THREE.MeshStandardMaterial({ color: '#2b3442', metalness: 0.75, roughness: 0.32 });
    const steel = new THREE.MeshStandardMaterial({ color: '#4b5563', metalness: 0.8, roughness: 0.35 });
    const warm = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: new THREE.Color('#ffd89a'), emissiveIntensity: 1.6, toneMapped: false });
    const screen = new THREE.MeshStandardMaterial({ color: '#0b1f3a', emissive: new THREE.Color('#38bdf8'), emissiveIntensity: 0.8 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.7 });
    const fabric = new THREE.MeshPhysicalMaterial({ color: '#475569', roughness: 0.92, sheen: 0.8, sheenRoughness: 0.6, sheenColor: new THREE.Color('#94a3b8') });
    const linen = new THREE.MeshPhysicalMaterial({ color: '#e2e8f0', roughness: 0.9, sheen: 0.5 });
    const plant = new THREE.MeshStandardMaterial({ color: '#2f6b3a', roughness: 0.85 });
    const pot = new THREE.MeshStandardMaterial({ color: '#d6d3d1', roughness: 0.6 });
    return { copper, insul, alu, steel, warm, screen, dark, fabric, linen, plant, pot };
  }, []);
}

function disposeAll(o: Record<string, THREE.Material | THREE.Texture>) {
  Object.values(o).forEach((m) => m.dispose());
}

const MOTION: MotionRef = { current: { speed: 0.5, target: 0.5 } };

/** Insulated refrigerant pair: copper liquid + insulated suction line. */
function LineSet({ pts, std, offset = 0.035 }: { pts: V3[]; std: ReturnType<typeof useStdMats>; offset?: number }) {
  const b = pts.map(([x, y, z]) => [x, y - offset, z] as V3);
  return (
    <group>
      <Tube pts={pts} r={0.022} material={std.insul} />
      <Tube pts={b} r={0.009} material={std.copper} />
    </group>
  );
}

/* ============================================================================
   Residential bungalow
   Local origin: centre of the footprint at ground level. Front faces +z.
   Footprint 4.5 × 3.4 m, plinth top at y 0.28, walls 2.42 m, hip roof.
   ============================================================================ */

export function ResidentialHouse({ xray, quality }: { xray: boolean; quality: 'low' | 'medium' | 'high' }) {
  const X = useXray(xray);
  const std = useStdMats();
  const corr = useCorrugation();
  const tex = useMemo(() => {
    const bump = createMatteWallBumpMap();
    bump.repeat.set(0.6, 0.6);
    const wood = createWoodGrainMaps();
    const tile = createTileFloorMaps('#d8cfc2', '#a8a093', 10);
    tile.map.repeat.set(1, 1);
    tile.roughnessMap.repeat.set(1, 1);
    tile.normalMap.repeat.set(1, 1);
    return { bump, woodMap: wood.map, woodRough: wood.roughnessMap, tileMap: tile.map, tileRough: tile.roughnessMap, tileNormal: tile.normalMap };
  }, []);

  const M = useMemo(() => {
    const stucco = X.shell(new THREE.MeshPhysicalMaterial({ color: '#ece4d6', roughness: 0.86, bumpMap: tex.bump, bumpScale: 0.01, sheen: 0.1 }));
    const stuccoIn = X.shell(new THREE.MeshStandardMaterial({ color: '#f5efe4', roughness: 0.9 }), 0.05);
    const slate = X.shell(new THREE.MeshPhysicalMaterial({ color: '#3a4656', roughness: 0.55, clearcoat: 0.3 }));
    const plinth = new THREE.MeshStandardMaterial({ color: '#6b7280', roughness: 0.92, bumpMap: tex.bump, bumpScale: 0.02 });
    const roof = X.shell(new THREE.MeshPhysicalMaterial({ color: '#33475e', roughness: 0.38, metalness: 0.55, bumpMap: corr, bumpScale: 0.035, clearcoat: 0.4, side: THREE.DoubleSide }), 0.05);
    const trim = X.shell(new THREE.MeshPhysicalMaterial({ color: '#f1f5f9', roughness: 0.4, clearcoat: 0.5 }));
    const gutter = X.shell(new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.5, roughness: 0.35 }));
    const frame = X.shell(new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.7, roughness: 0.3 }), 0.15);
    const glass = X.shell(
      new THREE.MeshPhysicalMaterial({ color: '#cfe8f5', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.32, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false }),
      0.06,
    );
    const ceiling = X.shell(new THREE.MeshStandardMaterial({ color: '#f8f5ef', roughness: 0.95 }), 0.0);
    const door = X.shell(new THREE.MeshPhysicalMaterial({ map: tex.woodMap, roughnessMap: tex.woodRough, color: '#9a5f35', roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.2 }), 0.12);
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 1, roughness: 0.25 });
    const floor = new THREE.MeshPhysicalMaterial({ map: tex.tileMap, roughnessMap: tex.tileRough, normalMap: tex.tileNormal, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.3, clearcoat: 0.4 });
    const woodFloor = new THREE.MeshPhysicalMaterial({ map: tex.woodMap, roughnessMap: tex.woodRough, color: '#b07a4a', roughness: 0.45, clearcoat: 0.5 });
    const concrete = new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.9, bumpMap: tex.bump, bumpScale: 0.015 });
    return { stucco, stuccoIn, slate, plinth, roof, trim, gutter, frame, glass, ceiling, door, brass, floor, woodFloor, concrete };
  }, [X, tex, corr]);

  useEffect(() => () => {
    disposeAll(M);
    disposeAll(std);
    disposeAll(tex);
  }, [M, std, tex]);

  const roof = useHipRoof(2.62, 2.08, 1.15);
  const daikin = BRANDS[0];
  const WallUnit = MODELS.wall;
  const showInterior = quality !== 'low';

  const base = 0.28; // wall base (plinth top)
  const H = 2.42; // wall height
  const top = base + H;

  return (
    <group>
      {/* ── Plinth, steps, porch slab ── */}
      <RBox p={[0, 0.14, 0]} s={[4.85, 0.28, 3.8]} r={0.035} material={M.plinth} />
      <RBox p={[0, 0.09, 2.08]} s={[1.5, 0.18, 0.4]} r={0.02} material={M.concrete} />
      <RBox p={[0, 0.045, 2.36]} s={[1.6, 0.09, 0.3]} r={0.02} material={M.concrete} />

      {/* ── Walls with real openings ── */}
      <Wall
        w={4.5}
        h={H}
        position={[0, base, 1.64]}
        material={M.stucco}
        holes={[
          { x: 0, y: 0, w: 0.95, h: 1.95 },
          { x: 1.35, y: 0.62, w: 1.2, h: 1.15 },
          { x: -0.92, y: 0.72, w: 0.66, h: 1.05 },
        ]}
      />
      <Wall w={4.5} h={H} position={[0, base, -1.64]} rotY={Math.PI} material={M.stucco} holes={[{ x: -0.8, y: 0.8, w: 1.2, h: 1.0 }]} />
      <Wall w={3.16} h={H} position={[-2.19, base, 0]} rotY={-Math.PI / 2} material={M.stucco} holes={[{ x: 0.3, y: 0.8, w: 1.0, h: 1.0 }]} />
      <Wall w={3.16} h={H} position={[2.19, base, 0]} rotY={Math.PI / 2} material={M.stucco} holes={[{ x: 0.9, y: 1.2, w: 0.6, h: 0.6 }]} />
      {/* Interior partition: bedroom on the back-right */}
      <Wall w={1.72} h={H} t={0.08} position={[0.6, base, -0.74]} rotY={Math.PI / 2} material={M.stuccoIn} holes={[{ x: 0.2, y: 0, w: 0.8, h: 2.0 }]} />
      <Wall w={1.55} h={H} t={0.08} position={[1.37, base, 0.12]} material={M.stuccoIn} />

      {/* Slate accent column + dado band */}
      <RBox p={[-1.78, base + H / 2, 1.74]} s={[0.86, H + 0.02, 0.1]} r={0.02} material={M.slate} />
      <RBox p={[0, base + 0.08, 1.71]} s={[4.52, 0.16, 0.05]} r={0.01} material={M.slate} smooth={2} />

      {/* ── Windows & door ── */}
      <group position={[1.35, base + 0.62 + 0.575, 1.64]}>
        <WindowUnit w={1.2} h={1.15} frame={M.frame} glass={M.glass} sill={M.trim} />
      </group>
      <group position={[-0.92, base + 0.72 + 0.525, 1.64]}>
        <WindowUnit w={0.66} h={1.05} frame={M.frame} glass={M.glass} sill={M.trim} split={false} />
      </group>
      <group position={[0.8, base + 0.8 + 0.5, -1.64]} rotation={[0, Math.PI, 0]}>
        <WindowUnit w={1.2} h={1.0} frame={M.frame} glass={M.glass} sill={M.trim} />
      </group>
      <group position={[-2.19, base + 0.8 + 0.5, 0.3]} rotation={[0, -Math.PI / 2, 0]}>
        <WindowUnit w={1.0} h={1.0} frame={M.frame} glass={M.glass} sill={M.trim} />
      </group>
      <group position={[2.19, base + 1.2 + 0.3, -0.9]} rotation={[0, Math.PI / 2, 0]}>
        <WindowUnit w={0.6} h={0.6} frame={M.frame} glass={M.glass} split={false} />
      </group>

      {/* Front door: frame, panelled leaf, handle */}
      <group position={[0, base, 1.64]}>
        <Box p={[-0.5, 0.99, 0]} s={[0.06, 1.98, 0.14]} material={M.trim} />
        <Box p={[0.5, 0.99, 0]} s={[0.06, 1.98, 0.14]} material={M.trim} />
        <Box p={[0, 1.98, 0]} s={[1.06, 0.06, 0.14]} material={M.trim} />
        <RBox p={[0, 0.975, 0.02]} s={[0.92, 1.93, 0.05]} r={0.01} material={M.door} smooth={2} />
        {[0.55, 1.4].map((y) =>
          [-0.2, 0.2].map((x) => <RBox key={`${x}${y}`} p={[x, y, 0.05]} s={[0.3, 0.62, 0.015]} r={0.006} material={M.door} smooth={2} />),
        )}
        <Beam a={[0.36, 0.95, 0.06]} b={[0.36, 1.12, 0.06]} r={0.012} material={M.brass} />
        <mesh position={[0.36, 1.03, 0.09]} material={M.brass}>
          <sphereGeometry args={[0.022, 16, 12]} />
        </mesh>
      </group>

      {/* Porch canopy on slim posts + wall lantern */}
      <RBox p={[0, 2.52, 2.02]} s={[1.75, 0.09, 0.8]} r={0.02} material={M.slate} />
      {[-0.8, 0.8].map((x) => (
        <Beam key={x} a={[x, 0.28, 2.34]} b={[x, 2.48, 2.34]} r={0.03} material={M.frame} />
      ))}
      <group position={[0.68, 2.0, 1.72]}>
        <RBox p={[0, 0, 0.04]} s={[0.12, 0.2, 0.1]} r={0.015} material={M.frame} smooth={3} />
        <mesh position={[0, -0.01, 0.09]} material={std.warm}>
          <boxGeometry args={[0.08, 0.13, 0.01]} />
        </mesh>
      </group>
      {quality !== 'low' && <pointLight position={[0.68, 2.0, 2.0]} color="#fbbf24" intensity={1.1} distance={4} decay={2} />}

      {/* ── Ceiling, eaves soffit, fascia, gutters ── */}
      <Box p={[0, top - 0.02, 0]} s={[4.4, 0.04, 3.3]} material={M.ceiling} shadow={false} />
      <Box p={[0, top + 0.02, 0]} s={[5.24, 0.04, 4.16]} material={M.trim} />
      {(
        [
          [[-2.62, top + 0.02, 2.08], [2.62, top + 0.02, 2.08]],
          [[-2.62, top + 0.02, -2.08], [2.62, top + 0.02, -2.08]],
          [[-2.62, top + 0.02, -2.08], [-2.62, top + 0.02, 2.08]],
          [[2.62, top + 0.02, -2.08], [2.62, top + 0.02, 2.08]],
        ] as [V3, V3][]
      ).map(([a, b], i) => (
        <Beam key={i} a={[a[0] * 1.012, a[1] - 0.03, a[2] * 1.015]} b={[b[0] * 1.012, b[1] - 0.03, b[2] * 1.015]} r={0.045} material={M.gutter} seg={14} />
      ))}
      {[
        [-2.66, 2.12],
        [2.66, 2.12],
        [2.66, -2.12],
      ].map(([x, z]) => (
        <Beam key={`${x}${z}`} a={[x, top - 0.02, z]} b={[x, 0.32, z]} r={0.028} material={M.gutter} seg={12} />
      ))}

      {/* ── Hip roof (corrugated metal) with ridge & hip caps ── */}
      <group position={[0, top + 0.04, 0]}>
        <mesh geometry={roof.geo} material={M.roof} castShadow receiveShadow />
        <Beam a={[-roof.ridge, 1.16, 0]} b={[roof.ridge, 1.16, 0]} r={0.05} material={M.roof} />
        {(
          [
            [-2.62, -2.08],
            [2.62, -2.08],
            [2.62, 2.08],
            [-2.62, 2.08],
          ] as [number, number][]
        ).map(([x, z]) => (
          <Beam key={`${x}${z}`} a={[x, 0.01, z]} b={[Math.sign(x) * roof.ridge, 1.16, 0]} r={0.035} material={M.roof} />
        ))}
      </group>

      {/* ── Interior ── */}
      <Box p={[0, base + 0.005, 0]} s={[4.26, 0.01, 3.16]} material={M.floor} shadow={false} />
      <Box p={[1.4, base + 0.012, -0.8]} s={[1.5, 0.006, 1.5]} material={M.woodFloor} shadow={false} />
      {showInterior && (
        <group>
          {/* Living: sofa, coffee table, TV console, plant */}
          <group position={[-1.1, base, -0.2]}>
            <RBox p={[0, 0.22, 0]} s={[1.6, 0.22, 0.72]} r={0.06} material={std.fabric} smooth={4} />
            <RBox p={[0, 0.5, -0.28]} s={[1.6, 0.42, 0.18]} r={0.07} material={std.fabric} smooth={4} />
            {[-0.74, 0.74].map((x) => (
              <RBox key={x} p={[x, 0.38, 0]} s={[0.14, 0.34, 0.72]} r={0.06} material={std.fabric} smooth={4} />
            ))}
            {[-0.35, 0.35].map((x) => (
              <RBox key={x} p={[x, 0.37, 0.04]} s={[0.66, 0.1, 0.6]} r={0.045} material={std.linen} smooth={4} />
            ))}
            <RBox p={[0, 0.22, 0.95]} s={[0.9, 0.04, 0.5]} r={0.015} material={M.woodFloor} smooth={3} />
            {[-0.38, 0.38].map((x) =>
              [0.77, 1.13].map((z) => <Beam key={`${x}${z}`} a={[x, 0, z]} b={[x, 0.2, z]} r={0.015} material={std.alu} seg={8} />),
            )}
          </group>
          <group position={[-1.1, base, 1.48]}>
            <RBox p={[0, 0.25, 0]} s={[1.3, 0.4, 0.3]} r={0.02} material={M.woodFloor} smooth={3} />
            <RBox p={[0, 0.95, 0.03]} s={[1.1, 0.62, 0.04]} r={0.01} material={std.dark} smooth={2} />
            <mesh position={[0, 0.95, 0.052]} material={std.screen}>
              <planeGeometry args={[1.04, 0.56]} />
            </mesh>
          </group>
          <group position={[-1.95, base, -1.35]}>
            <Beam a={[0, 0, 0]} b={[0, 0.34, 0]} r={0.12} material={std.pot} seg={20} />
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh key={i} position={[Math.cos(i * 1.3) * 0.12, 0.62 + (i % 2) * 0.12, Math.sin(i * 1.3) * 0.12]} material={std.plant} castShadow>
                <sphereGeometry args={[0.16, 16, 12]} />
              </mesh>
            ))}
          </group>
          {/* Bedroom: bed with pillows, nightstand */}
          <group position={[1.45, base, -1.0]}>
            <RBox p={[0, 0.2, 0]} s={[1.3, 0.32, 1.0]} r={0.04} material={M.woodFloor} smooth={3} />
            <RBox p={[0, 0.42, 0.05]} s={[1.2, 0.14, 0.9]} r={0.06} material={std.linen} smooth={4} />
            <RBox p={[0, 0.55, -0.48]} s={[1.3, 0.62, 0.06]} r={0.02} material={std.fabric} smooth={3} />
            {[-0.3, 0.3].map((x) => (
              <RBox key={x} p={[x, 0.53, -0.3]} s={[0.42, 0.1, 0.24]} r={0.05} material={std.linen} smooth={4} />
            ))}
            <RBox p={[0.35, 0.5, 0.25]} s={[0.55, 0.05, 0.5]} r={0.02} material={std.fabric} smooth={3} />
          </group>
          {/* Ceiling lights */}
          {(
            [
              [-1.1, -0.1],
              [1.4, -0.9],
              [-1.0, 1.1],
            ] as [number, number][]
          ).map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, top - 0.045, z]} rotation={[Math.PI / 2, 0, 0]} material={std.warm}>
              <circleGeometry args={[0.16, 32]} />
            </mesh>
          ))}
          {quality === 'high' && <pointLight position={[-0.9, top - 0.4, 0]} color="#ffd89a" intensity={2.2} distance={5} decay={2} />}
        </group>
      )}

      {/* ── Cooling system: two wall splits → one outdoor unit ── */}
      <group position={[-1.1, 2.3, -1.44]} scale={0.95}>
        <WallUnit brand={daikin} motionRef={MOTION} />
      </group>
      <group position={[1.45, 2.3, -1.44]} scale={0.85}>
        <WallUnit brand={daikin} motionRef={MOTION} />
      </group>
      <LineSet std={std} pts={[[-0.58, 2.28, -1.5], [0.4, 2.52, -1.52], [0.9, 2.55, -1.52], [2.02, 2.55, -1.45], [2.08, 2.5, -0.4], [2.1, 2.1, 0.32], [2.5, 1.75, 0.32]]} />
      <LineSet std={std} pts={[[1.9, 2.3, -1.5], [2.05, 2.48, -1.3], [2.08, 2.4, -0.2], [2.12, 2.0, 0.42], [2.5, 1.7, 0.42]]} offset={0.03} />
      <group position={[2.56, 1.46, 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <Box p={[-0.26, -0.33, -0.12]} s={[0.05, 0.05, 0.42]} material={std.steel} />
        <Box p={[0.26, -0.33, -0.12]} s={[0.05, 0.05, 0.42]} material={std.steel} />
        <group position={[0, 0, 0.0]}>
          <OutdoorCondenser brand={daikin} motionRef={MOTION} />
        </group>
      </group>

      <GlowRegister X={X} std={std} />
    </group>
  );
}

/** Registers the refrigerant-line materials to glow in x-ray (once). */
function GlowRegister({ X, std }: { X: Xray; std: ReturnType<typeof useStdMats> }) {
  useEffect(() => {
    X.glow(std.copper);
    X.glow(std.insul);
  }, [X, std]);
  return null;
}

/* ============================================================================
   Commercial building (two storeys)
   Local origin: centre of the footprint at ground level. Front faces +z.
   Footprint 4.95 × 3.7 m; ground floor 0.06–2.6, slab 2.6–2.9, upper floor to 5.1,
   roof slab to 5.28, parapet to 5.55, rooftop VRF.
   ============================================================================ */

export function CommercialBuilding({ xray, quality }: { xray: boolean; quality: 'low' | 'medium' | 'high' }) {
  const X = useXray(xray);
  const std = useStdMats();
  const tex = useMemo(() => {
    const bump = createMatteWallBumpMap();
    bump.repeat.set(0.5, 0.5);
    const tile = createTileFloorMaps('#cfd6de', '#9aa4b1', 12);
    const wood = createWoodGrainMaps();
    return { bump, tileMap: tile.map, tileRough: tile.roughnessMap, tileNormal: tile.normalMap, woodMap: wood.map, woodRough: wood.roughnessMap };
  }, []);

  const M = useMemo(() => {
    const concrete = X.shell(new THREE.MeshPhysicalMaterial({ color: '#d3d9e0', roughness: 0.82, bumpMap: tex.bump, bumpScale: 0.012 }));
    const column = X.shell(new THREE.MeshPhysicalMaterial({ color: '#1f2937', roughness: 0.5, metalness: 0.35, clearcoat: 0.4 }), 0.14);
    const slab = X.shell(new THREE.MeshStandardMaterial({ color: '#9aa4b1', roughness: 0.85 }), 0.1);
    const spandrel = X.shell(new THREE.MeshPhysicalMaterial({ color: '#273445', roughness: 0.3, metalness: 0.5, clearcoat: 0.8 }), 0.08);
    const mullion = X.shell(new THREE.MeshStandardMaterial({ color: '#111827', metalness: 0.75, roughness: 0.28 }), 0.18);
    const glass = X.shell(
      new THREE.MeshPhysicalMaterial({ color: '#bcd9ea', roughness: 0.03, metalness: 0.15, transparent: true, opacity: 0.3, clearcoat: 1, envMapIntensity: 1.8, depthWrite: false }),
      0.05,
    );
    const ceiling = X.shell(new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.95 }), 0.0);
    const parapet = X.shell(new THREE.MeshPhysicalMaterial({ color: '#111827', roughness: 0.45, metalness: 0.4, clearcoat: 0.5 }), 0.15);
    const sign = new THREE.MeshStandardMaterial({ color: '#fed7aa', emissive: new THREE.Color('#f97316'), emissiveIntensity: 1.3, toneMapped: false });
    const signBox = X.shell(new THREE.MeshPhysicalMaterial({ color: '#0f172a', roughness: 0.35, metalness: 0.6, clearcoat: 0.6 }), 0.2);
    const floor = new THREE.MeshPhysicalMaterial({ map: tex.tileMap, roughnessMap: tex.tileRough, normalMap: tex.tileNormal, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.3, clearcoat: 0.45 });
    const desk = new THREE.MeshPhysicalMaterial({ map: tex.woodMap, roughnessMap: tex.woodRough, color: '#c49a6c', roughness: 0.45, clearcoat: 0.5 });
    const shelf = new THREE.MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.6, metalness: 0.2 });
    const duct = new THREE.MeshStandardMaterial({ color: '#b4bfcc', metalness: 0.6, roughness: 0.4, emissive: new THREE.Color('#22d3ee'), emissiveIntensity: 0.05 });
    const louver = X.shell(new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.6, roughness: 0.35 }), 0.15);
    return { concrete, column, slab, spandrel, mullion, glass, ceiling, parapet, sign, signBox, floor, desk, shelf, duct, louver };
  }, [X, tex]);

  useEffect(() => {
    X.glow(std.copper);
    X.glow(std.insul);
    X.glow(M.duct);
  }, [X, std, M]);

  useEffect(() => () => {
    disposeAll(M);
    disposeAll(std);
    disposeAll(tex);
  }, [M, std, tex]);

  const brand = BRANDS[1]; // Trane for the commercial system
  const Cassette = MODELS.cassette;
  const Ducted = MODELS.ducted;
  const Vrf = MODELS.vrf;
  const showInterior = quality !== 'low';
  const HX = 2.475;
  const HZ = 1.85;

  // Product boxes on the shelves (one instanced mesh)
  const productsRef = useRef<THREE.InstancedMesh>(null);
  const products = useMemo(() => {
    const list: { p: V3; c: string }[] = [];
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#f8fafc'];
    [-1.6, -0.9].forEach((sx) =>
      [0.55, 1.0, 1.45].forEach((y) =>
        Array.from({ length: 6 }, (_, i) => list.push({ p: [sx, y, -1.2 + i * 0.28], c: colors[(i + Math.round(y * 3)) % colors.length] })),
      ),
    );
    return list;
  }, []);
  useEffect(() => {
    const mesh = productsRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    products.forEach((it, i) => {
      m.makeTranslation(...it.p);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.set(it.c));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [products, showInterior]);

  return (
    <group>
      {/* ── Foundation & ground slab ── */}
      <RBox p={[0, 0.03, 0]} s={[5.05, 0.06, 3.8]} r={0.02} material={M.slab} smooth={2} />
      <Box p={[0, 0.065, 0]} s={[4.9, 0.01, 3.6]} material={M.floor} shadow={false} />

      {/* ── Structural columns ── */}
      {(
        [
          [-HX + 0.16, HZ - 0.16],
          [HX - 0.16, HZ - 0.16],
          [-HX + 0.16, -HZ + 0.16],
          [HX - 0.16, -HZ + 0.16],
        ] as [number, number][]
      ).map(([x, z]) => (
        <RBox key={`${x}${z}`} p={[x, 2.68, z]} s={[0.36, 5.36, 0.36]} r={0.04} material={M.column} />
      ))}

      {/* ── Floor slabs & roof slab ── */}
      <RBox p={[0, 2.75, 0]} s={[4.95, 0.3, 3.7]} r={0.02} material={M.slab} smooth={2} />
      <RBox p={[0, 5.19, 0]} s={[4.95, 0.18, 3.7]} r={0.02} material={M.slab} smooth={2} />
      <Box p={[0, 2.92, 0]} s={[4.7, 0.01, 3.5]} material={M.floor} shadow={false} />

      {/* ── Side & back walls (concrete, with panel joints) ── */}
      <Wall w={3.34} h={5.05} position={[-HX + 0.08, 0.06, 0]} rotY={-Math.PI / 2} t={0.14} material={M.concrete} holes={[{ x: 0.2, y: 3.35, w: 1.8, h: 1.1 }]} />
      <Wall w={3.34} h={5.05} position={[HX - 0.08, 0.06, 0]} rotY={Math.PI / 2} t={0.14} material={M.concrete} holes={[{ x: 0.6, y: 0.9, w: 0.8, h: 0.6 }]} />
      <Wall w={4.6} h={5.05} position={[0, 0.06, -HZ + 0.08]} rotY={Math.PI} t={0.14} material={M.concrete} />
      <group position={[-HX + 0.08, 3.35 + 0.55 + 0.06, 0.2]} rotation={[0, -Math.PI / 2, 0]}>
        <WindowUnit w={1.8} h={1.1} depth={0.14} frame={M.mullion} glass={M.glass} />
      </group>
      {/* Exhaust louver on the right wall */}
      <group position={[HX - 0.02, 0.06 + 0.9 + 0.3, -0.6]} rotation={[0, Math.PI / 2, 0]}>
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={i} p={[0, -0.25 + i * 0.1, 0]} rot={[-0.5, 0, 0]} s={[0.78, 0.012, 0.09]} material={M.louver} />
        ))}
      </group>

      {/* ── Ground-floor glass storefront ── */}
      <group position={[0, 0.06, HZ - 0.1]}>
        <Box p={[0, 1.27, 0]} s={[4.2, 2.48, 0.016]} material={M.glass} shadow={false} />
        {[-2.1, -1.05, 1.05, 2.1].map((x) => (
          <Box key={x} p={[x, 1.27, 0.02]} s={[0.06, 2.52, 0.1]} material={M.mullion} />
        ))}
        <Box p={[0, 2.12, 0.02]} s={[4.2, 0.06, 0.1]} material={M.mullion} />
        <Box p={[0, 0.03, 0.02]} s={[4.2, 0.06, 0.12]} material={M.mullion} />
        {/* Double entrance doors */}
        {[-0.52, 0.52].map((x) => (
          <group key={x}>
            <Box p={[x * 2, 1.06, 0.03]} s={[0.04, 2.08, 0.08]} material={M.mullion} />
            <Beam a={[x * 0.14, 0.8, 0.09]} b={[x * 0.14, 1.4, 0.09]} r={0.014} material={std.alu} />
          </group>
        ))}
        <Box p={[0, 1.06, 0.03]} s={[0.04, 2.08, 0.08]} material={M.mullion} />
      </group>

      {/* ── Signage band between floors ── */}
      <RBox p={[0, 2.86, HZ + 0.06]} s={[4.7, 0.56, 0.2]} r={0.03} material={M.signBox} />
      <Box p={[0, 2.86, HZ + 0.165]} s={[4.3, 0.32, 0.01]} material={M.sign} shadow={false} />
      {quality !== 'low' && <pointLight position={[0, 2.55, HZ + 0.9]} color="#fb923c" intensity={1.6} distance={6} decay={2} />}

      {/* ── Upper floor: spandrel + ribbon windows + sun-shade fins ── */}
      <group position={[0, 0, HZ - 0.08]}>
        <Box p={[0, 3.15, 0]} s={[4.6, 0.5, 0.12]} material={M.spandrel} />
        <Box p={[0, 4.15, 0]} s={[4.6, 1.5, 0.016]} material={M.glass} shadow={false} />
        {[-2.3, -1.15, 0, 1.15, 2.3].map((x) => (
          <Box key={x} p={[x, 4.15, 0.02]} s={[0.06, 1.5, 0.1]} material={M.mullion} />
        ))}
        <Box p={[0, 3.42, 0.02]} s={[4.6, 0.05, 0.1]} material={M.mullion} />
        <Box p={[0, 4.88, 0.02]} s={[4.6, 0.05, 0.1]} material={M.mullion} />
        {[3.95, 4.35, 4.75].map((y) => (
          <Box key={y} p={[0, y + 0.18, 0.2]} s={[4.6, 0.02, 0.3]} rot={[0.25, 0, 0]} material={M.louver} />
        ))}
      </group>

      {/* ── Ceilings (x-ray removes them) ── */}
      <Box p={[0, 2.5, 0]} s={[4.6, 0.03, 3.4]} material={M.ceiling} shadow={false} />
      <Box p={[0, 4.72, 0]} s={[4.6, 0.03, 3.4]} material={M.ceiling} shadow={false} />

      {/* ── Parapet ── */}
      <RBox p={[0, 5.42, HZ - 0.06]} s={[4.95, 0.28, 0.12]} r={0.02} material={M.parapet} smooth={2} />
      <RBox p={[0, 5.42, -HZ + 0.06]} s={[4.95, 0.28, 0.12]} r={0.02} material={M.parapet} smooth={2} />
      <RBox p={[-HX + 0.06, 5.42, 0]} s={[0.12, 0.28, 3.7]} r={0.02} material={M.parapet} smooth={2} />
      <RBox p={[HX - 0.06, 5.42, 0]} s={[0.12, 0.28, 3.7]} r={0.02} material={M.parapet} smooth={2} />

      {/* ── Interior: ground-floor retail ── */}
      {showInterior && (
        <group>
          {[-1.6, -0.9].map((x) => (
            <group key={x}>
              <RBox p={[x, 0.95, -0.5]} s={[0.4, 1.8, 1.7]} r={0.02} material={M.shelf} smooth={2} />
              {[0.45, 0.9, 1.35].map((y) => (
                <Box key={y} p={[x, y, -0.5]} s={[0.46, 0.02, 1.74]} material={M.shelf} />
              ))}
            </group>
          ))}
          <instancedMesh ref={productsRef} args={[undefined, undefined, products.length]} castShadow>
            <boxGeometry args={[0.18, 0.2, 0.2]} />
            <meshStandardMaterial roughness={0.5} />
          </instancedMesh>
          <RBox p={[1.2, 0.55, 0.4]} s={[1.6, 1.0, 0.6]} r={0.04} material={M.desk} smooth={3} />
          <RBox p={[1.2, 1.07, 0.4]} s={[1.7, 0.04, 0.7]} r={0.015} material={M.shelf} smooth={2} />
          <RBox p={[1.0, 1.25, 0.35]} s={[0.32, 0.22, 0.03]} r={0.01} material={std.dark} smooth={2} />
          {/* Recessed troffers */}
          {(
            [
              [-1.2, -0.6],
              [0.6, -0.6],
              [-1.2, 0.9],
              [0.6, 0.9],
            ] as [number, number][]
          ).map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, 2.48, z]} rotation={[Math.PI / 2, 0, 0]} material={std.warm}>
              <planeGeometry args={[0.55, 0.55]} />
            </mesh>
          ))}

          {/* Upper floor: office desks, chairs, monitors */}
          {(
            [
              [-1.3, -0.5],
              [0.1, -0.5],
              [-1.3, 0.7],
              [0.1, 0.7],
            ] as [number, number][]
          ).map(([x, z]) => (
            <group key={`${x}${z}`} position={[x, 2.92, z]}>
              <RBox p={[0, 0.74, 0]} s={[1.1, 0.04, 0.62]} r={0.012} material={M.desk} smooth={2} />
              {[-0.5, 0.5].map((dx) => (
                <Box key={dx} p={[dx, 0.37, 0]} s={[0.04, 0.74, 0.56]} material={std.alu} />
              ))}
              <RBox p={[0, 0.98, -0.18]} s={[0.5, 0.3, 0.025]} r={0.01} material={std.dark} smooth={2} />
              <mesh position={[0, 0.98, -0.166]} material={std.screen}>
                <planeGeometry args={[0.46, 0.26]} />
              </mesh>
              <RBox p={[0, 0.45, 0.48]} s={[0.46, 0.08, 0.44]} r={0.03} material={std.fabric} smooth={3} />
              <RBox p={[0, 0.75, 0.7]} s={[0.44, 0.5, 0.06]} r={0.03} material={std.fabric} smooth={3} />
            </group>
          ))}
          {quality === 'high' && (
            <>
              <pointLight position={[0, 2.2, 0]} color="#fff1d6" intensity={2.4} distance={5} decay={2} />
              <pointLight position={[0, 4.4, 0]} color="#e0f2fe" intensity={2} distance={5} decay={2} />
            </>
          )}
        </group>
      )}

      {/* ── Cooling system ──
          Ground floor: two 4-way ceiling cassettes, panels facing down.
          Upper floor: concealed ducted unit above the ceiling with supply ducts.
          Roof: two VRF outdoor modules on steel dunnage; refrigerant risers drop down the right side. */}
      {[-0.4, 1.4].map((x) => (
        <group key={x} position={[x, 2.56, -0.1]} rotation={[Math.PI, 0, 0]} scale={0.7}>
          <Cassette brand={brand} motionRef={MOTION} />
        </group>
      ))}
      <group position={[-0.5, 4.9, -0.9]} scale={0.8}>
        <Ducted brand={brand} motionRef={MOTION} />
      </group>
      <Box p={[0.6, 4.9, -0.62]} s={[1.6, 0.18, 0.3]} material={M.duct} />
      <Box p={[1.3, 4.9, 0.2]} s={[0.3, 0.18, 1.6]} material={M.duct} />
      {[
        [1.3, 0.7],
        [0.2, -0.62],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} p={[x, 4.7, z]} s={[0.5, 0.02, 0.12]} material={std.dark} shadow={false} />
      ))}

      {/* Rooftop dunnage + VRF modules */}
      {[-0.5, 0.5].map((z) => (
        <Box key={z} p={[0, 5.33, z]} s={[2.4, 0.08, 0.1]} material={std.steel} />
      ))}
      {[-0.55, 0.55].map((x) => (
        <group key={x} position={[x, 5.37 + 0.68, 0]} scale={0.85}>
          <Vrf brand={brand} motionRef={MOTION} />
        </group>
      ))}

      {/* Refrigerant risers: roof → right wall → each floor */}
      <LineSet std={std} pts={[[0.9, 5.45, 0.32], [1.6, 5.45, 0.4], [2.3, 5.4, 0.6], [2.62, 5.2, 0.6], [2.62, 3.0, 0.6], [2.62, 2.7, 0.6]]} />
      <LineSet std={std} pts={[[2.62, 2.7, 0.6], [2.25, 2.55, 0.4], [1.6, 2.45, -0.05]]} offset={0.03} />
      <LineSet std={std} pts={[[2.62, 4.95, 0.62], [2.2, 4.93, 0.2], [0.0, 4.92, -0.62]]} offset={0.03} />
    </group>
  );
}

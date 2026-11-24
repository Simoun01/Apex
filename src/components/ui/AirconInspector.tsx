import { Html, OrbitControls, RoundedBox, ContactShadows } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { CalendarCheck, Gauge, RotateCcw, Wind, X, Zap } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode, RefObject } from 'react';
import * as THREE from 'three';
import { BRANDS, CATALOG_KIND, KINDS, featuresFor, specFor } from '../../data/airconBrands';
import type { Brand, BrandId, PartId, UnitKind } from '../../data/airconBrands';
import { EQUIPMENT_CATALOG } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';

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
}

type V3 = [number, number, number];

type MotionRef = { current: Motion };

/* ── Fan speed shared with the models through a ref (no re-render per frame) ── */
interface Motion {
  speed: number; // 0..1, eased toward target
  target: number;
}

function useSpin(motionRef: MotionRef, axis: 'x' | 'y' | 'z', rate: number) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation[axis] += dt * rate * (0.15 + motionRef.current.speed * 1.6);
  });
  return ref;
}

/* ── Primitive helpers ── */

function Mat({ color, rough = 0.45, metal = 0.05, emissive }: { color: string; rough?: number; metal?: number; emissive?: string }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 0.9 : 0} />;
}

function Box({ p, s, color, rough, metal, emissive }: { p: V3; s: V3; color: string; rough?: number; metal?: number; emissive?: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <Mat color={color} rough={rough} metal={metal} emissive={emissive} />
    </mesh>
  );
}

/** Row of thin bars: grilles, slats, fins. */
function Bars({ p, len, count, gap, axis, thick = 0.006, depth = 0.01, color }: { p: V3; len: number; count: number; gap: number; axis: 'x' | 'y'; thick?: number; depth?: number; color: string }) {
  return (
    <group position={p}>
      {Array.from({ length: count }, (_, i) => {
        const o = (i - (count - 1) / 2) * gap;
        return axis === 'x' ? (
          <Box key={i} p={[0, o, 0]} s={[len, thick, depth]} color={color} rough={0.6} />
        ) : (
          <Box key={i} p={[o, 0, 0]} s={[thick, len, depth]} color={color} rough={0.6} />
        );
      })}
    </group>
  );
}

/** Propeller fan facing +z (rotate the group to aim it). */
function Propeller({ r, motionRef, rate = 9, blades = 3, color = '#3b4452', guard = true }: { r: number; motionRef: MotionRef; rate?: number; blades?: number; color?: string; guard?: boolean }) {
  const spin = useSpin(motionRef, 'z', rate);
  const blade = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(r * 0.25, r * 0.5, r * 0.85, r * 0.6, r * 0.9, r * 0.15);
    s.bezierCurveTo(r * 0.6, r * 0.05, r * 0.3, 0, 0, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false });
  }, [r]);
  return (
    <group>
      <mesh position={[0, 0, -0.012]}>
        <circleGeometry args={[r * 1.02, 40]} />
        <meshStandardMaterial color="#0b1220" roughness={0.9} />
      </mesh>
      <group ref={spin}>
        {Array.from({ length: blades }, (_, i) => (
          <mesh key={i} geometry={blade} rotation={[0.25, 0, (i * Math.PI * 2) / blades]} castShadow>
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r * 0.14, r * 0.14, 0.04, 20]} />
          <Mat color="#94a3b8" metal={0.4} rough={0.3} />
        </mesh>
      </group>
      {guard && (
        <group position={[0, 0, 0.03]}>
          {[0.4, 0.7, 1].map((k) => (
            <mesh key={k}>
              <torusGeometry args={[r * k, 0.0035, 6, 48]} />
              <Mat color="#64748b" metal={0.6} rough={0.35} />
            </mesh>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
              <Box p={[0, 0, 0]} s={[r * 2, 0.005, 0.005]} color="#64748b" metal={0.6} />
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

/* ============================================================================
   Models — every unit faces +z, centred on the origin, about 1.2 m across.
   ANCHORS place the glowing highlight for each part.
   ============================================================================ */

interface ModelProps {
  brand: Brand;
  motionRef: MotionRef;
}

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

/** Small outdoor condenser behind wall / floor units, so the compressor and outdoor fan can be shown. */
function CompanionOutdoor({ brand, motionRef, at }: ModelProps & { at: V3 }) {
  return (
    <group position={at} scale={0.62}>
      <RoundedBox args={[0.78, 0.56, 0.3]} radius={0.02} smoothness={3} castShadow receiveShadow>
        <Mat color={brand.body} rough={0.5} />
      </RoundedBox>
      <group position={[-0.1, 0, 0.152]}>
        <Propeller r={0.21} motionRef={motionRef} rate={11} color="#4b5563" />
      </group>
      <Bars p={[0.29, 0, 0.152]} len={0.46} count={12} gap={0.036} axis="x" color={brand.trim} />
      {/* Compressor dome visible through a cut-away side */}
      <mesh position={[0.3, -0.06, 0.0]}>
        <capsuleGeometry args={[0.1, 0.14, 6, 18]} />
        <Mat color="#1f2937" metal={0.5} rough={0.35} />
      </mesh>
      <Box p={[0.395, -0.18, 0.08]} s={[0.04, 0.04, 0.04]} color="#c08a2b" metal={0.8} rough={0.3} />
    </group>
  );
}

function WallModel({ brand, motionRef }: ModelProps) {
  const flap = useRef<THREE.Group>(null);
  const cross = useSpin(motionRef, 'x', 14);
  useFrame(({ clock }) => {
    if (flap.current) flap.current.rotation.x = 0.55 + Math.sin(clock.elapsedTime * (0.6 + motionRef.current.speed * 0.6)) * 0.35;
  });
  return (
    <group>
      <RoundedBox args={[1.0, 0.3, 0.24]} radius={0.05} smoothness={5} castShadow receiveShadow>
        <Mat color={brand.body} rough={0.32} />
      </RoundedBox>
      {/* Front fascia with a soft sheen line */}
      <Box p={[0, 0.03, 0.121]} s={[0.94, 0.19, 0.004]} color={brand.body} rough={0.18} />
      <Box p={[0, 0.115, 0.124]} s={[0.94, 0.006, 0.003]} color={brand.accent} emissive={brand.accent} />
      {/* Top intake grille (filter behind it) */}
      <group position={[0, 0.151, -0.01]} rotation={[-Math.PI / 2, 0, 0]}>
        <Bars p={[0, 0, 0]} len={0.18} count={60} gap={0.015} axis="y" thick={0.004} depth={0.003} color={brand.trim} />
      </group>
      {/* Outlet slot with cross-flow fan */}
      <Box p={[0, -0.1, 0.07]} s={[0.9, 0.07, 0.14]} color="#0f172a" rough={0.9} />
      <group position={[0, -0.09, 0.07]} ref={cross}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.86, 18, 1, true]} />
          <meshStandardMaterial color="#64748b" roughness={0.5} wireframe />
        </mesh>
      </group>
      {/* Swing louver */}
      <group position={[0, -0.122, 0.13]} ref={flap}>
        <Box p={[0, 0, -0.03]} s={[0.88, 0.006, 0.06]} color={brand.body} rough={0.3} />
      </group>
      {/* Display + sensor */}
      <Box p={[0.37, -0.02, 0.124]} s={[0.1, 0.035, 0.004]} color="#0b1f3a" />
      <group position={[0.37, -0.02, 0.127]}>
        <Box p={[-0.0176, 0, 0]} s={[0.0240, 0.0200, 0.002]} color={brand.accent} emissive={brand.accent} />
        <Box p={[0.0160, 0, 0]} s={[0.0240, 0.0200, 0.002]} color={brand.accent} emissive={brand.accent} />
      </group>
      <mesh position={[-0.4, -0.04, 0.124]}>
        <sphereGeometry args={[0.018, 16, 12]} />
        <meshStandardMaterial color="#111827" roughness={0.1} metalness={0.6} />
      </mesh>
      <Box p={[-0.33, 0.06, 0.124]} s={[0.1, 0.012, 0.003]} color={brand.trim} />
      <CompanionOutdoor brand={brand} motionRef={motionRef} at={[0.78, -0.72, -0.5]} />
    </group>
  );
}

function FloorModel({ brand, motionRef }: ModelProps) {
  const vanes = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!vanes.current) return;
    const a = Math.sin(clock.elapsedTime * (0.5 + motionRef.current.speed * 0.5)) * 0.45;
    vanes.current.children.forEach((c) => (c.rotation.y = a));
  });
  return (
    <group>
      <RoundedBox args={[0.52, 1.72, 0.32]} radius={0.06} smoothness={5} castShadow receiveShadow>
        <Mat color={brand.body} rough={0.3} />
      </RoundedBox>
      <Box p={[0, 0.72, 0.162]} s={[0.5, 0.01, 0.004]} color={brand.accent} emissive={brand.accent} />
      <Box p={[0, 0.82, 0.162]} s={[0.2, 0.07, 0.004]} color="#0b1f3a" />
      <group position={[0, 0.82, 0.165]}>
        <Box p={[-0.0352, 0, 0]} s={[0.0480, 0.0400, 0.002]} color={brand.accent} emissive={brand.accent} />
        <Box p={[0.0320, 0, 0]} s={[0.0480, 0.0400, 0.002]} color={brand.accent} emissive={brand.accent} />
      </group>
      <Box p={[0, 0.42, 0.158]} s={[0.4, 0.6, 0.006]} color="#111827" rough={0.8} />
      <group ref={vanes} position={[0, 0.42, 0.17]}>
        {Array.from({ length: 9 }, (_, i) => (
          <group key={i} position={[(i - 4) * 0.042, 0, 0]}>
            <Box p={[0, 0, 0]} s={[0.006, 0.58, 0.04]} color="#9ca3af" metal={0.2} />
          </group>
        ))}
      </group>
      <Bars p={[0, -0.5, 0.162]} len={0.44} count={22} gap={0.024} axis="x" color={brand.trim} />
      <CompanionOutdoor brand={brand} motionRef={motionRef} at={[0.95, -0.6, -0.6]} />
    </group>
  );
}

function WindowModel({ brand, motionRef }: ModelProps) {
  return (
    <group>
      <RoundedBox args={[0.62, 0.4, 0.7]} radius={0.02} smoothness={3} castShadow receiveShadow>
        <Mat color={brand.body} rough={0.4} />
      </RoundedBox>
      {/* Front: grille, vanes, control strip */}
      <Box p={[-0.07, 0.04, 0.352]} s={[0.44, 0.32, 0.006]} color={brand.trim} />
      <Bars p={[-0.07, 0.12, 0.358]} len={0.42} count={7} gap={0.022} axis="x" thick={0.008} depth={0.02} color="#94a3b8" />
      <Box p={[-0.07, -0.06, 0.356]} s={[0.42, 0.13, 0.004]} color="#1f2937" />
      <Bars p={[-0.07, -0.06, 0.36]} len={0.13} count={20} gap={0.02} axis="y" color="#475569" />
      <Box p={[0.24, 0.0, 0.352]} s={[0.11, 0.34, 0.006]} color={brand.body} />
      <Box p={[0.24, 0.13, 0.357]} s={[0.08, 0.045, 0.004]} color="#0b1f3a" />
      <group position={[0.24, 0.13, 0.36]}>
        <Box p={[-0.0132, 0, 0]} s={[0.0180, 0.0250, 0.002]} color={brand.accent} emissive={brand.accent} />
        <Box p={[0.0120, 0, 0]} s={[0.0180, 0.0250, 0.002]} color={brand.accent} emissive={brand.accent} />
      </group>
      {[0.03, -0.08].map((y) => (
        <mesh key={y} position={[0.24, y, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.02, 24]} />
          <Mat color="#cbd5e1" metal={0.3} rough={0.3} />
        </mesh>
      ))}
      {/* Side louvres and the rear condenser fan */}
      {[-0.312, 0.312].map((x) => (
        <group key={x} position={[x, 0, -0.12]} rotation={[0, Math.PI / 2, 0]}>
          <Bars p={[0, 0, 0]} len={0.3} count={12} gap={0.026} axis="y" color={brand.trim} depth={0.006} />
        </group>
      ))}
      <group position={[0, 0, -0.352]} rotation={[0, Math.PI, 0]}>
        <Box p={[0, 0, 0.0]} s={[0.56, 0.36, 0.004]} color="#475569" />
        <Propeller r={0.15} motionRef={motionRef} rate={10} />
      </group>
    </group>
  );
}

function VrfModel({ brand, motionRef }: ModelProps) {
  return (
    <group>
      <RoundedBox args={[0.96, 1.6, 0.76]} radius={0.02} smoothness={3} castShadow receiveShadow>
        <Mat color={brand.body} rough={0.5} />
      </RoundedBox>
      {/* Coil grilles on the front and sides */}
      <Bars p={[0, 0.12, 0.382]} len={0.88} count={34} gap={0.03} axis="x" color={brand.trim} />
      {[-0.482, 0.482].map((x) => (
        <group key={x} position={[x, 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Bars p={[0, 0, 0]} len={0.68} count={34} gap={0.03} axis="x" color={brand.trim} />
        </group>
      ))}
      <Box p={[0, -0.5, 0.382]} s={[0.92, 0.48, 0.004]} color={brand.body} />
      <Box p={[-0.32, -0.66, 0.386]} s={[0.2, 0.1, 0.004]} color="#0b1f3a" />
      <Box p={[-0.32, -0.62, 0.389]} s={[0.04, 0.012, 0.002]} color="#22c55e" emissive="#22c55e" />
      {[0.32, 0.4].map((x) => (
        <mesh key={x} position={[x, -0.68, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.05, 16]} />
          <Mat color="#c08a2b" metal={0.85} rough={0.25} />
        </mesh>
      ))}
      <Box p={[0, -0.785, 0]} s={[0.98, 0.03, 0.78]} color="#334155" />
      {/* Top fan, pointing up */}
      <group position={[0, 0.805, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <Propeller r={0.32} motionRef={motionRef} rate={8} blades={4} />
      </group>
      <Box p={[0.4, -0.3, 0.386]} s={[0.12, 0.02, 0.002]} color={brand.accent} emissive={brand.accent} />
    </group>
  );
}

function PackagedModel({ brand, motionRef }: ModelProps) {
  return (
    <group>
      <RoundedBox args={[1.6, 0.82, 1.08]} radius={0.02} smoothness={3} castShadow receiveShadow>
        <Mat color={brand.body} rough={0.5} />
      </RoundedBox>
      <Box p={[0, -0.43, 0]} s={[1.64, 0.05, 1.1]} color="#334155" />
      <group position={[-0.52, 0, 0.542]}>
        <Bars p={[0, 0, 0]} len={0.7} count={18} gap={0.03} axis="y" color={brand.trim} />
      </group>
      {[0.0, 0.3, 0.6].map((x) => (
        <group key={x}>
          <Box p={[x, -0.02, 0.542]} s={[0.27, 0.7, 0.006]} color={brand.body} />
          <Box p={[x + 0.1, -0.02, 0.548]} s={[0.02, 0.08, 0.008]} color="#475569" metal={0.5} />
        </group>
      ))}
      <Box p={[0.6, 0.22, 0.547]} s={[0.1, 0.04, 0.004]} color={brand.accent} emissive={brand.accent} />
      {[-0.36, 0.36].map((x) => (
        <group key={x} position={[x, 0.415, -0.14]} rotation={[-Math.PI / 2, 0, 0]}>
          <Propeller r={0.28} motionRef={motionRef} rate={8} blades={4} />
        </group>
      ))}
    </group>
  );
}

function DuctedModel({ brand, motionRef }: ModelProps) {
  const blower = useSpin(motionRef, 'x', 12);
  return (
    <group>
      <RoundedBox args={[1.1, 0.3, 0.7]} radius={0.015} smoothness={3} castShadow receiveShadow>
        <Mat color="#a7b3c2" rough={0.45} metal={0.3} />
      </RoundedBox>
      {/* Supply flange and blower */}
      <Box p={[0, 0, 0.37]} s={[0.98, 0.26, 0.04]} color="#8a98ab" metal={0.4} />
      <Box p={[0, 0, 0.392]} s={[0.92, 0.2, 0.004]} color="#0f172a" />
      <group position={[0, 0, 0.33]} ref={blower}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.84, 22, 1, true]} />
          <meshStandardMaterial color="#64748b" wireframe />
        </mesh>
      </group>
      {/* Return filter rack */}
      <Box p={[0, 0, -0.355]} s={[1.0, 0.26, 0.01]} color={brand.trim} />
      <Bars p={[0, 0, -0.362]} len={0.24} count={30} gap={0.032} axis="y" color="#64748b" />
      {/* Control box with brand strip */}
      <Box p={[0.56, 0, 0.1]} s={[0.03, 0.2, 0.22]} color="#e5e7eb" />
      <Box p={[0.577, 0.05, 0.1]} s={[0.004, 0.02, 0.12]} color={brand.accent} emissive={brand.accent} />
      {[-0.5, 0.5].map((x) =>
        [-0.3, 0.3].map((z) => <Box key={`${x}${z}`} p={[x, 0.2, z]} s={[0.012, 0.12, 0.012]} color="#64748b" metal={0.6} />),
      )}
    </group>
  );
}

function CassetteModel({ brand, motionRef }: ModelProps) {
  const flaps = useRef<THREE.Group>(null);
  const fan = useSpin(motionRef, 'y', 10);
  useFrame(({ clock }) => {
    if (!flaps.current) return;
    const a = 0.4 + Math.sin(clock.elapsedTime * (0.6 + motionRef.current.speed * 0.5)) * 0.3;
    flaps.current.children.forEach((c) => ((c.children[0] as THREE.Object3D).rotation.x = a));
  });
  return (
    <group>
      <Box p={[0, -0.04, 0]} s={[0.7, 0.22, 0.7]} color="#cbd5e1" metal={0.2} />
      <RoundedBox args={[0.86, 0.05, 0.86]} radius={0.02} smoothness={3} position={[0, 0.1, 0]} castShadow receiveShadow>
        <Mat color={brand.body} rough={0.35} />
      </RoundedBox>
      <Box p={[0, 0.128, 0]} s={[0.4, 0.006, 0.4]} color={brand.trim} />
      <group position={[0, 0.133, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <Bars p={[0, 0, 0]} len={0.38} count={14} gap={0.026} axis="y" depth={0.006} color="#94a3b8" />
      </group>
      <group ref={fan} position={[0, 0.0, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Box key={i} p={[Math.cos((i * Math.PI) / 3) * 0.14, 0, Math.sin((i * Math.PI) / 3) * 0.14]} s={[0.12, 0.06, 0.02]} color="#64748b" />
        ))}
      </group>
      {/* Four slots, each with a swinging flap */}
      <group ref={flaps} position={[0, 0.128, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <group position={[0, 0, 0.31]}>
              <Box p={[0, 0, 0]} s={[0.56, 0.006, 0.06]} color={brand.body} />
            </group>
          </group>
        ))}
      </group>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <Box p={[0, 0.126, 0.31]} s={[0.6, 0.004, 0.08]} color="#0f172a" />
        </group>
      ))}
      <mesh position={[0.34, 0.13, 0.34]}>
        <sphereGeometry args={[0.014, 12, 10]} />
        <meshStandardMaterial color={brand.accent} emissive={brand.accent} emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

const MODELS: Record<UnitKind, (p: ModelProps) => ReactNode> = {
  wall: WallModel,
  floor: FloorModel,
  window: WindowModel,
  vrf: VrfModel,
  packaged: PackagedModel,
  ducted: DuctedModel,
  cassette: CassetteModel,
};

/* ── Airflow: cold air out of the outlet, warm air off condensers ── */

const FLOW: Record<UnitKind, { from: V3; spread: V3; dir: V3; warm: boolean }[]> = {
  wall: [
    { from: [0, -0.13, 0.14], spread: [0.8, 0.01, 0.02], dir: [0, -0.5, 1], warm: false },
    { from: [0.62, -0.7, -0.27], spread: [0.15, 0.15, 0.01], dir: [0, 0, 1], warm: true },
  ],
  floor: [
    { from: [0, 0.42, 0.18], spread: [0.34, 0.5, 0.01], dir: [0, 0.05, 1], warm: false },
    { from: [0.83, -0.6, -0.39], spread: [0.15, 0.15, 0.01], dir: [0, 0, 1], warm: true },
  ],
  window: [
    { from: [-0.07, 0.12, 0.37], spread: [0.4, 0.1, 0.01], dir: [0, 0.15, 1], warm: false },
    { from: [0, 0, -0.37], spread: [0.3, 0.25, 0.01], dir: [0, 0.1, -1], warm: true },
  ],
  vrf: [{ from: [0, 0.84, 0], spread: [0.5, 0.01, 0.5], dir: [0, 1, 0], warm: true }],
  packaged: [{ from: [0, 0.44, -0.14], spread: [1.1, 0.01, 0.4], dir: [0, 1, 0], warm: true }],
  ducted: [{ from: [0, 0, 0.42], spread: [0.86, 0.18, 0.01], dir: [0, 0, 1], warm: false }],
  cassette: [
    { from: [0, 0.13, 0.33], spread: [0.5, 0.01, 0.01], dir: [0, 0.6, 1], warm: false },
    { from: [0, 0.13, -0.33], spread: [0.5, 0.01, 0.01], dir: [0, 0.6, -1], warm: false },
    { from: [0.33, 0.13, 0], spread: [0.01, 0.01, 0.5], dir: [1, 0.6, 0], warm: false },
    { from: [-0.33, 0.13, 0], spread: [0.01, 0.01, 0.5], dir: [-1, 0.6, 0], warm: false },
  ],
};

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
        pos[i * 3 + 1] = s.from[1] + b * s.spread[1] + dir.y * t * reach + (s.warm ? 0 : -t * t * 0.08);
        pos[i * 3 + 2] = s.from[2] + c * s.spread[2] + dir.z * t * reach + c * t * 0.15;
      }
      geo.attributes.position.needsUpdate = true;
    });
  });
  return (
    <>
      {groups.map(({ s, geo }, i) => (
        <points key={i} geometry={geo}>
          <pointsMaterial size={0.018} color={s.warm ? '#fb923c' : '#7dd3fc'} transparent opacity={0.75} depthWrite={false} sizeAttenuation />
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

function Stage({ kind, brand, motionRef, parts, picked, onPick, labelOf, pinRoot }: { pinRoot: RefObject<HTMLDivElement | null>; kind: UnitKind; brand: Brand; motionRef: MotionRef; parts: PartId[]; picked: number | null; onPick: (i: number) => void; labelOf: (i: number) => string }) {
  const Model = MODELS[kind];
  const s = fitScale(kind);
  const lift = kind === 'wall' ? 0.25 : 0;
  return (
    <group scale={s} position={[kind === 'wall' ? -0.5 : kind === 'floor' ? -0.35 : 0, lift, 0]}>
      <Model brand={brand} motionRef={motionRef} />
      <Airflow kind={kind} motionRef={motionRef} />
      {picked !== null && <Highlight a={anchorOf(kind, parts[picked])} color={brand.accent} />}
      {parts.map((part, i) => {
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
  const [brandId, setBrandId] = useState<BrandId>(k.commercial ? 'trane' : 'daikin');
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

  const name = en ? item?.nameEn : item?.nameTaglish;
  const fmt = (n: number) => n.toLocaleString('en-US');

  const stats = [
    { icon: <Zap className="w-3.5 h-3.5" />, label: en ? 'Cooling capacity' : 'Lakas ng lamig', value: `${fmt(spec.btu)} BTU/h`, sub: `${spec.kw} kW` },
    { icon: <Wind className="w-3.5 h-3.5" />, label: en ? 'Airflow (now)' : 'Hangin (ngayon)', value: `${fmt(airNow)} m³/h`, sub: `${en ? 'max' : 'max'} ${fmt(spec.airflow)}` },
    { icon: <Gauge className="w-3.5 h-3.5" />, label: en ? 'Fan speed (now)' : 'Bilis ng fan', value: `${fmt(rpmNow)} rpm`, sub: `${en ? 'step' : 'level'} ${lvl}/${steps}` },
    { icon: <Gauge className="w-3.5 h-3.5" />, label: en ? 'Sound level' : 'Ingay', value: `${noiseNow} dBA`, sub: `${spec.noiseLow}–${spec.noiseHigh} dBA` },
  ];
  const rows: [string, string][] = [
    [spec.effUnit === 'CSPF' ? 'CSPF' : 'EER', `${spec.eff.toFixed(2)}${spec.effUnit === 'EER' ? ' W/W' : ''}`],
    [en ? 'Compressor' : 'Compressor', spec.compressor],
    [en ? 'Refrigerant' : 'Refrigerant', spec.refrigerant],
    [en ? 'Inverter' : 'Inverter', spec.inverter ? (en ? 'Yes' : 'Oo') : en ? 'No (fixed speed)' : 'Hindi (fixed speed)'],
    ...(spec.throwM ? ([[en ? 'Air throw' : 'Abot ng hangin', `up to ${spec.throwM} m`]] as [string, string][]) : []),
    [en ? 'Warranty' : 'Warranty', spec.warranty],
    [en ? 'Indicative price' : 'Tinatayang presyo', item?.priceEstimatePhp ?? '—'],
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
            <div ref={pinRoot} className="ai-pins" />
            <Canvas shadows resize={{ offsetSize: true }} dpr={[1, 2]} camera={{ position: narrow ? [2.1, 1.1, 3.9] : [1.5, 0.8, 2.7], fov: 36 }} gl={{ antialias: true, alpha: true }}>
              <hemisphereLight args={['#e0f2fe', '#0b1220', 0.75]} />
              <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
              <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#93c5fd" />
              <pointLight position={[0, 1.5, 2]} intensity={0.6} color={brand.accent} />
              <group key={spinKey}>
                <Stage
                  pinRoot={pinRoot}
                  kind={kind}
                  brand={brand}
                  motionRef={motionRef}
                  parts={features.map((f) => f.part)}
                  picked={picked}
                  onPick={setPicked}
                  labelOf={(i) => (en ? features[i].nameEn : features[i].nameTl)}
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
            <div className="ai-stage-bar">
              <span>{en ? 'Drag to turn · scroll to zoom' : 'I-drag para iikot · scroll para mag-zoom'}</span>
              <button type="button" className="ai-icon-btn" onClick={() => setSpinKey((n) => n + 1)} aria-label={en ? 'Reset view' : 'I-reset ang view'}>
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ── Data ── */}
          <div className="ai-panel">
            <button ref={closeBtn} type="button" className="ai-close" onClick={onClose} aria-label={en ? 'Close' : 'Isara'}>
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <p className="ai-eyebrow">
              {en ? k.labelEn : k.labelTl} · {target.variant}
            </p>
            <h2 id="ai-title" className="ai-title">
              {brand.name} <span>{name}</span>
            </h2>

            <div className="ai-brands" role="tablist" aria-label={en ? 'Brand' : 'Brand'}>
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
                <span>{en ? 'Fan speed' : 'Bilis ng fan'}</span>
                <span>{lvl === steps ? (en ? 'Turbo' : 'Turbo') : lvl === 1 ? (en ? 'Quiet' : 'Tahimik') : `${en ? 'Step' : 'Level'} ${lvl}`}</span>
              </div>
              <div className="ai-steps" role="radiogroup" aria-label={en ? 'Fan speed' : 'Bilis ng fan'}>
                {Array.from({ length: steps }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={lvl === i + 1}
                    aria-label={`${en ? 'Step' : 'Level'} ${i + 1}`}
                    className={`ai-step${i < lvl ? ' is-on' : ''}`}
                    style={{ height: `${10 + (i / Math.max(steps - 1, 1)) * 18}px` }}
                    onClick={() => setLevel(i + 1)}
                  />
                ))}
              </div>
            </div>

            <h3 className="ai-h3">{en ? 'What makes it different' : 'Ano ang kakaiba'}</h3>
            <ol className="ai-parts">
              {features.map((f, i) => (
                <li key={`${brandId}${i}`}>
                  <button type="button" className={`ai-part${picked === i ? ' is-on' : ''}`} onClick={() => setPicked(picked === i ? null : i)} aria-pressed={picked === i}>
                    <span className="ai-part-n">{i + 1}</span>
                    <span>
                      <strong>{en ? f.nameEn : f.nameTl}</strong>
                      <AnimatePresence initial={false}>
                        {picked === i && (
                          <motion.span className="ai-part-t" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            {en ? f.textEn : f.textTl}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <dl className="ai-rows">
              {rows.map(([t, d]) => (
                <div key={t}>
                  <dt>{t}</dt>
                  <dd>{d}</dd>
                </div>
              ))}
            </dl>
            <p className="ai-note">
              {en
                ? `Typical ${brand.name} figures for this size, for comparison. Exact ratings depend on the model; we confirm them on the data sheet with your quote.`
                : `Karaniwang figures ng ${brand.name} sa ganitong laki, pang-kumpara. Nakadepende sa model ang eksaktong rating; kinukumpirma namin sa data sheet kasama ng quote.`}
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
              {en ? `Get a quote for this ${brand.id === 'mitsubishi' ? 'Mitsubishi' : brand.name}` : `Magpa-quote ng ${brand.id === 'mitsubishi' ? 'Mitsubishi' : brand.name}`}
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

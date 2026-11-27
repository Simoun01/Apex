import { RoundedBox } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { BRANDS } from '../../data/airconBrands';
import type { BrandId } from '../../data/airconBrands';
import { MODELS } from './airconModels';
import {
  createBrickMaps,
  createFabricWeaveMaps,
  createMatteWallBumpMap,
  createTileFloorMaps,
  createWoodGrainMaps,
} from './hvacSceneUtils';

/* ============================================================================
   Hero room sets.
   Each home-page slide is a different part of a house with the unit the slide
   talks about actually installed in it: a living room, a bedroom, a kitchen and
   dining area, a loft home office, and a shop floor. They are built from simple
   volumes with real materials — brick, plaster, oak, ceramic, fabric — lit like
   an interior photograph, and rendered once to a still image by HeroRoomStudio.

   Scale is metres. The camera looks into the back-left corner of each room, so
   furniture sits between x -3.4 … 3.4 and z -3 … 2.
   ============================================================================ */

export type RoomId = 'living-room' | 'bedroom' | 'clean-installs' | 'lofts' | 'floor-standing';

const W = 7.4; // room width
const H = 2.95; // ceiling height
const D = 6.2; // room depth

/* ── Materials ─────────────────────────────────────────────────────────────── */

function useRoomMaterials(variant: RoomId) {
  const mats = useMemo(() => {
    const wallBump = createMatteWallBumpMap();
    const oak = createWoodGrainMaps();
    const tile = createTileFloorMaps('#d9d2c7', '#b3aa9c', 9);
    const brick = createBrickMaps();
    const weave = createFabricWeaveMaps();

    const plaster = new THREE.MeshStandardMaterial({
      color: variant === 'bedroom' ? '#e9edf2' : '#ebe7e0',
      roughness: 0.95,
      bumpMap: wallBump,
      bumpScale: 0.006,
    });
    const brickWall = new THREE.MeshStandardMaterial({
      map: brick.map,
      roughnessMap: brick.roughnessMap,
      normalMap: brick.normalMap,
      normalScale: new THREE.Vector2(1.3, 1.3),
      roughness: 1,
    });
    const floorWood = new THREE.MeshPhysicalMaterial({
      map: oak.map,
      roughnessMap: oak.roughnessMap,
      color: variant === 'bedroom' ? '#c4a687' : '#b98f62',
      roughness: 0.5,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
    });
    const floorTile = new THREE.MeshPhysicalMaterial({
      map: tile.map,
      roughnessMap: tile.roughnessMap,
      normalMap: tile.normalMap,
      roughness: 0.4,
      clearcoat: 0.5,
      clearcoatRoughness: 0.25,
    });
    const ceiling = new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.98 });
    const frame = new THREE.MeshStandardMaterial({ color: '#232a33', roughness: 0.4, metalness: 0.6 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#9fc4e8',
      roughness: 0.08,
      metalness: 0,
      transmission: 0.6,
      thickness: 0.02,
      transparent: true,
      opacity: 0.55,
    });
    const dusk = new THREE.MeshBasicMaterial({ color: '#cfe2f3', toneMapped: false });
    const oakWarm = new THREE.MeshPhysicalMaterial({
      map: oak.map,
      roughnessMap: oak.roughnessMap,
      color: '#c89b6b',
      roughness: 0.45,
      clearcoat: 0.4,
    });
    const fabric = new THREE.MeshPhysicalMaterial({
      map: weave.map,
      color: variant === 'bedroom' ? '#8d99a9' : '#5d6b7d',
      roughness: 0.95,
      sheen: 0.7,
      sheenColor: new THREE.Color('#c7d2de'),
    });
    const linen = new THREE.MeshPhysicalMaterial({ color: '#eef1f5', roughness: 0.92, sheen: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2b313a', roughness: 0.55, metalness: 0.2 });
    const metal = new THREE.MeshStandardMaterial({ color: '#aeb6c0', roughness: 0.35, metalness: 0.85 });
    const stone = new THREE.MeshPhysicalMaterial({ color: '#e7e9ec', roughness: 0.3, clearcoat: 0.6 });
    const plant = new THREE.MeshStandardMaterial({ color: '#35613a', roughness: 0.9 });
    const screen = new THREE.MeshStandardMaterial({
      color: '#0d1626',
      emissive: new THREE.Color('#2b6fb5'),
      emissiveIntensity: 0.5,
      roughness: 0.25,
    });
    const lamp = new THREE.MeshBasicMaterial({ color: '#ffeccf', toneMapped: false });

    return {
      plaster,
      brickWall,
      floorWood,
      floorTile,
      ceiling,
      frame,
      glass,
      dusk,
      oakWarm,
      fabric,
      linen,
      dark,
      metal,
      stone,
      plant,
      screen,
      lamp,
      _tex: [wallBump, oak.map, oak.roughnessMap, tile.map, tile.roughnessMap, tile.normalMap, brick.map, brick.roughnessMap, brick.normalMap, weave.map],
    };
  }, [variant]);

  useEffect(
    () => () => {
      Object.entries(mats).forEach(([k, v]) => {
        if (k === '_tex') return;
        (v as THREE.Material).dispose();
      });
      mats._tex.forEach((t) => t.dispose());
    },
    [mats],
  );

  return mats;
}

type Mats = ReturnType<typeof useRoomMaterials>;

/* ── Building blocks ───────────────────────────────────────────────────────── */

function B({ p, s, m, rot, r = 0.012 }: { p: [number, number, number]; s: [number, number, number]; m: THREE.Material; rot?: [number, number, number]; r?: number }) {
  return (
    <RoundedBox args={s} radius={Math.min(r, Math.min(...s) / 2.2)} smoothness={3} position={p} rotation={rot} castShadow receiveShadow material={m} />
  );
}

/** Back wall with a wide dark-framed window and a cool dusk sky behind it. */
function WindowWall({ m, x = 0, width = 3.1 }: { m: Mats; x?: number; width?: number }) {
  const y = 1.55;
  const h = 1.6;
  const t = 0.07;
  return (
    <group position={[x, 0, -D / 2 + 0.06]}>
      {/* sky panel behind the opening */}
      <mesh position={[0, y, -0.14]}>
        <planeGeometry args={[width - 0.1, h - 0.1]} />
        <primitive object={m.dusk} attach="material" />
      </mesh>
      <mesh position={[0, y, -0.05]}>
        <planeGeometry args={[width - 0.14, h - 0.14]} />
        <primitive object={m.glass} attach="material" />
      </mesh>
      {/* frame */}
      <B p={[0, y + h / 2, 0]} s={[width, t, 0.1]} m={m.frame} />
      <B p={[0, y - h / 2, 0]} s={[width, t, 0.1]} m={m.frame} />
      <B p={[-width / 2, y, 0]} s={[t, h, 0.1]} m={m.frame} />
      <B p={[width / 2, y, 0]} s={[t, h, 0.1]} m={m.frame} />
      {[-width / 6, width / 6].map((mx) => (
        <B key={mx} p={[mx, y, 0]} s={[0.045, h, 0.09]} m={m.frame} />
      ))}
      {/* sill */}
      <B p={[0, y - h / 2 - 0.06, 0.07]} s={[width + 0.18, 0.06, 0.22]} m={m.oakWarm} />
    </group>
  );
}

/** Floor, walls, ceiling and ceiling spots. */
function Shell({ m, accentWall, floor }: { m: Mats; accentWall: 'brick' | 'plaster'; floor: 'wood' | 'tile' }) {
  const floorMat = floor === 'wood' ? m.floorWood : m.floorTile;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow material={m.ceiling}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* back wall */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow material={m.plaster}>
        <planeGeometry args={[W, H]} />
      </mesh>
      {/* right wall: the accent wall the camera faces */}
      <mesh
        position={[W / 2, H / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
        material={accentWall === 'brick' ? m.brickWall : m.plaster}
      >
        <planeGeometry args={[D, H]} />
      </mesh>
      {/* left wall, mostly out of frame but it bounces light */}
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow material={m.plaster}>
        <planeGeometry args={[D, H]} />
      </mesh>
      {/* skirting */}
      <B p={[0, 0.05, -D / 2 + 0.03]} s={[W, 0.1, 0.03]} m={m.linen} />
      {/* ceiling track spots */}
      {[-1.5, 0.2, 1.9].map((x) => (
        <group key={x} position={[x, H - 0.02, -1.1]}>
          <B p={[0, -0.05, 0]} s={[0.34, 0.08, 0.1]} m={m.dark} r={0.03} />
          <mesh position={[0, -0.1, 0.03]} rotation={[0.5, 0, 0]} material={m.lamp}>
            <cylinderGeometry args={[0.045, 0.055, 0.05, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Wall-mounted split, installed high on the wall like a real fit-out. */
function WallUnit({ brandId, position, rotation }: { brandId: BrandId; position: [number, number, number]; rotation?: [number, number, number] }) {
  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];
  const Model = MODELS.wall;
  return (
    <group position={position} rotation={rotation} scale={0.92}>
      <Model brand={brand} />
    </group>
  );
}

/* ── Furniture ─────────────────────────────────────────────────────────────── */

function Sofa({ m, p, rot }: { m: Mats; p: [number, number, number]; rot?: [number, number, number] }) {
  return (
    <group position={p} rotation={rot}>
      <B p={[0, 0.2, 0]} s={[2.3, 0.32, 0.9]} m={m.fabric} r={0.06} />
      <B p={[0, 0.52, -0.33]} s={[2.3, 0.56, 0.22]} m={m.fabric} r={0.08} />
      <B p={[-1.08, 0.46, 0]} s={[0.22, 0.42, 0.9]} m={m.fabric} r={0.08} />
      <B p={[1.08, 0.46, 0]} s={[0.22, 0.42, 0.9]} m={m.fabric} r={0.08} />
      {[-0.6, 0.6].map((x) => (
        <B key={x} p={[x, 0.55, -0.2]} s={[0.46, 0.46, 0.14]} m={m.linen} r={0.06} rot={[0.18, 0, 0]} />
      ))}
      {[-1.0, 1.0].map((x) =>
        [-0.32, 0.32].map((z) => <B key={`${x}${z}`} p={[x, 0.03, z]} s={[0.07, 0.07, 0.07]} m={m.dark} />),
      )}
    </group>
  );
}

function CoffeeTable({ m, p }: { m: Mats; p: [number, number, number] }) {
  return (
    <group position={p}>
      <B p={[0, 0.4, 0]} s={[1.1, 0.06, 0.6]} m={m.oakWarm} r={0.02} />
      {[-0.48, 0.48].map((x) =>
        [-0.24, 0.24].map((z) => <B key={`${x}${z}`} p={[x, 0.19, z]} s={[0.05, 0.38, 0.05]} m={m.dark} />),
      )}
      <B p={[0.18, 0.45, 0.06]} s={[0.22, 0.04, 0.16]} m={m.linen} r={0.01} />
    </group>
  );
}

/** The slatted oak credenza that runs under the window. */
function Credenza({ m, p, len = 3.2 }: { m: Mats; p: [number, number, number]; len?: number }) {
  const slats = Math.floor(len / 0.11);
  return (
    <group position={p}>
      <B p={[0, 0.3, 0]} s={[len, 0.6, 0.46]} m={m.oakWarm} r={0.02} />
      {Array.from({ length: slats }, (_, i) => (
        <B key={i} p={[-len / 2 + 0.06 + i * 0.11, 0.3, 0.24]} s={[0.055, 0.56, 0.035]} m={m.oakWarm} r={0.012} />
      ))}
      <B p={[0, 0.615, 0]} s={[len + 0.06, 0.03, 0.5]} m={m.oakWarm} r={0.01} />
    </group>
  );
}

function Rug({ m, p, s }: { m: Mats; p: [number, number, number]; s: [number, number] }) {
  return (
    <mesh position={[p[0], 0.008, p[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={m.linen}>
      <planeGeometry args={s} />
    </mesh>
  );
}

function Bed({ m, p }: { m: Mats; p: [number, number, number] }) {
  return (
    <group position={p}>
      <B p={[0, 0.22, 0]} s={[1.95, 0.36, 2.15]} m={m.dark} r={0.03} />
      <B p={[0, 0.5, -0.02]} s={[1.86, 0.26, 2.0]} m={m.linen} r={0.07} />
      <B p={[0, 0.74, -1.02]} s={[1.98, 0.9, 0.16]} m={m.fabric} r={0.08} />
      {[-0.46, 0.46].map((x) => (
        <B key={x} p={[x, 0.68, -0.78]} s={[0.72, 0.18, 0.4]} m={m.linen} r={0.08} rot={[-0.22, 0, 0]} />
      ))}
      <B p={[0, 0.64, 0.5]} s={[1.9, 0.05, 1.0]} m={m.fabric} r={0.02} />
      {[-1.35, 1.35].map((x) => (
        <group key={x} position={[x, 0, -0.75]}>
          <B p={[0, 0.25, 0]} s={[0.5, 0.5, 0.42]} m={m.oakWarm} r={0.02} />
          <mesh position={[0, 0.62, 0]} material={m.lamp}>
            <sphereGeometry args={[0.1, 14, 14]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function KitchenRun({ m, p, len = 3.4 }: { m: Mats; p: [number, number, number]; len?: number }) {
  const doors = Math.max(2, Math.round(len / 0.62));
  return (
    <group position={p}>
      {/* base units + worktop */}
      <B p={[0, 0.44, 0]} s={[len, 0.88, 0.62]} m={m.linen} r={0.01} />
      <B p={[0, 0.9, 0.01]} s={[len + 0.04, 0.045, 0.66]} m={m.stone} r={0.01} />
      {Array.from({ length: doors }, (_, i) => (
        <B key={i} p={[-len / 2 + len / doors / 2 + (i * len) / doors, 0.44, 0.32]} s={[len / doors - 0.03, 0.82, 0.02]} m={m.linen} r={0.01} />
      ))}
      {/* wall units */}
      <B p={[0, 1.95, -0.12]} s={[len, 0.7, 0.36]} m={m.linen} r={0.01} />
      <B p={[0, 1.42, 0.0]} s={[len, 0.34, 0.03]} m={m.stone} r={0.005} />
      {/* handles */}
      {Array.from({ length: doors }, (_, i) => (
        <B key={`h${i}`} p={[-len / 2 + len / doors / 2 + (i * len) / doors, 0.78, 0.34]} s={[len / doors - 0.18, 0.02, 0.02]} m={m.metal} r={0.008} />
      ))}
    </group>
  );
}

function DiningSet({ m, p }: { m: Mats; p: [number, number, number] }) {
  return (
    <group position={p}>
      <B p={[0, 0.74, 0]} s={[1.9, 0.055, 0.95]} m={m.dark} r={0.015} />
      {[-0.86, 0.86].map((x) =>
        [-0.4, 0.4].map((z) => <B key={`${x}${z}`} p={[x, 0.37, z]} s={[0.05, 0.72, 0.05]} m={m.metal} />),
      )}
      {[-0.55, 0.55].map((x) =>
        [-0.78, 0.78].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]} rotation={[0, z > 0 ? Math.PI : 0, 0]}>
            <B p={[0, 0.45, 0]} s={[0.44, 0.05, 0.44]} m={m.oakWarm} r={0.015} />
            <B p={[0, 0.7, -0.2]} s={[0.42, 0.46, 0.05]} m={m.oakWarm} r={0.03} />
            {[-0.18, 0.18].map((cx) =>
              [-0.18, 0.18].map((cz) => <B key={`${cx}${cz}`} p={[cx, 0.22, cz]} s={[0.035, 0.44, 0.035]} m={m.metal} />),
            )}
          </group>
        )),
      )}
      <B p={[0, 0.8, 0]} s={[0.16, 0.14, 0.16]} m={m.linen} r={0.04} />
    </group>
  );
}

function Desk({ m, p }: { m: Mats; p: [number, number, number] }) {
  return (
    <group position={p}>
      <B p={[0, 0.73, 0]} s={[1.7, 0.05, 0.72]} m={m.oakWarm} r={0.012} />
      {[-0.78, 0.78].map((x) => (
        <B key={x} p={[x, 0.36, 0]} s={[0.05, 0.7, 0.62]} m={m.metal} />
      ))}
      {/* monitor */}
      <B p={[0, 0.79, -0.18]} s={[0.2, 0.06, 0.16]} m={m.dark} r={0.01} />
      <B p={[0, 0.98, -0.2]} s={[0.06, 0.34, 0.06]} m={m.dark} r={0.01} />
      <B p={[0, 1.26, -0.2]} s={[1.0, 0.42, 0.03]} m={m.dark} r={0.01} />
      <mesh position={[0, 1.26, -0.183]} material={m.screen}>
        <planeGeometry args={[0.95, 0.37]} />
      </mesh>
      {/* chair */}
      <group position={[0, 0, 0.72]}>
        <B p={[0, 0.46, 0]} s={[0.5, 0.07, 0.5]} m={m.fabric} r={0.03} />
        <B p={[0, 0.78, 0.22]} s={[0.48, 0.56, 0.07]} m={m.fabric} r={0.04} />
        <B p={[0, 0.23, 0]} s={[0.06, 0.42, 0.06]} m={m.metal} />
        <B p={[0, 0.04, 0]} s={[0.56, 0.05, 0.56]} m={m.dark} r={0.02} />
      </group>
    </group>
  );
}

function Shelf({ m, p }: { m: Mats; p: [number, number, number] }) {
  return (
    <group position={p}>
      <B p={[0, 1.0, 0]} s={[1.5, 2.0, 0.34]} m={m.linen} r={0.01} />
      {[0.42, 0.86, 1.3, 1.74].map((y) => (
        <B key={y} p={[0, y, 0.02]} s={[1.44, 0.03, 0.32]} m={m.oakWarm} r={0.005} />
      ))}
      {[-0.45, 0.1, 0.52].map((x, i) => (
        <B key={x} p={[x, 0.98 + (i % 2) * 0.44, 0.06]} s={[0.1, 0.26, 0.2]} m={i % 2 ? m.dark : m.fabric} r={0.01} />
      ))}
    </group>
  );
}

function Counter({ m, p }: { m: Mats; p: [number, number, number] }) {
  return (
    <group position={p}>
      <B p={[0, 0.52, 0]} s={[2.6, 1.04, 0.66]} m={m.linen} r={0.015} />
      <B p={[0, 1.06, 0.02]} s={[2.72, 0.06, 0.74]} m={m.stone} r={0.012} />
      <B p={[0, 0.52, 0.34]} s={[2.4, 0.9, 0.02]} m={m.oakWarm} r={0.01} />
      {[-0.8, 0.8].map((x) => (
        <group key={x} position={[x, 0, 0.95]}>
          <B p={[0, 0.66, 0]} s={[0.36, 0.05, 0.36]} m={m.dark} r={0.02} />
          <B p={[0, 0.33, 0]} s={[0.05, 0.62, 0.05]} m={m.metal} />
          <B p={[0, 0.03, 0]} s={[0.36, 0.04, 0.36]} m={m.metal} r={0.015} />
        </group>
      ))}
    </group>
  );
}

function Plant({ m, p, h = 1.1 }: { m: Mats; p: [number, number, number]; h?: number }) {
  return (
    <group position={p}>
      <B p={[0, 0.17, 0]} s={[0.34, 0.34, 0.34]} m={m.stone} r={0.04} />
      <B p={[0, 0.34 + h * 0.3, 0]} s={[0.045, h * 0.6, 0.045]} m={m.plant} />
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 1.9) * 0.2, 0.34 + h * (0.55 + (i % 3) * 0.14), Math.cos(i * 1.9) * 0.18]}
          rotation={[0.3 + i * 0.2, i * 1.3, 0.4]}
          castShadow
          material={m.plant}
        >
          <sphereGeometry args={[0.2, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}

/** Neat-install detail: bracket, lineset trunking and the drain run down the wall. */
function Trunking({ m, from, down = 1.0 }: { m: Mats; from: [number, number, number]; down?: number }) {
  return (
    <group position={from}>
      <B p={[0, -down / 2, 0]} s={[0.1, down, 0.07]} m={m.linen} r={0.01} />
      <B p={[0, 0.02, 0]} s={[0.12, 0.09, 0.08]} m={m.linen} r={0.015} />
    </group>
  );
}

/* ── The five rooms ────────────────────────────────────────────────────────── */

export function HeroRoom({ id, brandId }: { id: RoomId; brandId: BrandId }) {
  const m = useRoomMaterials(id);

  const rooms: Record<RoomId, ReactNode> = {
    /* 1 — Living room: brick accent wall, slatted credenza under the window */
    'living-room': (
      <>
        <Shell m={m} accentWall="brick" floor="wood" />
        <WindowWall m={m} x={-0.2} width={3.0} />
        <Credenza m={m} p={[-0.2, 0, -2.84]} len={3.3} />
        <Rug m={m} p={[-0.8, 0, -0.6]} s={[3.2, 2.3]} />
        {/* Sofa along the left wall, out of the lens, facing the brick wall */}
        <Sofa m={m} p={[-2.6, 0, -0.6]} rot={[0, Math.PI / 2, 0]} />
        <CoffeeTable m={m} p={[-0.9, 0, -0.6]} />
        <Plant m={m} p={[2.6, 0, -2.4]} h={1.3} />
        {/* On the brick wall: body depth 0.28, so the back sits flush at x 3.7 */}
        <WallUnit brandId={brandId} position={[3.55, 2.35, -1.3]} rotation={[0, -Math.PI / 2, 0]} />
        <Trunking m={m} from={[3.64, 2.2, -0.76]} down={0.95} />
      </>
    ),

    /* 2 — Bedroom: the unit sits above the headboard wall */
    bedroom: (
      <>
        <Shell m={m} accentWall="plaster" floor="wood" />
        <WindowWall m={m} x={2.1} width={2.3} />
        {/* Headboard against the back wall */}
        <Bed m={m} p={[-0.9, 0, -1.95]} />
        <Rug m={m} p={[-0.9, 0, 0.3]} s={[3.0, 1.8]} />
        <Plant m={m} p={[2.9, 0, -0.6]} h={1.0} />
        <WallUnit brandId={brandId} position={[-0.9, 2.45, -2.95]} />
        <Trunking m={m} from={[-0.34, 2.3, -3.06]} down={0.72} />
      </>
    ),

    /* 3 — Clean installs: kitchen and dining, trunking and bracket on show */
    'clean-installs': (
      <>
        <Shell m={m} accentWall="plaster" floor="tile" />
        <WindowWall m={m} x={2.35} width={2.1} />
        <KitchenRun m={m} p={[-1.5, 0, -2.82]} len={3.6} />
        <DiningSet m={m} p={[0.5, 0, 0.2]} />
        <Plant m={m} p={[3.0, 0, -1.4]} h={1.2} />
        {/* Clear of the wall units below and the window to its right */}
        <WallUnit brandId={brandId} position={[0.85, 2.6, -2.95]} />
        <Trunking m={m} from={[1.4, 2.45, -3.06]} down={1.5} />
      </>
    ),

    /* 4 — Loft / home office */
    lofts: (
      <>
        <Shell m={m} accentWall="brick" floor="wood" />
        <WindowWall m={m} x={-1.5} width={2.5} />
        <Desk m={m} p={[-1.5, 0, -2.4]} />
        <Shelf m={m} p={[2.5, 0, -2.93]} />
        <Rug m={m} p={[-0.8, 0, 0.2]} s={[3.0, 2.0]} />
        <Plant m={m} p={[0.7, 0, -1.2]} h={1.15} />
        {/* Back wall, between the window and the shelving, where the camera sees it */}
        <WallUnit brandId={brandId} position={[1.1, 2.5, -2.95]} />
        <Trunking m={m} from={[1.65, 2.35, -3.06]} down={1.45} />
      </>
    ),

    /* 5 — Shop / office floor with a floor-standing tower */
    'floor-standing': (
      <>
        <Shell m={m} accentWall="plaster" floor="tile" />
        <WindowWall m={m} x={-1.7} width={3.0} />
        <Counter m={m} p={[-1.4, 0, -2.5]} />
        <Shelf m={m} p={[1.5, 0, -2.93]} />
        <Plant m={m} p={[0.3, 0, -1.6]} h={1.35} />
        <group position={[2.55, 0.9, -0.9]} rotation={[0, -Math.PI / 2.4, 0]} scale={1.02}>
          {(() => {
            const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];
            const Floor = MODELS.floor;
            return <Floor brand={brand} />;
          })()}
        </group>
      </>
    ),
  };

  return <group>{rooms[id]}</group>;
}

import { useEffect, useMemo, useRef } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHVACStore } from '../../store/useHVACStore';
import {
  createAsphaltMaps,
  createBrushedMetalMaps,
  createConcreteMaps,
  createGrassMaps,
  createRadialFalloffTexture,
} from './hvacSceneUtils';
import { CommercialBuilding, ResidentialHouse } from './StreetBuildings';

const GOLDEN_HOUR_VERTEX = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const GOLDEN_HOUR_FRAGMENT = /* glsl */ `
  varying vec3 vWorldPos;
  uniform vec3 uSunDir;

  void main() {
    vec3 dir = normalize(vWorldPos);
    float h = clamp(dir.y, -0.15, 1.0);

    vec3 nadir = vec3(0.05, 0.08, 0.13);
    vec3 horizon = vec3(0.86, 0.55, 0.34);
    vec3 midDusk = vec3(0.33, 0.26, 0.37);
    vec3 zenith = vec3(0.043, 0.122, 0.227); // #0B1F3A

    vec3 col = mix(nadir, horizon, smoothstep(-0.12, 0.04, h));
    col = mix(col, midDusk, smoothstep(0.03, 0.24, h));
    col = mix(col, zenith, smoothstep(0.22, 0.68, h));

    // Warm golden-hour solar scatter along low western horizon
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float sunGlow = pow(sunDot, 12.0) * 0.55 + pow(sunDot, 96.0) * 0.85;
    float horizonMask = smoothstep(-0.05, 0.38, h) * (1.0 - smoothstep(0.38, 0.85, h));
    col += vec3(1.0, 0.72, 0.42) * sunGlow * (0.4 + 0.5 * horizonMask);

    // Thin haze band just above the land, the way real dusk air scatters
    col = mix(col, vec3(0.42, 0.40, 0.44), smoothstep(0.12, -0.02, h) * 0.35);

    // Dither: breaks up the banding that makes a smooth sky look like a poster
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Soft dark patch on the ground: anchors a volume even with shadows off. */
function GroundShadow({ at, size, opacity = 0.5, tex }: { at: [number, number, number]; size: [number, number]; opacity?: number; tex: THREE.CanvasTexture }) {
  return (
    <mesh position={at} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Warm pool of lamplight on the pavement, additive so it reads at dusk. */
function LightPool({ at, size, opacity = 0.5, tex }: { at: [number, number, number]; size: [number, number]; opacity?: number; tex: THREE.CanvasTexture }) {
  return (
    <mesh position={at} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

/* ============================================================================
   Planting.
   Real shrubs and trees are lumpy, uneven and many-toned. A single smooth
   dodecahedron reads as a toy, so every bush and canopy here is a cluster of
   noise-displaced spheres in slightly different greens, sitting on a short
   trunk or mulch ring.
   ============================================================================ */

function seeded(seed: number) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Sphere with its vertices pushed in and out, so the silhouette is irregular. */
function useLumpyGeometry(radius: number, seed: number, amount = 0.26, detail = 1) {
  return useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const pos = geo.attributes.position;
    const rand = seeded(seed);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = 1 + (rand() - 0.5) * 2 * amount;
      v.multiplyScalar(n);
      // squash very slightly so nothing looks like a perfect ball
      v.y *= 0.88 + rand() * 0.2;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, [radius, seed, amount, detail]);
}

function Lump({ radius, seed, color, position, detail = 1 }: { radius: number; seed: number; color: string; position: [number, number, number]; detail?: number }) {
  const geo = useLumpyGeometry(radius, seed, 0.3, detail);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={position} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.96} metalness={0} flatShading={false} />
    </mesh>
  );
}

const LEAF_GREENS = ['#36512f', '#2c4529', '#405f33', '#2a3d24', '#4a6b39'];

/** A low garden shrub: three or four overlapping lumps over a soil ring. */
function Shrub({ position, scale = 1, seed, quality }: { position: [number, number, number]; scale?: number; seed: number; quality: 'low' | 'medium' | 'high' }) {
  const rand = useMemo(() => seeded(seed), [seed]);
  const lumps = useMemo(() => {
    const n = quality === 'low' ? 2 : quality === 'medium' ? 3 : 4;
    return Array.from({ length: n }, (_, i) => ({
      r: (0.2 + rand() * 0.14) * scale,
      p: [(rand() - 0.5) * 0.34 * scale, (0.1 + rand() * 0.16) * scale, (rand() - 0.5) * 0.3 * scale] as [number, number, number],
      c: LEAF_GREENS[Math.floor(rand() * LEAF_GREENS.length)],
      s: seed + i * 977,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, scale, quality]);

  return (
    <group position={position}>
      {/* mulch / soil ring, so the planting meets the ground instead of floating */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[0.32 * scale, 16]} />
        <meshStandardMaterial color="#3a2f26" roughness={0.98} />
      </mesh>
      {lumps.map((l, i) => (
        <Lump key={i} radius={l.r} seed={l.s} color={l.c} position={l.p} detail={quality === 'high' ? 2 : 1} />
      ))}
    </group>
  );
}

/** A small ornamental tree: tapered trunk, a few boughs, a clustered canopy. */
function Tree({ position, height = 2.4, seed, quality }: { position: [number, number, number]; height?: number; seed: number; quality: 'low' | 'medium' | 'high' }) {
  const rand = useMemo(() => seeded(seed), [seed]);
  const canopy = useMemo(() => {
    const n = quality === 'low' ? 2 : quality === 'medium' ? 4 : 6;
    return Array.from({ length: n }, (_, i) => ({
      r: height * (0.2 + rand() * 0.14),
      p: [(rand() - 0.5) * height * 0.5, height * (0.72 + rand() * 0.26), (rand() - 0.5) * height * 0.45] as [number, number, number],
      c: LEAF_GREENS[Math.floor(rand() * LEAF_GREENS.length)],
      s: seed + i * 613,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, height, quality]);

  return (
    <group position={position}>
      <mesh position={[0, height * 0.38, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[height * 0.035, height * 0.062, height * 0.78, quality === 'low' ? 5 : 8]} />
        <meshStandardMaterial color="#4a3a2c" roughness={0.95} />
      </mesh>
      {quality !== 'low' &&
        [0.5, -0.7].map((a, i) => (
          <mesh key={i} position={[Math.sin(a) * height * 0.12, height * 0.66, Math.cos(a) * height * 0.1]} rotation={[0.4 * (i ? -1 : 1), a, 0.5 * (i ? 1 : -1)]} castShadow>
            <cylinderGeometry args={[height * 0.016, height * 0.03, height * 0.3, 5]} />
            <meshStandardMaterial color="#4a3a2c" roughness={0.95} />
          </mesh>
        ))}
      {canopy.map((c, i) => (
        <Lump key={i} radius={c.r} seed={c.s} color={c.c} position={c.p} detail={quality === 'high' ? 2 : 1} />
      ))}
    </group>
  );
}

/** Concrete utility pole with a transformer and sagging service drops. */
function UtilityPole({ x, z, seed, quality, span }: { x: number; z: number; seed: number; quality: 'low' | 'medium' | 'high'; span: number }) {
  const h = 6.2;
  const wires = useMemo(() => {
    if (quality === 'low' || span <= 0) return [];
    const rand = seeded(seed);
    // Catenary-ish sag between this pole and the next one along the street.
    return [0, 1, 2].map((i) => {
      const y = h - 0.35 - i * 0.26;
      const sag = 0.34 + rand() * 0.16;
      const zo = (i - 1) * 0.16;
      const pts: THREE.Vector3[] = [];
      for (let t = 0; t <= 10; t++) {
        const u = t / 10;
        pts.push(new THREE.Vector3(x + u * span, y - Math.sin(u * Math.PI) * sag, z + zo));
      }
      return new THREE.CatmullRomCurve3(pts);
    });
  }, [x, z, seed, quality, span]);

  return (
    <group>
      <mesh position={[x, h / 2, z]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.13, h, quality === 'low' ? 6 : 10]} />
        <meshStandardMaterial color="#8d9299" roughness={0.93} />
      </mesh>
      {/* cross-arm */}
      <mesh position={[x, h - 0.3, z]} castShadow>
        <boxGeometry args={[0.1, 0.08, 1.5]} />
        <meshStandardMaterial color="#6b5a47" roughness={0.9} />
      </mesh>
      {/* transformer can */}
      <mesh position={[x - 0.22, h - 1.15, z]} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.52, quality === 'low' ? 6 : 12]} />
        <meshStandardMaterial color="#9aa2ab" roughness={0.62} metalness={0.35} />
      </mesh>
      {wires.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, quality === 'high' ? 14 : 8, 0.012, 4, false]} />
          <meshStandardMaterial color="#141820" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Faint animated heat-shimmer wisps above outdoor condenser units.
 * Pure procedural transparent planes with soft sin-wave ripple opacity + gentle vertical drift.
 */
function HeatShimmerPlume({
  position,
  width = 0.72,
  height = 0.75,
  count = 3,
}: {
  position: [number, number, number];
  width?: number;
  height?: number;
  count?: number;
}) {
  const reduceMotion = useHVACStore((s) => s.reduceMotion);
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  const planes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        offsetX: (i - (count - 1) / 2) * (width * 0.28),
        offsetZ: ((i % 2) - 0.5) * 0.16,
        phase: i * 1.9,
      })),
    [count, width],
  );

  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.getElapsedTime();
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = planes[i];
      const wave = Math.sin(t * 3.1 + p.phase);
      const lift = ((t * 0.55 + i * 0.33) % 1) * 0.24;
      mesh.position.y = height * 0.5 + lift;
      mesh.position.x = p.offsetX + wave * 0.035;
      mesh.scale.x = 0.92 + Math.sin(t * 4.4 + p.phase) * 0.12;
      mesh.scale.y = 0.9 + Math.cos(t * 3.7 + p.phase) * 0.1;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.045 + 0.035 * Math.sin(t * 5.0 + p.phase);
    });
  });

  if (reduceMotion) return null;

  return (
    <group position={position}>
      {planes.map((p, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          position={[p.offsetX, height * 0.5, p.offsetZ]}
          rotation={[0, idx * 0.45, 0]}
        >
          <planeGeometry args={[width * 0.6, height]} />
          <meshBasicMaterial
            color="#fed7aa"
            transparent
            opacity={0.06}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Spinning 3-blade condenser fan rotor.
 */
function ExteriorFanRotor({
  position,
  rotation = [0, 0, 0],
  radius = 0.24,
  speed = 5.5,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  radius?: number;
  speed?: number;
}) {
  const reduceMotion = useHVACStore((s) => s.reduceMotion);
  const rotorRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (reduceMotion || !rotorRef.current) return;
    rotorRef.current.rotation.z -= delta * speed;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={rotorRef}>
        <mesh>
          <cylinderGeometry args={[radius * 0.22, radius * 0.22, 0.04, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} metalness={0.7} />
        </mesh>
        {[0, 1, 2].map((idx) => (
          <group key={idx} rotation={[0, 0, (idx * Math.PI * 2) / 3]}>
            <mesh position={[radius * 0.46, 0, 0]} rotation={[0.35, 0, 0]}>
              <boxGeometry args={[radius * 0.72, radius * 0.24, 0.015]} />
              <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.45} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/**
 * Instanced perimeter fence posts & rails for the residential yard.
 */
function ResidentialFenceInstanced() {
  const postRef = useRef<THREE.InstancedMesh>(null);
  const posts = useMemo(() => {
    const coords: [number, number, number][] = [];
    // Front fence left & right of pedestrian gate
    for (let x = -7.6; x <= -5.2; x += 0.8) coords.push([x, 0.52, 1.45]);
    for (let x = -3.4; x <= -1.0; x += 0.8) coords.push([x, 0.52, 1.45]);
    // Side fence lines
    for (let z = 0.65; z >= -4.2; z -= 0.95) {
      coords.push([-7.6, 0.52, z]);
      coords.push([-0.65, 0.52, z]);
    }
    return coords;
  }, []);

  useEffect(() => {
    const mesh = postRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    posts.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [posts]);

  return (
    <group>
      <instancedMesh ref={postRef} args={[undefined, undefined, posts.length]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 1.04, 0.1]} />
        <meshStandardMaterial color="#aeb2b7" roughness={0.95} metalness={0} />
      </instancedMesh>
      {/* Front concrete plinth + metal rails */}
      <mesh position={[-6.4, 0.16, 1.45]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.32, 0.12]} />
        <meshStandardMaterial color="#9ba0a6" roughness={0.96} />
      </mesh>
      <mesh position={[-2.2, 0.16, 1.45]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.32, 0.12]} />
        <meshStandardMaterial color="#9ba0a6" roughness={0.96} />
      </mesh>
      {/* Steel gate leaves */}
      <mesh position={[-4.65, 0.52, 1.45]} castShadow>
        <boxGeometry args={[0.78, 0.92, 0.04]} />
        <meshStandardMaterial color="#232a33" roughness={0.52} metalness={0.68} />
      </mesh>
      <mesh position={[-3.82, 0.52, 1.45]} castShadow>
        <boxGeometry args={[0.78, 0.92, 0.04]} />
        <meshStandardMaterial color="#1e293b" roughness={0.42} metalness={0.72} />
      </mesh>
    </group>
  );
}

/**
 * Instanced row of 3 larger commercial outdoor condenser cabinets on the right building's utility pad.
 */
function CommercialCondenserRowInstanced({
  metalMap,
  metalRough,
  quality,
}: {
  metalMap: THREE.CanvasTexture;
  metalRough: THREE.CanvasTexture;
  quality: 'low' | 'medium' | 'high';
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const grilleRef = useRef<THREE.InstancedMesh>(null);

  const positions: [number, number, number][] = useMemo(
    () => [
      [1.42, 0.64, -0.55],
      [1.42, 0.64, -1.62],
      [1.42, 0.64, -2.69],
    ],
    [],
  );

  useEffect(() => {
    const dummy = new THREE.Object3D();
    if (bodyRef.current) {
      positions.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        bodyRef.current!.setMatrixAt(i, dummy.matrix);
      });
      bodyRef.current.instanceMatrix.needsUpdate = true;
    }
    if (grilleRef.current) {
      positions.forEach(([x, y, z], i) => {
        dummy.position.set(x - 0.24, y + 0.04, z);
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.updateMatrix();
        grilleRef.current!.setMatrixAt(i, dummy.matrix);
      });
      grilleRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [positions]);

  return (
    <group>
      {/* Concrete equipment pad */}
      <mesh position={[1.42, 0.08, -1.62]} receiveShadow castShadow>
        <boxGeometry args={[0.75, 0.16, 3.35]} />
        <meshStandardMaterial color="#7b8089" roughness={0.97} />
      </mesh>

      <instancedMesh ref={bodyRef} args={[undefined, undefined, positions.length]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.96, 0.88]} />
        <meshStandardMaterial
          map={metalMap}
          roughnessMap={metalRough}
          color="#dbe3ec"
          roughness={0.46}
          metalness={0.52}
        />
      </instancedMesh>

      <instancedMesh
        key={`ext-grille-${quality}`}
        ref={grilleRef}
        args={[undefined, undefined, positions.length]}
      >
        <cylinderGeometry args={[0.31, 0.31, 0.03, quality === 'low' ? 10 : quality === 'medium' ? 14 : 20]} />
        <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.65} wireframe />
      </instancedMesh>

      {positions.map(([x, y, z], i) => (
        <group key={i}>
          <ExteriorFanRotor
            position={[x - 0.23, y + 0.04, z]}
            rotation={[0, -Math.PI / 2, 0]}
            radius={0.27}
            speed={4.8 + i * 0.45}
          />
          {quality !== 'low' && (
            <HeatShimmerPlume
              position={[x - 0.1, y + 0.6, z]}
              width={0.55}
              height={0.65}
              count={quality === 'high' ? 2 : 1}
            />
          )}
        </group>
      ))}
    </group>
  );
}

function BuildingHoverRim({
  active,
  color,
  position,
  size,
}: {
  active: boolean;
  color: string;
  position: [number, number, number];
  size: [number, number, number];
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const edgeGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size]);

  useFrame((_, delta) => {
    if (!matRef.current) return;
    const targetOpacity = active ? 0.92 : 0;
    matRef.current.opacity = THREE.MathUtils.damp(matRef.current.opacity, targetOpacity, 10, Math.min(delta, 0.05));
  });

  useEffect(() => () => edgeGeo.dispose(), [edgeGeo]);

  return (
    <group position={position}>
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial color={color} transparent opacity={active ? 0.95 : 0} />
      </lineSegments>
      {/* Soft ground glow footprint */}
      <mesh position={[0, -size[1] / 2 + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(size[0], size[2]) * 0.54, Math.max(size[0], size[2]) * 0.62, 48]} />
        <meshBasicMaterial ref={matRef} color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function ExteriorStreetScene() {
  const { gl } = useThree();
  const quality = useHVACStore((s) => s.quality);
  const hoveredHomeBuilding = useHVACStore((s) => s.hoveredHomeBuilding);
  // Which side the pointer is on: the camera walks there, and that building
  // lights up, so the two read as two separate places rather than one row.
  const homeFocus = useHVACStore((s) => s.homeFocus);
  const setHoveredHomeBuilding = useHVACStore((s) => s.setHoveredHomeBuilding);
  const enterExperience = useHVACStore((s) => s.enterExperience);

  const metalMaps = useMemo(() => createBrushedMetalMaps(), []);
  // Procedural outdoor surfaces: speckled asphalt, panelled concrete, mottled lawn.
  const asphalt = useMemo(() => createAsphaltMaps(), []);
  const walkway = useMemo(() => createConcreteMaps('#9aa0a6'), []);
  const pad = useMemo(() => createConcreteMaps('#7e858d'), []);
  const grass = useMemo(() => createGrassMaps(), []);
  // Decals: a dark falloff for grounding volumes, a warm one for lamplight.
  const shadowTex = useMemo(() => createRadialFalloffTexture('rgba(2,6,16,0.62)', 'rgba(2,6,16,0)', 0.46), []);
  const glowTex = useMemo(() => createRadialFalloffTexture('rgba(255,186,110,0.5)', 'rgba(255,186,110,0)', 0.3), []);

  useEffect(() => {
    const aniso = quality === 'high' ? 8 : quality === 'medium' ? 4 : 2;
    [metalMaps.map, metalMaps.roughnessMap, metalMaps.bumpMap, metalMaps.normalMap].forEach((tex) => {
      tex.anisotropy = aniso;
      tex.needsUpdate = true;
    });
    // Tile density per surface: the defaults are tuned for small props, and a
    // 46 m road stretched over 8 repeats reads as a smear from eye level.
    const tile = (set: { map: THREE.Texture; roughnessMap: THREE.Texture; normalMap: THREE.Texture }, x: number, y: number) => {
      [set.map, set.roughnessMap, set.normalMap].forEach((tex) => {
        tex.repeat.set(x, y);
        tex.anisotropy = Math.max(aniso, 4);
        tex.needsUpdate = true;
      });
    };
    tile(asphalt, 16, 1.8);
    tile(walkway, 12, 1);
    tile(pad, 14, 10);
    tile(grass, 6, 5);
  }, [quality, metalMaps, asphalt, walkway, pad, grass]);

  const skyUniforms = useMemo(
    () => ({
      uSunDir: { value: new THREE.Vector3(-0.78, 0.16, -0.6).normalize() },
    }),
    [],
  );

  useEffect(() => {
    return () => {
      gl.domElement.style.cursor = 'auto';
      metalMaps.map.dispose();
      metalMaps.roughnessMap.dispose();
      metalMaps.bumpMap.dispose();
      metalMaps.normalMap.dispose();
      [asphalt, walkway, pad, grass].forEach((t) => {
        t.map.dispose();
        t.roughnessMap.dispose();
        t.normalMap.dispose();
      });
      shadowTex.dispose();
      glowTex.dispose();
    };
  }, [gl, metalMaps, asphalt, walkway, pad, grass, shadowTex, glowTex]);

  const handleBuildingHover = (target: 'residential' | 'commercial' | null, e?: ThreeEvent<PointerEvent>) => {
    e?.stopPropagation();
    setHoveredHomeBuilding(target);
    gl.domElement.style.cursor = target ? 'pointer' : 'auto';
  };

  const handleBuildingClick = (target: 'residential' | 'commercial', e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    gl.domElement.style.cursor = 'auto';
    enterExperience(target);
  };

  return (
    <group name="exterior-pampanga-street">
      {/* Golden-hour Dusk Sky Dome */}
      <mesh>
        <sphereGeometry args={[42, quality === 'low' ? 16 : 32, quality === 'low' ? 12 : 24]} />
        <shaderMaterial
          vertexShader={GOLDEN_HOUR_VERTEX}
          fragmentShader={GOLDEN_HOUR_FRAGMENT}
          uniforms={skyUniforms}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Distant barangay tree line: clustered canopies, hazed back by the fog */}
      {(quality === 'low'
        ? [-13, 13]
        : quality === 'medium'
          ? [-15, -6, 6.5, 16]
          : [-15, -10.5, -6, 0.2, 6.5, 11.5, 16]
      ).map((x, idx) => (
        <group key={idx} position={[x, 0, -11 - (idx % 2) * 2]}>
          <Tree position={[0, 0, 0]} height={3.4 + (idx % 3) * 0.7} seed={9001 + idx * 37} quality={quality} />
        </group>
      ))}

      {/* Ground Base: damp earth / unpaved shoulder */}
      <mesh position={[0, -0.02, -1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[52, 36]} />
        <meshStandardMaterial
          map={pad.map}
          roughnessMap={pad.roughnessMap}
          normalMap={pad.normalMap}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          color="#3d4049"
          roughness={1}
        />
      </mesh>

      {/* Asphalt Road: aggregate, cracks and polished wheel tracks */}
      <mesh position={[0, 0.005, 5.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[46, 5.2]} />
        <meshStandardMaterial
          map={asphalt.map}
          roughnessMap={asphalt.roughnessMap}
          normalMap={asphalt.normalMap}
          normalScale={new THREE.Vector2(0.9, 0.9)}
          color="#6f737b"
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* Worn dashed centre line: thermoplastic paint, scuffed and uneven */}
      {[-12, -8.5, -5, -1.5, 2, 5.5, 9, 12.5].map((x, i) => (
        <mesh key={x} position={[x, 0.012, 5.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.7, 0.14]} />
          <meshStandardMaterial
            color="#c9bb7a"
            roughness={0.85}
            transparent
            opacity={0.62 + ((i * 7) % 5) * 0.05}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Concrete Kerb & Panelled Pavement */}
      <mesh position={[0, 0.06, 3.08]} receiveShadow castShadow>
        <boxGeometry args={[36, 0.12, 0.24]} />
        <meshStandardMaterial
          map={walkway.map}
          roughnessMap={walkway.roughnessMap}
          normalMap={walkway.normalMap}
          color="#b7bcc3"
          roughness={1}
        />
      </mesh>
      <mesh position={[0, 0.03, 2.3]} receiveShadow>
        <boxGeometry args={[36, 0.06, 1.38]} />
        <meshStandardMaterial
          map={walkway.map}
          roughnessMap={walkway.roughnessMap}
          normalMap={walkway.normalMap}
          normalScale={new THREE.Vector2(0.8, 0.8)}
          color="#898f97"
          roughness={1}
        />
      </mesh>

      {/* Overhead lines: the pole run that reads instantly as a Philippine street */}
      {quality !== 'low' &&
        [-12.4, -5.2, 2, 9.2, 16.4].map((x, i, arr) => (
          <UtilityPole
            key={x}
            x={x}
            z={3.35}
            seed={4100 + i * 53}
            quality={quality}
            /* the last pole in the run has no next pole to string to */
            span={i === arr.length - 1 ? 0 : arr[i + 1] - x}
          />
        ))}

      {/* Street Lamps casting warm twilight pools */}
      {[-7.2, 0, 7.2].map((x, idx) => (
        <group key={idx} position={[x, 0, 2.75]}>
          <mesh position={[0, 1.9, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.065, 3.8, 10]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} metalness={0.7} />
          </mesh>
          <mesh position={[0, 3.8, 0.28]}>
            <boxGeometry args={[0.24, 0.09, 0.42]} />
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 3.74, 0.34]}>
            <sphereGeometry args={[0.09, quality === 'low' ? 6 : 12, quality === 'low' ? 6 : 12]} />
            <meshBasicMaterial color="#fde68a" />
          </mesh>
          {(quality === 'high' || (quality === 'medium' && idx === 1)) && (
            <pointLight position={[0, 3.4, 0.45]} color="#fdba74" intensity={1.8} distance={7.5} decay={2} />
          )}
          {/* The pool of light on the pavement, drawn at every quality tier */}
          <LightPool at={[0, 0.075, 0.5]} size={[5.2, 5.2]} opacity={0.5} tex={glowTex} />
          <GroundShadow at={[0, 0.05, 0]} size={[0.75, 0.75]} opacity={0.6} tex={shadowTex} />
        </group>
      ))}

      {/* ===================================================================
          LEFT BUILDING: RESIDENTIAL FILIPINO BUNGALOW + SPLIT OUTDOOR UNIT
         =================================================================== */}
      <group
        name="home-residential-bungalow"
        onPointerOver={(e) => handleBuildingHover('residential', e)}
        onPointerOut={(e) => handleBuildingHover(null, e)}
        onClick={(e) => handleBuildingClick('residential', e)}
      >
        {/* Bermuda lawn & concrete driveway */}
        <mesh position={[-4.2, 0.02, -1.35]} receiveShadow>
          <boxGeometry args={[7.4, 0.04, 5.8]} />
          <meshStandardMaterial
            map={grass.map}
            roughnessMap={grass.roughnessMap}
            normalMap={grass.normalMap}
            normalScale={new THREE.Vector2(1.1, 1.1)}
            color="#8fa882"
            roughness={1}
          />
        </mesh>
        <mesh position={[-4.2, 0.035, 0.55]} receiveShadow>
          <boxGeometry args={[1.65, 0.05, 1.9]} />
          <meshStandardMaterial
            map={walkway.map}
            roughnessMap={walkway.roughnessMap}
            normalMap={walkway.normalMap}
            color="#9b968f"
            roughness={1}
          />
        </mesh>

        {/* Small tropical front garden: clustered shrubs and a young ornamental tree */}
        {([
          [-6.45, 0.72, 1.05],
          [-5.85, 0.88, 0.8],
          [-2.35, 0.78, 0.95],
          [-1.85, 0.92, 0.72],
        ] as [number, number, number][]).map(([gx, gz, sc], i) => (
          <Shrub key={i} position={[gx, 0.02, gz]} scale={sc} seed={311 + i * 131} quality={quality} />
        ))}
        {quality !== 'low' && (
          <Tree position={[-7.1, 0.02, -0.4]} height={2.3} seed={8801} quality={quality} />
        )}
        {/* Flowering bougainvillea over the nearest shrub */}
        {quality !== 'low' &&
          ([
            [-6.5, 0.46, 0.76],
            [-6.36, 0.52, 0.64],
            [-6.58, 0.38, 0.66],
          ] as [number, number, number][]).map(([bx, by, bz], i) => (
            <mesh key={i} position={[bx, by, bz]} castShadow>
              <icosahedronGeometry args={[0.07 + (i % 2) * 0.02, 0]} />
              <meshStandardMaterial color={i % 2 ? '#b8325a' : '#d1456c'} roughness={0.88} />
            </mesh>
          ))}

        {/* Grounding shadow under the house and its footprint */}
        <GroundShadow at={[-4.2, 0.045, -1.5]} size={[8.2, 6.4]} opacity={0.62} tex={shadowTex} />

        {/* Residential Perimeter Fence & Gate (Instanced posts) */}
        <ResidentialFenceInstanced />

        {/* Detailed bungalow: hollow walls with real openings, hip roof, furnished interior and its
            split-type system. Hovering the house (or its Explore button) switches on x-ray. */}
        <group position={[-4.2, 0, -1.75]}>
          <ResidentialHouse xray={hoveredHomeBuilding === 'residential'} quality={quality} />
        </group>
        {quality !== 'low' && (
          <HeatShimmerPlume position={[-1.62, 1.78, -1.45]} width={0.48} height={0.58} count={quality === 'high' ? 2 : 1} />
        )}

        {/* Cyan Highlight Rim when Residential CTA / Building is Hovered */}
        <BuildingHoverRim
          active={hoveredHomeBuilding === 'residential' || homeFocus === 'residential'}
          color="#22D3EE"
          position={[-4.2, 1.9, -1.75]}
          size={[5.4, 3.9, 4.3]}
        />
      </group>

      {/* ===================================================================
          RIGHT BUILDING: 2-STOREY COMMERCIAL OFFICE / RETAIL + VRF ROOF UNIT
         =================================================================== */}
      <group
        name="home-commercial-building"
        onPointerOver={(e) => handleBuildingHover('commercial', e)}
        onPointerOut={(e) => handleBuildingHover(null, e)}
        onClick={(e) => handleBuildingClick('commercial', e)}
      >
        {/* Brushed Concrete Forecourt */}
        <mesh position={[4.2, 0.02, -1.35]} receiveShadow>
          <boxGeometry args={[7.4, 0.04, 5.8]} />
          <meshStandardMaterial
            map={pad.map}
            roughnessMap={pad.roughnessMap}
            normalMap={pad.normalMap}
            normalScale={new THREE.Vector2(0.75, 0.75)}
            color="#7c838c"
            roughness={1}
          />
        </mesh>
        {/* Wheel stops & ornamental planter */}
        {[3.2, 5.2].map((wx) => (
          <mesh key={wx} position={[wx, 0.08, 0.92]} castShadow receiveShadow>
            <boxGeometry args={[1.25, 0.1, 0.16]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.75} />
          </mesh>
        ))}
        <mesh position={[6.95, 0.25, 0.85]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.44, 0.7]} />
          <meshStandardMaterial color="#475569" roughness={0.85} />
        </mesh>
        <Shrub position={[6.95, 0.46, 0.85]} scale={1.35} seed={6601} quality={quality} />

        {/* Grounding shadow under the commercial block */}
        <GroundShadow at={[4.3, 0.045, -1.6]} size={[7.6, 6.2]} opacity={0.68} tex={shadowTex} />

        {/* Detailed two-storey building: concrete frame, glass storefront, retail + office interiors,
            ceiling cassettes, ducted unit and rooftop VRF. Hovering switches on x-ray. */}
        <group position={[4.3, 0, -1.85]}>
          <CommercialBuilding xray={hoveredHomeBuilding === 'commercial'} quality={quality} />
        </group>

        {/* Instanced Row of 3 Commercial Condenser Units */}
        <CommercialCondenserRowInstanced
          metalMap={metalMaps.map}
          metalRough={metalMaps.roughnessMap}
          quality={quality}
        />

        {quality !== 'low' && (
          <HeatShimmerPlume position={[4.3, 6.75, -1.85]} width={1.6} height={0.78} count={quality === 'high' ? 3 : 1} />
        )}

        {/* Amber Highlight Rim when Commercial CTA / Building is Hovered */}
        <BuildingHoverRim
          active={hoveredHomeBuilding === 'commercial' || homeFocus === 'commercial'}
          color="#F97316"
          position={[4.3, 3.45, -1.85]}
          size={[5.5, 6.95, 4.35]}
        />
      </group>
    </group>
  );
}

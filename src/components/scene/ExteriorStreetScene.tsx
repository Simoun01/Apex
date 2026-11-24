import { useEffect, useMemo, useRef } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHVACStore } from '../../store/useHVACStore';
import { createBrushedMetalMaps } from './hvacSceneUtils';
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

    vec3 nadir = vec3(0.04, 0.09, 0.19);
    vec3 horizon = vec3(0.95, 0.56, 0.30);
    vec3 midDusk = vec3(0.36, 0.25, 0.42);
    vec3 zenith = vec3(0.043, 0.122, 0.227); // #0B1F3A

    vec3 col = mix(nadir, horizon, smoothstep(-0.12, 0.04, h));
    col = mix(col, midDusk, smoothstep(0.03, 0.24, h));
    col = mix(col, zenith, smoothstep(0.22, 0.68, h));

    // Warm golden-hour solar scatter along low western horizon
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float sunGlow = pow(sunDot, 12.0) * 0.55 + pow(sunDot, 96.0) * 0.85;
    float horizonMask = smoothstep(-0.05, 0.38, h) * (1.0 - smoothstep(0.38, 0.85, h));
    col += vec3(1.0, 0.68, 0.34) * sunGlow * (0.45 + 0.55 * horizonMask);

    gl_FragColor = vec4(col, 1.0);
  }
`;

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
        <meshStandardMaterial color="#cbd5e1" roughness={0.82} metalness={0.1} />
      </instancedMesh>
      {/* Front concrete plinth + metal rails */}
      <mesh position={[-6.4, 0.16, 1.45]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.32, 0.12]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.88} />
      </mesh>
      <mesh position={[-2.2, 0.16, 1.45]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.32, 0.12]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.88} />
      </mesh>
      {/* Steel gate leaves */}
      <mesh position={[-4.65, 0.52, 1.45]} castShadow>
        <boxGeometry args={[0.78, 0.92, 0.04]} />
        <meshStandardMaterial color="#1e293b" roughness={0.42} metalness={0.72} />
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
        <meshStandardMaterial color="#64748b" roughness={0.9} />
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
  const setHoveredHomeBuilding = useHVACStore((s) => s.setHoveredHomeBuilding);
  const enterExperience = useHVACStore((s) => s.enterExperience);

  const metalMaps = useMemo(() => createBrushedMetalMaps(), []);

  useEffect(() => {
    const aniso = quality === 'high' ? 8 : quality === 'medium' ? 4 : 1;
    [metalMaps.map, metalMaps.roughnessMap, metalMaps.bumpMap, metalMaps.normalMap].forEach((tex) => {
      tex.anisotropy = aniso;
      tex.needsUpdate = true;
    });
  }, [quality, metalMaps]);

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
    };
  }, [gl, metalMaps]);

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

      {/* Subtle distant horizon tree silhouettes & barangay roofline depth */}
      {(quality === 'low'
        ? []
        : quality === 'medium'
          ? [-15, -6, 6.5, 16]
          : [-15, -10.5, -6, 0.2, 6.5, 11.5, 16]
      ).map((x, idx) => (
        <mesh key={idx} position={[x, 1.3 + (idx % 3) * 0.45, -11 - (idx % 2) * 2]}>
          <dodecahedronGeometry args={[1.6 + (idx % 2) * 0.45, 0]} />
          <meshStandardMaterial color="#18273c" roughness={0.95} />
        </mesh>
      ))}

      {/* Ground Base & Suburban Road */}
      <mesh position={[0, -0.02, -1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[52, 36]} />
        <meshStandardMaterial color="#1e293b" roughness={0.92} />
      </mesh>

      {/* Asphalt Road */}
      <mesh position={[0, 0.005, 5.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[46, 5.2]} />
        <meshStandardMaterial color="#1e2430" roughness={0.86} />
      </mesh>
      {/* Road Dashed Center Stripes */}
      {[-12, -8.5, -5, -1.5, 2, 5.5, 9, 12.5].map((x) => (
        <mesh key={x} position={[x, 0.012, 5.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.7, 0.14]} />
          <meshStandardMaterial color="#eab308" roughness={0.75} />
        </mesh>
      ))}

      {/* Concrete Curb & Tiled Sidewalk */}
      <mesh position={[0, 0.06, 3.08]} receiveShadow castShadow>
        <boxGeometry args={[36, 0.12, 0.24]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.03, 2.3]} receiveShadow>
        <boxGeometry args={[36, 0.06, 1.38]} />
        <meshStandardMaterial color="#64748b" roughness={0.84} />
      </mesh>

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
        {/* Bermuda lawn & driveway */}
        <mesh position={[-4.2, 0.02, -1.35]} receiveShadow>
          <boxGeometry args={[7.4, 0.04, 5.8]} />
          <meshStandardMaterial color="#2a442d" roughness={0.94} />
        </mesh>
        <mesh position={[-4.2, 0.035, 0.55]} receiveShadow>
          <boxGeometry args={[1.65, 0.05, 1.9]} />
          <meshStandardMaterial color="#78716c" roughness={0.88} />
        </mesh>

        {/* Small Tropical Front Garden (shrubs & ornamental tree) */}
        {[
          [-6.45, 0.34, 0.72, 0.34],
          [-5.85, 0.28, 0.88, 0.26],
          [-2.35, 0.3, 0.78, 0.29],
          [-1.85, 0.26, 0.92, 0.24],
        ].map(([gx, gy, gz, r], i) => (
          <mesh key={i} position={[gx, gy, gz]} castShadow receiveShadow>
            <dodecahedronGeometry args={[r, quality === 'high' ? 1 : 0]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#365e32' : '#4a7c3f'} roughness={0.9} />
          </mesh>
        ))}
        {/* Flowering bougainvillea accent */}
        <mesh position={[-6.45, 0.54, 0.72]}>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial color="#f43f5e" roughness={0.8} />
        </mesh>

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
          active={hoveredHomeBuilding === 'residential'}
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
          <meshStandardMaterial color="#334155" roughness={0.86} />
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
        <mesh position={[6.95, 0.72, 0.85]} castShadow>
          <dodecahedronGeometry args={[0.42, quality === 'high' ? 1 : 0]} />
          <meshStandardMaterial color="#2f5a38" roughness={0.88} />
        </mesh>

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
          active={hoveredHomeBuilding === 'commercial'}
          color="#F97316"
          position={[4.3, 3.45, -1.85]}
          size={[5.5, 6.95, 4.35]}
        />
      </group>
    </group>
  );
}

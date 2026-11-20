import { useEffect, useMemo, useRef } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHVACStore } from '../../store/useHVACStore';
import {
  createFabricWeaveMaps,
  createMatteWallBumpMap,
  createTileFloorMaps,
  createWoodGrainMaps,
} from './hvacSceneUtils';

const _warmColor = new THREE.Color('#F97316');
const _coolColor = new THREE.Color('#22D3EE');
const _offColor = new THREE.Color('#FB923C');

export function RoomShell({ isSoftwareGl = false }: { isSoftwareGl?: boolean }) {
  const audience = useHVACStore((s) => s.audience);
  const heatMapOn = useHVACStore((s) => s.heatMapOn);
  const powerOn = useHVACStore((s) => s.powerOn);
  const service = useHVACStore((s) => s.service);
  const installStep = useHVACStore((s) => s.installStep);
  const quality = useHVACStore((s) => s.quality);
  const { invalidate } = useThree();

  const heatMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const heatMixRef = useRef(powerOn ? 1 : 0);

  const resFloorMaps = useMemo(() => createTileFloorMaps('#23344e', '#0f172a', 8), []);
  const comFloorMaps = useMemo(() => createTileFloorMaps('#1f2c40', '#111827', 10), []);
  const wallBump = useMemo(() => createMatteWallBumpMap(), []);
  const woodMaps = useMemo(() => createWoodGrainMaps(), []);
  const fabricMaps = useMemo(() => createFabricWeaveMaps(), []);

  useEffect(() => {
    return () => {
      resFloorMaps.map.dispose();
      resFloorMaps.roughnessMap.dispose();
      comFloorMaps.map.dispose();
      comFloorMaps.roughnessMap.dispose();
      wallBump.dispose();
      woodMaps.map.dispose();
      woodMaps.roughnessMap.dispose();
      fabricMaps.map.dispose();
      fabricMaps.bumpMap.dispose();
    };
  }, [resFloorMaps, comFloorMaps, wallBump, woodMaps, fabricMaps]);

  useFrame((_, delta) => {
    if (!heatMapOn || !heatMatRef.current) return;
    const target = powerOn ? 1 : 0;
    if (Math.abs(heatMixRef.current - target) > 0.005) {
      heatMixRef.current = THREE.MathUtils.damp(heatMixRef.current, target, 2.5, Math.min(delta, 0.05));
      heatMatRef.current.color.copy(_warmColor).lerp(_coolColor, heatMixRef.current);
      heatMatRef.current.emissive.copy(_warmColor).lerp(_coolColor, heatMixRef.current);
      invalidate();
    } else {
      const c = powerOn ? _coolColor : _offColor;
      heatMatRef.current.color.copy(c);
      heatMatRef.current.emissive.copy(c);
    }
  });

  const isInstallEarly = service === 'installation' && installStep <= 2;
  const usePlanarReflector = quality === 'high' && !isSoftwareGl;
  const isLowQuality = quality === 'low';

  useEffect(() => {
    const aniso = quality === 'high' ? 8 : quality === 'medium' ? 4 : 1;
    [
      resFloorMaps.map,
      resFloorMaps.roughnessMap,
      comFloorMaps.map,
      comFloorMaps.roughnessMap,
      wallBump,
      woodMaps.map,
      woodMaps.roughnessMap,
      fabricMaps.map,
      fabricMaps.bumpMap,
    ].forEach((tex) => {
      tex.anisotropy = aniso;
      tex.needsUpdate = true;
    });
    invalidate();
  }, [quality, resFloorMaps, comFloorMaps, wallBump, woodMaps, fabricMaps, invalidate]);

  if (audience === 'residential') {
    return (
      <group name="residential-room-shell">
        {/* Main Tiled Living Room Structural Slab */}
        <mesh position={[-0.4, -0.07, -0.2]} receiveShadow castShadow>
          <boxGeometry args={[4.4, 0.12, 4.4]} />
          <meshStandardMaterial color="#162236" roughness={0.75} metalness={0.05} />
        </mesh>

        {/* Floor Top Surface scaled by Quality Tier: High = Planar Reflector, Med = Clearcoat Physical, Low = Matte Standard */}
        <mesh key={`res-floor-${quality}`} position={[-0.4, -0.005, -0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4.38, 4.38]} />
          {usePlanarReflector ? (
            <MeshReflectorMaterial
              map={resFloorMaps.map}
              roughnessMap={resFloorMaps.roughnessMap}
              blur={[220, 70]}
              resolution={512}
              mixBlur={0.88}
              mixStrength={0.48}
              roughness={0.3}
              depthScale={0.4}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.2}
              color="#dbeafe"
              metalness={0.14}
              mirror={0.26}
            />
          ) : isLowQuality ? (
            <meshStandardMaterial
              map={resFloorMaps.map}
              roughness={0.62}
              metalness={0.04}
            />
          ) : (
            <meshPhysicalMaterial
              map={resFloorMaps.map}
              roughnessMap={resFloorMaps.roughnessMap}
              roughness={0.28}
              metalness={0.08}
              clearcoat={0.48}
              clearcoatRoughness={0.24}
              envMapIntensity={1.15}
            />
          )}
        </mesh>

        {/* Exterior Concrete Patio / Mechanical Slab */}
        <mesh position={[2.8, -0.08, -0.7]} receiveShadow castShadow>
          <boxGeometry args={[2.1, 0.1, 3.4]} />
          <meshStandardMaterial
            bumpMap={wallBump}
            bumpScale={0.008}
            color="#29364a"
            roughness={0.88}
            metalness={0.04}
          />
        </mesh>

        {/* Matte Painted Back Wall */}
        <mesh position={[-0.4, 1.5, -2.35]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 3.0, 0.16]} />
          <meshStandardMaterial
            bumpMap={wallBump}
            bumpScale={0.004}
            color="#1c3152"
            roughness={0.88}
            metalness={0.02}
          />
        </mesh>

        {/* Matte Painted Right Side Partition Wall */}
        <mesh position={[1.72, 1.5, -1.35]} castShadow receiveShadow>
          <boxGeometry args={[0.16, 3.0, 2.0]} />
          <meshStandardMaterial
            bumpMap={wallBump}
            bumpScale={0.004}
            color="#192c4a"
            roughness={0.88}
            metalness={0.02}
          />
        </mesh>
        <mesh position={[1.72, 0.35, 0.8]} castShadow receiveShadow>
          <boxGeometry args={[0.16, 0.7, 2.3]} />
          <meshStandardMaterial
            bumpMap={wallBump}
            bumpScale={0.004}
            color="#192c4a"
            roughness={0.88}
            metalness={0.02}
          />
        </mesh>

        {/* Matte Painted Left Wall with Tropical Window Cutout */}
        <mesh position={[-2.52, 0.48, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.16, 0.96, 4.4]} />
          <meshStandardMaterial bumpMap={wallBump} bumpScale={0.004} color="#1d3356" roughness={0.88} />
        </mesh>
        <mesh position={[-2.52, 2.65, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.16, 0.7, 4.4]} />
          <meshStandardMaterial bumpMap={wallBump} bumpScale={0.004} color="#1d3356" roughness={0.88} />
        </mesh>
        <mesh position={[-2.52, 1.63, -1.65]} castShadow receiveShadow>
          <boxGeometry args={[0.16, 1.34, 1.5]} />
          <meshStandardMaterial bumpMap={wallBump} bumpScale={0.004} color="#1d3356" roughness={0.88} />
        </mesh>
        <mesh position={[-2.52, 1.63, 1.35]} castShadow receiveShadow>
          <boxGeometry args={[0.16, 1.34, 1.3]} />
          <meshStandardMaterial bumpMap={wallBump} bumpScale={0.004} color="#1d3356" roughness={0.88} />
        </mesh>

        {/* Window Frame, Sill, Tinted Glass & Daylight Spill */}
        <group position={[-2.5, 1.63, -0.1]}>
          {/* Outer Aluminum Frame */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.1, 1.36, 1.62]} />
            <meshStandardMaterial color="#0f172a" roughness={0.32} metalness={0.75} />
          </mesh>
          {/* Interior Window Sill */}
          <mesh position={[0.05, -0.68, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.04, 1.68]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.45} metalness={0.1} />
          </mesh>
          {/* Exterior Warm Sky Glow Backdrop behind Glass */}
          <mesh position={[-0.08, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[1.52, 1.24]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#fde68a"
              emissiveIntensity={1.15}
              roughness={0.4}
            />
          </mesh>
          {/* Optical Glass Panes */}
          <mesh key={`res-glass-${quality}`} position={[0.01, 0, 0]}>
            <boxGeometry args={[0.02, 1.24, 1.5]} />
            {isLowQuality ? (
              <meshStandardMaterial color="#bae6fd" transparent opacity={0.25} roughness={0.35} depthWrite={false} />
            ) : (
              <meshPhysicalMaterial
                color="#bae6fd"
                transparent
                opacity={0.28}
                roughness={0.06}
                metalness={0.05}
                clearcoat={1}
                ior={1.5}
                depthWrite={false}
              />
            )}
          </mesh>
          {/* Center Mullion */}
          <mesh castShadow>
            <boxGeometry args={[0.11, 1.34, 0.05]} />
            <meshStandardMaterial color="#0f172a" roughness={0.32} metalness={0.75} />
          </mesh>
        </group>

        {/* Window Daylight Spill Light + Subtle Floor Sun-Patch (Med/High) */}
        {!isLowQuality && (
          <spotLight
            position={[-3.3, 2.35, -0.1]}
            angle={0.55}
            penumbra={0.85}
            intensity={12}
            decay={1.5}
            distance={8}
            color="#fff3d6"
          />
        )}
        <mesh position={[-1.45, 0.008, -0.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.45, 1.25]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive="#fde68a"
            emissiveIntensity={0.28}
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </mesh>

        {/* Interior Molded Baseboard Trim along Back, Left & Right Walls */}
        <group name="baseboards">
          <mesh position={[-0.4, 0.06, -2.255]} castShadow receiveShadow>
            <boxGeometry args={[4.2, 0.12, 0.032]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.42} metalness={0.05} />
          </mesh>
          <mesh position={[-2.425, 0.06, -0.2]} castShadow receiveShadow>
            <boxGeometry args={[0.032, 0.12, 4.2]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.42} metalness={0.05} />
          </mesh>
          <mesh position={[1.625, 0.06, -0.2]} castShadow receiveShadow>
            <boxGeometry args={[0.032, 0.12, 4.1]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.42} metalness={0.05} />
          </mesh>
        </group>

        {/* Ceiling Cove / Cutaway Cornice */}
        <mesh position={[-0.4, 2.95, -2.05]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.1, 0.6]} />
          <meshStandardMaterial bumpMap={wallBump} bumpScale={0.003} color="#1e3457" roughness={0.85} />
        </mesh>

        {/* Woven Area Rug (offset +0.015 on Y) */}
        <mesh position={[-0.5, 0.015, -0.15]} receiveShadow castShadow>
          <boxGeometry args={[2.5, 0.02, 1.9]} />
          <meshPhysicalMaterial
            bumpMap={fabricMaps.bumpMap}
            bumpScale={0.012}
            color="#263752"
            roughness={0.95}
            sheen={0.5}
          />
        </mesh>

        {/* Modern Fabric Sofa (MeshPhysicalMaterial with fabric weave + sheen) */}
        <group position={[-0.95, 0, -1.25]}>
          <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.95, 0.22, 0.82]} />
            <meshPhysicalMaterial
              map={fabricMaps.map}
              bumpMap={fabricMaps.bumpMap}
              bumpScale={0.01}
              color="#475569"
              roughness={0.92}
              sheen={0.85}
              sheenRoughness={0.7}
            />
          </mesh>
          <mesh position={[0, 0.44, -0.31]} castShadow receiveShadow>
            <boxGeometry args={[1.95, 0.45, 0.2]} />
            <meshPhysicalMaterial
              map={fabricMaps.map}
              bumpMap={fabricMaps.bumpMap}
              bumpScale={0.01}
              color="#334155"
              roughness={0.92}
              sheen={0.85}
            />
          </mesh>
          <mesh position={[-0.88, 0.34, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.36, 0.82]} />
            <meshPhysicalMaterial
              map={fabricMaps.map}
              bumpMap={fabricMaps.bumpMap}
              bumpScale={0.01}
              color="#334155"
              roughness={0.92}
              sheen={0.85}
            />
          </mesh>
          <mesh position={[0.88, 0.34, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.36, 0.82]} />
            <meshPhysicalMaterial
              map={fabricMaps.map}
              bumpMap={fabricMaps.bumpMap}
              bumpScale={0.01}
              color="#334155"
              roughness={0.92}
              sheen={0.85}
            />
          </mesh>
          <mesh position={[-0.4, 0.28, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[0.74, 0.1, 0.66]} />
            <meshPhysicalMaterial
              map={fabricMaps.map}
              bumpMap={fabricMaps.bumpMap}
              bumpScale={0.01}
              color="#64748b"
              roughness={0.9}
              sheen={0.9}
            />
          </mesh>
          <mesh position={[0.4, 0.28, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[0.74, 0.1, 0.66]} />
            <meshPhysicalMaterial
              map={fabricMaps.map}
              bumpMap={fabricMaps.bumpMap}
              bumpScale={0.01}
              color="#64748b"
              roughness={0.9}
              sheen={0.9}
            />
          </mesh>
          {/* Wooden Sofa Legs */}
          {[
            [-0.88, 0.025, 0.34],
            [0.88, 0.025, 0.34],
            [-0.88, 0.025, -0.34],
            [0.88, 0.025, -0.34],
          ].map((pos, idx) => (
            <mesh key={idx} position={pos as [number, number, number]} castShadow>
              <cylinderGeometry args={[0.025, 0.018, 0.05, 10]} />
              <meshStandardMaterial color="#5c3a21" roughness={0.5} />
            </mesh>
          ))}
        </group>

        {/* Varnished Wood Coffee Table (MeshPhysicalMaterial with clearcoat) */}
        <group position={[-0.85, 0, 0.05]}>
          <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.05, 0.58]} />
            <meshPhysicalMaterial
              map={woodMaps.map}
              roughnessMap={woodMaps.roughnessMap}
              roughness={0.34}
              metalness={0.04}
              clearcoat={0.82}
              clearcoatRoughness={0.14}
            />
          </mesh>
          {[
            [-0.46, 0.14, -0.22],
            [0.46, 0.14, -0.22],
            [-0.46, 0.14, 0.22],
            [0.46, 0.14, 0.22],
          ].map((pos, idx) => (
            <mesh key={idx} position={pos as [number, number, number]} castShadow receiveShadow>
              <cylinderGeometry args={[0.025, 0.02, 0.28, 12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </group>

        {/* Tropical Potted Plant */}
        <group position={[1.15, 0, -1.75]}>
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.14, 0.44, 18]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.65} />
          </mesh>
          <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.26, 14, 12]} />
            <meshStandardMaterial color="#15803d" roughness={0.78} />
          </mesh>
          <mesh position={[0.12, 0.78, 0.06]} castShadow receiveShadow>
            <sphereGeometry args={[0.18, 12, 10]} />
            <meshStandardMaterial color="#16a34a" roughness={0.78} />
          </mesh>
        </group>

        {/* Heat-Map Thermal Floor Overlay */}
        {heatMapOn && (
          <mesh position={[-0.45, 0.045, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.9, 3.9]} />
            <meshStandardMaterial
              ref={heatMatRef}
              color={powerOn ? '#22D3EE' : '#F97316'}
              emissive={powerOn ? '#22D3EE' : '#F97316'}
              emissiveIntensity={0.35}
              transparent
              opacity={0.28}
              depthWrite={false}
            />
          </mesh>
        )}

        {isInstallEarly && (
          <gridHelper args={[4.2, 10, '#22D3EE', '#1e40af']} position={[-0.45, 0.03, -0.25]} />
        )}
      </group>
    );
  }

  // COMMERCIAL OFFICE / RETAIL SCENE
  return (
    <group name="commercial-room-shell">
      <mesh position={[-0.5, -0.07, -0.1]} receiveShadow castShadow>
        <boxGeometry args={[5.8, 0.12, 4.9]} />
        <meshStandardMaterial color="#152033" roughness={0.75} />
      </mesh>
      <mesh key={`com-floor-${quality}`} position={[-0.5, -0.005, -0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.78, 4.88]} />
        {usePlanarReflector ? (
          <MeshReflectorMaterial
            map={comFloorMaps.map}
            roughnessMap={comFloorMaps.roughnessMap}
            blur={[200, 60]}
            resolution={512}
            mixBlur={0.85}
            mixStrength={0.44}
            roughness={0.28}
            depthScale={0.4}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#cbd5e1"
            metalness={0.14}
            mirror={0.24}
          />
        ) : isLowQuality ? (
          <meshStandardMaterial map={comFloorMaps.map} roughness={0.62} metalness={0.04} />
        ) : (
          <meshPhysicalMaterial
            map={comFloorMaps.map}
            roughnessMap={comFloorMaps.roughnessMap}
            roughness={0.3}
            metalness={0.12}
            clearcoat={0.45}
            clearcoatRoughness={0.25}
          />
        )}
      </mesh>

      <mesh position={[-0.5, 1.35, -2.5]} castShadow receiveShadow>
        <boxGeometry args={[5.8, 2.7, 0.16]} />
        <meshStandardMaterial bumpMap={wallBump} bumpScale={0.004} color="#172742" roughness={0.86} />
      </mesh>

      {/* Commercial Baseboard */}
      <mesh position={[-0.5, 0.06, -2.41]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 0.12, 0.03]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.3} />
      </mesh>

      <mesh position={[-3.32, 0.45, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.9, 4.9]} />
        <meshStandardMaterial bumpMap={wallBump} bumpScale={0.004} color="#172742" roughness={0.86} />
      </mesh>
      <mesh position={[-3.3, 1.65, -0.1]}>
        <boxGeometry args={[0.04, 1.5, 4.4]} />
        <meshPhysicalMaterial
          color="#7dd3fc"
          transparent
          opacity={0.22}
          roughness={0.08}
          clearcoat={1}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[2.32, 1.35, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 2.7, 4.1]} />
        <meshStandardMaterial bumpMap={wallBump} bumpScale={0.004} color="#16243d" roughness={0.86} />
      </mesh>

      <mesh position={[2.85, 2.6, -0.8]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 0.14, 3.6]} />
        <meshStandardMaterial color="#27364f" roughness={0.82} metalness={0.1} />
      </mesh>
      <mesh position={[3.95, 2.85, -0.8]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.36, 3.6]} />
        <meshStandardMaterial color="#334155" roughness={0.78} />
      </mesh>

      <group position={[-1.4, 2.35, 0.8]}>
        <mesh receiveShadow>
          <boxGeometry args={[3.5, 0.05, 1.8]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.82} transparent opacity={0.42} />
        </mesh>
      </group>

      {[-1.85, -0.15].map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0.55]}>
          <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.35, 0.05, 0.72]} />
            <meshPhysicalMaterial
              map={woodMaps.map}
              roughnessMap={woodMaps.roughnessMap}
              roughness={0.36}
              clearcoat={0.75}
            />
          </mesh>
          <mesh position={[-0.6, 0.37, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.74, 0.64]} />
            <meshStandardMaterial color="#0f172a" metalness={0.75} roughness={0.3} />
          </mesh>
          <mesh position={[0.6, 0.37, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.74, 0.64]} />
            <meshStandardMaterial color="#0f172a" metalness={0.75} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.0, -0.16]} castShadow>
            <boxGeometry args={[0.52, 0.32, 0.03]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0, 1.0, -0.143]}>
            <planeGeometry args={[0.48, 0.28]} />
            <meshStandardMaterial color="#1e3a5f" emissive="#0ea5e9" emissiveIntensity={0.22} />
          </mesh>
          <mesh position={[0, 0.45, 0.52]} castShadow receiveShadow>
            <boxGeometry args={[0.44, 0.06, 0.44]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.72, 0.72]} castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.48, 0.06]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
        </group>
      ))}

      <mesh position={[0.95, 1.05, -0.9]}>
        <boxGeometry args={[0.04, 2.1, 2.2]} />
        <meshPhysicalMaterial
          color="#bae6fd"
          transparent
          opacity={0.18}
          roughness={0.08}
          clearcoat={1}
          depthWrite={false}
        />
      </mesh>

      <group position={[0.35, 1.42, -2.39]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.14, 0.035]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.01, 0.019]}>
          <planeGeometry args={[0.11, 0.07]} />
          <meshStandardMaterial
            color="#0B1F3A"
            emissive={powerOn ? '#22D3EE' : '#475569'}
            emissiveIntensity={powerOn ? 0.8 : 0.1}
          />
        </mesh>
      </group>

      {heatMapOn && (
        <mesh position={[-0.5, 0.045, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.4, 4.5]} />
          <meshStandardMaterial
            ref={heatMatRef}
            color={powerOn ? '#22D3EE' : '#F97316'}
            emissive={powerOn ? '#22D3EE' : '#F97316'}
            emissiveIntensity={0.35}
            transparent
            opacity={0.26}
            depthWrite={false}
          />
        </mesh>
      )}

      {isInstallEarly && (
        <gridHelper args={[5.4, 12, '#22D3EE', '#1e40af']} position={[-0.5, 0.03, -0.1]} />
      )}
    </group>
  );
}

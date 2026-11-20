import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HVAC_PARTS } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';
import {
  createBrushedMetalMaps,
  createCopperPatinaMaps,
  getPartHighlightState,
} from './hvacSceneUtils';

const _cleanCoil = new THREE.Color('#cbd5e1');
const _dirtyCoil = new THREE.Color('#665647');
const _emissiveCyan = new THREE.Color('#22D3EE');
const _emissiveOrange = new THREE.Color('#F97316');
const _emissiveBlack = new THREE.Color('#000000');
const _dummy = new THREE.Object3D();

interface SplitUnitOutdoorProps {
  position?: [number, number, number];
}

export function SplitUnitOutdoor({ position = [2.85, 0.56, -1.65] }: SplitUnitOutdoorProps) {
  const { invalidate } = useThree();
  const service = useHVACStore((s) => s.service);
  const exploded = useHVACStore((s) => s.exploded);
  const xray = useHVACStore((s) => s.xray);
  const powerOn = useHVACStore((s) => s.powerOn);
  const fanSpeed = useHVACStore((s) => s.fanSpeed);
  const selectedPart = useHVACStore((s) => s.selectedPart);
  const hoveredPart = useHVACStore((s) => s.hoveredPart);
  const selectedSymptom = useHVACStore((s) => s.selectedSymptom);
  const cleaningBeforeAfter = useHVACStore((s) => s.cleaningBeforeAfter);
  const reduceMotion = useHVACStore((s) => s.reduceMotion);
  const quality = useHVACStore((s) => s.quality);
  const installStep = useHVACStore((s) => s.installStep);
  const setSelectedPart = useHVACStore((s) => s.setSelectedPart);
  const setHoveredPart = useHVACStore((s) => s.setHoveredPart);
  const flyToPart = useHVACStore((s) => s.flyToPart);
  const markInteracted = useHVACStore((s) => s.markInteracted);

  const grilleRef = useRef<THREE.Group>(null);
  const fanRef = useRef<THREE.Group>(null);
  const coilRef = useRef<THREE.Group>(null);
  const compressorRef = useRef<THREE.Group>(null);
  const finInstancedRef = useRef<THREE.InstancedMesh>(null);
  const sideLouversRef = useRef<THREE.InstancedMesh>(null);
  const screwInstancedRef = useRef<THREE.InstancedMesh>(null);
  const explodeProgress = useRef(0);

  const brushedMaps = useMemo(() => createBrushedMetalMaps(), []);
  const copperMaps = useMemo(() => createCopperPatinaMaps(), []);

  // Swept curved axial fan blade ExtrudeGeometry
  const fanBladeGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0.04, -0.015);
    shape.quadraticCurveTo(0.11, -0.05, 0.185, -0.02);
    shape.quadraticCurveTo(0.195, 0.03, 0.16, 0.055);
    shape.quadraticCurveTo(0.09, 0.045, 0.04, 0.015);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 2,
    });
    geo.computeVertexNormals();
    return geo;
  }, []);

  const finCount = quality === 'high' ? 28 : quality === 'medium' ? 16 : 8;
  const sideLouverCount = quality === 'high' ? 9 : quality === 'medium' ? 6 : 3;
  const screwPositions: [number, number, number][] = useMemo(
    () => [
      [-0.43, 0.28, 0.193],
      [0.43, 0.28, 0.193],
      [-0.43, -0.22, 0.193],
      [0.43, -0.22, 0.193],
      [0.24, 0.28, 0.193],
      [0.24, -0.22, 0.193],
      [0.453, 0.12, 0.14],
      [0.453, -0.14, 0.14],
    ],
    [],
  );

  useEffect(() => {
    return () => {
      brushedMaps.map.dispose();
      brushedMaps.roughnessMap.dispose();
      brushedMaps.bumpMap.dispose();
      copperMaps.map.dispose();
      copperMaps.roughnessMap.dispose();
      fanBladeGeo.dispose();
    };
  }, [brushedMaps, copperMaps, fanBladeGeo]);

  useEffect(() => {
    if (finInstancedRef.current) {
      for (let i = 0; i < finCount; i++) {
        const x = -0.34 + (i / (finCount - 1)) * 0.68;
        _dummy.position.set(x, 0, 0);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        finInstancedRef.current.setMatrixAt(i, _dummy.matrix);
      }
      finInstancedRef.current.instanceMatrix.needsUpdate = true;
      finInstancedRef.current.computeBoundingSphere();
    }

    if (sideLouversRef.current) {
      for (let i = 0; i < sideLouverCount; i++) {
        const y = -0.14 + (i / (sideLouverCount - 1)) * 0.32;
        _dummy.position.set(-0.452, y, 0);
        _dummy.rotation.set(0, 0, -0.35);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        sideLouversRef.current.setMatrixAt(i, _dummy.matrix);
      }
      sideLouversRef.current.instanceMatrix.needsUpdate = true;
      sideLouversRef.current.computeBoundingSphere();
    }

    if (screwInstancedRef.current) {
      screwPositions.forEach((pos, idx) => {
        _dummy.position.set(pos[0], pos[1], pos[2]);
        _dummy.rotation.set(pos[0] > 0.45 ? 0 : Math.PI / 2, 0, pos[0] > 0.45 ? Math.PI / 2 : 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        screwInstancedRef.current!.setMatrixAt(idx, _dummy.matrix);
      });
      screwInstancedRef.current.instanceMatrix.needsUpdate = true;
      screwInstancedRef.current.computeBoundingSphere();
    }
  }, [finCount, sideLouverCount, screwPositions, quality]);

  const cleanliness = service === 'cleaning' ? cleaningBeforeAfter : 0.95;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const targetExp = exploded ? 1 : 0;

    if (reduceMotion) {
      explodeProgress.current = targetExp;
    } else if (Math.abs(explodeProgress.current - targetExp) > 0.002) {
      explodeProgress.current = THREE.MathUtils.damp(explodeProgress.current, targetExp, 6, dt);
      invalidate();
    }

    const e = explodeProgress.current;
    if (grilleRef.current) grilleRef.current.position.z = 0.21 + e * 0.42;
    if (fanRef.current) {
      fanRef.current.position.z = 0.09 + e * 0.22;
      if (powerOn && !reduceMotion) {
        const speed = fanSpeed === 'high' ? 12 : fanSpeed === 'med' ? 8 : 4.5;
        fanRef.current.rotation.z -= dt * speed;
        invalidate();
      }
    }
    if (coilRef.current) coilRef.current.position.z = -0.15 - e * 0.22;
    if (compressorRef.current) compressorRef.current.position.x = 0.2 + e * 0.25;
  });

  const handleSelect = (partId: string, e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    markInteracted();
    setSelectedPart(partId);
  };

  const handleDblClick = (partId: string, e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    markInteracted();
    setSelectedPart(partId);
    const info = HVAC_PARTS[partId];
    if (info?.positionResidential) {
      const [x, y, z] = info.positionResidential;
      const [ox, oy, oz] = info.cameraOffset;
      flyToPart([x + ox, y + oy, z + oz], [x, y, z]);
    }
  };

  const getEmissive = (partId: string) => {
    const st = getPartHighlightState(partId, {
      service,
      selectedPart,
      hoveredPart,
      selectedSymptom,
    });
    if (st === 'selected') return { color: _emissiveOrange, intensity: 0.48 };
    if (st === 'highlighted') return { color: _emissiveCyan, intensity: 0.32 };
    return { color: _emissiveBlack, intensity: 0 };
  };

  const coilColor = useMemo(() => _dirtyCoil.clone().lerp(_cleanCoil, cleanliness), [cleanliness]);

  const showUnit = service !== 'installation' || installStep >= 4;
  const showStand = service !== 'installation' || installStep >= 4;

  const compEm = getEmissive('compressor');
  const coilEm = getEmissive('condenser_coil');
  const fanEm = getEmissive('fan_motor');
  const valveEm = getEmissive('expansion_valve');
  const casingOpacity = xray ? 0.2 : 1.0;

  return (
    <group position={position} name="split-unit-outdoor">
      {/* Galvanized Steel Ground/Wall Mounting Brackets & Anti-Vibration Pads */}
      {showStand && (
        <group position={[0, -0.44, 0]}>
          {[-0.31, 0.31].map((xOff, i) => (
            <group key={i} position={[xOff, 0, 0]}>
              {/* Vertical wall/pad leg */}
              <mesh position={[0, 0.03, -0.18]} castShadow receiveShadow>
                <boxGeometry args={[0.06, 0.34, 0.05]} />
                <meshStandardMaterial color="#475569" metalness={0.78} roughness={0.35} />
              </mesh>
              {/* Horizontal L-bracket arm */}
              <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.065, 0.045, 0.44]} />
                <meshStandardMaterial color="#64748b" metalness={0.78} roughness={0.35} />
              </mesh>
              {/* Diagonal gusset strut */}
              <mesh position={[0, 0.03, -0.06]} rotation={[0.72, 0, 0]} castShadow>
                <boxGeometry args={[0.04, 0.03, 0.28]} />
                <meshStandardMaterial color="#475569" metalness={0.78} roughness={0.35} />
              </mesh>
              {/* Rubber vibration damper pad + bolt */}
              <mesh position={[0, 0.165, 0]} castShadow>
                <boxGeometry args={[0.08, 0.028, 0.38]} />
                <meshStandardMaterial color="#0f172a" roughness={0.95} />
              </mesh>
              <mesh position={[0, 0.185, 0.12]}>
                <cylinderGeometry args={[0.012, 0.012, 0.018, 6]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.22} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {showUnit && (
        <group>
          {/* Base Pan + Drain Stub */}
          <mesh position={[0, -0.255, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.045, 0.4]} />
            <meshStandardMaterial color="#334155" metalness={0.72} roughness={0.38} />
          </mesh>
          <mesh position={[0.15, -0.295, -0.05]} castShadow>
            <cylinderGeometry args={[0.016, 0.014, 0.05, 10]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.45} />
          </mesh>

          {/* Brushed Metal Condenser Cabinet */}
          <mesh key={`outdoor-cabinet-${quality}`} position={[0, 0.03, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.56, 0.38]} />
            {quality === 'low' ? (
              <meshStandardMaterial
                map={brushedMaps.map}
                roughnessMap={brushedMaps.roughnessMap}
                color="#d7e0ea"
                metalness={0.58}
                roughness={0.4}
                transparent={xray}
                opacity={casingOpacity}
                depthWrite={!xray}
              />
            ) : (
              <meshPhysicalMaterial
                map={brushedMaps.map}
                roughnessMap={brushedMaps.roughnessMap}
                bumpMap={brushedMaps.bumpMap}
                bumpScale={0.004}
                color="#d7e0ea"
                metalness={0.62}
                roughness={0.36}
                anisotropy={quality === 'high' ? 0.6 : 0.25}
                transparent={xray}
                opacity={casingOpacity}
                depthWrite={!xray}
              />
            )}
          </mesh>

          {/* Top Stamped Lid Lip & Panel Seam */}
          <mesh position={[0, 0.318, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.022, 0.4]} />
            <meshStandardMaterial
              color="#cbd5e1"
              metalness={0.65}
              roughness={0.34}
              transparent={xray}
              opacity={casingOpacity}
              depthWrite={!xray}
            />
          </mesh>
          {/* Vertical panel seam dividing fan bay and compressor bay */}
          <mesh position={[0.21, 0.03, 0.191]}>
            <boxGeometry args={[0.008, 0.54, 0.006]} />
            <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
          </mesh>

          {/* Side Stamped Intake Louvers */}
          <instancedMesh
            key={`outdoor-louvers-${sideLouverCount}`}
            ref={sideLouversRef}
            args={[undefined, undefined, sideLouverCount]}
            castShadow
          >
            <boxGeometry args={[0.012, 0.015, 0.24]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.68} roughness={0.34} />
          </instancedMesh>

          {/* Cabinet Corner Screws */}
          {quality !== 'low' && (
            <instancedMesh ref={screwInstancedRef} args={[undefined, undefined, screwPositions.length]}>
              <cylinderGeometry args={[0.008, 0.008, 0.012, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.22} />
            </instancedMesh>
          )}

          {/* Side Electrical Service Cover & Conduit Gland */}
          <mesh position={[0.455, -0.02, 0.04]} castShadow>
            <boxGeometry args={[0.02, 0.24, 0.18]} />
            <meshStandardMaterial color="#475569" metalness={0.55} roughness={0.4} />
          </mesh>

          {/* Inverter Compressor + Accumulator */}
          <group
            ref={compressorRef}
            position={[0.2, -0.05, -0.02]}
            onClick={(e) => handleSelect('compressor', e)}
            onDoubleClick={(e) => handleDblClick('compressor', e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredPart('compressor');
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredPart(null);
              document.body.style.cursor = 'auto';
            }}
          >
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.085, 0.085, 0.28, 20]} />
              <meshStandardMaterial
                color="#1e293b"
                metalness={0.75}
                roughness={0.32}
                emissive={compEm.color}
                emissiveIntensity={compEm.intensity}
              />
            </mesh>
            <mesh position={[-0.11, -0.02, 0.03]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.19, 14]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.18, 0.02]} castShadow>
              <boxGeometry args={[0.22, 0.06, 0.22]} />
              <meshStandardMaterial color="#0f766e" roughness={0.42} />
            </mesh>
          </group>

          {/* Rear Condenser Coil Fin Bank */}
          <group
            ref={coilRef}
            position={[-0.04, 0.03, -0.15]}
            onClick={(e) => handleSelect('condenser_coil', e)}
            onDoubleClick={(e) => handleDblClick('condenser_coil', e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredPart('condenser_coil');
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredPart(null);
              document.body.style.cursor = 'auto';
            }}
          >
            <instancedMesh
              key={`outdoor-fins-${finCount}`}
              ref={finInstancedRef}
              args={[undefined, undefined, finCount]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.01, 0.46, 0.05]} />
              <meshStandardMaterial
                color={coilColor}
                metalness={0.78}
                roughness={cleanliness < 0.5 ? 0.78 : 0.28}
                emissive={coilEm.color}
                emissiveIntensity={coilEm.intensity}
              />
            </instancedMesh>
          </group>

          {/* Swept 3-Blade Axial Condenser Fan & Motor */}
          <group
            ref={fanRef}
            position={[-0.12, 0.03, 0.09]}
            onClick={(e) => handleSelect('fan_motor', e)}
            onDoubleClick={(e) => handleDblClick('fan_motor', e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredPart('fan_motor');
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredPart(null);
              document.body.style.cursor = 'auto';
            }}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, 0.075, 18]} />
              <meshStandardMaterial
                color="#334155"
                metalness={0.68}
                roughness={0.32}
                emissive={fanEm.color}
                emissiveIntensity={fanEm.intensity}
              />
            </mesh>
            {[0, 1, 2].map((b) => (
              <group key={b} rotation={[0, 0, (b * Math.PI * 2) / 3]}>
                <mesh geometry={fanBladeGeo} rotation={[0.35, 0, 0]} castShadow>
                  <meshStandardMaterial
                    color="#0f172a"
                    roughness={0.35}
                    metalness={0.18}
                    emissive={fanEm.color}
                    emissiveIntensity={fanEm.intensity * 0.6}
                  />
                </mesh>
              </group>
            ))}
          </group>

          {/* Visible Multi-Ring Wire Fan Grille + Radial Struts + Hub Cap */}
          <group ref={grilleRef} position={[-0.12, 0.03, 0.205]}>
            {(quality === 'low' ? [0.21, 0.11] : [0.21, 0.155, 0.1, 0.05]).map((rad, idx) => (
              <mesh key={`${quality}-${rad}`} castShadow>
                <torusGeometry
                  args={[
                    rad,
                    idx === 0 ? 0.011 : 0.0055,
                    quality === 'low' ? 6 : 8,
                    quality === 'high' ? 28 : quality === 'medium' ? 18 : 12,
                  ]}
                />
                <meshStandardMaterial
                  color="#1e293b"
                  metalness={0.5}
                  roughness={0.35}
                  transparent={xray}
                  opacity={casingOpacity}
                  depthWrite={!xray}
                />
              </mesh>
            ))}
            {[0, 1, 2, 3].map((r) => (
              <mesh key={r} rotation={[0, 0, (r * Math.PI) / 4]} castShadow>
                <boxGeometry args={[0.42, 0.008, 0.008]} />
                <meshStandardMaterial
                  color="#1e293b"
                  metalness={0.5}
                  roughness={0.35}
                  transparent={xray}
                  opacity={casingOpacity}
                  depthWrite={!xray}
                />
              </mesh>
            ))}
            {/* Center Brand Hub */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.036, 0.036, 0.014, 16]} />
              <meshStandardMaterial color="#0B1F3A" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>

          {/* Brass Flare Service Valves + Patinated Copper Stubs */}
          <group
            position={[-0.44, -0.14, 0.1]}
            onClick={(e) => handleSelect('expansion_valve', e)}
            onDoubleClick={(e) => handleDblClick('expansion_valve', e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredPart('expansion_valve');
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredPart(null);
              document.body.style.cursor = 'auto';
            }}
          >
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.024, 0.024, 0.075, 10]} />
              <meshStandardMaterial
                color="#d97706"
                metalness={0.88}
                roughness={0.22}
                emissive={valveEm.color}
                emissiveIntensity={valveEm.intensity}
              />
            </mesh>
            <mesh position={[0, -0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.075, 10]} />
              <meshStandardMaterial
                color="#d97706"
                metalness={0.88}
                roughness={0.22}
                emissive={valveEm.color}
                emissiveIntensity={valveEm.intensity}
              />
            </mesh>
            {/* Copper flare stub */}
            <mesh position={[-0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.014, 0.014, 0.04, quality === 'low' ? 8 : 12]} />
              {quality === 'low' ? (
                <meshStandardMaterial
                  map={copperMaps.map}
                  roughnessMap={copperMaps.roughnessMap}
                  metalness={0.85}
                  roughness={0.26}
                />
              ) : (
                <meshPhysicalMaterial
                  map={copperMaps.map}
                  roughnessMap={copperMaps.roughnessMap}
                  metalness={0.9}
                  roughness={0.22}
                />
              )}
            </mesh>
          </group>

          {exploded && (
            <>
              <Html position={[-0.12, 0.34, 0.58]} center distanceFactor={7}>
                <div className="px-1.5 py-0.5 rounded bg-[#0B1F3A]/90 border border-white/15 text-[10px] font-medium text-slate-200 whitespace-nowrap pointer-events-none">
                  Fan Grille
                </div>
              </Html>
              <Html position={[0.45, 0.2, 0]} center distanceFactor={7}>
                <div className="px-1.5 py-0.5 rounded bg-[#0B1F3A]/90 border border-white/15 text-[10px] font-medium text-slate-200 whitespace-nowrap pointer-events-none">
                  Compressor
                </div>
              </Html>
              <Html position={[-0.04, 0.34, -0.38]} center distanceFactor={7}>
                <div className="px-1.5 py-0.5 rounded bg-[#0B1F3A]/90 border border-white/15 text-[10px] font-medium text-slate-200 whitespace-nowrap pointer-events-none">
                  Condenser Coil
                </div>
              </Html>
            </>
          )}
        </group>
      )}
    </group>
  );
}

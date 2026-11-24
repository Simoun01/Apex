import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HVAC_PARTS } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';
import { tr } from '../../i18n/tr';
import {
  createCopperPatinaMaps,
  createFilterMeshTexture,
  getPartHighlightState,
} from './hvacSceneUtils';

const _cleanFin = new THREE.Color('#d1dbe6');
const _dirtyFin = new THREE.Color('#6b5b4b');
const _cleanFilter = new THREE.Color('#94a3b8');
const _dirtyFilter = new THREE.Color('#5c4d3c');
const _emissiveCyan = new THREE.Color('#22D3EE');
const _emissiveOrange = new THREE.Color('#F97316');
const _emissiveBlack = new THREE.Color('#000000');
const _dummy = new THREE.Object3D();

interface SplitUnitIndoorProps {
  position?: [number, number, number];
  isNonInverter?: boolean;
  labelTag?: string;
}

export function SplitUnitIndoor({
  position = [-1.45, 2.22, -2.14],
  isNonInverter = false,
  labelTag,
}: SplitUnitIndoorProps) {
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
  const setSelectedPart = useHVACStore((s) => s.setSelectedPart);
  const setHoveredPart = useHVACStore((s) => s.setHoveredPart);
  const flyToPart = useHVACStore((s) => s.flyToPart);
  const markInteracted = useHVACStore((s) => s.markInteracted);

  const casingRef = useRef<THREE.Group>(null);
  const filterRef = useRef<THREE.Group>(null);
  const coilRef = useRef<THREE.Group>(null);
  const blowerRef = useRef<THREE.Group>(null);
  const pcbRef = useRef<THREE.Group>(null);
  const louverRef = useRef<THREE.Group>(null);
  const finInstancedRef = useRef<THREE.InstancedMesh>(null);
  const verticalVanesRef = useRef<THREE.InstancedMesh>(null);
  const topIntakeSlatsRef = useRef<THREE.InstancedMesh>(null);

  const explodeProgress = useRef(0);
  const louverAngle = useRef(powerOn ? 0.55 : 0.05);

  const filterTex = useMemo(() => createFilterMeshTexture(), []);
  const copperMaps = useMemo(() => createCopperPatinaMaps(), []);

  // Contoured beveled front fascia ExtrudeGeometry
  const frontShellGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.06, -0.14);
    shape.lineTo(0.05, -0.14);
    shape.quadraticCurveTo(0.085, -0.12, 0.09, -0.02);
    shape.quadraticCurveTo(0.085, 0.11, 0.03, 0.145);
    shape.lineTo(-0.06, 0.145);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 1.06,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 3,
    });
    // Rotate so width runs along X (-0.53..+0.53) and profile is in YZ plane
    geo.rotateY(Math.PI / 2);
    geo.translate(-0.53, 0, 0.055);
    geo.computeVertexNormals();
    return geo;
  }, []);

  const finCount = quality === 'high' ? 34 : quality === 'medium' ? 20 : 10;
  const vaneCount = quality === 'high' ? 16 : quality === 'medium' ? 10 : 5;
  const slatCount = quality === 'high' ? 12 : quality === 'medium' ? 7 : 4;

  useEffect(() => {
    return () => {
      filterTex.dispose();
      copperMaps.map.dispose();
      copperMaps.roughnessMap.dispose();
      frontShellGeo.dispose();
    };
  }, [filterTex, copperMaps, frontShellGeo]);

  useEffect(() => {
    if (finInstancedRef.current) {
      for (let i = 0; i < finCount; i++) {
        const x = -0.39 + (i / (finCount - 1)) * 0.78;
        _dummy.position.set(x, 0, 0);
        _dummy.rotation.set(0.28, 0, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        finInstancedRef.current.setMatrixAt(i, _dummy.matrix);
      }
      finInstancedRef.current.instanceMatrix.needsUpdate = true;
      finInstancedRef.current.computeBoundingSphere();
    }

    if (verticalVanesRef.current) {
      for (let i = 0; i < vaneCount; i++) {
        const x = -0.4 + (i / (vaneCount - 1)) * 0.8;
        _dummy.position.set(x, -0.105, 0.095);
        _dummy.rotation.set(0, (i < vaneCount / 2 ? -0.18 : 0.18), 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        verticalVanesRef.current.setMatrixAt(i, _dummy.matrix);
      }
      verticalVanesRef.current.instanceMatrix.needsUpdate = true;
      verticalVanesRef.current.computeBoundingSphere();
    }

    if (topIntakeSlatsRef.current) {
      for (let i = 0; i < slatCount; i++) {
        const z = -0.02 + (i / (slatCount - 1)) * 0.08;
        _dummy.position.set(0, 0.148, z);
        _dummy.rotation.set(0.25, 0, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        topIntakeSlatsRef.current.setMatrixAt(i, _dummy.matrix);
      }
      topIntakeSlatsRef.current.instanceMatrix.needsUpdate = true;
      topIntakeSlatsRef.current.computeBoundingSphere();
    }
  }, [finCount, vaneCount, slatCount]);

  const cleanliness = service === 'cleaning' ? cleaningBeforeAfter : 0.96;

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
    if (casingRef.current) casingRef.current.position.z = e * 0.42;
    if (filterRef.current) {
      filterRef.current.position.y = 0.08 + e * 0.24;
      filterRef.current.position.z = 0.07 + e * 0.26;
    }
    if (coilRef.current) coilRef.current.position.z = 0.01 + e * 0.08;
    if (blowerRef.current) {
      blowerRef.current.position.y = -0.05 - e * 0.14;
      blowerRef.current.position.z = 0.01 + e * 0.04;
      if (powerOn && !reduceMotion) {
        const rpm = fanSpeed === 'high' ? 14 : fanSpeed === 'med' ? 9 : 5;
        blowerRef.current.rotation.x += dt * rpm;
        invalidate();
      }
    }
    if (pcbRef.current) {
      pcbRef.current.position.x = 0.48 + e * 0.25;
      pcbRef.current.position.z = 0.03 + e * 0.14;
    }

    const targetLouver = powerOn ? 0.62 : 0.04;
    if (reduceMotion) {
      louverAngle.current = targetLouver;
    } else if (Math.abs(louverAngle.current - targetLouver) > 0.004) {
      louverAngle.current = THREE.MathUtils.damp(louverAngle.current, targetLouver, 5, dt);
      invalidate();
    }
    if (louverRef.current) {
      louverRef.current.rotation.x = louverAngle.current;
    }
  });

  const handlePartInteract = (partId: string, e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    markInteracted();
    setSelectedPart(partId);
  };

  const handlePartDoubleClick = (partId: string, e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    markInteracted();
    setSelectedPart(partId);
    const info = HVAC_PARTS[partId];
    if (info && info.positionResidential) {
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
    if (st === 'selected') return { color: _emissiveOrange, intensity: 0.45 };
    if (st === 'highlighted') return { color: _emissiveCyan, intensity: 0.3 };
    return { color: _emissiveBlack, intensity: 0 };
  };

  const coilColor = useMemo(() => _dirtyFin.clone().lerp(_cleanFin, cleanliness), [cleanliness]);
  const filterColor = useMemo(
    () => _dirtyFilter.clone().lerp(_cleanFilter, cleanliness),
    [cleanliness],
  );

  const coilEm = getEmissive('evaporator_coil');
  const filterEm = getEmissive('filter');
  const blowerEm = getEmissive('blower_wheel');
  const drainEm = getEmissive('drain_pan');
  const pcbEm = getEmissive('thermostat');
  const casingOpacity = xray ? 0.22 : 1.0;

  return (
    <group position={position} name="split-unit-indoor">
      {/* Galvanized Steel Wall Mounting Backplate + 6 Masonry Anchor Screws */}
      <group position={[0, 0, -0.115]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.04, 0.29, 0.018]} />
          <meshStandardMaterial color="#64748b" metalness={0.82} roughness={0.32} />
        </mesh>
        {quality !== 'low' &&
          [
            [-0.45, 0.1, 0.012],
            [0, 0.1, 0.012],
            [0.45, 0.1, 0.012],
            [-0.45, -0.1, 0.012],
            [0, -0.1, 0.012],
            [0.45, -0.1, 0.012],
          ].map((pos, idx) => (
            <mesh key={idx} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.012, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.22} />
            </mesh>
          ))}
      </group>

      {/* Rear Chassis Tub */}
      <mesh position={[0, 0, -0.055]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.28, 0.1]} />
        <meshStandardMaterial
          color="#cbd5e1"
          roughness={0.42}
          metalness={0.1}
          transparent={xray}
          opacity={xray ? 0.28 : 1}
          depthWrite={!xray}
        />
      </mesh>

      {/* Drain Pan & Trough */}
      <mesh
        position={[0, -0.125, 0.025]}
        castShadow
        receiveShadow
        onClick={(e) => handlePartInteract('drain_pan', e)}
        onDoubleClick={(e) => handlePartDoubleClick('drain_pan', e)}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPart('drain_pan');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredPart(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[0.96, 0.032, 0.11]} />
        <meshStandardMaterial
          color={cleanliness < 0.45 ? '#6b5344' : '#e2e8f0'}
          roughness={0.48}
          emissive={drainEm.color}
          emissiveIntensity={drainEm.intensity}
        />
      </mesh>

      {/* Evaporator Coil Assembly (Instanced Aluminum Fins + Patinated Copper U-Bends) */}
      <group
        ref={coilRef}
        position={[0, 0.02, 0.01]}
        onClick={(e) => handlePartInteract('evaporator_coil', e)}
        onDoubleClick={(e) => handlePartDoubleClick('evaporator_coil', e)}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPart('evaporator_coil');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredPart(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <instancedMesh
          key={`indoor-fins-${finCount}`}
          ref={finInstancedRef}
          args={[undefined, undefined, finCount]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.007, 0.16, 0.09]} />
          <meshStandardMaterial
            color={coilColor}
            metalness={0.82}
            roughness={cleanliness < 0.5 ? 0.72 : 0.26}
            emissive={coilEm.color}
            emissiveIntensity={coilEm.intensity}
          />
        </instancedMesh>
        {/* Patinated Copper U-bend loops */}
        {[-0.045, 0, 0.045].map((yOff, i) => (
          <mesh key={i} position={[-0.41, yOff, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <torusGeometry args={[0.022, 0.008, quality === 'low' ? 6 : 8, quality === 'low' ? 10 : 16, Math.PI]} />
            {quality === 'low' ? (
              <meshStandardMaterial
                map={copperMaps.map}
                roughnessMap={copperMaps.roughnessMap}
                metalness={0.85}
                roughness={0.28}
              />
            ) : (
              <meshPhysicalMaterial
                map={copperMaps.map}
                roughnessMap={copperMaps.roughnessMap}
                metalness={0.9}
                roughness={0.22}
                clearcoat={0.35}
              />
            )}
          </mesh>
        ))}
      </group>

      {/* Cross-Flow Blower Wheel */}
      <group
        ref={blowerRef}
        position={[-0.04, -0.05, 0.01]}
        onClick={(e) => handlePartInteract('blower_wheel', e)}
        onDoubleClick={(e) => handlePartDoubleClick('blower_wheel', e)}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPart('blower_wheel');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredPart(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.78, 18]} />
          <meshStandardMaterial
            color={cleanliness < 0.45 ? '#574c41' : '#1e293b'}
            roughness={0.45}
            metalness={0.25}
            emissive={blowerEm.color}
            emissiveIntensity={blowerEm.intensity}
          />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <mesh key={idx} rotation={[(idx * Math.PI) / 6, 0, 0]} castShadow>
            <boxGeometry args={[0.76, 0.095, 0.006]} />
            <meshStandardMaterial color="#334155" roughness={0.45} />
          </mesh>
        ))}
      </group>

      {/* Intake Filter Mesh */}
      <group
        ref={filterRef}
        position={[-0.03, 0.08, 0.07]}
        rotation={[-0.42, 0, 0]}
        onClick={(e) => handlePartInteract('filter', e)}
        onDoubleClick={(e) => handlePartDoubleClick('filter', e)}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPart('filter');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredPart(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.84, 0.14, 0.01]} />
          <meshStandardMaterial
            map={filterTex}
            color={filterColor}
            roughness={cleanliness < 0.5 ? 0.92 : 0.55}
            emissive={filterEm.color}
            emissiveIntensity={filterEm.intensity}
          />
        </mesh>
      </group>

      {/* PCB & Display Control Module */}
      <group
        ref={pcbRef}
        position={[0.48, -0.02, 0.03]}
        onClick={(e) => handlePartInteract('thermostat', e)}
        onDoubleClick={(e) => handlePartDoubleClick('thermostat', e)}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPart('thermostat');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredPart(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <mesh castShadow>
          <boxGeometry args={[0.1, 0.2, 0.07]} />
          <meshStandardMaterial
            color="#065f46"
            roughness={0.4}
            metalness={0.22}
            emissive={pcbEm.color}
            emissiveIntensity={pcbEm.intensity}
          />
        </mesh>
        {/* Terminal block & screws */}
        <mesh position={[0, 0.05, 0.038]}>
          <boxGeometry args={[0.06, 0.035, 0.015]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        {/* LED Status Indicator */}
        <mesh position={[0, -0.04, 0.04]}>
          <boxGeometry args={[0.055, 0.024, 0.008]} />
          <meshStandardMaterial
            color={powerOn ? '#22D3EE' : '#334155'}
            emissive={powerOn ? '#22D3EE' : '#000000'}
            emissiveIntensity={powerOn ? 1.8 : 0}
          />
        </mesh>
      </group>

      {/* Beveled Outer Front Casing + Top Intake Slats + Real Discharge Louver Fins */}
      <group ref={casingRef}>
        <mesh key={`indoor-shell-${quality}`} geometry={frontShellGeo} castShadow receiveShadow>
          {quality === 'low' ? (
            <meshStandardMaterial
              color={isNonInverter ? '#e2e8f0' : '#f8fafc'}
              roughness={0.28}
              metalness={0.05}
              transparent={xray}
              opacity={casingOpacity}
              depthWrite={!xray}
            />
          ) : (
            <meshPhysicalMaterial
              color={isNonInverter ? '#e2e8f0' : '#f8fafc'}
              roughness={0.2}
              metalness={0.05}
              clearcoat={0.65}
              clearcoatRoughness={0.18}
              transparent={xray}
              opacity={casingOpacity}
              depthWrite={!xray}
            />
          )}
        </mesh>

        {/* Horizontal front panel seam groove */}
        <mesh position={[0, 0.062, 0.142]}>
          <boxGeometry args={[1.05, 0.005, 0.006]} />
          <meshStandardMaterial
            color="#94a3b8"
            metalness={0.4}
            roughness={0.4}
            transparent={xray}
            opacity={casingOpacity}
            depthWrite={!xray}
          />
        </mesh>

        {/* Metallic brand trim accent */}
        <mesh position={[0, 0.072, 0.143]}>
          <boxGeometry args={[1.04, 0.012, 0.005]} />
          <meshStandardMaterial
            color={isNonInverter ? '#64748b' : '#22D3EE'}
            metalness={0.75}
            roughness={0.22}
            transparent={xray}
            opacity={casingOpacity}
            depthWrite={!xray}
          />
        </mesh>

        {/* Top Intake Grille Slat Bars */}
        <instancedMesh
          key={`indoor-slats-${slatCount}`}
          ref={topIntakeSlatsRef}
          args={[undefined, undefined, slatCount]}
          castShadow
        >
          <boxGeometry args={[0.92, 0.006, 0.009]} />
          <meshStandardMaterial
            color="#cbd5e1"
            roughness={0.35}
            transparent={xray}
            opacity={casingOpacity}
            depthWrite={!xray}
          />
        </instancedMesh>

        {/* Internal Vertical Air-Deflector Louver Fins */}
        <instancedMesh
          key={`indoor-vanes-${vaneCount}`}
          ref={verticalVanesRef}
          args={[undefined, undefined, vaneCount]}
          castShadow
        >
          <boxGeometry args={[0.007, 0.04, 0.032]} />
          <meshStandardMaterial
            color="#334155"
            roughness={0.45}
            transparent={xray}
            opacity={casingOpacity}
            depthWrite={!xray}
          />
        </instancedMesh>

        {/* Side Chassis Screw Caps */}
        {quality !== 'low' &&
          [-0.535, 0.535].map((xPos, idx) => (
            <mesh key={idx} position={[xPos, -0.08, 0.07]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.007, 0.007, 0.01, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
            </mesh>
          ))}

        {/* Dual-Vane Motorized Supply Louver Assembly */}
        <group ref={louverRef} position={[0, -0.115, 0.11]} rotation={[0.55, 0, 0]}>
          <mesh key={`indoor-louver-${quality}`} castShadow receiveShadow>
            <boxGeometry args={[0.94, 0.012, 0.055]} />
            {quality === 'low' ? (
              <meshStandardMaterial
                color="#e2e8f0"
                roughness={0.3}
                transparent={xray}
                opacity={casingOpacity}
                depthWrite={!xray}
              />
            ) : (
              <meshPhysicalMaterial
                color="#e2e8f0"
                roughness={0.25}
                clearcoat={0.4}
                transparent={xray}
                opacity={casingOpacity}
                depthWrite={!xray}
              />
            )}
          </mesh>
          <mesh position={[0, 0.018, -0.012]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.92, 0.008, 0.035]} />
            <meshStandardMaterial
              color="#cbd5e1"
              roughness={0.35}
              transparent={xray}
              opacity={casingOpacity}
              depthWrite={!xray}
            />
          </mesh>
        </group>
      </group>

      {exploded && (
        <>
          <Html position={[0, 0.44, 0.35]} center distanceFactor={3.8}>
            <div className="px-1.5 py-0.5 rounded bg-[#0B1F3A]/90 border border-white/15 text-[9px] leading-tight font-medium text-slate-200 whitespace-nowrap pointer-events-none">
              {tr('Filter Mesh')}
            </div>
          </Html>
          <Html position={[0, 0.04, 0.48]} center distanceFactor={3.8}>
            <div className="px-1.5 py-0.5 rounded bg-[#0B1F3A]/90 border border-white/15 text-[9px] leading-tight font-medium text-slate-200 whitespace-nowrap pointer-events-none">
              {tr('Front Casing & Louvers')}
            </div>
          </Html>
          <Html position={[0.75, -0.02, 0.18]} center distanceFactor={3.8}>
            <div className="px-1.5 py-0.5 rounded bg-[#0B1F3A]/90 border border-white/15 text-[9px] leading-tight font-medium text-slate-200 whitespace-nowrap pointer-events-none">
              {tr('Inverter PCB')}
            </div>
          </Html>
        </>
      )}

      {labelTag && (
        <Html position={[0, 0.28, 0.08]} center distanceFactor={4}>
          <div className="px-2 py-0.5 rounded bg-[#0B1F3A]/95 border border-[#22D3EE]/50 text-[10px] leading-tight font-semibold text-[#22D3EE] whitespace-nowrap pointer-events-none">
            {labelTag}
          </div>
        </Html>
      )}
    </group>
  );
}

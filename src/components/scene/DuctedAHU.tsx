import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HVAC_PARTS } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';
import { getPartHighlightState } from './hvacSceneUtils';
import { tr } from '../../i18n/tr';

const _emissiveCyan = new THREE.Color('#22D3EE');
const _emissiveOrange = new THREE.Color('#F97316');
const _emissiveBlack = new THREE.Color('#000000');
const _cleanMetal = new THREE.Color('#cbd5e1');
const _dirtyMetal = new THREE.Color('#665647');

/** `ductsOnly`: draw just the ductwork & diffusers; the AHU and cassette come from the detailed models. */
export function DuctedAHU({ ductsOnly = false }: { ductsOnly?: boolean } = {}) {
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
  const selectedEquipmentId = useHVACStore((s) => s.selectedEquipmentId);
  const reduceMotion = useHVACStore((s) => s.reduceMotion);
  const installStep = useHVACStore((s) => s.installStep);
  const setSelectedPart = useHVACStore((s) => s.setSelectedPart);
  const setHoveredPart = useHVACStore((s) => s.setHoveredPart);
  const flyToPart = useHVACStore((s) => s.flyToPart);
  const markInteracted = useHVACStore((s) => s.markInteracted);

  const cassetteGrilleRef = useRef<THREE.Group>(null);
  const blowerRef = useRef<THREE.Mesh>(null);
  const expProgress = useRef(0);

  const cleanliness = service === 'cleaning' ? cleaningBeforeAfter : 0.96;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = exploded ? 1 : 0;
    if (reduceMotion) {
      expProgress.current = target;
    } else if (Math.abs(expProgress.current - target) > 0.002) {
      expProgress.current = THREE.MathUtils.damp(expProgress.current, target, 6, dt);
      invalidate();
    }
    if (cassetteGrilleRef.current) {
      cassetteGrilleRef.current.position.y = -0.14 - expProgress.current * 0.3;
    }
    if (blowerRef.current && powerOn && !reduceMotion) {
      const speed = fanSpeed === 'high' ? 12 : fanSpeed === 'med' ? 7 : 4;
      blowerRef.current.rotation.z += dt * speed;
      invalidate();
    }
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
    if (info?.positionCommercial) {
      const [x, y, z] = info.positionCommercial;
      const [ox, oy, oz] = info.cameraOffset;
      flyToPart([x + ox, y + oy, z + oz], [x, y, z]);
    }
  };

  const getEm = (partId: string) => {
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

  const coilCol = useMemo(
    () => _dirtyMetal.clone().lerp(_cleanMetal, cleanliness),
    [cleanliness],
  );

  const showDucts =
    (service !== 'equipment' ||
      selectedEquipmentId === 'com_ducted' ||
      selectedEquipmentId === 'com_packaged' ||
      selectedEquipmentId === 'com_vrf') &&
    (service !== 'installation' || installStep >= 3);

  const showCassette =
    service !== 'equipment' ||
    selectedEquipmentId === 'com_cassette' ||
    selectedEquipmentId === 'com_vrf';

  const ahuCoilEm = getEm('evaporator_coil');
  const filterEm = getEm('filter');
  const blowerEm = getEm('blower_wheel');
  const ductEm = getEm('ductwork');
  const diffEm = getEm('diffusers');
  const drainEm = getEm('drain_pan');
  const casingOpacity = xray ? 0.22 : 1.0;

  return (
    <group name="commercial-indoor-hvac">
      {/* Concealed Ceiling Ducted AHU (Air Handling Unit) */}
      {!ductsOnly && (
      <group position={[-1.95, 2.55, -1.6]}>
        {/* Main Insulated Sheet-Metal Cabinet */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.15, 0.34, 0.72]} />
          <meshStandardMaterial
            color="#94a3b8"
            metalness={0.55}
            roughness={0.35}
            transparent={xray}
            opacity={casingOpacity}
            depthWrite={!xray}
          />
        </mesh>

        {/* Internal Evaporator Coil Bank */}
        <mesh
          position={[0.12, 0, 0]}
          onClick={(e) => handleSelect('evaporator_coil', e)}
          onDoubleClick={(e) => handleDblClick('evaporator_coil', e)}
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
          <boxGeometry args={[0.28, 0.26, 0.6]} />
          <meshStandardMaterial
            color={coilCol}
            metalness={0.75}
            roughness={0.35}
            emissive={ahuCoilEm.color}
            emissiveIntensity={ahuCoilEm.intensity}
          />
        </mesh>

        {/* Pleated Return Air Filter Rack */}
        <mesh
          position={[-0.38, 0, 0]}
          onClick={(e) => handleSelect('filter', e)}
          onDoubleClick={(e) => handleDblClick('filter', e)}
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
          <boxGeometry args={[0.07, 0.26, 0.6]} />
          <meshStandardMaterial
            color={cleanliness < 0.45 ? '#5c4d3c' : '#cbd5e1'}
            roughness={0.8}
            emissive={filterEm.color}
            emissiveIntensity={filterEm.intensity}
          />
        </mesh>

        {/* Centrifugal Blower Drum */}
        <mesh
          ref={blowerRef}
          position={[0.38, -0.02, 0.14]}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={(e) => handleSelect('blower_wheel', e)}
          onDoubleClick={(e) => handleDblClick('blower_wheel', e)}
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
          <cylinderGeometry args={[0.1, 0.1, 0.34, 16]} />
          <meshStandardMaterial
            color="#334155"
            metalness={0.6}
            roughness={0.4}
            emissive={blowerEm.color}
            emissiveIntensity={blowerEm.intensity}
          />
        </mesh>

        {/* Stainless Drain Pan under AHU */}
        <mesh
          position={[0, -0.18, 0]}
          onClick={(e) => handleSelect('drain_pan', e)}
          onDoubleClick={(e) => handleDblClick('drain_pan', e)}
        >
          <boxGeometry args={[1.18, 0.03, 0.76]} />
          <meshStandardMaterial
            color="#64748b"
            metalness={0.7}
            roughness={0.35}
            emissive={drainEm.color}
            emissiveIntensity={drainEm.intensity}
          />
        </mesh>
      </group>
      )}

      {/* Insulated Supply Ductwork Trunk + Branch Plenums */}
      {showDucts && (
        <group
          onClick={(e) => handleSelect('ductwork', e)}
          onDoubleClick={(e) => handleDblClick('ductwork', e)}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredPart('ductwork');
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHoveredPart(null);
            document.body.style.cursor = 'auto';
          }}
        >
          {/* Main Trunk */}
          <mesh position={[-0.65, 2.66, -0.55]} castShadow>
            <boxGeometry args={[2.1, 0.24, 0.32]} />
            <meshStandardMaterial
              color="#94a3b8"
              metalness={0.55}
              roughness={0.35}
              emissive={ductEm.color}
              emissiveIntensity={ductEm.intensity}
            />
          </mesh>
          {/* Transition Elbow from AHU */}
          <mesh position={[-1.55, 2.62, -1.05]} castShadow>
            <boxGeometry args={[0.38, 0.24, 0.85]} />
            <meshStandardMaterial
              color="#94a3b8"
              metalness={0.55}
              roughness={0.35}
              emissive={ductEm.color}
              emissiveIntensity={ductEm.intensity}
            />
          </mesh>
          {/* Branch Duct to Front Diffuser 1 */}
          <mesh position={[-0.25, 2.55, 0.05]} castShadow>
            <boxGeometry args={[0.28, 0.2, 1.0]} />
            <meshStandardMaterial
              color="#cbd5e1"
              metalness={0.5}
              roughness={0.38}
              emissive={ductEm.color}
              emissiveIntensity={ductEm.intensity}
            />
          </mesh>
          {/* Branch Duct to Front Diffuser 2 */}
          <mesh position={[-1.65, 2.55, 0.05]} castShadow>
            <boxGeometry args={[0.28, 0.2, 1.0]} />
            <meshStandardMaterial
              color="#cbd5e1"
              metalness={0.5}
              roughness={0.38}
              emissive={ductEm.color}
              emissiveIntensity={ductEm.intensity}
            />
          </mesh>

          {/* 4-Way Ceiling Diffusers */}
          {[-0.25, -1.65].map((xPos, idx) => (
            <group
              key={idx}
              position={[xPos, 2.38, 0.45]}
              onClick={(e) => handleSelect('diffusers', e)}
              onDoubleClick={(e) => handleDblClick('diffusers', e)}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredPart('diffusers');
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredPart(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <mesh>
                <boxGeometry args={[0.52, 0.04, 0.52]} />
                <meshStandardMaterial
                  color="#f8fafc"
                  roughness={0.3}
                  emissive={diffEm.color}
                  emissiveIntensity={diffEm.intensity}
                />
              </mesh>
              <mesh position={[0, -0.022, 0]}>
                <boxGeometry args={[0.36, 0.015, 0.36]} />
                <meshStandardMaterial color="#1e293b" roughness={0.5} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* 4-Way Ceiling Cassette Unit */}
      {showCassette && !ductsOnly && (
        <group position={[-0.25, 2.48, -1.35]}>
          {/* Concealed Body */}
          <mesh castShadow>
            <boxGeometry args={[0.78, 0.24, 0.78]} />
            <meshStandardMaterial
              color="#64748b"
              metalness={0.6}
              roughness={0.4}
              transparent={xray}
              opacity={casingOpacity}
              depthWrite={!xray}
            />
          </mesh>
          {/* Decorative Flush Ceiling Fascia & 4-Way Louvers */}
          <group ref={cassetteGrilleRef} position={[0, -0.14, 0]}>
            <mesh>
              <boxGeometry args={[0.88, 0.04, 0.88]} />
              <meshPhysicalMaterial
                color="#f8fafc"
                roughness={0.25}
                clearcoat={0.5}
              />
            </mesh>
            {/* Central Return Intake Grille */}
            <mesh position={[0, -0.022, 0]}>
              <boxGeometry args={[0.42, 0.01, 0.42]} />
              <meshStandardMaterial color="#334155" roughness={0.6} />
            </mesh>
            {/* 4 Perimeter Supply Slots */}
            <mesh position={[0, -0.022, 0.34]}>
              <boxGeometry args={[0.56, 0.01, 0.05]} />
              <meshStandardMaterial color="#22D3EE" emissive="#22D3EE" emissiveIntensity={powerOn ? 0.35 : 0} />
            </mesh>
            <mesh position={[0, -0.022, -0.34]}>
              <boxGeometry args={[0.56, 0.01, 0.05]} />
              <meshStandardMaterial color="#22D3EE" emissive="#22D3EE" emissiveIntensity={powerOn ? 0.35 : 0} />
            </mesh>
          </group>
          {exploded && (
            <Html position={[0, -0.5, 0]} center distanceFactor={4}>
              <div className="px-1.5 py-0.5 rounded bg-[#0B1F3A]/90 border border-white/15 text-[9px] leading-tight font-medium text-slate-200 whitespace-nowrap pointer-events-none">
                {tr('4-Way Cassette Fascia')}
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  );
}

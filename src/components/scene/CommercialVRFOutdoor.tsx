import { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HVAC_PARTS } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';
import { getPartHighlightState } from './hvacSceneUtils';

const _emissiveCyan = new THREE.Color('#22D3EE');
const _emissiveOrange = new THREE.Color('#F97316');
const _emissiveBlack = new THREE.Color('#000000');

export function CommercialVRFOutdoor() {
  const { invalidate } = useThree();
  const service = useHVACStore((s) => s.service);
  const exploded = useHVACStore((s) => s.exploded);
  const xray = useHVACStore((s) => s.xray);
  const powerOn = useHVACStore((s) => s.powerOn);
  const fanSpeed = useHVACStore((s) => s.fanSpeed);
  const selectedPart = useHVACStore((s) => s.selectedPart);
  const hoveredPart = useHVACStore((s) => s.hoveredPart);
  const selectedSymptom = useHVACStore((s) => s.selectedSymptom);
  const selectedEquipmentId = useHVACStore((s) => s.selectedEquipmentId);
  const reduceMotion = useHVACStore((s) => s.reduceMotion);
  const installStep = useHVACStore((s) => s.installStep);
  const setSelectedPart = useHVACStore((s) => s.setSelectedPart);
  const setHoveredPart = useHVACStore((s) => s.setHoveredPart);
  const flyToPart = useHVACStore((s) => s.flyToPart);
  const markInteracted = useHVACStore((s) => s.markInteracted);

  const fan1Ref = useRef<THREE.Group>(null);
  const fan2Ref = useRef<THREE.Group>(null);
  const topShroudRef = useRef<THREE.Group>(null);
  const expProgress = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = exploded ? 1 : 0;
    if (reduceMotion) {
      expProgress.current = target;
    } else if (Math.abs(expProgress.current - target) > 0.002) {
      expProgress.current = THREE.MathUtils.damp(expProgress.current, target, 6, dt);
      invalidate();
    }

    if (topShroudRef.current) {
      topShroudRef.current.position.y = 0.72 + expProgress.current * 0.42;
    }

    if (powerOn && !reduceMotion) {
      const spd = fanSpeed === 'high' ? 11 : fanSpeed === 'med' ? 7 : 4;
      if (fan1Ref.current) fan1Ref.current.rotation.y += dt * spd;
      if (fan2Ref.current) fan2Ref.current.rotation.y += dt * spd;
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

  const showUnit = service !== 'installation' || installStep >= 4;
  if (!showUnit) return null;

  const isPackaged = service === 'equipment' && selectedEquipmentId === 'com_packaged';
  const isChiller = service === 'equipment' && selectedEquipmentId === 'com_chiller';

  const compEm = getEm('compressor');
  const coilEm = getEm('condenser_coil');
  const fanEm = getEm('fan_motor');
  const branchEm = getEm('vrf_branch_box');
  const casingOpacity = xray ? 0.2 : 1.0;

  return (
    <group name="commercial-rooftop-cluster">
      {/* VRF Branch Selector Box mounted in plenum near deck */}
      <group
        position={[1.3, 2.78, -1.45]}
        onClick={(e) => handleSelect('vrf_branch_box', e)}
        onDoubleClick={(e) => handleDblClick('vrf_branch_box', e)}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPart('vrf_branch_box');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredPart(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.22, 0.34]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.7}
            roughness={0.35}
            emissive={branchEm.color}
            emissiveIntensity={branchEm.intensity}
          />
        </mesh>
        {/* Brass distribution ports */}
        {[-0.1, 0, 0.1].map((zOff, i) => (
          <mesh key={i} position={[-0.24, 0, zOff]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.08, 10]} />
            <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.25} />
          </mesh>
        ))}
      </group>

      {/* Main Rooftop Unit Cluster */}
      <group position={[2.85, 2.68, -1.25]}>
        {/* Heavy I-Beam Mounting Skid */}
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.45, 0.08, 1.5]} />
          <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.35} />
        </mesh>

        {/* Outer Chassis */}
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <boxGeometry
            args={isPackaged ? [1.55, 0.88, 1.55] : isChiller ? [1.65, 0.95, 1.7] : [1.28, 0.82, 1.38]}
          />
          <meshStandardMaterial
            color={isChiller ? '#0e7490' : '#cbd5e1'}
            metalness={0.35}
            roughness={0.42}
            transparent={xray}
            opacity={casingOpacity}
            depthWrite={!xray}
          />
        </mesh>

        {/* Twin Inverter Scroll Compressors inside */}
        <group
          position={[0.15, 0.32, -0.1]}
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
          {[-0.16, 0.16].map((zOff, idx) => (
            <mesh key={idx} position={[0, 0, zOff]} castShadow>
              <cylinderGeometry args={[0.11, 0.11, 0.38, 16]} />
              <meshStandardMaterial
                color="#0f172a"
                metalness={0.75}
                roughness={0.3}
                emissive={compEm.color}
                emissiveIntensity={compEm.intensity}
              />
            </mesh>
          ))}
        </group>

        {/* Wrap-around Condenser Coil Bank */}
        <mesh
          position={[0, 0.48, -0.66]}
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
          <boxGeometry args={[1.15, 0.68, 0.08]} />
          <meshStandardMaterial
            color="#94a3b8"
            metalness={0.75}
            roughness={0.32}
            emissive={coilEm.color}
            emissiveIntensity={coilEm.intensity}
          />
        </mesh>

        {/* Top Discharge Fans + Exploding Shrouds */}
        <group ref={topShroudRef} position={[0, 0.72, 0]}>
          {[-0.32, 0.32].map((zOff, idx) => (
            <group
              key={idx}
              position={[0, 0.2, zOff]}
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
              {/* Fan Shroud Collar */}
              <mesh>
                <cylinderGeometry args={[0.26, 0.28, 0.12, 20, 1, true]} />
                <meshStandardMaterial
                  color="#1e293b"
                  side={THREE.DoubleSide}
                  roughness={0.4}
                  emissive={fanEm.color}
                  emissiveIntensity={fanEm.intensity * 0.5}
                />
              </mesh>
              {/* Spinning Axial Rotor */}
              <group ref={idx === 0 ? fan1Ref : fan2Ref}>
                <mesh>
                  <cylinderGeometry args={[0.05, 0.05, 0.06, 12]} />
                  <meshStandardMaterial color="#334155" metalness={0.7} />
                </mesh>
                {[0, 1, 2].map((b) => (
                  <mesh key={b} rotation={[0, (b * Math.PI * 2) / 3, 0]}>
                    <boxGeometry args={[0.44, 0.012, 0.07]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.4} />
                  </mesh>
                ))}
              </group>
            </group>
          ))}
        </group>

        {isChiller && (
          <Html position={[0, 1.35, 0]} center distanceFactor={8}>
            <div className="px-2 py-0.5 rounded bg-[#0B1F3A]/95 border border-[#22D3EE]/50 text-[11px] font-semibold text-[#22D3EE] whitespace-nowrap pointer-events-none">
              Chilled-Water Plant (Consultative)
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

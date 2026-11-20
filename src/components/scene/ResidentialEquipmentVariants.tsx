import { Html } from '@react-three/drei';
import { getEquipmentById, useHVACStore } from '../../store/useHVACStore';
import { SplitUnitIndoor } from './SplitUnitIndoor';

function WindowACModel({ position, label }: { position: [number, number, number]; label?: string }) {
  const powerOn = useHVACStore((s) => s.powerOn);
  const xray = useHVACStore((s) => s.xray);
  return (
    <group position={position}>
      {/* Main Sleeve Chassis */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.66, 0.44, 0.56]} />
        <meshStandardMaterial
          color="#e2e8f0"
          roughness={0.32}
          transparent={xray}
          opacity={xray ? 0.35 : 1}
        />
      </mesh>
      {/* Front Intake Grille */}
      <mesh position={[-0.12, 0, 0.285]}>
        <boxGeometry args={[0.36, 0.34, 0.02]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>
      {/* Supply Vent Louvers */}
      <mesh position={[0.19, 0.06, 0.285]}>
        <boxGeometry args={[0.2, 0.22, 0.02]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>
      {/* Digital Control Panel */}
      <mesh position={[0.19, -0.12, 0.285]}>
        <boxGeometry args={[0.18, 0.09, 0.02]} />
        <meshStandardMaterial
          color="#0B1F3A"
          emissive={powerOn ? '#22D3EE' : '#000000'}
          emissiveIntensity={powerOn ? 0.8 : 0}
        />
      </mesh>
      {label && (
        <Html position={[0, 0.38, 0]} center distanceFactor={7}>
          <div className="px-2 py-0.5 rounded bg-[#0B1F3A]/95 border border-[#22D3EE]/50 text-[11px] font-semibold text-[#22D3EE] whitespace-nowrap pointer-events-none">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

function FloorMountedModel({ position, label }: { position: [number, number, number]; label?: string }) {
  const powerOn = useHVACStore((s) => s.powerOn);
  const xray = useHVACStore((s) => s.xray);
  return (
    <group position={position}>
      {/* Base Plinth */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.56, 0.08, 0.38]} />
        <meshStandardMaterial color="#1e293b" roughness={0.45} />
      </mesh>
      {/* Tall Tower Body */}
      <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.68, 0.34]} />
        <meshPhysicalMaterial
          color="#f8fafc"
          roughness={0.22}
          clearcoat={0.55}
          transparent={xray}
          opacity={xray ? 0.3 : 1}
        />
      </mesh>
      {/* Top Supply Air Grille */}
      <mesh position={[0, 1.5, 0.175]}>
        <boxGeometry args={[0.4, 0.34, 0.02]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>
      {/* Circular LED Touch Display */}
      <mesh position={[0, 1.18, 0.175]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.015, 20]} />
        <meshStandardMaterial
          color="#0B1F3A"
          emissive={powerOn ? '#22D3EE' : '#000000'}
          emissiveIntensity={powerOn ? 0.9 : 0}
        />
      </mesh>
      {label && (
        <Html position={[0, 1.92, 0]} center distanceFactor={7}>
          <div className="px-2 py-0.5 rounded bg-[#0B1F3A]/95 border border-[#22D3EE]/50 text-[11px] font-semibold text-[#22D3EE] whitespace-nowrap pointer-events-none">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

export function ResidentialEquipmentVariants() {
  const audience = useHVACStore((s) => s.audience);
  const service = useHVACStore((s) => s.service);
  const selectedEquipmentId = useHVACStore((s) => s.selectedEquipmentId);
  const compareMode = useHVACStore((s) => s.compareMode);
  const compareEquipmentIds = useHVACStore((s) => s.compareEquipmentIds);
  const language = useHVACStore((s) => s.language);

  if (audience !== 'residential') {
    return null;
  }

  // Compare Mode: Display 2-3 selected residential units side by side on the front living wall
  if (service === 'equipment' && compareMode && compareEquipmentIds.length >= 2) {
    const offsets =
      compareEquipmentIds.length === 2 ? [-1.55, -0.15] : [-1.85, -0.65, 0.55];

    return (
      <group name="residential-compare-lineup">
        {compareEquipmentIds.map((id, index) => {
          const item = getEquipmentById(id);
          const x = offsets[index] ?? 0;
          const lbl = language === 'en' ? item.nameEn : item.nameTaglish;

          if (item.modelType === 'window_inverter') {
            return <WindowACModel key={id} position={[x, 1.85, -2.02]} label={lbl} />;
          }
          if (item.modelType === 'floor_mounted') {
            return <FloorMountedModel key={id} position={[x, 0, -1.95]} label={lbl} />;
          }
          return (
            <SplitUnitIndoor
              key={id}
              position={[x, 2.22, -2.14]}
              isNonInverter={item.modelType === 'split_non_inverter'}
              labelTag={lbl}
            />
          );
        })}
      </group>
    );
  }

  // Single Equipment Selection
  if (service === 'equipment') {
    if (selectedEquipmentId === 'res_window_inv') {
      return <WindowACModel position={[-2.25, 1.63, -0.1]} label="Window-Type Inverter" />;
    }
    if (selectedEquipmentId === 'res_floor_mounted') {
      return <FloorMountedModel position={[-1.45, 0, -1.92]} label="Floor-Mounted Tower" />;
    }
    return (
      <SplitUnitIndoor
        position={[-1.45, 2.22, -2.14]}
        isNonInverter={selectedEquipmentId === 'res_split_non_inverter' || selectedEquipmentId === 'res_split_non_inv'}
      />
    );
  }

  // Default Residential Split Indoor Unit
  return <SplitUnitIndoor position={[-1.45, 2.22, -2.14]} />;
}

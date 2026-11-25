import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BRANDS } from '../../data/airconBrands';
import type { BrandId } from '../../data/airconBrands';
import { HVAC_PARTS } from '../../data/hvacData';
import { tr } from '../../i18n/tr';
import { getEquipmentById, useHVACStore } from '../../store/useHVACStore';
import { usePartGuide } from '../../store/usePartGuide';
import { ExplodeProvider, FIGURE_MODELS, InteractionCtx } from './airconModels';
import type { FigureKind, Motion, V3 } from './airconModels';
import { getPartHighlightState } from './hvacSceneUtils';

/* ============================================================================
   Realistic units for the 3D service experience (residential + commercial).
   Each unit is a detailed model from airconModels, wired to the experience:
   power & fan speed, exploded view, x-ray, cleaning (dirt), symptom/service
   highlights, and click-a-part → "how it works" card + inspector selection.
   ============================================================================ */

/** Experience part ids (hotspots, symptoms) → model part ids, per model kind. */
function modelPartsFor(hvacId: string, kind: FigureKind): string[] {
  const indoor = kind === 'wall' || kind === 'floor' || kind === 'window' || kind === 'ducted' || kind === 'cassette';
  const outdoor = kind === 'outdoor' || kind === 'vrf' || kind === 'packaged';
  switch (hvacId) {
    case 'evaporator_coil':
      return indoor ? ['coil'] : kind === 'packaged' ? ['blower'] : [];
    case 'filter':
      return indoor ? ['filter'] : [];
    case 'blower_wheel':
      return kind === 'wall' ? ['crossflow'] : kind === 'cassette' ? ['fan'] : indoor || kind === 'packaged' ? ['blower'] : [];
    case 'drain_pan':
      return kind === 'wall' ? ['drain'] : kind === 'cassette' ? ['casing'] : kind === 'window' ? ['base'] : [];
    case 'thermostat':
      return kind === 'ducted' ? ['controls'] : indoor ? ['pcb'] : [];
    case 'compressor':
      return outdoor || kind === 'window' ? ['compressor'] : [];
    case 'condenser_coil':
      return kind === 'window' ? ['condenser'] : outdoor ? ['coil'] : [];
    case 'fan_motor':
      return outdoor || kind === 'window' ? ['fan'] : kind === 'wall' ? ['motor'] : [];
    case 'expansion_valve':
    case 'refrigerant_lines':
      return kind === 'outdoor' || kind === 'vrf' ? ['ports'] : [];
    default:
      return [];
  }
}

/** Model part → the experience part id it corresponds to (to sync the inspector panel). */
function hvacIdFor(partId: string, kind: FigureKind): string | null {
  const outdoor = kind === 'outdoor' || kind === 'vrf' || kind === 'packaged';
  switch (partId) {
    case 'coil':
      return outdoor ? 'condenser_coil' : 'evaporator_coil';
    case 'condenser':
      return 'condenser_coil';
    case 'filter':
      return 'filter';
    case 'crossflow':
    case 'blower':
      return 'blower_wheel';
    case 'drain':
      return 'drain_pan';
    case 'pcb':
    case 'controls':
      return 'thermostat';
    case 'compressor':
      return 'compressor';
    case 'fan':
      return kind === 'cassette' ? 'blower_wheel' : 'fan_motor';
    case 'ports':
      return 'refrigerant_lines';
    default:
      return null;
  }
}

const HVAC_IDS = Object.keys(HVAC_PARTS);

function Unit({
  kind,
  brandId,
  position,
  rotation,
  scale = 1,
  label,
}: {
  kind: FigureKind;
  brandId: BrandId;
  position: V3;
  rotation?: V3;
  scale?: number;
  label?: string;
}) {
  const exploded = useHVACStore((s) => s.exploded);
  const xray = useHVACStore((s) => s.xray);
  const powerOn = useHVACStore((s) => s.powerOn);
  const fanSpeed = useHVACStore((s) => s.fanSpeed);
  const service = useHVACStore((s) => s.service);
  const cleaning = useHVACStore((s) => s.cleaningBeforeAfter);
  const selectedPart = useHVACStore((s) => s.selectedPart);
  const hoveredPart = useHVACStore((s) => s.hoveredPart);
  const selectedSymptom = useHVACStore((s) => s.selectedSymptom);
  const reduceMotion = useHVACStore((s) => s.reduceMotion);
  const language = useHVACStore((s) => s.language);
  const setSelectedPart = useHVACStore((s) => s.setSelectedPart);
  const markInteracted = useHVACStore((s) => s.markInteracted);
  const showGuide = usePartGuide((s) => s.show);
  const guide = usePartGuide((s) => s.open);

  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];
  const Model = FIGURE_MODELS[kind];

  // Fans follow power + fan speed (a tiny negative speed cancels the idle spin when off).
  const motion = useRef<Motion>({ speed: 0.5, target: 0.5 });
  motion.current.target = !powerOn || reduceMotion ? -0.094 : fanSpeed === 'high' ? 1 : fanSpeed === 'med' ? 0.6 : 0.3;
  useFrame((_, dt) => {
    const m = motion.current;
    m.speed += (m.target - m.speed) * Math.min(1, dt * 2);
  });

  const explodeRef = useRef({ amount: 0, target: 0 });
  explodeRef.current.target = exploded ? 1 : 0;

  // Highlights from the symptom finder / service mode / hotspots
  const { selected, highlighted } = useMemo(() => {
    let sel: string | null = null;
    const lit = new Set<string>();
    HVAC_IDS.forEach((id) => {
      const st = getPartHighlightState(id, { service, selectedPart, hoveredPart, selectedSymptom });
      const parts = modelPartsFor(id, kind);
      if (st === 'selected' && parts.length && !sel) sel = parts[0];
      if (st === 'highlighted') parts.forEach((p) => lit.add(p));
    });
    // The part whose card is open is always the selected one
    if (guide && guide.kind === kind) sel = guide.partId;
    return { selected: sel, highlighted: [...lit] };
  }, [service, selectedPart, hoveredPart, selectedSymptom, kind, guide]);

  const interaction = useMemo(
    () => ({
      onPick: (partId: string) => {
        markInteracted();
        const hvac = hvacIdFor(partId, kind);
        if (hvac) setSelectedPart(hvac);
        showGuide({ kind, brandId, partId });
      },
      selected,
      highlighted,
      xray,
      dirt: service === 'cleaning' ? 1 - cleaning : 0.04,
    }),
    [kind, brandId, selected, highlighted, xray, service, cleaning, markInteracted, setSelectedPart, showGuide],
  );

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <InteractionCtx.Provider value={interaction}>
        <ExplodeProvider explodeRef={explodeRef} labels={exploded} en={language === 'en'} spread={1.1}>
          <Model brand={brand} motionRef={motion} />
        </ExplodeProvider>
      </InteractionCtx.Provider>
      {label && (
        <Html position={[0, 0.5, 0]} center distanceFactor={4}>
          <div className="px-2 py-0.5 rounded bg-[#0B1F3A]/95 border border-[#22D3EE]/50 text-[10px] leading-tight font-semibold text-[#22D3EE] whitespace-nowrap pointer-events-none">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ── Residential ── */

function residentialIndoor(id: string): { kind: FigureKind; brandId: BrandId } {
  const type = getEquipmentById(id).modelType;
  if (type === 'window_inverter') return { kind: 'window', brandId: 'carrier' };
  if (type === 'floor_mounted') return { kind: 'floor', brandId: 'mitsubishi' };
  return { kind: 'wall', brandId: type === 'split_non_inverter' ? 'gree' : 'daikin' };
}

function placeResidential(kind: FigureKind, x?: number): { position: V3; rotation?: V3; scale: number } {
  if (kind === 'window') {
    // Compare lineup: on the back wall; single: in the left-wall window opening, facing into the room
    return x === undefined
      ? { position: [-2.25, 1.63, -0.1], rotation: [0, Math.PI / 2, 0], scale: 0.9 }
      : { position: [x, 1.85, -1.98], scale: 0.9 };
  }
  if (kind === 'floor') return { position: [x ?? -1.45, 0.88, -1.95], scale: 1 };
  return { position: [x ?? -1.45, 2.22, -2.15], scale: 1 };
}

export function ResidentialUnits() {
  const audience = useHVACStore((s) => s.audience);
  const service = useHVACStore((s) => s.service);
  const selectedEquipmentId = useHVACStore((s) => s.selectedEquipmentId);
  const compareMode = useHVACStore((s) => s.compareMode);
  const compareEquipmentIds = useHVACStore((s) => s.compareEquipmentIds);
  useHVACStore((s) => s.language);

  if (audience !== 'residential') return null;

  const outdoor = (
    <group>
      <mesh position={[2.85, 0.03, -1.65]} receiveShadow castShadow>
        <boxGeometry args={[1.15, 0.06, 0.55]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.9} />
      </mesh>
      <Unit kind="outdoor" brandId="daikin" position={[2.85, 0.4, -1.65]} scale={1.2} />
    </group>
  );

  if (service === 'equipment' && compareMode && compareEquipmentIds.length >= 2) {
    const offsets = compareEquipmentIds.length === 2 ? [-1.55, -0.15] : [-1.85, -0.65, 0.55];
    return (
      <group name="residential-compare-lineup">
        {compareEquipmentIds.map((id, i) => {
          const item = getEquipmentById(id);
          const { kind, brandId } = residentialIndoor(id);
          const place = placeResidential(kind, offsets[i] ?? 0);
          return <Unit key={id} kind={kind} brandId={brandId} {...place} label={tr(item.nameEn, item.nameTaglish)} />;
        })}
        {outdoor}
      </group>
    );
  }

  const id = service === 'equipment' ? selectedEquipmentId : 'res_split_inv';
  const { kind, brandId } = residentialIndoor(id);
  return (
    <group name="residential-units">
      <Unit kind={kind} brandId={brandId} {...placeResidential(kind)} />
      {outdoor}
    </group>
  );
}

/* ── Commercial ── */

export function CommercialUnits() {
  const audience = useHVACStore((s) => s.audience);
  const service = useHVACStore((s) => s.service);
  const selectedEquipmentId = useHVACStore((s) => s.selectedEquipmentId);
  useHVACStore((s) => s.language);

  if (audience !== 'commercial') return null;

  const showCassette = service !== 'equipment' || selectedEquipmentId === 'com_cassette' || selectedEquipmentId === 'com_vrf';
  const packaged = service === 'equipment' && selectedEquipmentId === 'com_packaged';
  const chiller = service === 'equipment' && selectedEquipmentId === 'com_chiller';

  return (
    <group name="commercial-units">
      {/* Concealed ducted AHU above the ceiling */}
      <Unit kind="ducted" brandId="trane" position={[-1.95, 2.55, -1.6]} scale={1} />
      {/* 4-way ceiling cassette, panel flush with the ceiling, facing down */}
      {showCassette && <Unit kind="cassette" brandId="daikin" position={[-0.25, 2.47, -1.35]} rotation={[Math.PI, 0, 0]} scale={0.9} />}
      {/* Rooftop: packaged unit, or a pair of VRF modules */}
      {packaged ? (
        <Unit kind="packaged" brandId="carrier" position={[2.85, 2.67 + 0.3, -1.25]} scale={0.7} />
      ) : (
        <>
          <Unit kind="vrf" brandId="daikin" position={[2.5, 2.67 + 0.5, -1.25]} scale={0.62} />
          <Unit kind="vrf" brandId="daikin" position={[3.18, 2.67 + 0.5, -1.25]} scale={0.62} />
        </>
      )}
      {chiller && (
        <Html position={[2.85, 4.1, -1.25]} center distanceFactor={4.6}>
          <div className="px-2 py-0.5 rounded bg-[#0B1F3A]/95 border border-[#22D3EE]/50 text-[10px] leading-tight font-semibold text-[#22D3EE] whitespace-nowrap pointer-events-none">
            {tr('Chilled-Water Plant (Consultative)')}
          </div>
        </Html>
      )}
    </group>
  );
}

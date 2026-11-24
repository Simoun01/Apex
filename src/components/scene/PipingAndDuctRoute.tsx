import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HVAC_PARTS } from '../../data/hvacData';
import { useHVACStore } from '../../store/useHVACStore';
import { tr } from '../../i18n/tr';
import {
  createCopperPatinaMaps,
  createLinesetWrapMaps,
  getPartHighlightState,
} from './hvacSceneUtils';

const _emissiveCyan = new THREE.Color('#22D3EE');
const _emissiveOrange = new THREE.Color('#F97316');
const _emissiveBlack = new THREE.Color('#000000');

export function PipingAndDuctRoute() {
  const { invalidate } = useThree();
  const audience = useHVACStore((s) => s.audience);
  const service = useHVACStore((s) => s.service);
  const installStep = useHVACStore((s) => s.installStep);
  const selectedPart = useHVACStore((s) => s.selectedPart);
  const hoveredPart = useHVACStore((s) => s.hoveredPart);
  const selectedSymptom = useHVACStore((s) => s.selectedSymptom);
  const reduceMotion = useHVACStore((s) => s.reduceMotion);
  const setSelectedPart = useHVACStore((s) => s.setSelectedPart);
  const setHoveredPart = useHVACStore((s) => s.setHoveredPart);
  const flyToPart = useHVACStore((s) => s.flyToPart);
  const markInteracted = useHVACStore((s) => s.markInteracted);

  const copperMaps = useMemo(() => createCopperPatinaMaps(), []);
  const wrapMaps = useMemo(() => createLinesetWrapMaps(), []);

  const resSuctionGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.92, 2.15, -2.18),
      new THREE.Vector3(-0.92, 2.15, -2.44),
      new THREE.Vector3(1.85, 2.15, -2.44),
      new THREE.Vector3(1.85, 0.72, -2.44),
      new THREE.Vector3(2.38, 0.45, -1.55),
    ]);
    return new THREE.TubeGeometry(curve, 64, 0.027, 12, false);
  }, []);

  const resLiquidGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.92, 2.1, -2.18),
      new THREE.Vector3(-0.92, 2.1, -2.4),
      new THREE.Vector3(1.8, 2.1, -2.4),
      new THREE.Vector3(1.8, 0.66, -2.4),
      new THREE.Vector3(2.38, 0.38, -1.55),
    ]);
    return new THREE.TubeGeometry(curve, 64, 0.015, 10, false);
  }, []);

  const resDrainGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.92, 2.04, -2.16),
      new THREE.Vector3(-0.92, 1.98, -2.48),
      new THREE.Vector3(1.9, 1.65, -2.48),
      new THREE.Vector3(1.9, 0.12, -2.48),
      new THREE.Vector3(2.15, 0.05, -2.48),
    ]);
    return new THREE.TubeGeometry(curve, 48, 0.018, 10, false);
  }, []);

  const comBranchGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.3, 2.85, -1.25),
      new THREE.Vector3(1.52, 2.78, -1.45),
      new THREE.Vector3(0.4, 2.68, -1.55),
      new THREE.Vector3(-1.35, 2.58, -1.6),
    ]);
    return new THREE.TubeGeometry(curve, 64, 0.032, 10, false);
  }, []);

  const comCassettePipeGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.06, 2.78, -1.45),
      new THREE.Vector3(0.4, 2.62, -1.35),
      new THREE.Vector3(-0.25, 2.52, -1.35),
    ]);
    return new THREE.TubeGeometry(curve, 40, 0.022, 10, false);
  }, []);

  useEffect(() => {
    return () => {
      copperMaps.map.dispose();
      copperMaps.roughnessMap.dispose();
      wrapMaps.map.dispose();
      wrapMaps.bumpMap.dispose();
      resSuctionGeo.dispose();
      resLiquidGeo.dispose();
      resDrainGeo.dispose();
      comBranchGeo.dispose();
      comCassettePipeGeo.dispose();
    };
  }, [
    copperMaps,
    wrapMaps,
    resSuctionGeo,
    resLiquidGeo,
    resDrainGeo,
    comBranchGeo,
    comCassettePipeGeo,
  ]);

  const drawProgressRef = useRef(1);
  const prevStepRef = useRef(installStep);

  useEffect(() => {
    if (service === 'installation') {
      if (installStep < 3) {
        drawProgressRef.current = 0;
      } else if (installStep === 3 && prevStepRef.current !== 3 && !reduceMotion) {
        drawProgressRef.current = 0;
        invalidate();
      } else if (installStep >= 3) {
        drawProgressRef.current = 1;
      }
    } else {
      drawProgressRef.current = 1;
    }
    prevStepRef.current = installStep;
  }, [service, installStep, reduceMotion, invalidate]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = service === 'installation' && installStep < 3 ? 0 : 1;
    if (Math.abs(drawProgressRef.current - target) > 0.004) {
      drawProgressRef.current = THREE.MathUtils.lerp(drawProgressRef.current, target, dt * 1.8);
      if (Math.abs(drawProgressRef.current - target) < 0.01) {
        drawProgressRef.current = target;
      }
      invalidate();
    }

    const p = drawProgressRef.current;
    [resSuctionGeo, resLiquidGeo, resDrainGeo, comBranchGeo, comCassettePipeGeo].forEach((g) => {
      const total = g.index ? g.index.count : g.attributes.position.count;
      const count = Math.floor((total * p) / 3) * 3;
      g.setDrawRange(0, count);
    });
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
    const pos = audience === 'residential' ? info?.positionResidential : info?.positionCommercial;
    if (info && pos) {
      const [x, y, z] = pos;
      const [ox, oy, oz] = info.cameraOffset;
      flyToPart([x + ox, y + oy, z + oz], [x, y, z]);
    }
  };

  const lineState = getPartHighlightState('refrigerant_lines', {
    service,
    selectedPart,
    hoveredPart,
    selectedSymptom,
  });

  const drainState = getPartHighlightState('drain_pan', {
    service,
    selectedPart,
    hoveredPart,
    selectedSymptom,
  });

  const lineEmissive =
    lineState === 'selected'
      ? _emissiveOrange
      : lineState === 'highlighted'
        ? _emissiveCyan
        : _emissiveBlack;
  const lineIntensity = lineState === 'selected' ? 0.45 : lineState === 'highlighted' ? 0.3 : 0;

  const drainEmissive =
    drainState === 'selected'
      ? _emissiveOrange
      : drainState === 'highlighted'
        ? _emissiveCyan
        : _emissiveBlack;
  const drainIntensity = drainState === 'selected' ? 0.45 : drainState === 'highlighted' ? 0.3 : 0;

  const visibleInInstall = service !== 'installation' || installStep >= 3;

  return (
    <group name="piping-route" visible={visibleInInstall}>
      {audience === 'residential' ? (
        <group>
          <group
            onClick={(e) => handleSelect('refrigerant_lines', e)}
            onDoubleClick={(e) => handleDblClick('refrigerant_lines', e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredPart('refrigerant_lines');
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredPart(null);
              document.body.style.cursor = 'auto';
            }}
          >
            {/* Insulated Lineset Wrap (helical UV tape texture) */}
            <mesh geometry={resSuctionGeo} castShadow receiveShadow>
              <meshStandardMaterial
                map={wrapMaps.map}
                bumpMap={wrapMaps.bumpMap}
                bumpScale={0.008}
                roughness={0.72}
                metalness={0.08}
                emissive={lineEmissive}
                emissiveIntensity={lineIntensity}
              />
            </mesh>
            {/* Glossy Copper Piping with Subtle Patina */}
            <mesh geometry={resLiquidGeo} castShadow receiveShadow>
              <meshPhysicalMaterial
                map={copperMaps.map}
                roughnessMap={copperMaps.roughnessMap}
                metalness={0.92}
                roughness={0.22}
                clearcoat={0.42}
                clearcoatRoughness={0.18}
                emissive={lineEmissive}
                emissiveIntensity={lineIntensity}
              />
            </mesh>
            {/* Wall Sleeve Collar & Pipe Saddle Clamps */}
            <mesh position={[-0.92, 2.12, -2.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.058, 0.058, 0.2, 16]} />
              <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.45} />
            </mesh>
            {[
              [0.35, 2.13, -2.43],
              [1.83, 1.45, -2.43],
            ].map((pos, idx) => (
              <mesh key={idx} position={pos as [number, number, number]} castShadow>
                <boxGeometry args={[0.05, 0.08, 0.05]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.78} roughness={0.32} />
              </mesh>
            ))}
          </group>

          {/* PVC Condensate Drain Pipe */}
          <mesh
            geometry={resDrainGeo}
            castShadow
            receiveShadow
            onClick={(e) => handleSelect('drain_pan', e)}
            onDoubleClick={(e) => handleDblClick('drain_pan', e)}
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
            <meshStandardMaterial
              color="#e2e8f0"
              roughness={0.35}
              metalness={0.05}
              emissive={drainEmissive}
              emissiveIntensity={drainIntensity}
            />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh
            geometry={comBranchGeo}
            castShadow
            receiveShadow
            onClick={(e) => handleSelect('refrigerant_lines', e)}
            onDoubleClick={(e) => handleDblClick('refrigerant_lines', e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredPart('refrigerant_lines');
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredPart(null);
              document.body.style.cursor = 'auto';
            }}
          >
            <meshStandardMaterial
              map={wrapMaps.map}
              bumpMap={wrapMaps.bumpMap}
              bumpScale={0.008}
              roughness={0.68}
              emissive={lineEmissive}
              emissiveIntensity={lineIntensity}
            />
          </mesh>
          <mesh
            geometry={comCassettePipeGeo}
            castShadow
            receiveShadow
            onClick={(e) => handleSelect('refrigerant_lines', e)}
          >
            <meshPhysicalMaterial
              map={copperMaps.map}
              roughnessMap={copperMaps.roughnessMap}
              metalness={0.92}
              roughness={0.22}
              clearcoat={0.4}
              emissive={lineEmissive}
              emissiveIntensity={lineIntensity}
            />
          </mesh>
        </group>
      )}

      {service === 'installation' && installStep >= 5 && (
        <Html
          position={audience === 'residential' ? [2.85, 1.35, -1.55] : [2.85, 3.85, -1.25]}
          center
          distanceFactor={4.4}
        >
          <div className="px-2.5 py-1.5 rounded-lg bg-[#0B1F3A]/95 border border-[#22D3EE]/50 text-[11px] text-slate-100 whitespace-nowrap pointer-events-none shadow-lg">
            <div className="font-semibold text-[#22D3EE]">
              {installStep === 5 ? tr('Leak & Vacuum Verified') : tr('Commissioning Readings')}
            </div>
            <div className="font-mono-tabular text-[10px] text-slate-300 mt-0.5">
              {installStep === 5
                ? '450 PSI N₂ · <500 Microns'
                : 'ΔT 11.4°C · 4.6A Steady'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

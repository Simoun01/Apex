import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BRANDS } from '../../data/airconBrands';
import type { BrandId, UnitKind } from '../../data/airconBrands';
import { usePartGuide } from '../../store/usePartGuide';
import { ExplodeProvider, InteractionCtx, MODELS, StudioEnvironment, UNIT_SIZE, productScale } from './airconModels';
import type { ExplodeRef, Motion } from './airconModels';

/* ============================================================================
   Featured product in the showroom hero: one live, slowly turning 3D unit on
   a podium, with an animated exploded view and part labels.
   ============================================================================ */

function Featured({ kind, brandId, explodeRef, exploded, en }: { kind: UnitKind; brandId: BrandId; explodeRef: ExplodeRef; exploded: boolean; en: boolean }) {
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const motion = useRef<Motion>({ speed: 0.55, target: 0.55 });
  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];
  const Model = MODELS[kind];
  const base = productScale(kind, 1.45);

  useFrame((_, dt) => {
    t.current = Math.min(1, t.current + dt / 0.8);
    const k = 1 - Math.pow(1 - t.current, 3);
    const g = group.current;
    if (!g) return;
    const target = base * (exploded ? 0.5 : 1);
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, target, Math.min(1, dt * 5)));
    g.position.y = (1 - k) * -0.18;
    g.rotation.y = (1 - k) * -0.6;
  });

  const showGuide = usePartGuide((s) => s.show);
  const guide = usePartGuide((s) => s.open);
  const interaction = useMemo(
    () => ({
      onPick: (partId: string) => showGuide({ kind, brandId, partId }),
      selected: guide && guide.kind === kind ? guide.partId : null,
    }),
    [kind, brandId, guide, showGuide],
  );

  return (
    <group ref={group} scale={base * 0.8}>
      <InteractionCtx.Provider value={interaction}>
        <ExplodeProvider explodeRef={explodeRef} labels en={en} spread={1.9}>
          <Model brand={brand} motionRef={motion} />
        </ExplodeProvider>
      </InteractionCtx.Provider>
    </group>
  );
}

function Podium({ y, accent }: { y: number; accent: string }) {
  return (
    <group position={[0, y, 0]}>
      <mesh receiveShadow position={[0, -0.04, 0]}>
        <cylinderGeometry args={[1.15, 1.2, 0.08, 96]} />
        <meshPhysicalMaterial color="#0e1a2b" roughness={0.18} metalness={0.4} clearcoat={1} clearcoatRoughness={0.08} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.13, 1.155, 128]} />
        <meshBasicMaterial color={accent} transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function ShowroomFeature({
  kind,
  brandId,
  exploded,
  en,
  reduceMotion,
  onInteract,
}: {
  kind: UnitKind;
  brandId: BrandId;
  exploded: boolean;
  en: boolean;
  reduceMotion: boolean;
  onInteract: () => void;
}) {
  const explodeRef = useRef({ amount: 0, target: 0 });
  explodeRef.current.target = exploded ? 1 : 0;
  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];
  const s = productScale(kind, 1.45);
  const floorY = exploded ? -0.78 : -(UNIT_SIZE[kind][1] * s) / 2 - 0.02;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.75, 3.35], fov: 34, near: 0.05, far: 40 }}
      gl={{ antialias: true, alpha: true }}
      onPointerDown={onInteract}
    >
      <StudioEnvironment intensity={0.95} />
      <hemisphereLight args={['#e2e8f0', '#0b1220', 0.35]} />
      <directionalLight position={[2.6, 4.2, 3.2]} intensity={1.7} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
      <directionalLight position={[-3.2, 1.6, 1.8]} intensity={0.5} color="#dbeafe" />
      <spotLight position={[0, 4.5, -2.5]} intensity={18} angle={0.5} penumbra={0.9} color={brand.accent} distance={9} />
      <Featured key={`${kind}-${brandId}`} kind={kind} brandId={brandId} explodeRef={explodeRef} exploded={exploded} en={en} />
      <Podium y={floorY} accent={brand.accent} />
      <ContactShadows position={[0, floorY + 0.002, 0]} opacity={0.6} scale={3.2} blur={2.4} far={1.8} resolution={512} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={!reduceMotion}
        autoRotateSpeed={exploded ? 0.5 : 1.2}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.55}
        target={[0, exploded ? -0.05 : 0, 0]}
      />
    </Canvas>
  );
}

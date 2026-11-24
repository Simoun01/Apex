import { ContactShadows } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { BRANDS } from '../../data/airconBrands';
import type { BrandId, UnitKind } from '../../data/airconBrands';
import { MODELS, StudioEnvironment, UNIT_SIZE, productScale } from './airconModels';
import { hasShot, putShot } from './shotStore';

/* ============================================================================
   Product photo studio.
   Renders each requested product (kind × brand × angle) once, off-screen, with
   studio lighting and reflections, and keeps the result as an image. The
   carousels show these images, so dozens of products cost one WebGL context
   for a moment instead of one live canvas each.
   ============================================================================ */

export interface Shot {
  key: string;
  kind: UnitKind;
  brandId: BrandId;
  /** Turn of the unit, radians (0 = facing the camera) */
  yaw: number;
  /** Camera height angle, radians */
  pitch: number;
}

const W = 440;
const H = 330;


function Rig({ shots, onDone }: { shots: Shot[]; onDone: () => void }) {
  const { gl, scene, camera, invalidate } = useThree();
  const [i, setI] = useState(0);
  const shot = shots[i];

  useEffect(() => {
    if (!shot) {
      onDone();
      return;
    }
    const d = 3.05;
    camera.position.set(0, Math.sin(shot.pitch) * d, Math.cos(shot.pitch) * d);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    let a = 0;
    let b = 0;
    invalidate();
    // Wait two frames so instanced fins, shadows and the environment map are in place.
    a = requestAnimationFrame(() => {
      invalidate();
      b = requestAnimationFrame(() => {
        gl.render(scene, camera);
        try {
          putShot(shot.key, gl.domElement.toDataURL('image/webp', 0.9));
        } catch {
          /* tainted or lost context: leave the placeholder */
        }
        setI((n) => n + 1);
      });
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, [shot, gl, scene, camera, invalidate, onDone]);

  if (!shot) return null;
  const brand = BRANDS.find((x) => x.id === shot.brandId) ?? BRANDS[0];
  const Model = MODELS[shot.kind];
  const s = productScale(shot.kind, 1.3);
  const floorY = -(UNIT_SIZE[shot.kind][1] * s) / 2 - 0.015;
  return (
    <group key={shot.key}>
      <group rotation={[0, shot.yaw, 0]} scale={s}>
        <Model brand={brand} />
      </group>
      <ContactShadows position={[0, floorY, 0]} opacity={0.55} scale={3.4} blur={2.6} far={1.6} resolution={512} />
    </group>
  );
}

export default function ProductStudio({ shots }: { shots: Shot[] }) {
  const pending = useMemo(() => shots.filter((s) => !hasShot(s.key)), [shots]);
  const [done, setDone] = useState(pending.length === 0);
  if (done || pending.length === 0) return null;
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', left: -10000, top: 0, width: W, height: H, pointerEvents: 'none', opacity: 0 }}
    >
      <Canvas
        dpr={2}
        frameloop="demand"
        shadows
        camera={{ fov: 30, near: 0.05, far: 30, position: [0, 0.6, 3] }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      >
        <StudioEnvironment intensity={1.05} />
        <hemisphereLight args={['#f1f5f9', '#1e293b', 0.35]} />
        <directionalLight position={[2.5, 4, 3.5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
        <directionalLight position={[-3, 1.5, 2]} intensity={0.45} color="#dbeafe" />
        <directionalLight position={[0, 2, -4]} intensity={0.7} color="#bfdbfe" />
        <Rig shots={pending} onDone={() => setDone(true)} />
      </Canvas>
    </div>
  );
}

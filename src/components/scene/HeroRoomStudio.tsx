import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { BrandId } from '../../data/airconBrands';
import { HeroRoom } from './HeroRooms';
import type { RoomId } from './HeroRooms';
import { StudioEnvironment } from './airconModels';
import { hasShot, putShot } from './shotStore';

/* ============================================================================
   Hero room studio.
   Renders each home-page room once, off-screen, at slide resolution, and keeps
   the result as an image — the same trick the product carousels use. Five
   interiors therefore cost one short-lived WebGL context instead of five live
   canvases behind the hero.
   ============================================================================ */

export interface RoomShot {
  key: string;
  id: RoomId;
  brandId: BrandId;
}

// Rendered at full HD and a bit over, to sit beside the real photographs
// without looking soft when the slide is shown full-bleed.
const W = 2048;
const H = 1152;

/** Interior-photography camera: chest height, slightly wide, looking into the corner. */
const CAMERAS: Record<RoomId, { pos: [number, number, number]; look: [number, number, number]; fov: number }> = {
  'living-room': { pos: [-2.2, 1.55, 2.6], look: [1.3, 1.4, -2.2], fov: 54 },
  bedroom: { pos: [2.5, 1.6, 2.5], look: [-0.9, 1.32, -2.4], fov: 52 },
  'clean-installs': { pos: [-2.7, 1.6, 2.6], look: [0.9, 1.35, -2.5], fov: 55 },
  lofts: { pos: [2.4, 1.5, 2.6], look: [-0.9, 1.3, -2.5], fov: 54 },
  'floor-standing': { pos: [-2.5, 1.6, 2.7], look: [1.2, 1.25, -2.3], fov: 55 },
};

function Rig({ shots, onDone }: { shots: RoomShot[]; onDone: () => void }) {
  const { gl, scene, camera, invalidate } = useThree();
  const [i, setI] = useState(0);
  const shot = shots[i];

  useEffect(() => {
    if (!shot) {
      onDone();
      return;
    }
    const c = CAMERAS[shot.id];
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...c.pos);
    cam.fov = c.fov;
    cam.lookAt(new THREE.Vector3(...c.look));
    cam.updateProjectionMatrix();
    let a = 0;
    let b = 0;
    let d = 0;
    invalidate();
    // Three frames: geometry, then shadows and the environment map, then grab.
    a = requestAnimationFrame(() => {
      invalidate();
      b = requestAnimationFrame(() => {
        invalidate();
        d = requestAnimationFrame(() => {
          gl.render(scene, camera);
          try {
            putShot(shot.key, gl.domElement.toDataURL('image/webp', 0.9));
          } catch {
            /* tainted or lost context: the slide keeps its gradient */
          }
          setI((n) => n + 1);
        });
      });
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
      cancelAnimationFrame(d);
    };
  }, [shot, gl, scene, camera, invalidate, onDone]);

  if (!shot) return null;

  return (
    <group key={shot.key}>
      {/* Daylight through the window, warm interior fill, ceiling spots.
          Several soft sources rather than one hard key: interiors read as
          photographs when the shadows are layered and none of them is black. */}
      <hemisphereLight args={['#dceaf8', '#3a332c', 0.7]} />
      <ambientLight intensity={0.26} color="#cfd9e6" />
      <directionalLight
        position={[-1.5, 3.4, -6]}
        intensity={2.4}
        color="#d6e4f4"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-radius={5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-3}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
      />
      {/* Bounce off the floor and the near wall, so undersides are not dead */}
      <directionalLight position={[3.5, 2.6, 3]} intensity={0.42} color="#ffd9b0" />
      <directionalLight position={[0, -2, 2]} intensity={0.18} color="#e8d9c6" />
      <pointLight position={[-1.5, 2.72, -1.1]} intensity={7} color="#ffe6c4" distance={6.5} decay={2} castShadow={false} />
      <pointLight position={[1.9, 2.72, -1.1]} intensity={6} color="#ffe6c4" distance={6.5} decay={2} castShadow={false} />
      <pointLight position={[0.2, 2.72, 0.6]} intensity={4} color="#fff0d8" distance={5.5} decay={2} castShadow={false} />
      <HeroRoom id={shot.id} brandId={shot.brandId} />
    </group>
  );
}

export default function HeroRoomStudio({ shots }: { shots: RoomShot[] }) {
  const pending = useMemo(() => shots.filter((s) => !hasShot(s.key)), [shots]);
  const [done, setDone] = useState(pending.length === 0);
  if (done || pending.length === 0) return null;
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', left: -20000, top: 0, width: W, height: H, pointerEvents: 'none', opacity: 0 }}
    >
      <Canvas
        dpr={1}
        frameloop="demand"
        shadows
        camera={{ fov: 52, near: 0.08, far: 40, position: [-2.5, 1.55, 3] }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.06;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <StudioEnvironment intensity={0.78} />
        <Rig shots={pending} onDone={() => setDone(true)} />
      </Canvas>
    </div>
  );
}

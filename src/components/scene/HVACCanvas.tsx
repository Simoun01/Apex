import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ContactShadows, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HVAC_PARTS } from '../../data/hvacData';
import { QualityTier, useHVACStore } from '../../store/useHVACStore';
import { CameraRig } from './CameraRig';
import { ExteriorStreetScene } from './ExteriorStreetScene';
import { Hotspot } from './Hotspot';
import { PostProcessingRig } from './PostProcessingRig';
import { DEFAULT_CAMERA_FOV, getCameraPresetConfig } from './hvacSceneUtils';

const RoomShell = lazy(() => import('./RoomShell').then((m) => ({ default: m.RoomShell })));
const ResidentialEquipmentVariants = lazy(() =>
  import('./ResidentialEquipmentVariants').then((m) => ({
    default: m.ResidentialEquipmentVariants,
  })),
);
const SplitUnitOutdoor = lazy(() =>
  import('./SplitUnitOutdoor').then((m) => ({ default: m.SplitUnitOutdoor })),
);
const DuctedAHU = lazy(() => import('./DuctedAHU').then((m) => ({ default: m.DuctedAHU })));
const CommercialVRFOutdoor = lazy(() =>
  import('./CommercialVRFOutdoor').then((m) => ({ default: m.CommercialVRFOutdoor })),
);
const PipingAndDuctRoute = lazy(() =>
  import('./PipingAndDuctRoute').then((m) => ({ default: m.PipingAndDuctRoute })),
);
const AirflowParticles = lazy(() =>
  import('./AirflowParticles').then((m) => ({ default: m.AirflowParticles })),
);

function detectSoftwareGlAndSupport(): { supported: boolean; isSoftwareGl: boolean } {
  if (typeof window === 'undefined') return { supported: true, isSoftwareGl: false };
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

function getTargetDpr(quality: QualityTier, isSoftwareGl: boolean): number {
  if (isSoftwareGl) return 1;
  const nativeDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  if (quality === 'low') return 0.65;
  if (quality === 'medium') return Math.min(nativeDpr, 1.15);
  return Math.min(nativeDpr, 2);
}

/**
 * Dynamically applies real WebGL DPR, shadowMap enablement, and shadow map reallocation
 * whenever the user switches 3D Graphics Quality (Low / Medium / High).
 */
function QualitySyncRig({ isSoftwareGl }: { isSoftwareGl: boolean }) {
  const quality = useHVACStore((s) => s.quality);
  const { gl, setDpr, invalidate } = useThree();

  useEffect(() => {
    const targetDpr = getTargetDpr(quality, isSoftwareGl);
    setDpr(targetDpr);

    const shadowsOn = quality !== 'low' && !isSoftwareGl;
    gl.shadowMap.enabled = shadowsOn;
    gl.shadowMap.autoUpdate = shadowsOn;
    gl.shadowMap.needsUpdate = true;

    invalidate();
  }, [quality, isSoftwareGl, gl, setDpr, invalidate]);

  return null;
}

/**
 * Self-contained procedural IBL generated at runtime via Three.js RoomEnvironment + PMREMGenerator.
 * Intensity stays constant across quality tiers so brightness/exposure never washes out on Low.
 */
function ProceduralRoomEnvironment({ intensity }: { intensity: number }) {
  const { gl, scene, invalidate } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);

    const prevEnv = scene.environment;
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();
    invalidate();

    return () => {
      scene.environment = prevEnv;
      envTarget.dispose();
    };
  }, [gl, scene, invalidate]);

  useEffect(() => {
    scene.environmentIntensity = intensity;
    invalidate();
  }, [scene, intensity, invalidate]);

  return null;
}

function SceneHotspots() {
  const audience = useHVACStore((s) => s.audience);
  const service = useHVACStore((s) => s.service);
  const compareMode = useHVACStore((s) => s.compareMode);

  if (service === 'equipment' && compareMode) return null;

  const entries = Object.values(HVAC_PARTS).filter((part) => {
    if (audience === 'residential') return Boolean(part.positionResidential);
    return Boolean(part.positionCommercial);
  });

  return (
    <group name="scene-hotspots">
      {entries.map((part) => {
        const pos =
          audience === 'residential' ? part.positionResidential! : part.positionCommercial!;
        return <Hotspot key={part.id} partId={part.id} position={pos} />;
      })}
    </group>
  );
}

function Stage1ExteriorRig({
  shadowsAllowed,
  shadowSize,
  shadowRadius,
}: {
  shadowsAllowed: boolean;
  shadowSize: number;
  shadowRadius: number;
}) {
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    const light = keyLightRef.current;
    if (!light) return;
    light.shadow.mapSize.set(shadowSize, shadowSize);
    if (light.shadow.map) {
      light.shadow.map.dispose();
      light.shadow.map = null;
    }
    light.shadow.needsUpdate = true;
    invalidate();
  }, [shadowSize, shadowsAllowed, invalidate]);

  return (
    <>
      <color attach="background" args={['#101e36']} />
      <fog attach="fog" args={['#1d243b', 18, 46]} />

      {/* Warm Golden-Hour / Dusk Lighting Rig */}
      <ambientLight intensity={0.42} color="#cbd5e1" />
      <hemisphereLight args={['#93c5fd', '#292524', 0.85]} />

      {/* Low-Angle Golden Hour Key Light casting long soft shadows */}
      <directionalLight
        ref={keyLightRef}
        position={[-14, 5.4, 8.5]}
        intensity={2.95}
        color="#ffba7a"
        castShadow={shadowsAllowed}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-near={2}
        shadow-camera-far={38}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-radius={shadowRadius}
      />

      {/* Dusk Sky Fill + Cool Twilight Backlight */}
      <directionalLight position={[10, 4.5, 6]} intensity={0.75} color="#a5b4fc" />
      <directionalLight position={[4, 6, -10]} intensity={0.65} color="#fb923c" />

      <ExteriorStreetScene />
    </>
  );
}

function Stage2InteriorRig({
  isSoftwareGl,
  quality,
  shadowsAllowed,
  shadowSize,
  shadowRadius,
  visible,
}: {
  isSoftwareGl: boolean;
  quality: QualityTier;
  shadowsAllowed: boolean;
  shadowSize: number;
  shadowRadius: number;
  visible: boolean;
}) {
  const audience = useHVACStore((s) => s.audience);
  const setSelectedPart = useHVACStore((s) => s.setSelectedPart);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    const light = keyLightRef.current;
    if (!light) return;
    light.shadow.mapSize.set(shadowSize, shadowSize);
    if (light.shadow.map) {
      light.shadow.map.dispose();
      light.shadow.map = null;
    }
    light.shadow.needsUpdate = true;
    invalidate();
  }, [shadowSize, shadowsAllowed, invalidate]);

  const contactRes = quality === 'high' ? 512 : 128;
  const contactBlur = quality === 'high' ? 2.4 : 1.5;

  return (
    <group visible={visible}>
      {visible && (
        <>
          <color attach="background" args={['#0B1F3A']} />
          <fog attach="fog" args={['#0B1F3A', 14, 30]} />

          {/* Physical-scale Lighting Rig (constant exposure/brightness across all quality tiers) */}
          <ambientLight intensity={0.55} color="#cbd5e1" />
          <hemisphereLight args={['#e0f2fe', '#1e293b', 1.15]} />

          {/* Key Directional Light with Soft PCF Shadow Map scaled by Quality Tier */}
          <directionalLight
            ref={keyLightRef}
            position={[6.5, 9.5, 6.5]}
            intensity={2.6}
            color="#fff7ed"
            castShadow={shadowsAllowed}
            shadow-mapSize-width={shadowSize}
            shadow-mapSize-height={shadowSize}
            shadow-camera-near={1}
            shadow-camera-far={24}
            shadow-camera-left={-5.8}
            shadow-camera-right={5.8}
            shadow-camera-top={5.8}
            shadow-camera-bottom={-5.8}
            shadow-bias={-0.0004}
            shadow-normalBias={0.02}
            shadow-radius={shadowRadius}
          />

          {/* Warm Fill Light + Cool Rim Backlight */}
          <directionalLight position={[-4.5, 3.2, 4.5]} intensity={0.95} color="#ffdcb8" />
          <directionalLight position={[-6, 4.5, -5]} intensity={0.85} color="#38bdf8" />

          {/* Ground Backdrop Plane */}
          <mesh
            position={[0, -0.14, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={() => setSelectedPart(null)}
            receiveShadow
          >
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#091930" roughness={0.95} />
          </mesh>
        </>
      )}

      <Suspense fallback={null}>
        <RoomShell isSoftwareGl={isSoftwareGl} />
        {audience === 'residential' ? (
          <>
            <ResidentialEquipmentVariants />
            <SplitUnitOutdoor />
          </>
        ) : (
          <>
            <DuctedAHU />
            <CommercialVRFOutdoor />
          </>
        )}
        <PipingAndDuctRoute />
        <AirflowParticles />
        {visible && <SceneHotspots />}
        {visible && !isSoftwareGl && quality !== 'low' && (
          <group key={`contact-shadows-${audience}-${quality}`}>
            <ContactShadows
              position={[-0.65, 0.004, -0.55]}
              opacity={quality === 'high' ? 0.44 : 0.34}
              scale={5.2}
              blur={contactBlur}
              far={2.2}
              resolution={contactRes}
              frames={1}
            />
            <ContactShadows
              position={audience === 'residential' ? [2.85, -0.02, -1.65] : [2.85, 2.68, -1.25]}
              opacity={quality === 'high' ? 0.5 : 0.38}
              scale={2.6}
              blur={contactBlur * 0.85}
              far={1.8}
              resolution={contactRes}
              frames={1}
            />
          </group>
        )}
      </Suspense>
    </group>
  );
}

function SceneContents({ isSoftwareGl }: { isSoftwareGl: boolean }) {
  const stage = useHVACStore((s) => s.stage);
  const quality = useHVACStore((s) => s.quality);

  // Keep calibrated environment lighting intensity consistent across Low/Med/High
  // so lowering quality never washes out or brightens the scene.
  const envIntensity = stage === 'experience' ? 0.95 : 0.68;
  const shadowsAllowed = quality !== 'low' && !isSoftwareGl;
  const shadowSize = quality === 'high' ? 4096 : quality === 'medium' ? 1024 : 512;
  const shadowRadius = quality === 'high' ? 5 : 2;

  const showExterior = stage === 'home' || stage === 'entering';
  const mountInterior = stage === 'entering' || stage === 'experience';

  return (
    <>
      <QualitySyncRig isSoftwareGl={isSoftwareGl} />
      <ProceduralRoomEnvironment intensity={envIntensity} />

      <CameraRig />

      {showExterior && (
        <Stage1ExteriorRig
          shadowsAllowed={shadowsAllowed}
          shadowSize={shadowSize}
          shadowRadius={shadowRadius}
        />
      )}

      {mountInterior && (
        <Stage2InteriorRig
          isSoftwareGl={isSoftwareGl}
          quality={quality}
          shadowsAllowed={shadowsAllowed}
          shadowSize={shadowSize}
          shadowRadius={shadowRadius}
          visible={stage === 'experience'}
        />
      )}

      <PostProcessingRig isSoftwareGl={isSoftwareGl} />
    </>
  );
}

export function HVACCanvas() {
  const { supported, isSoftwareGl } = useMemo(() => detectSoftwareGlAndSupport(), []);
  const stage = useHVACStore((s) => s.stage);
  const audience = useHVACStore((s) => s.audience);
  const quality = useHVACStore((s) => s.quality);
  const setQuality = useHVACStore((s) => s.setQuality);
  const setNon3dMode = useHVACStore((s) => s.setNon3dMode);
  const airflowOn = useHVACStore((s) => s.airflowOn);
  const powerOn = useHVACStore((s) => s.powerOn);
  const reduceMotion = useHVACStore((s) => s.reduceMotion);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    if (!supported) {
      setNon3dMode(true);
    }
  }, [supported, setNon3dMode]);

  if (!supported || contextLost) {
    return null;
  }

  const targetDpr = getTargetDpr(quality, isSoftwareGl);
  const useContinuousLoop =
    !reduceMotion &&
    (stage === 'home' || stage === 'entering' || (airflowOn && powerOn));

  const overviewCam = getCameraPresetConfig(audience, 'overview');

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows="soft"
        dpr={targetDpr}
        frameloop={useContinuousLoop ? 'always' : 'demand'}
        camera={{
          position: stage === 'experience' ? overviewCam.position : [0, 3.45, 14.4],
          fov: DEFAULT_CAMERA_FOV,
          near: 0.1,
          far: 70,
        }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        style={{ touchAction: stage === 'home' ? 'pan-y' : 'none' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
          const dom = gl.domElement;
          dom.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
            setNon3dMode(true);
          });
          dom.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
      >
        <PerformanceMonitor
          onDecline={() => {
            if (quality === 'high') setQuality('medium');
            else if (quality === 'medium') setQuality('low');
          }}
        />
        <SceneContents isSoftwareGl={isSoftwareGl} />
      </Canvas>
    </div>
  );
}

import { useCallback, useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useHVACStore } from '../../store/useHVACStore';
import {
  CameraTargetConfig,
  DEFAULT_CAMERA_FOV,
  getCameraPresetConfig,
} from './hvacSceneUtils';

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _spherical = new THREE.Spherical();
const _approachPos = new THREE.Vector3();
const _approachLook = new THREE.Vector3();

const HOME_CAMERA_POS: [number, number, number] = [0, 3.45, 14.4];
const HOME_CAMERA_TARGET: [number, number, number] = [0, 2.35, -1.2];
const HOME_MIN_DIST = 9.0;
const HOME_MAX_DIST = 17.0;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, gl, invalidate } = useThree();

  const stage = useHVACStore((s) => s.stage);
  const enteringTarget = useHVACStore((s) => s.enteringTarget);
  const audience = useHVACStore((s) => s.audience);
  const service = useHVACStore((s) => s.service);
  const cameraPreset = useHVACStore((s) => s.cameraPreset);
  const cameraNonce = useHVACStore((s) => s.cameraNonce);
  const cameraFlyTarget = useHVACStore((s) => s.cameraFlyTarget);
  const reduceMotion = useHVACStore((s) => s.reduceMotion);
  const markInteracted = useHVACStore((s) => s.markInteracted);
  const completeEnterExperience = useHVACStore((s) => s.completeEnterExperience);
  const setTransitionVeil = useHVACStore((s) => s.setTransitionVeil);

  const isTransitioning = useRef(false);
  const isUserDragging = useRef(false);
  const lastDragEndTime = useRef(-10);
  const justCompletedEnter = useRef(false);

  // Home idle drift anchor in spherical coords relative to HOME_CAMERA_TARGET
  const homeBaseSpherical = useRef(new THREE.Spherical(15.6, 1.49, 0));
  const homeClockOffset = useRef(0);

  // Entering flight state — endPos/endLook always driven by single source of truth getCameraPresetConfig
  const enterState = useRef({
    active: false,
    elapsed: 0,
    duration: 1.55,
    veilTriggered: false,
    startPos: new THREE.Vector3(),
    startLook: new THREE.Vector3(),
    approachPos: new THREE.Vector3(),
    approachLook: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    endLook: new THREE.Vector3(),
  });

  const applyCameraSnapshot = useCallback(
    (
      cfg: CameraTargetConfig,
      opts?: {
        minAzimuth?: number;
        maxAzimuth?: number;
        minDist?: number;
        maxDist?: number;
        minPolar?: number;
        maxPolar?: number;
      },
    ) => {
      if (camera instanceof THREE.PerspectiveCamera && camera.fov !== DEFAULT_CAMERA_FOV) {
        camera.fov = DEFAULT_CAMERA_FOV;
        camera.updateProjectionMatrix();
      }
      camera.position.set(...cfg.position);

      const controls = controlsRef.current;
      if (controls) {
        if (opts?.minAzimuth !== undefined) controls.minAzimuthAngle = opts.minAzimuth;
        if (opts?.maxAzimuth !== undefined) controls.maxAzimuthAngle = opts.maxAzimuth;
        if (opts?.minDist !== undefined) controls.minDistance = opts.minDist;
        if (opts?.maxDist !== undefined) controls.maxDistance = opts.maxDist;
        if (opts?.minPolar !== undefined) controls.minPolarAngle = opts.minPolar;
        if (opts?.maxPolar !== undefined) controls.maxPolarAngle = opts.maxPolar;

        controls.target.set(...cfg.target);

        // Temporarily disable damping so OrbitControls.update() zeroes any residual delta
        // and immediately locks onto the exact target + position without drift or clamping.
        const prevDamping = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = prevDamping;
        controls.saveState();
      } else {
        camera.lookAt(...cfg.target);
      }
      invalidate();
    },
    [camera, invalidate],
  );

  // Sync touch-action and Ctrl/Cmd+Wheel / Pinch zoom on Home Hero
  const isHome = stage === 'home';
  useEffect(() => {
    const dom = gl.domElement;
    dom.style.touchAction = isHome ? 'pan-y' : 'none';

    if (!isHome) return;

    const applyHomeZoomDelta = (scaleFactor: number) => {
      const controls = controlsRef.current;
      if (!controls) return;
      _offset.copy(camera.position).sub(controls.target);
      _spherical.setFromVector3(_offset);
      const nextRadius = THREE.MathUtils.clamp(
        _spherical.radius * scaleFactor,
        HOME_MIN_DIST,
        HOME_MAX_DIST,
      );
      _spherical.radius = nextRadius;
      _offset.setFromSpherical(_spherical);
      camera.position.copy(controls.target).add(_offset);
      homeBaseSpherical.current.radius = nextRadius;
      controls.update();
      invalidate();
    };

    const onWheel = (e: WheelEvent) => {
      // Reserve wheel zoom on Hero exclusively for Ctrl/Cmd + wheel (and trackpad pinch which emits ctrlKey).
      // Normal vertical wheel scrolls the page down naturally.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = 1 + THREE.MathUtils.clamp(e.deltaY * 0.0025, -0.25, 0.25);
      applyHomeZoomDelta(factor);
    };

    let prevPinchDist: number | null = null;
    const getPinchDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        prevPinchDist = getPinchDist(e.touches);
      } else {
        prevPinchDist = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && prevPinchDist !== null) {
        e.preventDefault();
        const dist = getPinchDist(e.touches);
        if (dist > 0) {
          const scaleFactor = THREE.MathUtils.clamp(prevPinchDist / dist, 0.85, 1.18);
          applyHomeZoomDelta(scaleFactor);
          prevPinchDist = dist;
        }
      }
    };

    const onTouchEnd = () => {
      prevPinchDist = null;
    };

    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: false });
    dom.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
    };
  }, [isHome, gl, camera, invalidate]);

  // Sync camera targets on stage / preset / flyToPart changes
  useEffect(() => {
    if (stage === 'home') {
      enterState.current.active = false;
      isTransitioning.current = false;
      applyCameraSnapshot(
        { position: HOME_CAMERA_POS, target: HOME_CAMERA_TARGET },
        {
          minAzimuth: -0.42,
          maxAzimuth: 0.42,
          minDist: HOME_MIN_DIST,
          maxDist: HOME_MAX_DIST,
          minPolar: 0.92,
          maxPolar: Math.PI / 2 - 0.08,
        },
      );
      _targetPos.set(...HOME_CAMERA_POS);
      _targetLook.set(...HOME_CAMERA_TARGET);
      _offset.copy(_targetPos).sub(_targetLook);
      homeBaseSpherical.current.setFromVector3(_offset);
      homeClockOffset.current = 0;
      return;
    }

    if (stage === 'entering') {
      const targetAudience = enteringTarget ?? audience;
      const finalCfg = getCameraPresetConfig(targetAudience, cameraPreset);
      const controls = controlsRef.current;

      enterState.current.active = true;
      enterState.current.elapsed = 0;
      enterState.current.veilTriggered = false;
      enterState.current.startPos.copy(camera.position);
      enterState.current.startLook.copy(
        controls ? controls.target : _targetLook.set(...HOME_CAMERA_TARGET),
      );

      if (targetAudience === 'residential') {
        enterState.current.approachPos.set(-4.2, 1.7, 0.8);
        enterState.current.approachLook.set(-4.2, 1.5, -1.6);
      } else {
        enterState.current.approachPos.set(4.3, 1.75, 0.9);
        enterState.current.approachLook.set(4.3, 1.55, -1.6);
      }

      enterState.current.endPos.set(...finalCfg.position);
      enterState.current.endLook.set(...finalCfg.target);

      isTransitioning.current = false;
      invalidate();
      return;
    }

    // stage === 'experience'
    enterState.current.active = false;
    const cfg = cameraFlyTarget
      ? { position: cameraFlyTarget.position, target: cameraFlyTarget.target }
      : getCameraPresetConfig(audience, cameraPreset);

    _targetPos.set(...cfg.position);
    _targetLook.set(...cfg.target);

    const wasJustEntering = justCompletedEnter.current;
    justCompletedEnter.current = false;

    if (wasJustEntering || reduceMotion || (cameraFlyTarget === null && cameraPreset === 'overview')) {
      applyCameraSnapshot(cfg, {
        minAzimuth: -Infinity,
        maxAzimuth: Infinity,
        minDist: 1.7,
        maxDist: 15,
        minPolar: 0.12,
        maxPolar: Math.PI / 2 - 0.06,
      });
      isTransitioning.current = false;
    } else {
      isTransitioning.current = true;
      invalidate();
    }
  }, [
    stage,
    enteringTarget,
    audience,
    service,
    cameraPreset,
    cameraNonce,
    cameraFlyTarget,
    reduceMotion,
    camera,
    invalidate,
    applyCameraSnapshot,
  ]);

  useFrame(({ clock }, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dt = Math.min(delta, 0.05);

    // 1. Entering camera flight: push toward chosen building, cross-dissolve, then land on exact Stage 2 preset
    if (stage === 'entering' && enterState.current.active) {
      const st = enterState.current;
      st.elapsed += dt;
      const raw = Math.min(st.elapsed / st.duration, 1);

      if (raw < 0.72) {
        const subT = easeInOutCubic(raw / 0.72);
        _approachPos.lerpVectors(st.startPos, st.approachPos, subT);
        _approachLook.lerpVectors(st.startLook, st.approachLook, subT);
        camera.position.copy(_approachPos);
        controls.target.copy(_approachLook);
        controls.update();
      }

      if (raw >= 0.56 && !st.veilTriggered) {
        st.veilTriggered = true;
        setTransitionVeil(1);
      }

      if (raw >= 0.72) {
        // Behind the veil, place camera smoothly into the exact single-source-of-truth Overview/Preset coordinates
        const settleT = easeInOutCubic((raw - 0.72) / 0.28);
        _approachPos.copy(st.endPos).addScaledVector(
          _offset.copy(st.endPos).sub(st.endLook).normalize(),
          0.35 * (1 - settleT),
        );
        camera.position.copy(_approachPos);
        controls.minAzimuthAngle = -Infinity;
        controls.maxAzimuthAngle = Infinity;
        controls.minDistance = 1.7;
        controls.maxDistance = 15;
        controls.minPolarAngle = 0.12;
        controls.maxPolarAngle = Math.PI / 2 - 0.06;
        controls.target.copy(st.endLook);

        if (camera instanceof THREE.PerspectiveCamera && camera.fov !== DEFAULT_CAMERA_FOV) {
          camera.fov = DEFAULT_CAMERA_FOV;
          camera.updateProjectionMatrix();
        }
        const prevDamp = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = prevDamp;
      }

      if (raw >= 1) {
        st.active = false;
        justCompletedEnter.current = true;
        const targetAudience = enteringTarget ?? audience;
        const finalCfg = getCameraPresetConfig(targetAudience, cameraPreset);
        applyCameraSnapshot(finalCfg, {
          minAzimuth: -Infinity,
          maxAzimuth: Infinity,
          minDist: 1.7,
          maxDist: 15,
          minPolar: 0.12,
          maxPolar: Math.PI / 2 - 0.06,
        });
        completeEnterExperience();
      }
      invalidate();
      return;
    }

    // 2. Stage 1 Home gentle continuous orbit & breathing dolly when idle
    if (stage === 'home' && !reduceMotion && !isUserDragging.current) {
      const elapsed = clock.getElapsedTime();
      if (elapsed - lastDragEndTime.current > 2.2) {
        homeClockOffset.current += dt;
        const driftTime = homeClockOffset.current;
        const base = homeBaseSpherical.current;

        const thetaOffset = Math.sin(driftTime * 0.24) * 0.062;
        const radiusOffset = Math.sin(driftTime * 0.36) * 0.4;
        const phiOffset = Math.cos(driftTime * 0.28) * 0.015;

        _spherical.set(
          THREE.MathUtils.clamp(base.radius + radiusOffset, HOME_MIN_DIST, HOME_MAX_DIST),
          THREE.MathUtils.clamp(base.phi + phiOffset, 0.94, Math.PI / 2 - 0.1),
          THREE.MathUtils.clamp(base.theta + thetaOffset, -0.4, 0.4),
        );

        _offset.setFromSpherical(_spherical);
        camera.position.copy(controls.target).add(_offset);
        controls.update();
      }
      return;
    }

    // 3. Stage 2 smooth preset / hotspot transition
    if (isTransitioning.current) {
      const lambda = 5.5;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, lambda, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, lambda, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, lambda, dt);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, lambda, dt);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, lambda, dt);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, lambda, dt);

      controls.update();
      invalidate();

      if (
        camera.position.distanceTo(_targetPos) < 0.025 &&
        controls.target.distanceTo(_targetLook) < 0.025
      ) {
        camera.position.copy(_targetPos);
        controls.target.copy(_targetLook);
        const prevDamp = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = prevDamp;
        isTransitioning.current = false;
      }
    }
  });

  const isEntering = stage === 'entering';

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isEntering}
      enableZoom={!isHome}
      enableDamping={!reduceMotion}
      dampingFactor={0.07}
      enablePan={!isHome}
      rotateSpeed={isHome ? 0.45 : 0.75}
      panSpeed={0.75}
      zoomSpeed={0.85}
      minDistance={isHome ? HOME_MIN_DIST : 1.7}
      maxDistance={isHome ? HOME_MAX_DIST : 15}
      minAzimuthAngle={isHome ? -0.42 : -Infinity}
      maxAzimuthAngle={isHome ? 0.42 : Infinity}
      minPolarAngle={isHome ? 0.92 : 0.12}
      maxPolarAngle={isHome ? Math.PI / 2 - 0.08 : Math.PI / 2 - 0.06}
      onStart={() => {
        isTransitioning.current = false;
        isUserDragging.current = true;
        if (!isHome) markInteracted();
      }}
      onEnd={() => {
        isUserDragging.current = false;
        if (isHome && controlsRef.current) {
          _offset.copy(camera.position).sub(controlsRef.current.target);
          homeBaseSpherical.current.setFromVector3(_offset);
          homeClockOffset.current = 0;
          lastDragEndTime.current = performance.now() / 1000;
        }
      }}
      onChange={() => invalidate()}
    />
  );
}

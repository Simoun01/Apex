import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHVACStore } from '../../store/useHVACStore';

const _dummy = new THREE.Object3D();

export function AirflowParticles() {
  const { invalidate } = useThree();
  const audience = useHVACStore((s) => s.audience);
  const service = useHVACStore((s) => s.service);
  const airflowOn = useHVACStore((s) => s.airflowOn);
  const powerOn = useHVACStore((s) => s.powerOn);
  const fanSpeed = useHVACStore((s) => s.fanSpeed);
  const dirtyAirflowMode = useHVACStore((s) => s.dirtyAirflowMode);
  const quality = useHVACStore((s) => s.quality);
  const reduceMotion = useHVACStore((s) => s.reduceMotion);

  const coolRef = useRef<THREE.InstancedMesh>(null);
  const warmRef = useRef<THREE.InstancedMesh>(null);
  const dropRef = useRef<THREE.InstancedMesh>(null);

  const coolCount = quality === 'high' ? 96 : quality === 'medium' ? 56 : 24;
  const warmCount = quality === 'high' ? 48 : quality === 'medium' ? 28 : 12;
  const dropCount = quality === 'high' ? 24 : quality === 'medium' ? 12 : 0;

  const coolOffsets = useMemo(
    () =>
      Array.from({ length: 96 }, (_, i) => ({
        phase: (i / 96) * 1.0,
        spreadX: ((i * 37) % 100) / 100 - 0.5,
        spreadY: ((i * 53) % 100) / 100 - 0.5,
      })),
    [],
  );

  const warmOffsets = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        phase: (i / 48) * 1.0,
        spreadX: ((i * 43) % 100) / 100 - 0.5,
        spreadZ: ((i * 29) % 100) / 100 - 0.5,
      })),
    [],
  );

  const dropOffsets = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        phase: (i / 24) * 1.0,
        xShift: (((i * 19) % 100) / 100 - 0.5) * 0.65,
      })),
    [],
  );

  const elapsedRef = useRef(0);

  useEffect(() => {
    if (coolRef.current) coolRef.current.computeBoundingSphere();
    if (warmRef.current) warmRef.current.computeBoundingSphere();
    if (dropRef.current) dropRef.current.computeBoundingSphere();
  }, [coolCount, warmCount, dropCount]);

  const active = airflowOn && powerOn && !reduceMotion;

  useFrame((_, delta) => {
    if (!active) return;

    const dt = Math.min(delta, 0.05);
    const speedMult = fanSpeed === 'high' ? 1.45 : fanSpeed === 'med' ? 1.0 : 0.58;
    const dirtPenalty = service === 'cleaning' && dirtyAirflowMode ? 0.36 : 1.0;
    elapsedRef.current += dt * speedMult * dirtPenalty;
    const t = elapsedRef.current;

    const isDirtyWeak = service === 'cleaning' && dirtyAirflowMode;
    const reachScale = isDirtyWeak ? 0.45 : 1.0;

    if (coolRef.current) {
      for (let i = 0; i < coolCount; i++) {
        const o = coolOffsets[i];
        const p = (o.phase + t * 0.42) % 1;

        if (audience === 'residential') {
          const x = -1.45 + o.spreadX * (0.75 + p * 0.9);
          const y = 2.1 - Math.sin(p * 1.35) * 1.35 * reachScale + o.spreadY * 0.14;
          const z = -1.98 + p * 2.45 * reachScale;
          _dummy.position.set(x, y, z);
          _dummy.rotation.set(0.45, 0, 0);
        } else {
          const src = i % 3;
          const baseX = src === 0 ? -0.25 : src === 1 ? -0.25 : -1.65;
          const baseZ = src === 0 ? -1.35 : 0.45;
          const angle = (i * 2.39996) % (Math.PI * 2);
          const rad = 0.25 + p * 1.15 * reachScale;
          const x = baseX + Math.cos(angle) * rad;
          const z = baseZ + Math.sin(angle) * rad;
          const y = 2.32 - p * 1.45 * reachScale;
          _dummy.position.set(x, y, z);
          _dummy.rotation.set(0, -angle, 0.45);
        }

        const scalePulse = Math.sin(p * Math.PI) * (isDirtyWeak ? 0.55 : 1.0);
        _dummy.scale.set(scalePulse, scalePulse, scalePulse * 1.8);
        _dummy.updateMatrix();
        coolRef.current.setMatrixAt(i, _dummy.matrix);
      }
      coolRef.current.instanceMatrix.needsUpdate = true;
    }

    if (warmRef.current) {
      for (let i = 0; i < warmCount; i++) {
        const o = warmOffsets[i];
        const p = (o.phase + t * 0.28) % 1;

        if (audience === 'residential') {
          const x = -1.45 + o.spreadX * 0.9;
          const y = 1.05 + p * 1.45;
          const z = -1.15 + o.spreadZ * 0.4 - p * 0.95;
          _dummy.position.set(x, y, z);
        } else {
          const x = -1.2 + o.spreadX * 2.2;
          const y = 0.9 + p * 1.7;
          const z = -0.3 + o.spreadZ * 1.4 - p * 1.0;
          _dummy.position.set(x, y, z);
        }
        const s = Math.sin(p * Math.PI) * 0.85;
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(s, s * 1.4, s);
        _dummy.updateMatrix();
        warmRef.current.setMatrixAt(i, _dummy.matrix);
      }
      warmRef.current.instanceMatrix.needsUpdate = true;
    }

    if (dropRef.current && dropCount > 0) {
      for (let i = 0; i < dropCount; i++) {
        const o = dropOffsets[i];
        const p = (o.phase + t * 0.55) % 1;

        if (audience === 'residential') {
          if (p < 0.45) {
            const sub = p / 0.45;
            _dummy.position.set(-1.45 + o.xShift, 2.25 - sub * 0.21, -2.08);
          } else {
            const sub = (p - 0.45) / 0.55;
            _dummy.position.set(
              THREE.MathUtils.lerp(-0.92, 1.9, sub),
              THREE.MathUtils.lerp(1.98, 0.25, sub),
              -2.48,
            );
          }
        } else {
          _dummy.position.set(-1.95 + o.xShift * 0.8, 2.55 - p * 0.22, -1.55);
        }
        const ds = Math.sin(p * Math.PI);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(ds, ds * 1.35, ds);
        _dummy.updateMatrix();
        dropRef.current.setMatrixAt(i, _dummy.matrix);
      }
      dropRef.current.instanceMatrix.needsUpdate = true;
    }

    invalidate();
  });

  if (!airflowOn || !powerOn) return null;

  const isDirtyWeak = service === 'cleaning' && dirtyAirflowMode;
  const seg = quality === 'high' ? 8 : quality === 'medium' ? 5 : 4;

  return (
    <group name="airflow-particles">
      <instancedMesh
        key={`cool-${quality}`}
        ref={coolRef}
        args={[undefined, undefined, coolCount]}
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.016, 0.06, seg === 8 ? 4 : 2, seg]} />
        <meshStandardMaterial
          color={isDirtyWeak ? '#94a3b8' : '#22D3EE'}
          emissive={isDirtyWeak ? '#64748b' : '#22D3EE'}
          emissiveIntensity={isDirtyWeak ? 0.15 : 0.75}
          roughness={0.25}
          transparent
          opacity={isDirtyWeak ? 0.45 : 0.78}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh
        key={`warm-${quality}`}
        ref={warmRef}
        args={[undefined, undefined, warmCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.022, seg, seg]} />
        <meshStandardMaterial
          color="#F97316"
          emissive="#F97316"
          emissiveIntensity={0.65}
          roughness={0.3}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </instancedMesh>

      {dropCount > 0 && (
        <instancedMesh
          key={`drop-${quality}`}
          ref={dropRef}
          args={[undefined, undefined, dropCount]}
          frustumCulled={false}
        >
          <sphereGeometry args={[0.014, seg, seg]} />
          {quality === 'high' ? (
            <meshPhysicalMaterial
              color="#bae6fd"
              roughness={0.08}
              metalness={0.05}
              clearcoat={1}
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          ) : (
            <meshStandardMaterial
              color="#bae6fd"
              roughness={0.2}
              transparent
              opacity={0.8}
              depthWrite={false}
            />
          )}
        </instancedMesh>
      )}
    </group>
  );
}

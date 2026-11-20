import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useHVACStore } from '../../store/useHVACStore';

function PostProcessingExecutor() {
  const { gl, scene, camera, size, invalidate } = useThree();

  const passes = useMemo(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rt = new THREE.WebGLRenderTarget(
      Math.max(1, Math.floor(size.width * dpr)),
      Math.max(1, Math.floor(size.height * dpr)),
      {
        type: THREE.HalfFloatType,
        samples: gl.capabilities.isWebGL2 ? 4 : 0,
      },
    );
    const composer = new EffectComposer(gl, rt);

    const renderPass = new RenderPass(scene, camera);
    renderPass.clear = true;
    composer.addPass(renderPass);

    // Subtle selective bloom strictly on bright emissive HVAC airflow/LEDs & dusk windows/lamps
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, size.width / 2), Math.max(1, size.height / 2)),
      0.16,
      0.38,
      0.88,
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    return { composer, bloomPass, outputPass, rt };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    passes.composer.setPixelRatio(dpr);
    passes.composer.setSize(size.width, size.height);
    passes.bloomPass.resolution.set(Math.max(1, size.width / 2), Math.max(1, size.height / 2));
    invalidate();
  }, [passes, size.width, size.height, invalidate]);

  useEffect(() => {
    return () => {
      passes.composer.dispose();
      passes.bloomPass.dispose();
      passes.outputPass.dispose();
      passes.rt.dispose();
      invalidate();
    };
  }, [passes, invalidate]);

  // Runs at priority 1 only on High tier (non-software WebGL)
  useFrame(() => {
    passes.composer.render();
  }, 1);

  return null;
}

export function PostProcessingRig({ isSoftwareGl }: { isSoftwareGl: boolean }) {
  const quality = useHVACStore((s) => s.quality);
  const postProcessingEnabled = useHVACStore((s) => s.postProcessingEnabled);

  if (!postProcessingEnabled || isSoftwareGl || quality !== 'high') {
    return null;
  }

  return <PostProcessingExecutor />;
}

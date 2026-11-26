import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useHVACStore } from '../../store/useHVACStore';

/* ── Cinematic vignette + subtle contrast/saturation color grading ── */
const VignetteColorGradeShader = {
  name: 'VignetteColorGrade',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignetteOffset: { value: 1.1 },
    vignetteDarkness: { value: 0.68 },
    contrast: { value: 1.06 },
    // Keep colour near-neutral: pushing saturation is what makes a 3D scene
    // read as a cartoon rather than a photograph.
    saturation: { value: 0.97 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignetteOffset;
    uniform float vignetteDarkness;
    uniform float contrast;
    uniform float saturation;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 col = texel.rgb;

      // Contrast lift
      col = (col - 0.5) * contrast + 0.5;

      // Saturation lift
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, saturation);

      // Vignette
      vec2 uv = (vUv - 0.5) * vec2(vignetteOffset);
      float vig = smoothstep(0.0, 1.0, 1.0 - dot(uv, uv));
      col *= mix(1.0 - vignetteDarkness, 1.0, vig);

      gl_FragColor = vec4(max(col, 0.0), texel.a);
    }
  `,
};

/* ── High-Quality post-processing: SSAO + Bloom + Vignette ── */
function HighPostProcessing() {
  const { gl, scene, camera, size, invalidate } = useThree();

  const passes = useMemo(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(size.width * dpr));
    const h = Math.max(1, Math.floor(size.height * dpr));
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      samples: gl.capabilities.isWebGL2 ? 4 : 0,
    });
    const composer = new EffectComposer(gl, rt);

    // 1 — Scene render
    const renderPass = new RenderPass(scene, camera);
    renderPass.clear = true;
    composer.addPass(renderPass);

    // 2 — Screen-Space Ambient Occlusion: soft crevice & contact shadows
    const ssaoPass = new SSAOPass(scene, camera, w, h);
    ssaoPass.kernelRadius = 0.35;
    ssaoPass.minDistance = 0.0008;
    ssaoPass.maxDistance = 0.06;
    (ssaoPass as any).output = SSAOPass.OUTPUT.Default;
    composer.addPass(ssaoPass);

    // 3 — Bloom on bright emissives (LEDs, window glow, airflow)
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, size.width / 2), Math.max(1, size.height / 2)),
      0.2,
      0.42,
      0.84,
    );
    composer.addPass(bloomPass);

    // 4 — Cinematic vignette + color grading
    const vignettePass = new ShaderPass(VignetteColorGradeShader);
    composer.addPass(vignettePass);

    // 5 — Output (gamma / tone-map finalization)
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    return { composer, ssaoPass, bloomPass, vignettePass, outputPass, rt };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    passes.composer.setPixelRatio(dpr);
    passes.composer.setSize(size.width, size.height);
    passes.bloomPass.resolution.set(Math.max(1, size.width / 2), Math.max(1, size.height / 2));
    passes.ssaoPass.setSize(size.width, size.height);
    invalidate();
  }, [passes, size.width, size.height, invalidate]);

  useEffect(() => {
    return () => {
      passes.composer.dispose();
      passes.bloomPass.dispose();
      (passes.vignettePass.material as THREE.ShaderMaterial).dispose();
      passes.outputPass.dispose();
      passes.rt.dispose();
      invalidate();
    };
  }, [passes, invalidate]);

  useFrame(() => {
    passes.composer.render();
  }, 1);

  return null;
}

/* ── Medium-Quality post-processing: Bloom only (lightweight) ── */
function MediumPostProcessing() {
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

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, size.width / 2), Math.max(1, size.height / 2)),
      0.14,
      0.36,
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

  useFrame(() => {
    passes.composer.render();
  }, 1);

  return null;
}

export function PostProcessingRig({ isSoftwareGl }: { isSoftwareGl: boolean }) {
  const quality = useHVACStore((s) => s.quality);
  const postProcessingEnabled = useHVACStore((s) => s.postProcessingEnabled);

  if (!postProcessingEnabled || isSoftwareGl || quality === 'low') {
    return null;
  }

  if (quality === 'medium') {
    return <MediumPostProcessing />;
  }

  return <HighPostProcessing />;
}

import * as THREE from 'three';
import { Audience, CameraPreset, SYMPTOM_ITEMS, ServiceMode } from '../../data/hvacData';

export const DEFAULT_CAMERA_FOV = 42;

export interface CameraTargetConfig {
  position: [number, number, number];
  target: [number, number, number];
}

export const RESIDENTIAL_PRESETS: Record<CameraPreset, CameraTargetConfig> = {
  overview: {
    position: [4.6, 3.6, 5.4],
    target: [0.35, 1.25, -0.45],
  },
  indoor: {
    position: [-0.45, 2.25, 0.25],
    target: [-1.45, 2.22, -2.05],
  },
  outdoor: {
    position: [4.85, 1.65, 0.75],
    target: [2.85, 1.0, -1.65],
  },
  piping: {
    position: [1.1, 2.25, 1.9],
    target: [0.75, 1.55, -2.15],
  },
  top: {
    position: [0.35, 7.6, 1.6],
    target: [0.35, 0.6, -0.6],
  },
};

export const COMMERCIAL_PRESETS: Record<CameraPreset, CameraTargetConfig> = {
  overview: {
    position: [5.9, 4.7, 6.2],
    target: [0.25, 1.6, -0.35],
  },
  indoor: {
    position: [-0.85, 1.95, 1.65],
    target: [-1.45, 2.38, -0.95],
  },
  outdoor: {
    position: [5.4, 4.15, 1.35],
    target: [2.75, 3.05, -1.35],
  },
  piping: {
    position: [1.15, 3.85, 2.6],
    target: [0.4, 2.55, -0.95],
  },
  top: {
    position: [0.25, 8.8, 1.8],
    target: [0.25, 1.2, -0.4],
  },
};

export function getCameraPresetConfig(audience: Audience, preset: CameraPreset): CameraTargetConfig {
  return audience === 'residential' ? RESIDENTIAL_PRESETS[preset] : COMMERCIAL_PRESETS[preset];
}

export const SERVICE_HIGHLIGHT_PARTS: Record<ServiceMode, string[]> = {
  repair: ['compressor', 'refrigerant_lines', 'thermostat', 'fan_motor', 'expansion_valve'],
  cleaning: ['filter', 'evaporator_coil', 'blower_wheel', 'drain_pan', 'condenser_coil'],
  equipment: [],
  installation: ['refrigerant_lines', 'ductwork', 'compressor', 'evaporator_coil'],
};

export type PartHighlightState = 'selected' | 'highlighted' | 'dimmed' | 'normal';

export function getPartHighlightState(
  partId: string,
  opts: {
    service: ServiceMode;
    selectedPart: string | null;
    hoveredPart: string | null;
    selectedSymptom: string | null;
  },
): PartHighlightState {
  if (opts.selectedPart === partId || opts.hoveredPart === partId) {
    return 'selected';
  }

  if (opts.service === 'repair' && opts.selectedSymptom) {
    const symptom = SYMPTOM_ITEMS.find((s) => s.id === opts.selectedSymptom);
    if (symptom) {
      return symptom.partIds.includes(partId) ? 'highlighted' : 'dimmed';
    }
  }

  if (opts.service === 'repair' || opts.service === 'cleaning') {
    const list = SERVICE_HIGHLIGHT_PARTS[opts.service];
    return list.includes(partId) ? 'highlighted' : 'dimmed';
  }

  return 'normal';
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  opts: { isSRGB: boolean; repeat?: [number, number]; anisotropy?: number },
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = opts.isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) {
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  tex.anisotropy = opts.anisotropy ?? 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Sobel-filter a greyscale height canvas into a tangent-space normal map.
 * Wraps at edges so the result tiles seamlessly.
 */
export function heightCanvasToNormalMap(
  heightCanvas: HTMLCanvasElement,
  strength: number = 2.0,
  opts?: { repeat?: [number, number]; anisotropy?: number },
): THREE.CanvasTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = w;
  normalCanvas.height = h;
  const nctx = normalCanvas.getContext('2d')!;
  const normalImg = nctx.createImageData(w, h);
  const nd = normalImg.data;

  const getH = (px: number, py: number) => {
    const sx = ((px % w) + w) % w;
    const sy = ((py % h) + h) % h;
    return srcData[(sy * w + sx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = getH(x - 1, y - 1);
      const t  = getH(x,     y - 1);
      const tr = getH(x + 1, y - 1);
      const l  = getH(x - 1, y);
      const r  = getH(x + 1, y);
      const bl = getH(x - 1, y + 1);
      const b  = getH(x,     y + 1);
      const br = getH(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      const idx = (y * w + x) * 4;
      nd[idx]     = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      nd[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      nd[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      nd[idx + 3] = 255;
    }
  }

  nctx.putImageData(normalImg, 0, 0);
  return finalizeTexture(normalCanvas, {
    isSRGB: false,
    repeat: opts?.repeat,
    anisotropy: opts?.anisotropy ?? 4,
  });
}

export function createTileFloorMaps(
  baseHex = '#23334b',
  groutHex = '#0f172a',
  gridCount = 8,
): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; normalMap: THREE.CanvasTexture } {
  const size = 512;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const actx = albedoCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d');

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hctx = heightCanvas.getContext('2d');

  if (actx && rctx) {
    actx.fillStyle = baseHex;
    actx.fillRect(0, 0, size, size);

    // Polished ceramic tile base roughness (~72/255 = 0.28)
    rctx.fillStyle = 'rgb(74, 74, 74)';
    rctx.fillRect(0, 0, size, size);

    const step = size / gridCount;
    for (let x = 0; x < gridCount; x++) {
      for (let y = 0; y < gridCount; y++) {
        const shade = ((x * 7 + y * 13) % 5) * 4;
        actx.fillStyle = `rgba(255,255,255,${0.02 + shade * 0.004})`;
        actx.fillRect(x * step + 3, y * step + 3, step - 6, step - 6);

        // Subtle stone speckle
        for (let k = 0; k < 12; k++) {
          const sx = x * step + 6 + (((x * 31 + k * 19) % 100) / 100) * (step - 12);
          const sy = y * step + 6 + (((y * 23 + k * 41) % 100) / 100) * (step - 12);
          actx.fillStyle = k % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
          actx.fillRect(sx, sy, 3, 2);
        }

        const rVal = 64 + ((x + y) % 3) * 10;
        rctx.fillStyle = `rgb(${rVal}, ${rVal}, ${rVal})`;
        rctx.fillRect(x * step + 3, y * step + 3, step - 6, step - 6);
      }
    }

    // Matte grout lines
    actx.strokeStyle = groutHex;
    actx.lineWidth = 4;
    rctx.strokeStyle = 'rgb(235, 235, 235)';
    rctx.lineWidth = 5;
    for (let i = 0; i <= gridCount; i++) {
      const p = i * step;
      actx.beginPath();
      actx.moveTo(p, 0);
      actx.lineTo(p, size);
      actx.stroke();
      actx.beginPath();
      actx.moveTo(0, p);
      actx.lineTo(size, p);
      actx.stroke();

      rctx.beginPath();
      rctx.moveTo(p, 0);
      rctx.lineTo(p, size);
      rctx.stroke();
      rctx.beginPath();
      rctx.moveTo(0, p);
      rctx.lineTo(size, p);
      rctx.stroke();
    }
  }

  // Height map for normal map generation: tiles raised, grout recessed
  if (hctx) {
    hctx.fillStyle = 'rgb(180, 180, 180)';
    hctx.fillRect(0, 0, size, size);
    const hStep = size / gridCount;
    for (let x = 0; x < gridCount; x++) {
      for (let y = 0; y < gridCount; y++) {
        const h = 170 + ((x * 7 + y * 13) % 5) * 4;
        hctx.fillStyle = `rgb(${h}, ${h}, ${h})`;
        hctx.fillRect(x * hStep + 4, y * hStep + 4, hStep - 8, hStep - 8);
      }
    }
    hctx.strokeStyle = 'rgb(80, 80, 80)';
    hctx.lineWidth = 5;
    for (let i = 0; i <= gridCount; i++) {
      const p = i * hStep;
      hctx.beginPath(); hctx.moveTo(p, 0); hctx.lineTo(p, size); hctx.stroke();
      hctx.beginPath(); hctx.moveTo(0, p); hctx.lineTo(size, p); hctx.stroke();
    }
  }

  return {
    map: finalizeTexture(albedoCanvas, { isSRGB: true, repeat: [2, 2], anisotropy: 8 }),
    roughnessMap: finalizeTexture(roughCanvas, { isSRGB: false, repeat: [2, 2], anisotropy: 8 }),
    normalMap: heightCanvasToNormalMap(heightCanvas, 2.5, { repeat: [2, 2], anisotropy: 8 }),
  };
}

export function createBrushedMetalMaps(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const rough = document.createElement('canvas');
  rough.width = size;
  rough.height = size;
  const rctx = rough.getContext('2d');

  if (actx && rctx) {
    actx.fillStyle = '#cfd8e3';
    actx.fillRect(0, 0, size, size);
    rctx.fillStyle = 'rgb(96, 96, 96)';
    rctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      const n = ((y * 73 + 19) % 29) - 14;
      actx.fillStyle = n > 0 ? `rgba(255,255,255,${n * 0.008})` : `rgba(15,23,42,${-n * 0.007})`;
      actx.fillRect(0, y, size, 1);

      const rv = Math.max(55, Math.min(135, 92 + n * 2));
      rctx.fillStyle = `rgb(${rv}, ${rv}, ${rv})`;
      rctx.fillRect(0, y, size, 1);
    }
  }

  return {
    map: finalizeTexture(albedo, { isSRGB: true, repeat: [2, 2], anisotropy: 4 }),
    roughnessMap: finalizeTexture(rough, { isSRGB: false, repeat: [2, 2], anisotropy: 4 }),
    bumpMap: finalizeTexture(rough, { isSRGB: false, repeat: [2, 2], anisotropy: 4 }),
    normalMap: heightCanvasToNormalMap(rough, 1.5, { repeat: [2, 2], anisotropy: 4 }),
  };
}

export function createMatteWallBumpMap(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgb(128,128,128)';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2400; i++) {
      const x = (i * 97) % size;
      const y = (i * 53) % size;
      const v = 112 + ((i * 31) % 32);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  return finalizeTexture(canvas, { isSRGB: false, repeat: [4, 4], anisotropy: 4 });
}

export function createWoodGrainMaps(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const rough = document.createElement('canvas');
  rough.width = size;
  rough.height = size;
  const rctx = rough.getContext('2d');

  if (actx && rctx) {
    actx.fillStyle = '#7c4d2b';
    actx.fillRect(0, 0, size, size);
    rctx.fillStyle = 'rgb(88, 88, 88)';
    rctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      const wave = Math.sin(y * 0.14) * 0.5 + Math.cos(y * 0.37) * 0.5;
      actx.fillStyle = wave > 0 ? 'rgba(40, 20, 8, 0.18)' : 'rgba(210, 150, 95, 0.14)';
      actx.fillRect(0, y, size, 1);

      const rv = Math.round(78 + (wave + 1) * 14);
      rctx.fillStyle = `rgb(${rv}, ${rv}, ${rv})`;
      rctx.fillRect(0, y, size, 1);
    }
  }

  return {
    map: finalizeTexture(albedo, { isSRGB: true, repeat: [1, 1], anisotropy: 4 }),
    roughnessMap: finalizeTexture(rough, { isSRGB: false, repeat: [1, 1], anisotropy: 4 }),
  };
}

export function createFabricWeaveMaps(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 128;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext('2d');

  if (actx && bctx) {
    actx.fillStyle = '#475569';
    actx.fillRect(0, 0, size, size);
    bctx.fillStyle = 'rgb(120, 120, 120)';
    bctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        const alt = ((x + y) / 4) % 2 === 0;
        actx.fillStyle = alt ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.12)';
        actx.fillRect(x, y, 3, 3);
        bctx.fillStyle = alt ? 'rgb(175,175,175)' : 'rgb(85,85,85)';
        bctx.fillRect(x, y, 3, 3);
      }
    }
  }

  return {
    map: finalizeTexture(albedo, { isSRGB: true, repeat: [6, 4], anisotropy: 4 }),
    bumpMap: finalizeTexture(bump, { isSRGB: false, repeat: [6, 4], anisotropy: 4 }),
  };
}

export function createCopperPatinaMaps(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const rough = document.createElement('canvas');
  rough.width = size;
  rough.height = size;
  const rctx = rough.getContext('2d');

  if (actx && rctx) {
    actx.fillStyle = '#c87344';
    actx.fillRect(0, 0, size, size);
    rctx.fillStyle = 'rgb(52, 52, 52)';
    rctx.fillRect(0, 0, size, size);

    // Subtle verdigris & heat-tarnish patina mottling
    for (let i = 0; i < 42; i++) {
      const cx = (i * 61) % size;
      const cy = (i * 89) % size;
      const r = 10 + (i % 18);
      actx.fillStyle = i % 3 === 0 ? 'rgba(72, 138, 122, 0.22)' : 'rgba(92, 48, 28, 0.22)';
      actx.beginPath();
      actx.arc(cx, cy, r, 0, Math.PI * 2);
      actx.fill();

      rctx.fillStyle = i % 3 === 0 ? 'rgb(135, 135, 135)' : 'rgb(90, 90, 90)';
      rctx.beginPath();
      rctx.arc(cx, cy, r, 0, Math.PI * 2);
      rctx.fill();
    }
  }

  return {
    map: finalizeTexture(albedo, { isSRGB: true, repeat: [3, 1], anisotropy: 4 }),
    roughnessMap: finalizeTexture(rough, { isSRGB: false, repeat: [3, 1], anisotropy: 4 }),
  };
}

export function createLinesetWrapMaps(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const actx = albedo.getContext('2d');

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext('2d');

  if (actx && bctx) {
    // Ivory/slate UV-protective HVAC lineset tape wrap
    actx.fillStyle = '#334155';
    actx.fillRect(0, 0, size, size);
    bctx.fillStyle = 'rgb(128, 128, 128)';
    bctx.fillRect(0, 0, size, size);

    // Helical overlapping wrap bands
    for (let x = -size; x < size * 2; x += 22) {
      actx.strokeStyle = 'rgba(226, 232, 240, 0.16)';
      actx.lineWidth = 10;
      actx.beginPath();
      actx.moveTo(x, 0);
      actx.lineTo(x + size * 0.4, size);
      actx.stroke();

      actx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      actx.lineWidth = 2;
      actx.beginPath();
      actx.moveTo(x + 5, 0);
      actx.lineTo(x + 5 + size * 0.4, size);
      actx.stroke();

      bctx.strokeStyle = 'rgb(210, 210, 210)';
      bctx.lineWidth = 8;
      bctx.beginPath();
      bctx.moveTo(x, 0);
      bctx.lineTo(x + size * 0.4, size);
      bctx.stroke();
    }
  }

  return {
    map: finalizeTexture(albedo, { isSRGB: true, repeat: [12, 1], anisotropy: 4 }),
    bumpMap: finalizeTexture(bump, { isSRGB: false, repeat: [12, 1], anisotropy: 4 }),
  };
}

export function createFilterMeshTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  }
  return finalizeTexture(canvas, { isSRGB: true, repeat: [4, 2], anisotropy: 4 });
}
